import { rm } from 'fs/promises';
import {
  CANCEL_GRACE_PERIOD_MS,
  EXPIRED_JOBS_SWEEP_INTERVAL_MS,
  FINISHED_STATUSES,
  TranscriptionStage,
  TranscriptionStatus,
  WHISPER_MODELS,
  WORKER_IDLE_TIMEOUT_MS,
  WorkerEventTypes,
  WorkerRequestTypes,
  type TranscriptionStatusValues,
  type WhisperModelIdValues,
} from '../logic/constants';
import { resolveRuntimes } from '../logic/utils/resolveRuntimes';
import type { LoggerService } from '@src/core/services/logger';
import type { TranscriptionConfig } from '@src/plugins/config-service';
import type { TranscriptionJob, WorkerEvent, WorkerProcess } from '../types';

export type JobsServiceLogger = Pick<LoggerService, 'debug' | 'info' | 'warn' | 'error' | 'fatal'>;

type TranscriptionJobsServiceProps = {
  config: TranscriptionConfig;
  logger: JobsServiceLogger;
  /**
   * Starts the process that runs `transcription.worker`.
   */
  spawnWorker: () => WorkerProcess;
};

type CreateJobProps = {
  id: string;
  audioPath: string;
  audioDurationSec: number;
  modelId: WhisperModelIdValues;
  /**
   * A language code, or `auto`.
   */
  language: string;
};

type FinishActiveJobProps = {
  status: TranscriptionStatusValues;
  error?: string;
};

/**
 * Owns the transcription queue and the worker process that executes it, one job at a time (inference already
 * uses every CPU core, so parallel jobs would only slow each other down).
 */
export class TranscriptionJobsService {
  private readonly config: TranscriptionConfig;
  private readonly logger: JobsServiceLogger;
  private readonly spawnWorker: () => WorkerProcess;
  private readonly jobs = new Map<string, TranscriptionJob>();
  private readonly queue: Array<string> = [];
  private readonly sweepTimer: NodeJS.Timeout;
  private worker: WorkerProcess | null = null;
  /**
   * Stays set until the worker confirms the job ended, even when the job was deleted in the meantime.
   */
  private activeJob: TranscriptionJob | null = null;
  private cancelTimer: NodeJS.Timeout | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  constructor(props: TranscriptionJobsServiceProps) {
    const { config, logger, spawnWorker } = props;

    this.config = config;
    this.logger = logger;
    this.spawnWorker = spawnWorker;

    this.sweepTimer = setInterval(() => this.removeExpiredJobs(), EXPIRED_JOBS_SWEEP_INTERVAL_MS);
    this.sweepTimer.unref();
  }

  /**
   * Queued jobs plus the one being processed.
   */
  get pendingJobsCount(): number {
    const activeJobsCount = this.activeJob && this.jobs.has(this.activeJob.id) ? 1 : 0;

    return this.queue.length + activeJobsCount;
  }

  createJob(props: CreateJobProps): TranscriptionJob {
    const { id, audioPath, audioDurationSec, modelId, language } = props;

    const job: TranscriptionJob = {
      id,
      status: TranscriptionStatus.Queued,
      stage: TranscriptionStage.Waiting,
      modelId,
      requestedLanguage: language,
      language: null,
      languageProbability: null,
      device: null,
      audioPath,
      audioDurationSec,
      progress: 0,
      modelDownload: null,
      words: [],
      error: null,
      createdAt: Date.now(),
      startedAt: null,
      finishedAt: null,
    };

    this.jobs.set(id, job);
    this.queue.push(id);
    this.processNextJob();

    return job;
  }

  getJob(jobId: string): TranscriptionJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * @returns 1 for the next job to run, `null` when the job isn't waiting.
   */
  getQueuePosition(jobId: string): number | null {
    const queueIndex = this.queue.indexOf(jobId);

    return queueIndex === -1 ? null : queueIndex + 1;
  }

  /**
   * Cancels the job if it hasn't finished, and forgets it.
   *
   * @returns `false` when there's no such job.
   */
  deleteJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);

    if (!job) return false;

    this.jobs.delete(jobId);

    const queueIndex = this.queue.indexOf(jobId);

    if (queueIndex !== -1) {
      this.queue.splice(queueIndex, 1);
      void this.removeAudioFile(job);
    }

    if (this.activeJob?.id === jobId) this.cancelActiveJob();

    return true;
  }

  /**
   * Stops the worker and removes every uploaded audio file still on disk.
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    clearInterval(this.sweepTimer);
    this.clearCancelTimer();
    this.clearIdleTimer();
    this.stopWorker();

    const pendingJobs = [...this.jobs.values()].filter((job) => !FINISHED_STATUSES.includes(job.status));
    const jobsWithAudio = this.activeJob ? [...pendingJobs, this.activeJob] : pendingJobs;

    await Promise.all(jobsWithAudio.map((job) => this.removeAudioFile(job)));
  }

  private processNextJob() {
    if (this.activeJob || this.isShuttingDown) return;

    const nextJobId = this.queue.shift();

    if (!nextJobId) return void this.startIdleTimer();

    const job = this.jobs.get(nextJobId);

    if (!job) return void this.processNextJob();

    this.clearIdleTimer();

    const worker = this.getOrSpawnWorker();
    const model = WHISPER_MODELS[job.modelId];
    const runtimes = resolveRuntimes({ runtimes: model.runtimes, device: this.config.device });

    job.status = TranscriptionStatus.Processing;
    job.startedAt = Date.now();
    this.activeJob = job;

    this.logger.info(`Transcription ${job.id} started (model: ${job.modelId}, language: ${job.requestedLanguage})`);

    worker.send({
      type: WorkerRequestTypes.Transcribe,
      task: {
        jobId: job.id,
        audioPath: job.audioPath,
        language: job.requestedLanguage,
        repo: model.repo,
        runtimes,
        modelsDir: this.config.modelsDir,
        allowRemoteModels: this.config.allowRemoteModels,
      },
    });
  }

  private getOrSpawnWorker(): WorkerProcess {
    if (this.worker?.connected) return this.worker;

    const worker = this.spawnWorker();

    worker.on('message', (event: WorkerEvent) => this.handleWorkerEvent({ worker, event }));
    worker.on('exit', (code, signal) => this.handleWorkerExit({ worker, reason: signal ?? `exit code ${code}` }));
    worker.on('error', (error) => {
      this.logger.error('The transcription worker failed', { error });
      worker.kill();
      this.handleWorkerExit({ worker, reason: error.message });
    });

    this.worker = worker;

    return worker;
  }

  private handleWorkerEvent(props: { worker: WorkerProcess; event: WorkerEvent }) {
    const { worker, event } = props;

    if (worker !== this.worker) return;

    if (event.type === WorkerEventTypes.Log) {
      this.logger[event.level](`[transcription worker] ${event.message}`);
      return;
    }

    const job = this.activeJob;

    if (job?.id !== event.jobId) return;

    switch (event.type) {
      case WorkerEventTypes.Stage:
        job.stage = event.stage;
        break;
      case WorkerEventTypes.ModelDownload:
        job.modelDownload = { loadedBytes: event.loadedBytes, totalBytes: event.totalBytes };
        break;
      case WorkerEventTypes.ModelLoaded:
        job.device = event.device;
        this.logger.info(`Transcription ${job.id} runs on ${event.device} (${event.dtype})`);
        break;
      case WorkerEventTypes.Language:
        job.language = event.language;
        job.languageProbability = event.probability;
        break;
      case WorkerEventTypes.Words:
        event.words.forEach((word) => job.words.push(word));
        job.progress = event.progress;
        break;
      case WorkerEventTypes.Completed:
        this.finishActiveJob({ status: TranscriptionStatus.Completed });
        break;
      case WorkerEventTypes.Canceled:
        this.finishActiveJob({ status: TranscriptionStatus.Canceled });
        break;
      case WorkerEventTypes.Failed:
        this.finishActiveJob({ status: TranscriptionStatus.Failed, error: event.message });
        break;
    }
  }

  private handleWorkerExit(props: { worker: WorkerProcess; reason: string }) {
    const { worker, reason } = props;

    if (worker !== this.worker) return;

    worker.removeAllListeners();
    this.worker = null;

    const job = this.activeJob;

    if (!job) return;

    const wasCanceled = !this.jobs.has(job.id);

    if (wasCanceled) return void this.finishActiveJob({ status: TranscriptionStatus.Canceled });

    this.logger.error(`The transcription worker stopped during transcription ${job.id} (${reason})`);
    this.finishActiveJob({
      status: TranscriptionStatus.Failed,
      error: `The transcription engine stopped unexpectedly (${reason})`,
    });
  }

  private finishActiveJob(props: FinishActiveJobProps) {
    const { status, error } = props;

    const job = this.activeJob;

    if (!job) return;

    job.status = status;
    job.stage = TranscriptionStage.Done;
    job.error = error ?? null;
    job.finishedAt = Date.now();
    if (status === TranscriptionStatus.Completed) job.progress = 1;

    const elapsedSec = ((job.finishedAt - (job.startedAt ?? job.finishedAt)) / 1000).toFixed(1);
    this.logger.info(`Transcription ${job.id} ${status} after ${elapsedSec}s (${job.words.length} words)`);

    this.activeJob = null;
    this.clearCancelTimer();
    void this.removeAudioFile(job);
    this.processNextJob();
  }

  private cancelActiveJob() {
    const job = this.activeJob;

    if (!job || !this.worker) return;

    this.worker.send({ type: WorkerRequestTypes.Cancel, jobId: job.id });

    // The worker only checks for cancellation between steps; a model download can take minutes.
    this.clearCancelTimer();
    this.cancelTimer = setTimeout(() => {
      if (this.activeJob !== job) return;

      this.logger.warn(`Transcription ${job.id} didn't stop in time, restarting the worker`);
      this.stopWorker();
    }, CANCEL_GRACE_PERIOD_MS);
    this.cancelTimer.unref();
  }

  private stopWorker() {
    const worker = this.worker;

    if (!worker) return;

    worker.kill();
    this.handleWorkerExit({ worker, reason: 'stopped' });
  }

  private startIdleTimer() {
    if (!this.worker || this.idleTimer) return;

    this.idleTimer = setTimeout(() => {
      this.idleTimer = null;

      if (this.activeJob) return;

      this.logger.info('Stopping the idle transcription worker to free memory');
      this.stopWorker();
    }, WORKER_IDLE_TIMEOUT_MS);
    this.idleTimer.unref();
  }

  private clearIdleTimer() {
    if (!this.idleTimer) return;

    clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }

  private clearCancelTimer() {
    if (!this.cancelTimer) return;

    clearTimeout(this.cancelTimer);
    this.cancelTimer = null;
  }

  private removeExpiredJobs() {
    const expiredBefore = Date.now() - this.config.jobTtlMs;

    this.jobs.forEach((job, jobId) => {
      const isExpired = job.finishedAt !== null && job.finishedAt < expiredBefore;

      if (isExpired) this.jobs.delete(jobId);
    });
  }

  private async removeAudioFile(job: TranscriptionJob) {
    try {
      await rm(job.audioPath, { force: true });
    } catch (error) {
      this.logger.warn(`Could not delete the audio of transcription ${job.id}`, { error });
    }
  }
}

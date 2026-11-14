import { rm } from 'fs/promises';
import { JobStatuses, WorkerJobQueue, type WorkerJobQueueLogger } from '@src/lib/worker-job-queue';
import {
  TranscriptionStage,
  TranscriptionWorkerEventTypes,
  TranscriptionWorkerRequestTypes,
  WHISPER_MODELS,
  type WhisperModelIdValues,
} from '../logic/constants';
import { resolveRuntimes } from '../logic/utils/resolveRuntimes';
import type { TranscriptionConfig } from '@src/plugins/config-service';
import type {
  TranscribeRequest,
  TranscriptionJob,
  TranscriptionProgressEvent,
  TranscriptionWorkerProcess,
} from '../types';

type TranscriptionJobsServiceProps = {
  config: TranscriptionConfig;
  logger: WorkerJobQueueLogger;
  /**
   * Starts the process that runs `transcription.worker`.
   */
  spawnWorker: () => TranscriptionWorkerProcess;
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

/**
 * Owns the transcription queue and the worker process that executes it.
 */
export class TranscriptionJobsService extends WorkerJobQueue<
  TranscriptionJob,
  TranscribeRequest,
  TranscriptionProgressEvent
> {
  private readonly config: TranscriptionConfig;

  constructor(props: TranscriptionJobsServiceProps) {
    const { config, logger, spawnWorker } = props;

    super({ jobLabel: 'transcription', logger, spawnWorker, jobTtlMs: config.jobTtlMs });

    this.config = config;
  }

  createJob(props: CreateJobProps): TranscriptionJob {
    const { id, audioPath, audioDurationSec, modelId, language } = props;

    const job: TranscriptionJob = {
      id,
      status: JobStatuses.Queued,
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

    this.enqueueJob(job);

    return job;
  }

  protected createStartRequest(job: TranscriptionJob): TranscribeRequest {
    const model = WHISPER_MODELS[job.modelId];
    const runtimes = resolveRuntimes({ runtimes: model.runtimes, device: this.config.device });

    this.logger.info(`Transcription ${job.id} started (model: ${job.modelId}, language: ${job.requestedLanguage})`);

    return {
      type: TranscriptionWorkerRequestTypes.Transcribe,
      task: {
        jobId: job.id,
        audioPath: job.audioPath,
        language: job.requestedLanguage,
        repo: model.repo,
        runtimes,
        modelsDir: this.config.modelsDir,
        allowRemoteModels: this.config.allowRemoteModels,
      },
    };
  }

  protected applyProgressEvent(props: { job: TranscriptionJob; event: TranscriptionProgressEvent }) {
    const { job, event } = props;

    switch (event.type) {
      case TranscriptionWorkerEventTypes.Stage:
        job.stage = event.stage;
        break;
      case TranscriptionWorkerEventTypes.ModelDownload:
        job.modelDownload = { loadedBytes: event.loadedBytes, totalBytes: event.totalBytes };
        break;
      case TranscriptionWorkerEventTypes.ModelLoaded:
        job.device = event.device;
        this.logger.info(`Transcription ${job.id} runs on ${event.device} (${event.dtype})`);
        break;
      case TranscriptionWorkerEventTypes.Language:
        job.language = event.language;
        job.languageProbability = event.probability;
        break;
      case TranscriptionWorkerEventTypes.Words:
        event.words.forEach((word) => job.words.push(word));
        job.progress = event.progress;
        break;
    }
  }

  protected onJobFinished(job: TranscriptionJob) {
    job.stage = TranscriptionStage.Done;

    if (job.status === JobStatuses.Completed) job.progress = 1;
  }

  protected describeFinishedJob(job: TranscriptionJob): string {
    return `${job.words.length} words`;
  }

  protected async releaseJob(job: TranscriptionJob): Promise<void> {
    try {
      await rm(job.audioPath, { force: true });
    } catch (error) {
      this.logger.warn(`Could not delete the audio of transcription ${job.id}`, { error });
    }
  }
}

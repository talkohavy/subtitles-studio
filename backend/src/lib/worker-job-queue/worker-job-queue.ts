import {
  CANCEL_GRACE_PERIOD_MS,
  EXPIRED_JOBS_SWEEP_INTERVAL_MS,
  FINISHED_JOB_STATUSES,
  JobStatuses,
  WORKER_IDLE_TIMEOUT_MS,
  WorkerJobEventTypes,
  WorkerJobRequestTypes,
  type JobStatusValues,
} from './logic/constants';
import type {
  WorkerCancelRequest,
  WorkerJob,
  WorkerJobQueueLogger,
  WorkerLifecycleEvent,
  WorkerProcess,
} from './types';

type ProgressEvent = { type: string; jobId: string };

type QueueWorker<TRequest, TEvent> = WorkerProcess<TRequest | WorkerCancelRequest, TEvent | WorkerLifecycleEvent>;

type JobEndEvent = Exclude<WorkerLifecycleEvent, { type: typeof WorkerJobEventTypes.Log }>;

type LogEvent = Extract<WorkerLifecycleEvent, { type: typeof WorkerJobEventTypes.Log }>;

export type WorkerJobQueueProps<TRequest, TEvent extends ProgressEvent> = {
  /**
   * Names the jobs in log and error messages, e.g. `transcription`.
   */
  jobLabel: string;
  logger: WorkerJobQueueLogger;
  /**
   * Starts the worker process: on the first job, and on the next job after it exits.
   */
  spawnWorker: () => QueueWorker<TRequest, TEvent>;
  /**
   * How long a finished job stays available.
   *
   * In milliseconds.
   */
  jobTtlMs: number;
};

type FinishActiveJobProps = {
  status: JobStatusValues;
  error?: string;
};

const JOB_END_EVENT_TYPES: ReadonlyArray<string> = [
  WorkerJobEventTypes.Completed,
  WorkerJobEventTypes.Canceled,
  WorkerJobEventTypes.Failed,
];

/**
 * Owns a job queue and the worker process that executes it, one job at a time (inference already uses every CPU
 * core, so parallel jobs would only slow each other down). Subclasses decide how a job starts on the worker and
 * how the worker's progress events apply to it.
 */
export abstract class WorkerJobQueue<TJob extends WorkerJob, TRequest, TEvent extends ProgressEvent> {
  protected readonly logger: WorkerJobQueueLogger;
  private readonly jobLabel: string;
  private readonly spawnWorker: () => QueueWorker<TRequest, TEvent>;
  private readonly jobTtlMs: number;
  private readonly jobs = new Map<string, TJob>();
  private readonly queue: Array<string> = [];
  private readonly sweepTimer: NodeJS.Timeout;
  private worker: QueueWorker<TRequest, TEvent> | null = null;
  /**
   * Stays set until the worker confirms the job ended, even when the job was deleted in the meantime.
   */
  private activeJob: TJob | null = null;
  private cancelTimer: NodeJS.Timeout | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  constructor(props: WorkerJobQueueProps<TRequest, TEvent>) {
    const { jobLabel, logger, spawnWorker, jobTtlMs } = props;

    this.jobLabel = jobLabel;
    this.logger = logger;
    this.spawnWorker = spawnWorker;
    this.jobTtlMs = jobTtlMs;

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

  getJob(jobId: string): TJob | undefined {
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
      void this.releaseJob(job);
    }

    if (this.activeJob?.id === jobId) this.cancelActiveJob();

    return true;
  }

  /**
   * Stops the worker and releases every job that hasn't finished.
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    clearInterval(this.sweepTimer);
    this.clearCancelTimer();
    this.clearIdleTimer();
    this.stopWorker();

    const pendingJobs = [...this.jobs.values()].filter((job) => !FINISHED_JOB_STATUSES.includes(job.status));
    const unreleasedJobs = this.activeJob ? [...pendingJobs, this.activeJob] : pendingJobs;

    await Promise.all(unreleasedJobs.map((job) => this.releaseJob(job)));
  }

  protected enqueueJob(job: TJob) {
    this.jobs.set(job.id, job);
    this.queue.push(job.id);
    this.processNextJob();
  }

  /**
   * The message that starts `job` on the worker.
   */
  protected abstract createStartRequest(job: TJob): TRequest;

  /**
   * Applies one of the worker's progress events to the job it's about.
   */
  protected abstract applyProgressEvent(props: { job: TJob; event: TEvent }): void;

  /**
   * Called when the job completed, failed or was canceled, right after its status is set.
   */
  protected onJobFinished(_job: TJob): void {}

  /**
   * Appended to the log line of a finished job, e.g. how much it produced.
   */
  protected describeFinishedJob(_job: TJob): string | null {
    return null;
  }

  /**
   * Frees what the job holds on to (e.g. an uploaded file) once it no longer runs: after it finishes, when it's
   * deleted before it started, or at shutdown.
   */
  protected async releaseJob(_job: TJob): Promise<void> {}

  private processNextJob() {
    if (this.activeJob || this.isShuttingDown) return;

    const nextJobId = this.queue.shift();

    if (!nextJobId) return void this.startIdleTimer();

    const job = this.jobs.get(nextJobId);

    if (!job) return void this.processNextJob();

    this.clearIdleTimer();

    const worker = this.getOrSpawnWorker();

    job.status = JobStatuses.Processing;
    job.startedAt = Date.now();
    this.activeJob = job;

    const startRequest = this.createStartRequest(job);
    worker.send(startRequest);
  }

  private getOrSpawnWorker(): QueueWorker<TRequest, TEvent> {
    if (this.worker?.connected) return this.worker;

    const worker = this.spawnWorker();

    worker.on('message', (event) => this.handleWorkerEvent({ worker, event }));
    worker.on('exit', (code, signal) => this.handleWorkerExit({ worker, reason: signal ?? `exit code ${code}` }));
    worker.on('error', (error) => {
      this.logger.error(`The ${this.jobLabel} worker failed`, { error });
      worker.kill();
      this.handleWorkerExit({ worker, reason: error.message });
    });

    this.worker = worker;

    return worker;
  }

  private handleWorkerEvent(props: { worker: QueueWorker<TRequest, TEvent>; event: TEvent | WorkerLifecycleEvent }) {
    const { worker, event } = props;

    if (worker !== this.worker) return;

    if (isLogEvent(event)) {
      this.logger[event.level](`[${this.jobLabel} worker] ${event.message}`);
      return;
    }

    const job = this.activeJob;

    if (job?.id !== event.jobId) return;

    if (isJobEndEvent(event)) return void this.handleJobEndEvent(event);

    this.applyProgressEvent({ job, event: event as TEvent });
  }

  private handleJobEndEvent(event: JobEndEvent) {
    switch (event.type) {
      case WorkerJobEventTypes.Completed:
        this.finishActiveJob({ status: JobStatuses.Completed });
        break;
      case WorkerJobEventTypes.Canceled:
        this.finishActiveJob({ status: JobStatuses.Canceled });
        break;
      case WorkerJobEventTypes.Failed:
        this.finishActiveJob({ status: JobStatuses.Failed, error: event.message });
        break;
    }
  }

  private handleWorkerExit(props: { worker: QueueWorker<TRequest, TEvent>; reason: string }) {
    const { worker, reason } = props;

    if (worker !== this.worker) return;

    worker.removeAllListeners();
    this.worker = null;

    const job = this.activeJob;

    if (!job) return;

    const wasCanceled = !this.jobs.has(job.id);

    if (wasCanceled) return void this.finishActiveJob({ status: JobStatuses.Canceled });

    this.logger.error(`The ${this.jobLabel} worker stopped during ${this.jobLabel} ${job.id} (${reason})`);
    this.finishActiveJob({
      status: JobStatuses.Failed,
      error: `The ${this.jobLabel} engine stopped unexpectedly (${reason})`,
    });
  }

  private finishActiveJob(props: FinishActiveJobProps) {
    const { status, error } = props;

    const job = this.activeJob;

    if (!job) return;

    job.status = status;
    job.error = error ?? null;
    job.finishedAt = Date.now();
    this.onJobFinished(job);

    const elapsedSec = ((job.finishedAt - (job.startedAt ?? job.finishedAt)) / 1000).toFixed(1);
    const description = this.describeFinishedJob(job);
    const details = description ? ` (${description})` : '';
    this.logger.info(`${capitalize(this.jobLabel)} ${job.id} ${status} after ${elapsedSec}s${details}`);

    this.activeJob = null;
    this.clearCancelTimer();
    void this.releaseJob(job);
    this.processNextJob();
  }

  private cancelActiveJob() {
    const job = this.activeJob;

    if (!job || !this.worker) return;

    this.worker.send({ type: WorkerJobRequestTypes.Cancel, jobId: job.id });

    // The worker only checks for cancellation between steps; a model download can take minutes.
    this.clearCancelTimer();
    this.cancelTimer = setTimeout(() => {
      if (this.activeJob !== job) return;

      this.logger.warn(`${capitalize(this.jobLabel)} ${job.id} didn't stop in time, restarting the worker`);
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

      this.logger.info(`Stopping the idle ${this.jobLabel} worker to free memory`);
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
    const expiredBefore = Date.now() - this.jobTtlMs;

    this.jobs.forEach((job, jobId) => {
      const isExpired = job.finishedAt !== null && job.finishedAt < expiredBefore;

      if (isExpired) this.jobs.delete(jobId);
    });
  }
}

function isLogEvent(event: { type: string }): event is LogEvent {
  return event.type === WorkerJobEventTypes.Log;
}

function isJobEndEvent(event: { type: string }): event is JobEndEvent {
  return JOB_END_EVENT_TYPES.includes(event.type);
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const JobStatuses = {
  Queued: 'queued',
  Processing: 'processing',
  Completed: 'completed',
  Failed: 'failed',
  Canceled: 'canceled',
} as const;

type TypeOfJobStatuses = typeof JobStatuses;
export type JobStatusKeys = keyof TypeOfJobStatuses;
export type JobStatusValues = TypeOfJobStatuses[JobStatusKeys];

export const FINISHED_JOB_STATUSES: ReadonlyArray<JobStatusValues> = [
  JobStatuses.Completed,
  JobStatuses.Failed,
  JobStatuses.Canceled,
];

/**
 * Requests every worker understands, besides the one that starts its kind of job.
 */
export const WorkerJobRequestTypes = {
  Cancel: 'cancel',
} as const;

/**
 * Events every worker sends, besides its own progress events.
 */
export const WorkerJobEventTypes = {
  Completed: 'completed',
  Canceled: 'canceled',
  Failed: 'failed',
  Log: 'log',
} as const;

/**
 * How long a canceled job may keep the worker busy before the worker is killed.
 *
 * In milliseconds.
 */
export const CANCEL_GRACE_PERIOD_MS = 15_000;

/**
 * An idle worker is stopped to release its model's memory (often more than 1GB). It restarts on the next job.
 *
 * In milliseconds.
 */
export const WORKER_IDLE_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * In milliseconds.
 */
export const EXPIRED_JOBS_SWEEP_INTERVAL_MS = 60 * 1000;

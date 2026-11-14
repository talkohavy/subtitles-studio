/**
 * The statuses of server-side jobs: transcriptions and translations.
 */
export const JobStatuses = {
  Queued: 'queued',
  Processing: 'processing',
  Completed: 'completed',
  Failed: 'failed',
  Canceled: 'canceled',
} as const;

export type JobStatusValues = (typeof JobStatuses)[keyof typeof JobStatuses];

export type ModelDownloadProgress = {
  loadedBytes: number;
  totalBytes: number;
};

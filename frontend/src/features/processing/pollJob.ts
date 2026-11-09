import { sleep } from '@src/common/utils/sleep';
import { ApiError } from '@src/lib/api/api-error';
import { JobStatuses, type JobStatusValues } from '@src/lib/api/types';

const POLL_INTERVAL_MS = 750;
const MAX_CONSECUTIVE_POLL_ERRORS = 5;

type PolledJob = {
  status: JobStatusValues;
  error: string | null;
};

type PollJobProps<TJob extends PolledJob> = {
  job: TJob;
  fetchJob: () => Promise<TJob>;
  /**
   * Called with `job`, then with every update fetched.
   */
  onUpdate: (job: TJob) => void;
  /**
   * Names the job in error messages, e.g. "transcription".
   */
  jobLabel: string;
  signal: AbortSignal;
};

/**
 * Polls a server-side job until it completes. Network hiccups are retried a few times.
 *
 * @throws when the job fails or is canceled, or the server stops answering.
 */
export async function pollJob<TJob extends PolledJob>(props: PollJobProps<TJob>): Promise<TJob> {
  const { job: initialJob, fetchJob, onUpdate, jobLabel, signal } = props;

  let job = initialJob;
  let consecutiveErrors = 0;

  onUpdate(job);

  while (job.status !== JobStatuses.Completed) {
    if (job.status === JobStatuses.Failed) throw new Error(job.error ?? `The ${jobLabel} failed.`);

    if (job.status === JobStatuses.Canceled) throw new Error(`The ${jobLabel} was canceled.`);

    await sleep({ ms: POLL_INTERVAL_MS, signal });

    try {
      job = await fetchJob();
      consecutiveErrors = 0;
      onUpdate(job);
    } catch (error) {
      signal.throwIfAborted();

      if (error instanceof ApiError && error.status === 404) {
        throw new Error(`The server lost track of this ${jobLabel} (it may have restarted). Try again.`);
      }

      consecutiveErrors += 1;

      if (consecutiveErrors >= MAX_CONSECUTIVE_POLL_ERRORS) throw error;
    }
  }

  return job;
}

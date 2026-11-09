import type { ILogger, LogLevelValues } from '@src/lib/logger';
import type { JobStatusValues, WorkerJobEventTypes, WorkerJobRequestTypes } from './logic/constants';

/**
 * The fields the queue manages; each kind of job adds its own.
 */
export type WorkerJob = {
  id: string;
  status: JobStatusValues;
  error: string | null;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
};

export type WorkerCancelRequest = { type: typeof WorkerJobRequestTypes.Cancel; jobId: string };

/**
 * The events that end a job, plus log lines (which belong to no job).
 */
export type WorkerLifecycleEvent =
  | { type: typeof WorkerJobEventTypes.Completed; jobId: string }
  | { type: typeof WorkerJobEventTypes.Canceled; jobId: string }
  | { type: typeof WorkerJobEventTypes.Failed; jobId: string; message: string }
  | { type: typeof WorkerJobEventTypes.Log; level: LogLevelValues; message: string };

/**
 * The slice of a `ChildProcess` the queue depends on (lets tests use a fake worker).
 */
export type WorkerProcess<TRequest, TEvent> = {
  send: (message: TRequest) => boolean;
  kill: (signal?: NodeJS.Signals) => boolean;
  on(event: 'message', listener: (message: TEvent) => void): unknown;
  on(event: 'exit', listener: (code: number | null, signal: NodeJS.Signals | null) => void): unknown;
  on(event: 'error', listener: (error: Error) => void): unknown;
  removeAllListeners: () => unknown;
  readonly connected: boolean;
};

export type WorkerJobQueueLogger = Pick<ILogger, 'debug' | 'info' | 'warn' | 'error' | 'fatal'>;

import type { LogLevelValues } from '@src/lib/logger';
import type {
  TranscriptionStageValues,
  TranscriptionStatusValues,
  WhisperDtypeValues,
  WhisperModelIdValues,
  WhisperRuntimeDeviceValues,
  WorkerEventTypes,
  WorkerRequestTypes,
} from './logic/constants';

export type WhisperRuntime = {
  device: WhisperRuntimeDeviceValues;
  dtype: WhisperDtypeValues;
  /**
   * Encoder + decoder download size.
   */
  approximateSizeMb: number;
};

export type WhisperModelDefinition = {
  id: WhisperModelIdValues;
  name: string;
  description: string;
  /**
   * Hugging Face repository.
   */
  repo: string;
  runtimes: Array<WhisperRuntime>;
};

export type TranscribedWord = {
  /**
   * Keeps its leading space when a space separates it from the previous word, so joining all words with `''`
   * restores the transcript (CJK text has no spaces, and punctuation can arrive as a separate word).
   */
  text: string;
  /**
   * In seconds, from the start of the audio.
   */
  start: number;
  /**
   * In seconds, from the start of the audio.
   */
  end: number;
};

export type ModelDownloadProgress = {
  loadedBytes: number;
  totalBytes: number;
};

export type TranscriptionJob = {
  id: string;
  status: TranscriptionStatusValues;
  stage: TranscriptionStageValues;
  modelId: WhisperModelIdValues;
  /**
   * A language code, or `auto`.
   */
  requestedLanguage: string;
  /**
   * The requested language, or the detected one once detection finished.
   */
  language: string | null;
  /**
   * Only set when the language was auto-detected.
   */
  languageProbability: number | null;
  device: WhisperRuntimeDeviceValues | null;
  audioPath: string;
  audioDurationSec: number;
  /**
   * Between 0 and 1.
   */
  progress: number;
  modelDownload: ModelDownloadProgress | null;
  words: Array<TranscribedWord>;
  error: string | null;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
};

export type TranscriptionJobDto = Omit<TranscriptionJob, 'audioPath' | 'words'> & {
  /**
   * Position among the jobs waiting for the worker (1 = next). `null` once processing started.
   */
  queuePosition: number | null;
  /**
   * The words from index `wordsFrom` onward, so pollers only fetch what's new.
   */
  words: Array<TranscribedWord>;
  wordsFrom: number;
  wordsTotal: number;
};

export type TranscriptionModelDto = {
  id: WhisperModelIdValues;
  name: string;
  description: string;
  approximateSizeMb: number;
  isDownloaded: boolean;
};

export type TranscriptionOptionsDto = {
  defaultModelId: WhisperModelIdValues;
  maxUploadBytes: number;
  models: Array<TranscriptionModelDto>;
  /**
   * The language codes a transcription can be requested in, besides `auto`.
   */
  languages: ReadonlyArray<string>;
};

export type TranscribeTask = {
  jobId: string;
  audioPath: string;
  /**
   * A language code, or `auto`.
   */
  language: string;
  repo: string;
  runtimes: Array<WhisperRuntime>;
  modelsDir: string;
  allowRemoteModels: boolean;
};

export type WorkerRequest =
  | { type: typeof WorkerRequestTypes.Transcribe; task: TranscribeTask }
  | { type: typeof WorkerRequestTypes.Cancel; jobId: string };

export type WorkerEvent =
  | { type: typeof WorkerEventTypes.Stage; jobId: string; stage: TranscriptionStageValues }
  | { type: typeof WorkerEventTypes.ModelDownload; jobId: string; loadedBytes: number; totalBytes: number }
  | {
      type: typeof WorkerEventTypes.ModelLoaded;
      jobId: string;
      device: WhisperRuntimeDeviceValues;
      dtype: WhisperDtypeValues;
    }
  | { type: typeof WorkerEventTypes.Language; jobId: string; language: string; probability: number | null }
  | { type: typeof WorkerEventTypes.Words; jobId: string; words: Array<TranscribedWord>; progress: number }
  | { type: typeof WorkerEventTypes.Completed; jobId: string }
  | { type: typeof WorkerEventTypes.Canceled; jobId: string }
  | { type: typeof WorkerEventTypes.Failed; jobId: string; message: string }
  | { type: typeof WorkerEventTypes.Log; level: LogLevelValues; message: string };

/**
 * The slice of a `ChildProcess` the jobs service depends on (lets tests use a fake worker).
 */
export type WorkerProcess = {
  send: (message: WorkerRequest) => boolean;
  kill: (signal?: NodeJS.Signals) => boolean;
  on(event: 'message', listener: (message: WorkerEvent) => void): unknown;
  on(event: 'exit', listener: (code: number | null, signal: NodeJS.Signals | null) => void): unknown;
  on(event: 'error', listener: (error: Error) => void): unknown;
  removeAllListeners: () => unknown;
  readonly connected: boolean;
};

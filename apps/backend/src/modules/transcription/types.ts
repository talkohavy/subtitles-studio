import type { ModelDownloadProgress } from '@src/common/types';
import type { WorkerCancelRequest, WorkerJob, WorkerLifecycleEvent, WorkerProcess } from '@src/lib/worker-job-queue';
import type {
  TranscriptionStageValues,
  TranscriptionWorkerEventTypes,
  TranscriptionWorkerRequestTypes,
  WhisperDtypeValues,
  WhisperModelIdValues,
  WhisperRuntimeDeviceValues,
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

export type TranscriptionJob = WorkerJob & {
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

export type TranscribeRequest = { type: typeof TranscriptionWorkerRequestTypes.Transcribe; task: TranscribeTask };

export type TranscriptionWorkerRequest = TranscribeRequest | WorkerCancelRequest;

export type TranscriptionProgressEvent =
  | { type: typeof TranscriptionWorkerEventTypes.Stage; jobId: string; stage: TranscriptionStageValues }
  | { type: typeof TranscriptionWorkerEventTypes.ModelDownload; jobId: string; loadedBytes: number; totalBytes: number }
  | {
      type: typeof TranscriptionWorkerEventTypes.ModelLoaded;
      jobId: string;
      device: WhisperRuntimeDeviceValues;
      dtype: WhisperDtypeValues;
    }
  | {
      type: typeof TranscriptionWorkerEventTypes.Language;
      jobId: string;
      language: string;
      probability: number | null;
    }
  | {
      type: typeof TranscriptionWorkerEventTypes.Words;
      jobId: string;
      words: Array<TranscribedWord>;
      progress: number;
    };

export type TranscriptionWorkerEvent = TranscriptionProgressEvent | WorkerLifecycleEvent;

export type TranscriptionWorkerProcess = WorkerProcess<TranscriptionWorkerRequest, TranscriptionWorkerEvent>;

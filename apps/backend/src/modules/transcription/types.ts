import type { ModelDownloadProgress, TranscribedWord, TranscriptionStageValues } from '@subtitles-studio/shared';
import type { WorkerCancelRequest, WorkerJob, WorkerLifecycleEvent, WorkerProcess } from '@src/lib/worker-job-queue';
import type {
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

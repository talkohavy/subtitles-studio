import type { ModelDownloadProgress, TranslationStageValues } from '@subtitles-studio/shared';
import type { WorkerCancelRequest, WorkerJob, WorkerLifecycleEvent, WorkerProcess } from '@src/lib/worker-job-queue';
import type { TranslationWorkerEventTypes, TranslationWorkerRequestTypes } from './logic/constants';

export type TranslationModelDefinition = {
  name: string;
  /**
   * Hugging Face repository.
   */
  repo: string;
  approximateSizeMb: number;
  /**
   * What transformers.js downloads, relative to the repository.
   */
  files: ReadonlyArray<string>;
};

export type TranslationJob = WorkerJob & {
  stage: TranslationStageValues;
  /**
   * A key of `NLLB_LANGUAGE_CODES`.
   */
  sourceLanguage: string;
  /**
   * A key of `NLLB_LANGUAGE_CODES`.
   */
  targetLanguage: string;
  texts: Array<string>;
  /**
   * One per text, in order. Grows as the worker translates.
   */
  translations: Array<string>;
  /**
   * Between 0 and 1.
   */
  progress: number;
  modelDownload: ModelDownloadProgress | null;
};

export type TranslateTask = {
  jobId: string;
  texts: Array<string>;
  /**
   * A FLORES-200 code, e.g. `eng_Latn`.
   */
  sourceLanguage: string;
  /**
   * A FLORES-200 code, e.g. `heb_Hebr`.
   */
  targetLanguage: string;
  repo: string;
  approximateSizeMb: number;
  modelsDir: string;
  allowRemoteModels: boolean;
};

export type TranslateRequest = { type: typeof TranslationWorkerRequestTypes.Translate; task: TranslateTask };

export type TranslationWorkerRequest = TranslateRequest | WorkerCancelRequest;

export type TranslationProgressEvent =
  | { type: typeof TranslationWorkerEventTypes.Stage; jobId: string; stage: TranslationStageValues }
  | { type: typeof TranslationWorkerEventTypes.ModelDownload; jobId: string; loadedBytes: number; totalBytes: number }
  | { type: typeof TranslationWorkerEventTypes.Translations; jobId: string; translations: Array<string> };

export type TranslationWorkerEvent = TranslationProgressEvent | WorkerLifecycleEvent;

export type TranslationWorkerProcess = WorkerProcess<TranslationWorkerRequest, TranslationWorkerEvent>;

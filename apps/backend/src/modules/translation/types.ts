import type { ModelDownloadProgress } from '@src/common/types';
import type { WorkerCancelRequest, WorkerJob, WorkerLifecycleEvent, WorkerProcess } from '@src/lib/worker-job-queue';
import type {
  TranslationStageValues,
  TranslationWorkerEventTypes,
  TranslationWorkerRequestTypes,
} from './logic/constants';

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

export type TranslationJobDto = Omit<TranslationJob, 'texts' | 'translations'> & {
  /**
   * Position among the jobs waiting for the worker (1 = next). `null` once processing started.
   */
  queuePosition: number | null;
  textsTotal: number;
  translatedCount: number;
  /**
   * The translations from index `translationsFrom` onward (one per text, in order), so pollers only fetch what's new.
   */
  translations: Array<string>;
  translationsFrom: number;
};

export type TranslationOptionsDto = {
  model: {
    name: string;
    approximateSizeMb: number;
    isDownloaded: boolean;
  };
  /**
   * The language codes a translation can be requested from and to.
   */
  languages: ReadonlyArray<string>;
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

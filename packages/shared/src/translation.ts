import type { JobStatusValues, ModelDownloadProgress } from './jobs';

export const TranslationStages = {
  Waiting: 'waiting',
  LoadingModel: 'loading-model',
  Translating: 'translating',
  Done: 'done',
} as const;

export type TranslationStageValues = (typeof TranslationStages)[keyof typeof TranslationStages];

export type TranslationJobDto = {
  id: string;
  status: JobStatusValues;
  stage: TranslationStageValues;
  /**
   * A language code, as listed in `TranslationOptionsDto.languages`.
   */
  sourceLanguage: string;
  /**
   * A language code, as listed in `TranslationOptionsDto.languages`.
   */
  targetLanguage: string;
  /**
   * Between 0 and 1.
   */
  progress: number;
  modelDownload: ModelDownloadProgress | null;
  error: string | null;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
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

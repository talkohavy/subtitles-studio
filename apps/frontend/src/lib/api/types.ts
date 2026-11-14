import type { Word } from '@src/lib/subtitles/types';

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

export const TranscriptionStages = {
  Waiting: 'waiting',
  LoadingModel: 'loading-model',
  DetectingLanguage: 'detecting-language',
  Transcribing: 'transcribing',
  Done: 'done',
} as const;

export type TranscriptionStageValues = (typeof TranscriptionStages)[keyof typeof TranscriptionStages];

export const AUTO_DETECT_LANGUAGE = 'auto';

export type ModelDownloadProgress = {
  loadedBytes: number;
  totalBytes: number;
};

/**
 * Mirrors the backend's `TranscriptionJobDto`.
 */
export type TranscriptionJob = {
  id: string;
  status: JobStatusValues;
  stage: TranscriptionStageValues;
  modelId: string;
  requestedLanguage: string;
  /**
   * The requested language, or the detected one once detection finished.
   */
  language: string | null;
  /**
   * Only set when the language was auto-detected.
   */
  languageProbability: number | null;
  device: string | null;
  audioDurationSec: number;
  /**
   * From 0 to 1.
   */
  progress: number;
  modelDownload: ModelDownloadProgress | null;
  error: string | null;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  /**
   * Position in the queue (1 = next), or `null` once processing started.
   */
  queuePosition: number | null;
  /**
   * The words from index `wordsFrom` onward. Times are seconds from the start of the uploaded audio.
   */
  words: Array<Word>;
  wordsFrom: number;
  wordsTotal: number;
};

export type TranscriptionModel = {
  id: string;
  name: string;
  description: string;
  approximateSizeMb: number;
  isDownloaded: boolean;
};

export type TranscriptionOptions = {
  defaultModelId: string;
  maxUploadBytes: number;
  models: Array<TranscriptionModel>;
  /**
   * Language codes, besides `auto`.
   */
  languages: Array<string>;
};

export const TranslationStages = {
  Waiting: 'waiting',
  LoadingModel: 'loading-model',
  Translating: 'translating',
  Done: 'done',
} as const;

export type TranslationStageValues = (typeof TranslationStages)[keyof typeof TranslationStages];

/**
 * Mirrors the backend's `TranslationJobDto`.
 */
export type TranslationJob = {
  id: string;
  status: JobStatusValues;
  stage: TranslationStageValues;
  sourceLanguage: string;
  targetLanguage: string;
  /**
   * From 0 to 1.
   */
  progress: number;
  modelDownload: ModelDownloadProgress | null;
  error: string | null;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  /**
   * Position in the queue (1 = next), or `null` once processing started.
   */
  queuePosition: number | null;
  textsTotal: number;
  translatedCount: number;
  /**
   * The translations from index `translationsFrom` onward, one per text sent.
   */
  translations: Array<string>;
  translationsFrom: number;
};

export type TranslationOptions = {
  model: {
    name: string;
    approximateSizeMb: number;
    isDownloaded: boolean;
  };
  /**
   * The language codes subtitles can be translated from and to.
   */
  languages: Array<string>;
};

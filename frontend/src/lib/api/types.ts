import type { Word } from '@src/lib/subtitles/types';

export const TranscriptionStatuses = {
  Queued: 'queued',
  Processing: 'processing',
  Completed: 'completed',
  Failed: 'failed',
  Canceled: 'canceled',
} as const;

export type TranscriptionStatusValues = (typeof TranscriptionStatuses)[keyof typeof TranscriptionStatuses];

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
  status: TranscriptionStatusValues;
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

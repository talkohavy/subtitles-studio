import type { JobStatusValues, ModelDownloadProgress } from './jobs';

export const TranscriptionStages = {
  Waiting: 'waiting',
  LoadingModel: 'loading-model',
  DetectingLanguage: 'detecting-language',
  Transcribing: 'transcribing',
  Done: 'done',
} as const;

export type TranscriptionStageValues = (typeof TranscriptionStages)[keyof typeof TranscriptionStages];

/**
 * Requests the language to be detected from the audio, instead of naming one.
 */
export const AUTO_DETECT_LANGUAGE = 'auto';

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

export type TranscriptionJobDto = {
  id: string;
  status: JobStatusValues;
  stage: TranscriptionStageValues;
  modelId: string;
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
  device: string | null;
  audioDurationSec: number;
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
  /**
   * The words from index `wordsFrom` onward, so pollers only fetch what's new.
   */
  words: Array<TranscribedWord>;
  wordsFrom: number;
  wordsTotal: number;
};

export type TranscriptionModelDto = {
  id: string;
  name: string;
  description: string;
  approximateSizeMb: number;
  isDownloaded: boolean;
};

export type TranscriptionOptionsDto = {
  defaultModelId: string;
  maxUploadBytes: number;
  models: Array<TranscriptionModelDto>;
  /**
   * The language codes a transcription can be requested in, besides `auto`.
   */
  languages: ReadonlyArray<string>;
};

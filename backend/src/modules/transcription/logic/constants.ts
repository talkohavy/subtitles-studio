import type { WhisperModelDefinition } from '../types';

export const WhisperModelIds = {
  Base: 'base',
  Small: 'small',
  LargeV3Turbo: 'large-v3-turbo',
} as const;

type TypeOfWhisperModelIds = typeof WhisperModelIds;
export type WhisperModelIdKeys = keyof TypeOfWhisperModelIds;
export type WhisperModelIdValues = TypeOfWhisperModelIds[WhisperModelIdKeys];

export const WhisperDevice = {
  Auto: 'auto',
  Cpu: 'cpu',
  WebGpu: 'webgpu',
} as const;

type TypeOfWhisperDevice = typeof WhisperDevice;
export type WhisperDeviceKeys = keyof TypeOfWhisperDevice;
export type WhisperDeviceValues = TypeOfWhisperDevice[WhisperDeviceKeys];

/**
 * A device the model actually runs on (`auto` is only a preference).
 */
export type WhisperRuntimeDeviceValues = Exclude<WhisperDeviceValues, typeof WhisperDevice.Auto>;

export const WhisperDtype = {
  Q8: 'q8',
  Q4: 'q4',
  Q4F16: 'q4f16',
  Fp16: 'fp16',
  Fp32: 'fp32',
} as const;

type TypeOfWhisperDtype = typeof WhisperDtype;
export type WhisperDtypeKeys = keyof TypeOfWhisperDtype;
export type WhisperDtypeValues = TypeOfWhisperDtype[WhisperDtypeKeys];

/**
 * The file-name suffix transformers.js uses for each dtype, i.e. `onnx/encoder_model_quantized.onnx`.
 */
export const DTYPE_TO_FILE_SUFFIX: Record<WhisperDtypeValues, string> = {
  [WhisperDtype.Q8]: '_quantized',
  [WhisperDtype.Q4]: '_q4',
  [WhisperDtype.Q4F16]: '_q4f16',
  [WhisperDtype.Fp16]: '_fp16',
  [WhisperDtype.Fp32]: '',
};

/**
 * The `_timestamped` exports include the cross-attention outputs needed for word-level timestamps.
 *
 * `runtimes` are tried in order (subject to the `WHISPER_DEVICE` preference); the first that loads is used.
 * Measured on an Apple Silicon laptop, per 30 seconds of speech: base ≈ 2s, small ≈ 4s, large-v3-turbo ≈ 6s on the
 * GPU and ≈ 18s on the CPU.
 */
export const WHISPER_MODELS: Record<WhisperModelIdValues, WhisperModelDefinition> = {
  [WhisperModelIds.Base]: {
    id: WhisperModelIds.Base,
    name: 'Fast',
    description: 'Quickest, smallest download. Good for clear English speech.',
    repo: 'onnx-community/whisper-base_timestamped',
    runtimes: [{ device: WhisperDevice.Cpu, dtype: WhisperDtype.Q8, approximateSizeMb: 76 }],
  },
  [WhisperModelIds.Small]: {
    id: WhisperModelIds.Small,
    name: 'Balanced',
    description: 'Accurate for most languages and still fast on a CPU.',
    repo: 'onnx-community/whisper-small_timestamped',
    runtimes: [
      { device: WhisperDevice.Cpu, dtype: WhisperDtype.Q8, approximateSizeMb: 263 },
      { device: WhisperDevice.WebGpu, dtype: WhisperDtype.Fp16, approximateSizeMb: 482 },
    ],
  },
  [WhisperModelIds.LargeV3Turbo]: {
    id: WhisperModelIds.LargeV3Turbo,
    name: 'Most accurate',
    description:
      'Whisper large-v3 turbo. Best quality, especially for non-English speech. Uses the GPU when available.',
    repo: 'onnx-community/whisper-large-v3-turbo_timestamped',
    runtimes: [
      { device: WhisperDevice.WebGpu, dtype: WhisperDtype.Q4F16, approximateSizeMb: 574 },
      { device: WhisperDevice.Cpu, dtype: WhisperDtype.Q4, approximateSizeMb: 754 },
    ],
  },
};

export const AUTO_DETECT_LANGUAGE = 'auto';

/**
 * Every language Whisper was trained on (ISO 639-1 where one exists). `yue` (Cantonese) needs a large-v3 model.
 */
// prettier-ignore
// biome-ignore format: one language per line would make this list 100 lines long
export const WHISPER_LANGUAGE_CODES = [
  'en', 'zh', 'de', 'es', 'ru', 'ko', 'fr', 'ja', 'pt', 'tr', 'pl', 'ca', 'nl', 'ar', 'sv', 'it', 'id', 'hi', 'fi',
  'vi', 'he', 'uk', 'el', 'ms', 'cs', 'ro', 'da', 'hu', 'ta', 'no', 'th', 'ur', 'hr', 'bg', 'lt', 'la', 'mi', 'ml',
  'cy', 'sk', 'te', 'fa', 'lv', 'bn', 'sr', 'az', 'sl', 'kn', 'et', 'mk', 'br', 'eu', 'is', 'hy', 'ne', 'mn', 'bs',
  'kk', 'sq', 'sw', 'gl', 'mr', 'pa', 'si', 'km', 'sn', 'yo', 'so', 'af', 'oc', 'ka', 'be', 'tg', 'sd', 'gu', 'am',
  'yi', 'lo', 'uz', 'fo', 'ht', 'ps', 'tk', 'nn', 'mt', 'sa', 'lb', 'my', 'bo', 'tl', 'mg', 'as', 'tt', 'haw', 'ln',
  'ha', 'ba', 'jw', 'su', 'yue',
] as const;

export const TranscriptionStage = {
  Waiting: 'waiting',
  LoadingModel: 'loading-model',
  DetectingLanguage: 'detecting-language',
  Transcribing: 'transcribing',
  Done: 'done',
} as const;

type TypeOfTranscriptionStage = typeof TranscriptionStage;
export type TranscriptionStageKeys = keyof TypeOfTranscriptionStage;
export type TranscriptionStageValues = TypeOfTranscriptionStage[TranscriptionStageKeys];

/**
 * Besides the requests every worker understands (see `WorkerJobRequestTypes`).
 */
export const TranscriptionWorkerRequestTypes = {
  Transcribe: 'transcribe',
} as const;

/**
 * Progress events, besides the events every worker sends (see `WorkerJobEventTypes`).
 */
export const TranscriptionWorkerEventTypes = {
  Stage: 'stage',
  ModelDownload: 'model-download',
  ModelLoaded: 'model-loaded',
  Language: 'language',
  Words: 'words',
} as const;

export const WHISPER_SAMPLE_RATE = 16_000;

export const ACCEPTED_AUDIO_CONTENT_TYPES = [
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/vnd.wave',
  'application/octet-stream',
];

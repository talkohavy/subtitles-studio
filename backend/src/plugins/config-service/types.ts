import type { EnvironmentValues } from '@src/common/constants';
import type { LoggerSettings, LogLevelValues } from '@src/lib/logger';
import type { WhisperDeviceValues, WhisperModelIdValues } from '@src/modules/transcription/logic/constants';

export type LoggerServiceSettings = LoggerSettings & {
  /**
   * Used to identify the service in the logs.
   * @default 'subtitles-backend'
   */
  serviceName?: string;
  /**
   * Used for filtering logs by environment.
   *
   * Examples: 'dev', 'qa', 'prod', 'stg', etc.
   * @default 'dev'
   */
  logEnv?: EnvironmentValues;
};

export type CorsConfig = {
  /**
   * Origins allowed to call the API from a browser. Requests without an `Origin` header always pass.
   */
  allowedOrigins: Array<string>;
};

export type TranscriptionConfig = {
  /**
   * Absolute path. Whisper models are downloaded here once, then loaded from disk.
   */
  modelsDir: string;
  /**
   * Absolute path. Uploaded audio tracks live here only until their transcription ends.
   */
  uploadsDir: string;
  maxUploadBytes: number;
  defaultModelId: WhisperModelIdValues;
  device: WhisperDeviceValues;
  /**
   * When false, only models already present in `modelsDir` can be used.
   */
  allowRemoteModels: boolean;
  /**
   * How long a finished transcription stays available for polling.
   *
   * In milliseconds.
   */
  jobTtlMs: number;
  maxQueuedJobs: number;
};

export type StaticFrontendConfig = {
  /**
   * Absolute path to the built frontend. Served (with an SPA fallback) only when the directory exists.
   */
  distDir: string;
};

export type ValidEnv = {
  PORT: number;
  /**
   * Used to identify the service in the logs.
   * @default 'subtitles-backend'
   */
  SERVICE_NAME: string;
  LOG_LEVEL: LogLevelValues;
  /**
   * Used for filtering logs by environment.
   *
   * Examples: 'dev', 'qa', 'prod', 'stg', etc.
   * @default 'dev'
   */
  LOG_ENV: EnvironmentValues;
  /**
   * Whether to use pretty print output in the logs.
   * @default false
   */
  USE_PRETTY_PRINT: boolean;
  /**
   * Comma separated list of origins.
   * @default 'http://localhost:3004'
   */
  CORS_ALLOWED_ORIGINS: string;
  /**
   * Relative paths are resolved against the current working directory.
   * @default './storage'
   */
  STORAGE_DIR: string;
  /**
   * @default 512
   */
  MAX_UPLOAD_MB: number;
  /**
   * @default 'small'
   */
  DEFAULT_WHISPER_MODEL: WhisperModelIdValues;
  /**
   * `auto` tries the GPU (WebGPU) first for models that benefit from it, and falls back to the CPU.
   * @default 'auto'
   */
  WHISPER_DEVICE: WhisperDeviceValues;
  /**
   * @default true
   */
  ALLOW_REMOTE_MODELS: boolean;
  /**
   * @default 60
   */
  JOB_TTL_MINUTES: number;
  /**
   * Relative paths are resolved against the current working directory.
   * @default '../frontend/dist'
   */
  FRONTEND_DIST_DIR: string;
};

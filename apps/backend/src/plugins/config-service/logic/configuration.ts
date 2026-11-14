import path from 'path';
import { validateEnvVariables } from './utils/validateEnvVariables';
import type { Config } from './constants';

const MAX_QUEUED_JOBS = 20;
const BYTES_IN_MB = 1024 * 1024;

export function configuration(): Config {
  const env = validateEnvVariables();

  const storageDir = path.resolve(process.cwd(), env.STORAGE_DIR);
  const modelsDir = path.join(storageDir, 'models');
  const jobTtlMs = env.JOB_TTL_MINUTES * 60 * 1000;

  return {
    port: env.PORT,
    cors: {
      allowedOrigins: parseCommaSeparatedList(env.CORS_ALLOWED_ORIGINS),
    },
    logSettings: {
      serviceName: env.SERVICE_NAME,
      logLevel: env.LOG_LEVEL,
      logEnv: env.LOG_ENV,
      usePrettyPrint: env.USE_PRETTY_PRINT,
    },
    transcription: {
      modelsDir,
      uploadsDir: path.join(storageDir, 'uploads'),
      maxUploadBytes: env.MAX_UPLOAD_MB * BYTES_IN_MB,
      defaultModelId: env.DEFAULT_WHISPER_MODEL,
      device: env.WHISPER_DEVICE,
      allowRemoteModels: env.ALLOW_REMOTE_MODELS,
      jobTtlMs,
      maxQueuedJobs: MAX_QUEUED_JOBS,
    },
    translation: {
      modelsDir,
      allowRemoteModels: env.ALLOW_REMOTE_MODELS,
      jobTtlMs,
      maxQueuedJobs: MAX_QUEUED_JOBS,
    },
    staticFrontend: {
      distDir: path.resolve(process.cwd(), env.FRONTEND_DIST_DIR),
    },
  };
}

function parseCommaSeparatedList(value: string): Array<string> {
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return items;
}

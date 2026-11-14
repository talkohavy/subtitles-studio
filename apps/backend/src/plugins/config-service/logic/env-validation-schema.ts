import Joi from 'joi';
import { Environment } from '@src/common/constants';
import { LogLevel } from '@src/lib/logger';
import { WhisperDevice, WhisperModelIds } from '@src/modules/transcription/logic/constants';
import type { ValidEnv } from '../types';

const logLevelValues = Object.values(LogLevel);
const whisperModelIdValues = Object.values(WhisperModelIds);
const whisperDeviceValues = Object.values(WhisperDevice);

export const envSchema = Joi.object<ValidEnv>({
  // Optional environment variables
  PORT: Joi.number().port().default(8000).messages({
    'number.base': '"PORT" must be a valid number',
    'number.port': '"PORT" must be a valid port (0-65535)',
  }),
  SERVICE_NAME: Joi.string().default('subtitles-backend'),
  LOG_LEVEL: Joi.string()
    .valid(...logLevelValues)
    .default(LogLevel.Info)
    .messages({
      'any.only': `"LOG_LEVEL" must be one of [${logLevelValues.join(', ')}]`,
    }),
  LOG_ENV: Joi.string()
    .valid(...Object.values(Environment))
    .default(Environment.Dev),
  USE_PRETTY_PRINT: Joi.boolean().default(false),
  CORS_ALLOWED_ORIGINS: Joi.string().default('http://localhost:3004'),
  STORAGE_DIR: Joi.string().default('./storage'),
  MAX_UPLOAD_MB: Joi.number().integer().min(1).max(4096).default(512),
  DEFAULT_WHISPER_MODEL: Joi.string()
    .valid(...whisperModelIdValues)
    .default(WhisperModelIds.Small)
    .messages({
      'any.only': `"DEFAULT_WHISPER_MODEL" must be one of [${whisperModelIdValues.join(', ')}]`,
    }),
  WHISPER_DEVICE: Joi.string()
    .valid(...whisperDeviceValues)
    .default(WhisperDevice.Auto)
    .messages({
      'any.only': `"WHISPER_DEVICE" must be one of [${whisperDeviceValues.join(', ')}]`,
    }),
  ALLOW_REMOTE_MODELS: Joi.boolean().default(true),
  JOB_TTL_MINUTES: Joi.number().integer().min(1).default(60),
  FRONTEND_DIST_DIR: Joi.string().default('../frontend/dist'),
}).unknown(true);

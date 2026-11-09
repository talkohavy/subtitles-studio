export const API_PATHS = {
  healthCheck: '/api/health-check',
  // transcription
  transcriptions: '/api/transcriptions',
  transcriptionById: '/api/transcriptions/:transcriptionId',
  transcriptionOptions: '/api/transcription-options',
  // translation
  translations: '/api/translations',
  translationById: '/api/translations/:translationId',
  translationOptions: '/api/translation-options',
} satisfies Record<string, `/${string}`>;

export const API_PATH_PREFIX = '/api/';

/**
 * Paths that should be excluded from certain middlewares
 */
export const EXCLUDED_PATHS = [API_PATHS.healthCheck] as string[];

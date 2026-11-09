import type {
  CorsConfig,
  LoggerServiceSettings,
  StaticFrontendConfig,
  TranscriptionConfig,
  TranslationConfig,
} from '../types';

export const ConfigKeys = {
  Port: 'port',
  Cors: 'cors',
  LogSettings: 'logSettings',
  Transcription: 'transcription',
  Translation: 'translation',
  StaticFrontend: 'staticFrontend',
} as const;

export type ConfigKeyValues = (typeof ConfigKeys)[keyof typeof ConfigKeys];

export type Config = {
  [ConfigKeys.Port]: number;
  [ConfigKeys.Cors]: CorsConfig;
  [ConfigKeys.LogSettings]: LoggerServiceSettings;
  [ConfigKeys.Transcription]: TranscriptionConfig;
  [ConfigKeys.Translation]: TranslationConfig;
  [ConfigKeys.StaticFrontend]: StaticFrontendConfig;
};

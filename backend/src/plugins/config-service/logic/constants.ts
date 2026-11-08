import type { CorsConfig, LoggerServiceSettings, StaticFrontendConfig, TranscriptionConfig } from '../types';

export const ConfigKeys = {
  Port: 'port',
  Cors: 'cors',
  LogSettings: 'logSettings',
  Transcription: 'transcription',
  StaticFrontend: 'staticFrontend',
} as const;

export type ConfigKeyValues = (typeof ConfigKeys)[keyof typeof ConfigKeys];

export type Config = {
  [ConfigKeys.Port]: number;
  [ConfigKeys.Cors]: CorsConfig;
  [ConfigKeys.LogSettings]: LoggerServiceSettings;
  [ConfigKeys.Transcription]: TranscriptionConfig;
  [ConfigKeys.StaticFrontend]: StaticFrontendConfig;
};

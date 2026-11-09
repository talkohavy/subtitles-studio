import type { OptimizedApp } from '../types';

/**
 * Pre-defined object structure for V8 shape optimization.
 */
export const optimizedApp: OptimizedApp = {
  modules: {
    HealthCheckModule: null as any,
    TranscriptionModule: null as any,
    TranslationModule: null as any,
    StaticFrontendModule: null as any,
  },
  configService: null as any,
  logger: null as any,
  callContextService: null as any,
  httpServer: null as any,
};

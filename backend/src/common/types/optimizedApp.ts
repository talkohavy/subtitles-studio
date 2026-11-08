import type { Server as HttpServer } from 'http';
import type { CallContextService } from '@src/core/services/call-context';
import type { ConfigService } from '@src/core/services/config';
import type { LoggerService } from '@src/core/services/logger';
import type { HealthCheckModule } from '@src/modules/health-check';
import type { StaticFrontendModule } from '@src/modules/static-frontend';
import type { TranscriptionModule } from '@src/modules/transcription';

export interface OptimizedApp {
  modules: {
    HealthCheckModule: HealthCheckModule;
    TranscriptionModule: TranscriptionModule;
    StaticFrontendModule: StaticFrontendModule;
  };
  configService: ConfigService;
  callContextService: CallContextService;
  logger: LoggerService;
  httpServer: HttpServer;
}

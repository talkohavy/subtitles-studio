import { optimizedApp } from '@src/common/constants';
import { AppFactory } from '@src/lib/lucky-server';
import { registerBodyLimitMiddleware } from './middlewares/bodyLimit.middleware';
import { registerCorsMiddleware } from './middlewares/cors';
import { errorHandler } from './middlewares/errorHandler.middleware';
import { registerHelmetMiddleware } from './middlewares/helmet.middleware';
import { pathNotFoundHandler } from './middlewares/pathNotFoundHandler.middleware';
import { registerAddRequestIdHeaderMiddleware } from './middlewares/request-id.middleware';
import { registerUrlEncodedMiddleware } from './middlewares/urlEncoded.middleware';
import { HealthCheckModule } from './modules/health-check';
import { StaticFrontendModule } from './modules/static-frontend';
import { TranscriptionModule } from './modules/transcription';
import { TranslationModule } from './modules/translation';
import { callContextPlugin } from './plugins/call-context.plugin';
import { configServicePlugin } from './plugins/config-service';
import { httpServerPlugin } from './plugins/http-server.plugin';
import { loggerPlugin } from './plugins/logger.plugin';
import type { Application } from 'express';

export async function buildApp(app: Application) {
  const appModule = new AppFactory(app, optimizedApp);

  await appModule.registerPlugins([configServicePlugin, callContextPlugin, loggerPlugin, httpServerPlugin]);

  await appModule.registerMiddleware([
    registerAddRequestIdHeaderMiddleware,
    registerCorsMiddleware,
    registerHelmetMiddleware,
    registerBodyLimitMiddleware,
    registerUrlEncodedMiddleware,
  ]);

  await appModule.registerModules([
    HealthCheckModule,
    TranscriptionModule,
    TranslationModule,
    // - Must come last: its catch-all route serves the single-page app
    StaticFrontendModule,
  ]);

  appModule.registerErrorHandler(errorHandler);
  appModule.registerPathNotFoundHandler(pathNotFoundHandler);
}

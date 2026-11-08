import { existsSync } from 'fs';
import path from 'path';
import { ConfigKeys, type StaticFrontendConfig } from '@src/plugins/config-service';
import { StaticFrontendController } from './controllers/static-frontend.controller';
import type { Application } from 'express';
import type { ModuleFactory } from '@src/lib/lucky-server';

/**
 * Serves the built frontend, so production needs a single server. In development Vite serves the frontend
 * (and proxies `/api` here), and this module stays idle.
 *
 * Must be registered after every API module.
 */
export class StaticFrontendModule implements ModuleFactory {
  constructor(private readonly app: Application) {}

  async init() {
    const { configService, logger } = this.app;

    const { distDir } = configService.get<StaticFrontendConfig>(ConfigKeys.StaticFrontend);
    const hasFrontendBuild = existsSync(path.join(distDir, 'index.html'));

    if (!hasFrontendBuild) {
      logger.info(`No frontend build at ${distDir}, serving the API only`);
      return;
    }

    const controller = new StaticFrontendController(this.app, distDir);
    controller.registerRoutes();

    logger.info(`Serving the frontend from ${distDir}`);
  }
}

import { ConfigKeys, type TranslationConfig } from '@src/plugins/config-service';
import { TranslationController } from './controllers';
import { spawnTranslationWorker } from './logic/utils/spawnTranslationWorker';
import { TranslationJobsService, TranslationService } from './services';
import type { Application } from 'express';
import type { ModuleFactory } from '@src/lib/lucky-server';

export class TranslationModule implements ModuleFactory {
  private translationJobsService!: TranslationJobsService;
  private translationService!: TranslationService;

  constructor(private readonly app: Application) {}

  async init() {
    const { configService, logger } = this.app;

    const config = configService.get<TranslationConfig>(ConfigKeys.Translation);

    this.translationJobsService = new TranslationJobsService({
      config,
      logger,
      spawnWorker: spawnTranslationWorker,
    });
    this.translationService = new TranslationService({ config, jobsService: this.translationJobsService });

    const controller = new TranslationController(this.app, this.translationService);
    controller.registerRoutes();
  }

  get services() {
    return {
      translationService: this.translationService,
      translationJobsService: this.translationJobsService,
    };
  }

  /**
   * Stops the worker process.
   */
  async cleanup() {
    await this.translationJobsService?.shutdown();
  }
}

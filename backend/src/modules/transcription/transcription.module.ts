import { ConfigKeys, type TranscriptionConfig } from '@src/plugins/config-service';
import { TranscriptionController } from './controllers';
import { prepareStorage } from './logic/utils/prepareStorage';
import { spawnTranscriptionWorker } from './logic/utils/spawnTranscriptionWorker';
import { TranscriptionJobsService, TranscriptionService } from './services';
import type { Application } from 'express';
import type { ModuleFactory } from '@src/lib/lucky-server';

export class TranscriptionModule implements ModuleFactory {
  private transcriptionJobsService!: TranscriptionJobsService;
  private transcriptionService!: TranscriptionService;

  constructor(private readonly app: Application) {}

  async init() {
    const { configService, logger } = this.app;

    const config = configService.get<TranscriptionConfig>(ConfigKeys.Transcription);

    await prepareStorage(config);

    this.transcriptionJobsService = new TranscriptionJobsService({
      config,
      logger,
      spawnWorker: spawnTranscriptionWorker,
    });
    this.transcriptionService = new TranscriptionService({ config, jobsService: this.transcriptionJobsService });

    const controller = new TranscriptionController(this.app, this.transcriptionService);
    controller.registerRoutes();
  }

  get services() {
    return {
      transcriptionService: this.transcriptionService,
      transcriptionJobsService: this.transcriptionJobsService,
    };
  }

  /**
   * Stops the worker process and deletes pending uploads.
   */
  async cleanup() {
    await this.transcriptionJobsService?.shutdown();
  }
}

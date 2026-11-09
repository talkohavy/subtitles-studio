import { JobStatuses, WorkerJobQueue, type WorkerJobQueueLogger } from '@src/lib/worker-job-queue';
import {
  NLLB_LANGUAGE_CODES,
  TRANSLATION_MODEL,
  TranslationStages,
  TranslationWorkerEventTypes,
  TranslationWorkerRequestTypes,
} from '../logic/constants';
import type { TranslationConfig } from '@src/plugins/config-service';
import type { TranslateRequest, TranslationJob, TranslationProgressEvent, TranslationWorkerProcess } from '../types';

type TranslationJobsServiceProps = {
  config: TranslationConfig;
  logger: WorkerJobQueueLogger;
  /**
   * Starts the process that runs `translation.worker`.
   */
  spawnWorker: () => TranslationWorkerProcess;
};

type CreateJobProps = {
  id: string;
  texts: Array<string>;
  /**
   * A key of `NLLB_LANGUAGE_CODES`.
   */
  sourceLanguage: string;
  /**
   * A key of `NLLB_LANGUAGE_CODES`.
   */
  targetLanguage: string;
};

/**
 * Owns the translation queue and the worker process that executes it.
 */
export class TranslationJobsService extends WorkerJobQueue<TranslationJob, TranslateRequest, TranslationProgressEvent> {
  private readonly config: TranslationConfig;

  constructor(props: TranslationJobsServiceProps) {
    const { config, logger, spawnWorker } = props;

    super({ jobLabel: 'translation', logger, spawnWorker, jobTtlMs: config.jobTtlMs });

    this.config = config;
  }

  createJob(props: CreateJobProps): TranslationJob {
    const { id, texts, sourceLanguage, targetLanguage } = props;

    const job: TranslationJob = {
      id,
      status: JobStatuses.Queued,
      stage: TranslationStages.Waiting,
      sourceLanguage,
      targetLanguage,
      texts,
      translations: [],
      progress: 0,
      modelDownload: null,
      error: null,
      createdAt: Date.now(),
      startedAt: null,
      finishedAt: null,
    };

    this.enqueueJob(job);

    return job;
  }

  protected createStartRequest(job: TranslationJob): TranslateRequest {
    this.logger.info(
      `Translation ${job.id} started (${job.sourceLanguage} → ${job.targetLanguage}, ${job.texts.length} texts)`,
    );

    return {
      type: TranslationWorkerRequestTypes.Translate,
      task: {
        jobId: job.id,
        texts: job.texts,
        sourceLanguage: NLLB_LANGUAGE_CODES[job.sourceLanguage]!,
        targetLanguage: NLLB_LANGUAGE_CODES[job.targetLanguage]!,
        repo: TRANSLATION_MODEL.repo,
        approximateSizeMb: TRANSLATION_MODEL.approximateSizeMb,
        modelsDir: this.config.modelsDir,
        allowRemoteModels: this.config.allowRemoteModels,
      },
    };
  }

  protected applyProgressEvent(props: { job: TranslationJob; event: TranslationProgressEvent }) {
    const { job, event } = props;

    switch (event.type) {
      case TranslationWorkerEventTypes.Stage:
        job.stage = event.stage;
        break;
      case TranslationWorkerEventTypes.ModelDownload:
        job.modelDownload = { loadedBytes: event.loadedBytes, totalBytes: event.totalBytes };
        break;
      case TranslationWorkerEventTypes.Translations:
        event.translations.forEach((translation) => job.translations.push(translation));
        job.progress = job.translations.length / Math.max(1, job.texts.length);
        break;
    }
  }

  protected onJobFinished(job: TranslationJob) {
    job.stage = TranslationStages.Done;

    if (job.status === JobStatuses.Completed) job.progress = 1;
  }

  protected describeFinishedJob(job: TranslationJob): string {
    return `${job.translations.length} of ${job.texts.length} texts`;
  }
}

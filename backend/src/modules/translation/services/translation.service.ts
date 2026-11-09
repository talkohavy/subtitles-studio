import { randomUUID } from 'crypto';
import path from 'path';
import { doesFileExist } from '@src/common/utils/doesFileExist';
import { NotFoundError, TooManyRequestsError } from '@src/core/errors';
import { TRANSLATION_LANGUAGE_CODES, TRANSLATION_MODEL } from '../logic/constants';
import type { TranslationConfig } from '@src/plugins/config-service';
import type { TranslationJob, TranslationJobDto, TranslationOptionsDto } from '../types';
import type { TranslationJobsService } from './translation-jobs.service';

type TranslationServiceProps = {
  config: TranslationConfig;
  jobsService: TranslationJobsService;
};

type CreateTranslationProps = {
  /**
   * Translated one by one, so each should be a single sentence.
   */
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

type GetTranslationProps = {
  translationId: string;
  /**
   * Only translations from this index onward are returned.
   */
  translationsFrom: number;
};

export class TranslationService {
  private readonly config: TranslationConfig;
  private readonly jobsService: TranslationJobsService;

  constructor(props: TranslationServiceProps) {
    const { config, jobsService } = props;

    this.config = config;
    this.jobsService = jobsService;
  }

  /**
   * @throws {TooManyRequestsError}
   */
  createTranslation(props: CreateTranslationProps): TranslationJobDto {
    const { texts, sourceLanguage, targetLanguage } = props;
    const { maxQueuedJobs } = this.config;

    if (this.jobsService.pendingJobsCount >= maxQueuedJobs) {
      throw new TooManyRequestsError(
        `The server is busy with ${maxQueuedJobs} translations. Please try again in a few minutes`,
      );
    }

    const job = this.jobsService.createJob({ id: randomUUID(), texts, sourceLanguage, targetLanguage });
    const jobDto = this.toJobDto({ job, translationsFrom: 0 });

    return jobDto;
  }

  /**
   * @throws {NotFoundError}
   */
  getTranslation(props: GetTranslationProps): TranslationJobDto {
    const { translationId, translationsFrom } = props;

    const job = this.jobsService.getJob(translationId);

    if (!job) throw new NotFoundError(`Translation ${translationId} not found`);

    const jobDto = this.toJobDto({ job, translationsFrom });

    return jobDto;
  }

  /**
   * Cancels the translation if it's still running.
   *
   * @throws {NotFoundError}
   */
  deleteTranslation(translationId: string): void {
    const isDeleted = this.jobsService.deleteJob(translationId);

    if (!isDeleted) throw new NotFoundError(`Translation ${translationId} not found`);
  }

  async getOptions(): Promise<TranslationOptionsDto> {
    const { name, repo, approximateSizeMb, files } = TRANSLATION_MODEL;
    const fileChecks = await Promise.all(
      files.map((file) => doesFileExist(path.join(this.config.modelsDir, repo, file))),
    );

    return {
      model: { name, approximateSizeMb, isDownloaded: fileChecks.every(Boolean) },
      languages: TRANSLATION_LANGUAGE_CODES,
    };
  }

  private toJobDto(props: { job: TranslationJob; translationsFrom: number }): TranslationJobDto {
    const { job, translationsFrom } = props;

    return {
      id: job.id,
      status: job.status,
      stage: job.stage,
      sourceLanguage: job.sourceLanguage,
      targetLanguage: job.targetLanguage,
      progress: job.progress,
      modelDownload: job.modelDownload,
      error: job.error,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      queuePosition: this.jobsService.getQueuePosition(job.id),
      textsTotal: job.texts.length,
      translatedCount: job.translations.length,
      translations: job.translations.slice(translationsFrom),
      translationsFrom,
    };
  }
}

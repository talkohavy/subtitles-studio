import { randomUUID } from 'crypto';
import { rm } from 'fs/promises';
import path from 'path';
import { StatusCodes } from '@src/common/constants';
import { BadRequestError, NotFoundError, TooManyRequestsError } from '@src/core/errors';
import { WHISPER_LANGUAGE_CODES, WHISPER_MODELS, type WhisperModelIdValues } from '../logic/constants';
import { InvalidAudioError } from '../logic/utils/audio/invalid-audio.error';
import { readWavInfoFromFile } from '../logic/utils/audio/readWavInfoFromFile';
import { isModelDownloaded } from '../logic/utils/isModelDownloaded';
import { resolveRuntimes } from '../logic/utils/resolveRuntimes';
import { MaxBytesExceededError, saveStreamToFile } from '../logic/utils/saveStreamToFile';
import type { Readable } from 'stream';
import type { TranscriptionConfig } from '@src/plugins/config-service';
import type {
  TranscriptionJob,
  TranscriptionJobDto,
  TranscriptionModelDto,
  TranscriptionOptionsDto,
  WhisperModelDefinition,
} from '../types';
import type { TranscriptionJobsService } from './transcription-jobs.service';

type TranscriptionServiceProps = {
  config: TranscriptionConfig;
  jobsService: TranscriptionJobsService;
};

type CreateTranscriptionProps = {
  /**
   * A WAV file.
   */
  audioStream: Readable;
  /**
   * The declared upload size, when known, to reject oversized uploads before reading them.
   */
  contentLength: number | null;
  /**
   * A language code, or `auto`.
   */
  language: string;
  /**
   * @default config.defaultModelId
   */
  modelId?: WhisperModelIdValues;
};

type GetTranscriptionProps = {
  transcriptionId: string;
  /**
   * Only words from this index onward are returned.
   */
  wordsFrom: number;
};

const MIN_AUDIO_DURATION_SEC = 0.1;
const BYTES_IN_MB = 1024 * 1024;

export class TranscriptionService {
  private readonly config: TranscriptionConfig;
  private readonly jobsService: TranscriptionJobsService;

  constructor(props: TranscriptionServiceProps) {
    const { config, jobsService } = props;

    this.config = config;
    this.jobsService = jobsService;
  }

  async createTranscription(props: CreateTranscriptionProps): Promise<TranscriptionJobDto> {
    const { audioStream, contentLength, language, modelId = this.config.defaultModelId } = props;
    const { maxUploadBytes, maxQueuedJobs, uploadsDir } = this.config;

    if (this.jobsService.pendingJobsCount >= maxQueuedJobs) {
      throw new TooManyRequestsError(
        `The server is busy with ${maxQueuedJobs} transcriptions. Please try again in a few minutes`,
      );
    }

    if (contentLength !== null && contentLength > maxUploadBytes) throw this.createUploadTooLargeError();

    const jobId = randomUUID();
    const audioPath = path.join(uploadsDir, `${jobId}.wav`);

    try {
      const fileSize = await saveStreamToFile({ stream: audioStream, filePath: audioPath, maxBytes: maxUploadBytes });
      const wavInfo = await readWavInfoFromFile({ filePath: audioPath, fileSize });

      if (wavInfo.durationSec < MIN_AUDIO_DURATION_SEC) throw new BadRequestError('The audio track is empty');

      const job = this.jobsService.createJob({
        id: jobId,
        audioPath,
        audioDurationSec: wavInfo.durationSec,
        modelId,
        language,
      });
      const jobDto = this.toJobDto({ job, wordsFrom: 0 });

      return jobDto;
    } catch (error) {
      await rm(audioPath, { force: true });

      if (error instanceof InvalidAudioError) throw new BadRequestError(error.message);
      if (error instanceof MaxBytesExceededError) throw this.createUploadTooLargeError();

      throw error;
    }
  }

  /**
   * @throws {NotFoundError}
   */
  getTranscription(props: GetTranscriptionProps): TranscriptionJobDto {
    const { transcriptionId, wordsFrom } = props;

    const job = this.jobsService.getJob(transcriptionId);

    if (!job) throw new NotFoundError(`Transcription ${transcriptionId} not found`);

    const jobDto = this.toJobDto({ job, wordsFrom });

    return jobDto;
  }

  /**
   * Cancels the transcription if it's still running.
   *
   * @throws {NotFoundError}
   */
  deleteTranscription(transcriptionId: string): void {
    const isDeleted = this.jobsService.deleteJob(transcriptionId);

    if (!isDeleted) throw new NotFoundError(`Transcription ${transcriptionId} not found`);
  }

  async getOptions(): Promise<TranscriptionOptionsDto> {
    const modelDefinitions = Object.values(WHISPER_MODELS);
    const models = await Promise.all(modelDefinitions.map((model) => this.toModelDto(model)));

    return {
      defaultModelId: this.config.defaultModelId,
      maxUploadBytes: this.config.maxUploadBytes,
      models,
      languages: WHISPER_LANGUAGE_CODES,
    };
  }

  private async toModelDto(model: WhisperModelDefinition): Promise<TranscriptionModelDto> {
    const runtimes = resolveRuntimes({ runtimes: model.runtimes, device: this.config.device });
    const downloadChecks = await Promise.all(
      runtimes.map((runtime) => isModelDownloaded({ modelsDir: this.config.modelsDir, repo: model.repo, runtime })),
    );

    return {
      id: model.id,
      name: model.name,
      description: model.description,
      approximateSizeMb: runtimes[0]?.approximateSizeMb ?? 0,
      isDownloaded: downloadChecks.some(Boolean),
    };
  }

  private toJobDto(props: { job: TranscriptionJob; wordsFrom: number }): TranscriptionJobDto {
    const { job, wordsFrom } = props;

    return {
      id: job.id,
      status: job.status,
      stage: job.stage,
      modelId: job.modelId,
      requestedLanguage: job.requestedLanguage,
      language: job.language,
      languageProbability: job.languageProbability,
      device: job.device,
      audioDurationSec: job.audioDurationSec,
      progress: job.progress,
      modelDownload: job.modelDownload,
      error: job.error,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      queuePosition: this.jobsService.getQueuePosition(job.id),
      words: job.words.slice(wordsFrom),
      wordsFrom,
      wordsTotal: job.words.length,
    };
  }

  private createUploadTooLargeError(): BadRequestError {
    const maxUploadMb = Math.round(this.config.maxUploadBytes / BYTES_IN_MB);

    return new BadRequestError(`The audio track is larger than the ${maxUploadMb} MB limit`, {
      statusCode: StatusCodes.PAYLOAD_TOO_LARGE,
    });
  }
}

import { mkdir, mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { PassThrough } from 'stream';
import { StatusCodes } from '@src/common/constants';
import { createLoggerMock, FakeWorker } from '@src/lib/worker-job-queue/test-utils/fake-worker';
import { createWavBuffer } from '../logic/utils/audio/test-utils/createWavBuffer';
import { TranscriptionJobsService } from './transcription-jobs.service';
import { TranscriptionService } from './transcription.service';
import type { TranscriptionConfig } from '@src/plugins/config-service';
import type { TranscriptionWorkerEvent, TranscriptionWorkerRequest } from '../types';

const ONE_SECOND_WAV = createWavBuffer({ channels: [new Array(16_000).fill(0)], sampleRate: 16_000 });

describe('TranscriptionService', () => {
  let tempDir: string;
  let jobsService: TranscriptionJobsService;
  let transcriptionService: TranscriptionService;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'transcription-service-'));
    const config: TranscriptionConfig = {
      modelsDir: path.join(tempDir, 'models'),
      uploadsDir: path.join(tempDir, 'uploads'),
      maxUploadBytes: 64 * 1024,
      defaultModelId: 'small',
      device: 'auto',
      allowRemoteModels: true,
      jobTtlMs: 60_000,
      maxQueuedJobs: 1,
    };
    await mkdir(config.uploadsDir, { recursive: true });

    jobsService = new TranscriptionJobsService({
      config,
      logger: createLoggerMock() as any,
      spawnWorker: () => new FakeWorker<TranscriptionWorkerRequest, TranscriptionWorkerEvent>(),
    });
    transcriptionService = new TranscriptionService({ config, jobsService });
  });

  afterEach(async () => {
    await jobsService.shutdown();
    await rm(tempDir, { recursive: true, force: true });
  });

  function startUpload(audioStream: PassThrough) {
    const upload = transcriptionService.createTranscription({ audioStream, contentLength: null, language: 'auto' });

    return upload;
  }

  it('should count an upload still being received as taking a place in the queue', async () => {
    const firstUpload = new PassThrough();
    const firstJob = startUpload(firstUpload);

    const secondError = await startUpload(new PassThrough()).catch((error: unknown) => error);
    firstUpload.end(ONE_SECOND_WAV);
    const firstJobStatus = (await firstJob).status;
    const actualResult = { secondStatusCode: (secondError as any)?.statusCode, firstJobStatus };

    const expectedResult = { secondStatusCode: StatusCodes.TOO_MANY_REQUESTS, firstJobStatus: 'processing' };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should free the place of an upload that fails', async () => {
    const failedUpload = new PassThrough();
    const failedJob = startUpload(failedUpload);
    failedUpload.end(Buffer.from('not a wav file'));
    await failedJob.catch(() => {});

    const nextUpload = new PassThrough();
    const nextJob = startUpload(nextUpload);
    nextUpload.end(ONE_SECOND_WAV);
    const actualResult = (await nextJob).status;

    expect(actualResult).toBe('processing');
  });
});

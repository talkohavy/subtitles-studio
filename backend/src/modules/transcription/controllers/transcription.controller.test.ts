import { mkdir, mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import express, { type Application } from 'express';
import request from 'supertest';
import { API_PATHS, StatusCodes } from '@src/common/constants';
import { errorHandler } from '../../../middlewares/errorHandler.middleware';
import { createLoggerMock, FakeWorker } from '../logic/test-utils/fake-worker';
import { createWavBuffer } from '../logic/utils/audio/test-utils/createWavBuffer';
import { TranscriptionJobsService } from '../services/transcription-jobs.service';
import { TranscriptionService } from '../services/transcription.service';
import { TranscriptionController } from './transcription.controller';
import type { TranscriptionConfig } from '@src/plugins/config-service';

const ONE_SECOND_WAV = createWavBuffer({ channels: [new Array(16_000).fill(0)], sampleRate: 16_000 });

describe('TranscriptionController', () => {
  let app: Application;
  let tempDir: string;
  let workers: Array<FakeWorker>;
  let jobsService: TranscriptionJobsService;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'transcription-controller-'));
    const config: TranscriptionConfig = {
      modelsDir: path.join(tempDir, 'models'),
      uploadsDir: path.join(tempDir, 'uploads'),
      maxUploadBytes: 64 * 1024,
      defaultModelId: 'small',
      device: 'auto',
      allowRemoteModels: true,
      jobTtlMs: 60_000,
      maxQueuedJobs: 5,
    };
    await mkdir(config.uploadsDir, { recursive: true });

    app = express() as unknown as Application;
    app.logger = createLoggerMock() as any;
    workers = [];
    jobsService = new TranscriptionJobsService({
      config,
      logger: app.logger,
      spawnWorker: () => {
        const worker = new FakeWorker();
        workers.push(worker);

        return worker;
      },
    });
    const transcriptionService = new TranscriptionService({ config, jobsService });

    const controller = new TranscriptionController(app, transcriptionService);
    controller.registerRoutes();
    errorHandler(app);
  });

  afterEach(async () => {
    await jobsService.shutdown();
    await rm(tempDir, { recursive: true, force: true });
  });

  async function postAudio(props: { body: Buffer; query?: string; contentType?: string }) {
    const { body, query = '', contentType = 'audio/wav' } = props;

    const response = await request(app)
      .post(`${API_PATHS.transcriptions}${query}`)
      .set('Content-Type', contentType)
      .send(body);

    return response;
  }

  it('should queue a transcription for an uploaded WAV file', async () => {
    const response = await postAudio({ body: ONE_SECOND_WAV, query: '?language=he&model=base' });
    const actualResult = {
      status: response.status,
      location: response.headers.location,
      jobStatus: response.body.status,
      modelId: response.body.modelId,
      requestedLanguage: response.body.requestedLanguage,
      audioDurationSec: response.body.audioDurationSec,
    };

    const expectedResult = {
      status: StatusCodes.ACCEPTED,
      location: `${API_PATHS.transcriptions}/${response.body.id}`,
      jobStatus: 'processing',
      modelId: 'base',
      requestedLanguage: 'he',
      audioDurationSec: 1,
    };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should use the default model and language detection when none are requested', async () => {
    const response = await postAudio({ body: ONE_SECOND_WAV });
    const actualResult = { modelId: response.body.modelId, requestedLanguage: response.body.requestedLanguage };

    const expectedResult = { modelId: 'small', requestedLanguage: 'auto' };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should reject an upload that is not sent as audio', async () => {
    const response = await postAudio({ body: ONE_SECOND_WAV, contentType: 'text/plain' });

    expect(response.status).toBe(StatusCodes.UNSUPPORTED_MEDIA_TYPE);
  });

  it('should reject an unknown language', async () => {
    const response = await postAudio({ body: ONE_SECOND_WAV, query: '?language=klingon' });

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should reject a body that is not a WAV file', async () => {
    const response = await postAudio({ body: Buffer.from('definitely not a wav file, just some text') });
    const actualResult = { status: response.status, message: response.body.message };

    const expectedResult = {
      status: StatusCodes.BAD_REQUEST,
      message: 'Not a WAV file (missing the RIFF/WAVE header)',
    };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should reject an upload over the size limit', async () => {
    const largeWav = createWavBuffer({ channels: [new Array(48_000).fill(0)], sampleRate: 16_000 });

    const response = await postAudio({ body: largeWav });

    expect(response.status).toBe(StatusCodes.PAYLOAD_TOO_LARGE);
  });

  it('should return only the words from the requested index onward', async () => {
    const { body: created } = await postAudio({ body: ONE_SECOND_WAV });
    const words = [
      { text: ' One', start: 0, end: 0.3 },
      { text: ' two', start: 0.3, end: 0.6 },
      { text: ' three', start: 0.6, end: 0.9 },
    ];
    workers[0]?.emitEvent({ type: 'words', jobId: created.id, words, progress: 1 });

    const response = await request(app).get(`${API_PATHS.transcriptions}/${created.id}?wordsFrom=1`);
    const actualResult = {
      words: response.body.words,
      wordsFrom: response.body.wordsFrom,
      wordsTotal: response.body.wordsTotal,
    };

    const expectedResult = { words: words.slice(1), wordsFrom: 1, wordsTotal: 3 };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should return 404 for an unknown transcription', async () => {
    const response = await request(app).get(`${API_PATHS.transcriptions}/does-not-exist`);

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
  });

  it('should delete a transcription', async () => {
    const { body: created } = await postAudio({ body: ONE_SECOND_WAV });

    const deleteResponse = await request(app).delete(`${API_PATHS.transcriptions}/${created.id}`);
    const getResponse = await request(app).get(`${API_PATHS.transcriptions}/${created.id}`);
    const actualResult = { deleteStatus: deleteResponse.status, getStatus: getResponse.status };

    const expectedResult = { deleteStatus: StatusCodes.NO_CONTENT, getStatus: StatusCodes.NOT_FOUND };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should list the available models and languages', async () => {
    const response = await request(app).get(API_PATHS.transcriptionOptions);
    const actualResult = {
      defaultModelId: response.body.defaultModelId,
      maxUploadBytes: response.body.maxUploadBytes,
      models: response.body.models.map((model: { id: string; isDownloaded: boolean }) => ({
        id: model.id,
        isDownloaded: model.isDownloaded,
      })),
      languageCount: response.body.languages.length,
      includesHebrew: response.body.languages.includes('he'),
    };

    const expectedResult = {
      defaultModelId: 'small',
      maxUploadBytes: 64 * 1024,
      models: [
        { id: 'base', isDownloaded: false },
        { id: 'small', isDownloaded: false },
        { id: 'large-v3-turbo', isDownloaded: false },
      ],
      languageCount: 100,
      includesHebrew: true,
    };
    expect(actualResult).toEqual(expectedResult);
  });
});

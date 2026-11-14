import { mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import express, { type Application } from 'express';
import request from 'supertest';
import { API_PATHS, StatusCodes } from '@src/common/constants';
import { createLoggerMock, FakeWorker } from '@src/lib/worker-job-queue/test-utils/fake-worker';
import { errorHandler } from '../../../middlewares/errorHandler.middleware';
import { TranslationJobsService } from '../services/translation-jobs.service';
import { TranslationService } from '../services/translation.service';
import { TranslationController } from './translation.controller';
import type { TranslationConfig } from '@src/plugins/config-service';
import type { TranslationWorkerEvent, TranslationWorkerRequest } from '../types';

type TranslationFakeWorker = FakeWorker<TranslationWorkerRequest, TranslationWorkerEvent>;

describe('TranslationController', () => {
  let app: Application;
  let tempDir: string;
  let workers: Array<TranslationFakeWorker>;
  let jobsService: TranslationJobsService;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'translation-controller-'));
    const config: TranslationConfig = {
      modelsDir: path.join(tempDir, 'models'),
      allowRemoteModels: true,
      jobTtlMs: 60_000,
      maxQueuedJobs: 5,
    };

    app = express() as unknown as Application;
    app.use(express.json());
    app.logger = createLoggerMock() as any;
    workers = [];
    jobsService = new TranslationJobsService({
      config,
      logger: app.logger,
      spawnWorker: () => {
        const worker: TranslationFakeWorker = new FakeWorker();
        workers.push(worker);

        return worker;
      },
    });
    const translationService = new TranslationService({ config, jobsService });

    const controller = new TranslationController(app, translationService);
    controller.registerRoutes();
    errorHandler(app);
  });

  afterEach(async () => {
    await jobsService.shutdown();
    await rm(tempDir, { recursive: true, force: true });
  });

  async function postTranslation(body: object) {
    const response = await request(app).post(API_PATHS.translations).send(body);

    return response;
  }

  const VALID_BODY = { sourceLanguage: 'en', targetLanguage: 'he', texts: ['Hello.', 'How are you?'] };

  it('should queue a translation', async () => {
    const response = await postTranslation(VALID_BODY);
    const actualResult = {
      status: response.status,
      location: response.headers.location,
      jobStatus: response.body.status,
      sourceLanguage: response.body.sourceLanguage,
      targetLanguage: response.body.targetLanguage,
      textsTotal: response.body.textsTotal,
    };

    const expectedResult = {
      status: StatusCodes.ACCEPTED,
      location: `${API_PATHS.translations}/${response.body.id}`,
      jobStatus: 'processing',
      sourceLanguage: 'en',
      targetLanguage: 'he',
      textsTotal: 2,
    };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should reject translating into the language the texts are already in', async () => {
    const response = await postTranslation({ ...VALID_BODY, targetLanguage: 'en' });
    const actualResult = { status: response.status, message: response.body.message };

    const expectedResult = {
      status: StatusCodes.BAD_REQUEST,
      message: '"targetLanguage" must differ from "sourceLanguage"',
    };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should reject a language the translator does not support', async () => {
    const response = await postTranslation({ ...VALID_BODY, targetLanguage: 'la' });

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should reject a request without texts', async () => {
    const response = await postTranslation({ ...VALID_BODY, texts: [] });

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should return only the translations from translationsFrom onward', async () => {
    const { body: created } = await postTranslation(VALID_BODY);
    workers[0]?.emitEvent({ type: 'translations', jobId: created.id, translations: ['שלום.', 'מה שלומך?'] });

    const response = await request(app).get(`${API_PATHS.translations}/${created.id}?translationsFrom=1`);
    const actualResult = {
      translations: response.body.translations,
      translationsFrom: response.body.translationsFrom,
      translatedCount: response.body.translatedCount,
    };

    const expectedResult = { translations: ['מה שלומך?'], translationsFrom: 1, translatedCount: 2 };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should report a completed translation', async () => {
    const { body: created } = await postTranslation(VALID_BODY);
    workers[0]?.emitEvent({ type: 'translations', jobId: created.id, translations: ['שלום.', 'מה שלומך?'] });
    workers[0]?.emitEvent({ type: 'completed', jobId: created.id });

    const response = await request(app).get(`${API_PATHS.translations}/${created.id}`);
    const actualResult = { status: response.body.status, translations: response.body.translations };

    const expectedResult = { status: 'completed', translations: ['שלום.', 'מה שלומך?'] };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should return 404 for an unknown translation', async () => {
    const response = await request(app).get(`${API_PATHS.translations}/does-not-exist`);

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
  });

  it('should delete a translation', async () => {
    const { body: created } = await postTranslation(VALID_BODY);

    const deleteResponse = await request(app).delete(`${API_PATHS.translations}/${created.id}`);
    const getResponse = await request(app).get(`${API_PATHS.translations}/${created.id}`);
    const actualResult = { deleteStatus: deleteResponse.status, getStatus: getResponse.status };

    const expectedResult = { deleteStatus: StatusCodes.NO_CONTENT, getStatus: StatusCodes.NOT_FOUND };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should describe the model and the languages it translates', async () => {
    const response = await request(app).get(API_PATHS.translationOptions);
    const actualResult = {
      model: response.body.model,
      languageCount: response.body.languages.length,
      includesHebrew: response.body.languages.includes('he'),
    };

    const expectedResult = {
      model: { name: 'NLLB-200', approximateSizeMb: 870, isDownloaded: false },
      languageCount: 97,
      includesHebrew: true,
    };
    expect(actualResult).toEqual(expectedResult);
  });
});

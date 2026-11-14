import { createLoggerMock, FakeWorker } from '@src/lib/worker-job-queue/test-utils/fake-worker';
import { TRANSLATION_MODEL } from '../logic/constants';
import { TranslationJobsService } from './translation-jobs.service';
import type { TranslationConfig } from '@src/plugins/config-service';
import type { TranslationWorkerEvent, TranslationWorkerRequest } from '../types';

type TranslationFakeWorker = FakeWorker<TranslationWorkerRequest, TranslationWorkerEvent>;

const CONFIG: TranslationConfig = {
  modelsDir: '/models',
  allowRemoteModels: true,
  jobTtlMs: 60_000,
  maxQueuedJobs: 5,
};

describe('TranslationJobsService', () => {
  let service: TranslationJobsService;
  let workers: Array<TranslationFakeWorker>;

  function createJob(props: { id: string; texts?: Array<string> }) {
    const { id, texts = ['Hello.', 'How are you?'] } = props;

    return service.createJob({ id, texts, sourceLanguage: 'en', targetLanguage: 'he' });
  }

  beforeEach(() => {
    workers = [];
    service = new TranslationJobsService({
      config: CONFIG,
      logger: createLoggerMock(),
      spawnWorker: () => {
        const worker: TranslationFakeWorker = new FakeWorker();
        workers.push(worker);

        return worker;
      },
    });
  });

  afterEach(async () => {
    await service.shutdown();
  });

  it('should send a new job to the worker with the language codes the model expects', () => {
    createJob({ id: 'job-1' });

    const actualResult = workers[0]?.sentMessages;

    const expectedResult = [
      {
        type: 'translate',
        task: {
          jobId: 'job-1',
          texts: ['Hello.', 'How are you?'],
          sourceLanguage: 'eng_Latn',
          targetLanguage: 'heb_Hebr',
          repo: TRANSLATION_MODEL.repo,
          approximateSizeMb: TRANSLATION_MODEL.approximateSizeMb,
          modelsDir: '/models',
          allowRemoteModels: true,
        },
      },
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should collect the translations and the progress the worker reports', () => {
    createJob({ id: 'job-1' });
    const worker = workers[0]!;

    worker.emitEvent({ type: 'stage', jobId: 'job-1', stage: 'translating' });
    worker.emitEvent({ type: 'model-download', jobId: 'job-1', loadedBytes: 5, totalBytes: 10 });
    worker.emitEvent({ type: 'translations', jobId: 'job-1', translations: ['שלום.'] });
    const job = service.getJob('job-1')!;
    const actualResult = {
      stage: job.stage,
      modelDownload: job.modelDownload,
      translations: job.translations,
      progress: job.progress,
    };

    const expectedResult = {
      stage: 'translating',
      modelDownload: { loadedBytes: 5, totalBytes: 10 },
      translations: ['שלום.'],
      progress: 0.5,
    };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should complete a job', () => {
    createJob({ id: 'job-1' });

    workers[0]?.emitEvent({ type: 'translations', jobId: 'job-1', translations: ['שלום.', 'מה שלומך?'] });
    workers[0]?.emitEvent({ type: 'completed', jobId: 'job-1' });
    const job = service.getJob('job-1')!;
    const actualResult = { status: job.status, stage: job.stage, progress: job.progress, error: job.error };

    const expectedResult = { status: 'completed', stage: 'done', progress: 1, error: null };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should fail the active job when the worker crashes', () => {
    createJob({ id: 'job-1' });

    workers[0]?.emitExit(1);
    const job = service.getJob('job-1')!;
    const actualResult = { status: job.status, error: job.error };

    const expectedResult = { status: 'failed', error: 'The translation engine stopped unexpectedly (exit code 1)' };
    expect(actualResult).toEqual(expectedResult);
  });
});

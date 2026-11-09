import { access, mkdtemp, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { createLoggerMock, FakeWorker } from '@src/lib/worker-job-queue/test-utils/fake-worker';
import { WHISPER_MODELS } from '../logic/constants';
import { TranscriptionJobsService } from './transcription-jobs.service';
import type { TranscriptionConfig } from '@src/plugins/config-service';
import type { TranscriptionWorkerEvent, TranscriptionWorkerRequest } from '../types';

type TranscriptionFakeWorker = FakeWorker<TranscriptionWorkerRequest, TranscriptionWorkerEvent>;

const CONFIG: TranscriptionConfig = {
  modelsDir: '/models',
  uploadsDir: '/uploads',
  maxUploadBytes: 1024 * 1024,
  defaultModelId: 'small',
  device: 'auto',
  allowRemoteModels: true,
  jobTtlMs: 60_000,
  maxQueuedJobs: 5,
};

async function doesFileExist(filePath: string): Promise<boolean> {
  try {
    await access(filePath);

    return true;
  } catch {
    return false;
  }
}

async function waitUntil(condition: () => Promise<boolean>) {
  const deadline = Date.now() + 2000;

  while (Date.now() < deadline) {
    const isMet = await condition();

    if (isMet) return;

    await new Promise((resolve) => setImmediate(resolve));
  }

  throw new Error('Condition was not met in time');
}

describe('TranscriptionJobsService', () => {
  let service: TranscriptionJobsService;
  let workers: Array<TranscriptionFakeWorker>;

  function createJob(props: { id: string; audioPath?: string }) {
    const { id, audioPath = `/uploads/${id}.wav` } = props;

    return service.createJob({ id, audioPath, audioDurationSec: 10, modelId: 'small', language: 'auto' });
  }

  beforeEach(() => {
    workers = [];
    service = new TranscriptionJobsService({
      config: CONFIG,
      logger: createLoggerMock(),
      spawnWorker: () => {
        const worker: TranscriptionFakeWorker = new FakeWorker();
        workers.push(worker);

        return worker;
      },
    });
  });

  afterEach(async () => {
    await service.shutdown();
  });

  it('should send a new job to the worker right away', () => {
    createJob({ id: 'job-1' });

    const actualResult = workers[0]?.sentMessages;

    const expectedResult = [
      {
        type: 'transcribe',
        task: {
          jobId: 'job-1',
          audioPath: '/uploads/job-1.wav',
          language: 'auto',
          repo: WHISPER_MODELS.small.repo,
          runtimes: WHISPER_MODELS.small.runtimes,
          modelsDir: '/models',
          allowRemoteModels: true,
        },
      },
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should mark a job as processing once the worker has it', () => {
    createJob({ id: 'job-1' });

    const actualResult = service.getJob('job-1')?.status;

    expect(actualResult).toBe('processing');
  });

  it('should keep a second job queued while the first one runs', () => {
    createJob({ id: 'job-1' });
    createJob({ id: 'job-2' });

    const actualResult = {
      queuePosition: service.getQueuePosition('job-2'),
      sentCount: workers[0]?.send.mock.calls.length,
    };

    const expectedResult = { queuePosition: 1, sentCount: 1 };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should start the next job when the active one completes', () => {
    createJob({ id: 'job-1' });
    createJob({ id: 'job-2' });

    workers[0]?.emitEvent({ type: 'completed', jobId: 'job-1' });
    const actualResult = workers[0]?.sentMessages.at(-1);

    expect(actualResult).toMatchObject({ type: 'transcribe', task: { jobId: 'job-2' } });
  });

  it('should apply the progress the worker reports', () => {
    createJob({ id: 'job-1' });
    const worker = workers[0]!;

    worker.emitEvent({ type: 'stage', jobId: 'job-1', stage: 'transcribing' });
    worker.emitEvent({ type: 'model-download', jobId: 'job-1', loadedBytes: 5, totalBytes: 10 });
    worker.emitEvent({ type: 'model-loaded', jobId: 'job-1', device: 'cpu', dtype: 'q8' });
    worker.emitEvent({ type: 'language', jobId: 'job-1', language: 'he', probability: 0.9 });
    worker.emitEvent({ type: 'words', jobId: 'job-1', words: [{ text: ' Hi', start: 0, end: 1 }], progress: 0.5 });
    const job = service.getJob('job-1')!;
    const actualResult = {
      stage: job.stage,
      modelDownload: job.modelDownload,
      device: job.device,
      language: job.language,
      languageProbability: job.languageProbability,
      words: job.words,
      progress: job.progress,
    };

    const expectedResult = {
      stage: 'transcribing',
      modelDownload: { loadedBytes: 5, totalBytes: 10 },
      device: 'cpu',
      language: 'he',
      languageProbability: 0.9,
      words: [{ text: ' Hi', start: 0, end: 1 }],
      progress: 0.5,
    };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should complete a job', () => {
    createJob({ id: 'job-1' });

    workers[0]?.emitEvent({ type: 'completed', jobId: 'job-1' });
    const job = service.getJob('job-1')!;
    const actualResult = { status: job.status, stage: job.stage, progress: job.progress, error: job.error };

    const expectedResult = { status: 'completed', stage: 'done', progress: 1, error: null };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should fail a job with the error the worker reports', () => {
    createJob({ id: 'job-1' });

    workers[0]?.emitEvent({ type: 'failed', jobId: 'job-1', message: 'Out of memory' });
    const job = service.getJob('job-1')!;
    const actualResult = { status: job.status, error: job.error };

    const expectedResult = { status: 'failed', error: 'Out of memory' };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should fail the active job when the worker crashes', () => {
    createJob({ id: 'job-1' });

    workers[0]?.emitExit(134);
    const job = service.getJob('job-1')!;
    const actualResult = { status: job.status, error: job.error };

    const expectedResult = { status: 'failed', error: 'The transcription engine stopped unexpectedly (exit code 134)' };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should run the next job on a new worker after a crash', () => {
    createJob({ id: 'job-1' });
    createJob({ id: 'job-2' });

    workers[0]?.emitExit(1);
    const actualResult = workers[1]?.sentMessages[0];

    expect(actualResult).toMatchObject({ type: 'transcribe', task: { jobId: 'job-2' } });
  });

  it('should ignore events about other jobs', () => {
    createJob({ id: 'job-1' });

    workers[0]?.emitEvent({ type: 'completed', jobId: 'job-unknown' });
    const actualResult = service.getJob('job-1')?.status;

    expect(actualResult).toBe('processing');
  });

  it('should never run a queued job that was deleted', () => {
    createJob({ id: 'job-1' });
    createJob({ id: 'job-2' });

    service.deleteJob('job-2');
    workers[0]?.emitEvent({ type: 'completed', jobId: 'job-1' });
    const actualResult = workers[0]?.send.mock.calls.length;

    expect(actualResult).toBe(1);
  });

  it('should ask the worker to cancel the active job when it is deleted', () => {
    createJob({ id: 'job-1' });

    service.deleteJob('job-1');
    const actualResult = workers[0]?.sentMessages.at(-1);

    const expectedResult = { type: 'cancel', jobId: 'job-1' };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should start the next job once the worker confirms a cancellation', () => {
    createJob({ id: 'job-1' });
    createJob({ id: 'job-2' });

    service.deleteJob('job-1');
    workers[0]?.emitEvent({ type: 'canceled', jobId: 'job-1' });
    const actualResult = workers[0]?.sentMessages.at(-1);

    expect(actualResult).toMatchObject({ type: 'transcribe', task: { jobId: 'job-2' } });
  });

  it('should report false when deleting a job that does not exist', () => {
    const actualResult = service.deleteJob('job-unknown');

    expect(actualResult).toBe(false);
  });

  it('should count queued and active jobs as pending', () => {
    createJob({ id: 'job-1' });
    createJob({ id: 'job-2' });
    createJob({ id: 'job-3' });

    service.deleteJob('job-1');
    const actualResult = service.pendingJobsCount;

    expect(actualResult).toBe(2);
  });

  it('should delete the audio file once the job finishes', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'jobs-service-'));
    const audioPath = path.join(tempDir, 'job-1.wav');
    await writeFile(audioPath, 'audio');
    createJob({ id: 'job-1', audioPath });

    workers[0]?.emitEvent({ type: 'completed', jobId: 'job-1' });
    await waitUntil(async () => !(await doesFileExist(audioPath)));
    const actualResult = await doesFileExist(audioPath);
    await rm(tempDir, { recursive: true, force: true });

    expect(actualResult).toBe(false);
  });
});

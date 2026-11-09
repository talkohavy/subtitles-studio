import { getErrorMessage } from '@src/common/utils/getErrorMessage';
import { WorkerJobEventTypes, WorkerJobRequestTypes } from '@src/lib/worker-job-queue';
import { TranslationStages, TranslationWorkerEventTypes, TranslationWorkerRequestTypes } from '../constants';
import { NllbEngine } from './nllb-engine';
import type { TranslateTask, TranslationWorkerEvent, TranslationWorkerRequest } from '../../types';

/**
 * Runs in a child process (see `TranslationJobsService`): inference blocks the event loop for up to a second per
 * sentence, and a crashing native runtime must not take the HTTP server down with it.
 */

class JobCanceledError extends Error {}

const engine = new NllbEngine();
const canceledJobIds = new Set<string>();

process.on('message', handleRequest);
process.on('disconnect', () => process.exit(0));

function handleRequest(request: TranslationWorkerRequest) {
  if (request.type === WorkerJobRequestTypes.Cancel) return void canceledJobIds.add(request.jobId);

  if (request.type === TranslationWorkerRequestTypes.Translate) void runTask(request.task);
}

function send(event: TranslationWorkerEvent) {
  process.send?.(event);
}

async function runTask(task: TranslateTask) {
  const { jobId } = task;

  try {
    await loadModel(task);

    throwIfCanceled(jobId);

    send({ type: TranslationWorkerEventTypes.Stage, jobId, stage: TranslationStages.Translating });

    await translateTexts(task);

    send({ type: WorkerJobEventTypes.Completed, jobId });
  } catch (error) {
    if (error instanceof JobCanceledError) {
      send({ type: WorkerJobEventTypes.Canceled, jobId });
    } else {
      send({ type: WorkerJobEventTypes.Failed, jobId, message: getErrorMessage(error) });
    }
  } finally {
    canceledJobIds.delete(jobId);
  }
}

async function loadModel(task: TranslateTask) {
  const { jobId, repo, approximateSizeMb, modelsDir, allowRemoteModels } = task;

  send({ type: TranslationWorkerEventTypes.Stage, jobId, stage: TranslationStages.LoadingModel });

  await engine.load({
    repo,
    approximateSizeMb,
    modelsDir,
    allowRemoteModels,
    onDownloadProgress: (progress) => send({ type: TranslationWorkerEventTypes.ModelDownload, jobId, ...progress }),
  });
}

async function translateTexts(task: TranslateTask) {
  const { jobId, texts, sourceLanguage, targetLanguage } = task;

  for (let textIndex = 0; textIndex < texts.length; textIndex++) {
    // Let pending IPC messages (cancellations) in before the next blocking inference.
    await yieldToEventLoop();
    throwIfCanceled(jobId);

    const translation = await engine.translate({ text: texts[textIndex]!, sourceLanguage, targetLanguage });

    send({ type: TranslationWorkerEventTypes.Translations, jobId, translations: [translation] });
  }
}

function throwIfCanceled(jobId: string) {
  if (canceledJobIds.has(jobId)) throw new JobCanceledError();
}

async function yieldToEventLoop() {
  await new Promise((resolve) => setImmediate(resolve));
}

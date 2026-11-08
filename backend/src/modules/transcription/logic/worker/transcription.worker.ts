import { readFile } from 'fs/promises';
import { LogLevel } from '@src/lib/logger';
import {
  AUTO_DETECT_LANGUAGE,
  TranscriptionStage,
  WHISPER_SAMPLE_RATE,
  WorkerEventTypes,
  WorkerRequestTypes,
} from '../constants';
import { decodeWav } from '../utils/audio/decodeWav';
import { downmixToMono } from '../utils/audio/downmixToMono';
import { resampleAudio } from '../utils/audio/resampleAudio';
import { normalizeWords } from '../utils/normalizeWords';
import { splitIntoSpeechWindows, type AudioWindow } from '../utils/splitIntoSpeechWindows';
import { getErrorMessage, WhisperEngine } from './whisper-engine';
import type { TranscribeTask, WorkerEvent, WorkerRequest } from '../../types';

/**
 * Runs in a child process (see `TranscriptionJobsService`): inference blocks the event loop for seconds at a time,
 * and a crashing native runtime must not take the HTTP server down with it.
 */

class JobCanceledError extends Error {}

const engine = new WhisperEngine();
const canceledJobIds = new Set<string>();

process.on('message', handleRequest);
process.on('disconnect', () => process.exit(0));

function handleRequest(request: WorkerRequest) {
  if (request.type === WorkerRequestTypes.Cancel) return void canceledJobIds.add(request.jobId);

  if (request.type === WorkerRequestTypes.Transcribe) void runTask(request.task);
}

function send(event: WorkerEvent) {
  process.send?.(event);
}

async function runTask(task: TranscribeTask) {
  const { jobId } = task;

  try {
    const samples = await loadAudio(task.audioPath);
    const windows = splitIntoSpeechWindows({ samples, sampleRate: WHISPER_SAMPLE_RATE });

    throwIfCanceled(jobId);

    await loadModel(task);

    throwIfCanceled(jobId);

    const language = await resolveLanguage({ task, samples, windows });

    send({ type: WorkerEventTypes.Stage, jobId, stage: TranscriptionStage.Transcribing });

    await transcribeWindows({ jobId, samples, windows, language });

    send({ type: WorkerEventTypes.Completed, jobId });
  } catch (error) {
    if (error instanceof JobCanceledError) {
      send({ type: WorkerEventTypes.Canceled, jobId });
    } else {
      send({ type: WorkerEventTypes.Failed, jobId, message: getErrorMessage(error) });
    }
  } finally {
    canceledJobIds.delete(jobId);
  }
}

/**
 * @returns 16kHz mono samples.
 */
async function loadAudio(audioPath: string): Promise<Float32Array> {
  const wavBuffer = await readFile(audioPath);
  const decodedAudio = decodeWav(wavBuffer);
  const monoSamples = downmixToMono(decodedAudio.channels);
  const samples = resampleAudio({
    samples: monoSamples,
    fromSampleRate: decodedAudio.sampleRate,
    toSampleRate: WHISPER_SAMPLE_RATE,
  });

  return samples;
}

async function loadModel(task: TranscribeTask) {
  const { jobId, repo, runtimes, modelsDir, allowRemoteModels } = task;

  send({ type: WorkerEventTypes.Stage, jobId, stage: TranscriptionStage.LoadingModel });

  const runtime = await engine.load({
    repo,
    runtimes,
    modelsDir,
    allowRemoteModels,
    onDownloadProgress: (progress) => send({ type: WorkerEventTypes.ModelDownload, jobId, ...progress }),
    onRuntimeFailed: ({ runtime: failedRuntime, error }) =>
      send({
        type: WorkerEventTypes.Log,
        level: LogLevel.Warn,
        message: `Could not run ${repo} on ${failedRuntime.device} (${failedRuntime.dtype}), trying the next option: ${getErrorMessage(error)}`,
      }),
  });

  send({ type: WorkerEventTypes.ModelLoaded, jobId, device: runtime.device, dtype: runtime.dtype });
}

type ResolveLanguageProps = {
  task: TranscribeTask;
  samples: Float32Array;
  windows: Array<AudioWindow>;
};

async function resolveLanguage(props: ResolveLanguageProps): Promise<string> {
  const { task, samples, windows } = props;
  const { jobId } = task;

  if (task.language !== AUTO_DETECT_LANGUAGE) {
    if (!engine.supportsLanguage(task.language)) {
      throw new Error(`This model can't transcribe the "${task.language}" language. Try another model`);
    }

    send({ type: WorkerEventTypes.Language, jobId, language: task.language, probability: null });

    return task.language;
  }

  if (windows.length === 0) {
    send({ type: WorkerEventTypes.Language, jobId, language: 'en', probability: null });

    return 'en';
  }

  send({ type: WorkerEventTypes.Stage, jobId, stage: TranscriptionStage.DetectingLanguage });

  const windowSamples = windows.map((window) => samples.subarray(window.start, window.end));
  const { language, probability } = await engine.detectLanguage({ windows: windowSamples });

  send({ type: WorkerEventTypes.Language, jobId, language, probability });

  return language;
}

type TranscribeWindowsProps = {
  jobId: string;
  samples: Float32Array;
  windows: Array<AudioWindow>;
  language: string;
};

async function transcribeWindows(props: TranscribeWindowsProps) {
  const { jobId, samples, windows, language } = props;

  const totalSamples = windows.reduce((sum, window) => sum + (window.end - window.start), 0);
  let processedSamples = 0;

  if (windows.length === 0) {
    send({ type: WorkerEventTypes.Words, jobId, words: [], progress: 1 });
    return;
  }

  for (let windowIndex = 0; windowIndex < windows.length; windowIndex++) {
    // Let pending IPC messages (cancellations) in before the next blocking inference.
    await yieldToEventLoop();
    throwIfCanceled(jobId);

    const window = windows[windowIndex]!;
    const chunks = await engine.transcribe({ samples: samples.subarray(window.start, window.end), language });
    const words = normalizeWords({
      chunks,
      windowStartSec: window.start / WHISPER_SAMPLE_RATE,
      windowEndSec: window.end / WHISPER_SAMPLE_RATE,
      language,
    });

    processedSamples += window.end - window.start;

    send({ type: WorkerEventTypes.Words, jobId, words, progress: processedSamples / totalSamples });
  }
}

function throwIfCanceled(jobId: string) {
  if (canceledJobIds.has(jobId)) throw new JobCanceledError();
}

async function yieldToEventLoop() {
  await new Promise((resolve) => setImmediate(resolve));
}

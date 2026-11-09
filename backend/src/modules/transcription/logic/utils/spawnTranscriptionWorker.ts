import { fork } from 'child_process';
import path from 'path';
import type { TranscriptionWorkerProcess } from '../../types';

/**
 * In development the server runs from TypeScript sources through tsx, so the worker does too. The production
 * build bundles the worker into its own file next to the server bundle (see `build.config.mjs`).
 */
export function spawnTranscriptionWorker(): TranscriptionWorkerProcess {
  const isTypeScriptRuntime = __filename.endsWith('.ts');

  const workerPath = isTypeScriptRuntime
    ? path.join(__dirname, '..', 'worker', 'transcription.worker.ts')
    : path.join(__dirname, 'transcription.worker.js');
  const execArgv = isTypeScriptRuntime ? ['--import', 'tsx'] : [];

  const worker = fork(workerPath, [], { execArgv, serialization: 'advanced' });

  return worker;
}

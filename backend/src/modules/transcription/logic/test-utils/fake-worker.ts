import { EventEmitter } from 'events';
import type { WorkerEvent, WorkerProcess, WorkerRequest } from '../../types';

/**
 * Test double for the transcription worker process: records what it's sent and lets tests emit its events.
 */
export class FakeWorker extends EventEmitter implements WorkerProcess {
  connected = true;
  readonly sentMessages: Array<WorkerRequest> = [];

  send = jest.fn((message: WorkerRequest) => {
    this.sentMessages.push(message);

    return true;
  });

  kill = jest.fn(() => {
    this.connected = false;

    return true;
  });

  emitEvent(event: WorkerEvent) {
    this.emit('message', event);
  }

  emitExit(code: number | null) {
    this.connected = false;
    this.emit('exit', code, null);
  }
}

export function createLoggerMock() {
  return {
    debug: jest.fn(),
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
  };
}

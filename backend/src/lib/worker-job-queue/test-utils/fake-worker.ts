import { EventEmitter } from 'events';
import type { WorkerProcess } from '../types';

/**
 * Test double for a worker process: records what it's sent and lets tests emit its events.
 */
export class FakeWorker<TRequest = unknown, TEvent = unknown>
  extends EventEmitter
  implements WorkerProcess<TRequest, TEvent>
{
  connected = true;
  readonly sentMessages: Array<TRequest> = [];

  send = jest.fn((message: TRequest) => {
    this.sentMessages.push(message);

    return true;
  });

  kill = jest.fn(() => {
    this.connected = false;

    return true;
  });

  emitEvent(event: TEvent) {
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

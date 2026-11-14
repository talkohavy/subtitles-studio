import { EventEmitter } from 'events';
import { vi } from 'vite-plus/test';
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

  send = vi.fn((message: TRequest) => {
    this.sentMessages.push(message);

    return true;
  });

  kill = vi.fn(() => {
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
    debug: vi.fn(),
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  };
}

import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { ApiError } from './api-error';
import { createTranscription } from './transcriptionApi';

const HTML_PAGE = '<!doctype html><html><body>Bad gateway</body></html>';

function stubXhrResponse(response: { status: number; responseText: string }) {
  class FakeXMLHttpRequest {
    status = 0;
    responseText = '';
    upload = { onprogress: null };
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onabort: (() => void) | null = null;

    open() {}

    setRequestHeader() {}

    abort() {
      this.onabort?.();
    }

    send() {
      queueMicrotask(() => {
        Object.assign(this, response);
        this.onload?.();
      });
    }
  }

  vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest);
}

function startUpload() {
  const upload = createTranscription({
    wav: new ArrayBuffer(8),
    language: 'auto',
    modelId: null,
    onUploadProgress: () => {},
    signal: new AbortController().signal,
  });

  return upload;
}

describe('createTranscription', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should return the queued job', async () => {
    stubXhrResponse({ status: 202, responseText: JSON.stringify({ id: 'job-1' }) });

    const actualResult = await startUpload();

    expect(actualResult).toEqual({ id: 'job-1' });
  });

  it('should fail, not hang, when a successful reply isn’t JSON', async () => {
    stubXhrResponse({ status: 200, responseText: HTML_PAGE });

    const actualResult = await startUpload().catch((error: unknown) => error);

    expect(actualResult).toBeInstanceOf(ApiError);
    expect((actualResult as ApiError).message).toBe('The server sent a reply the app couldn’t read.');
  });
});

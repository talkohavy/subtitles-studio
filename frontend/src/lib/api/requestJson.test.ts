import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { ApiError } from './api-error';
import { requestJson } from './requestJson';

describe('requestJson', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should fail with a readable error when a successful reply isn’t JSON', async () => {
    vi.stubGlobal('fetch', async () => new Response('<!doctype html><html></html>', { status: 200 }));

    const actualResult = await requestJson({ url: '/api/transcription-options' }).catch((error: unknown) => error);

    expect(actualResult).toBeInstanceOf(ApiError);
    expect((actualResult as ApiError).message).toBe('The server sent a reply the app couldn’t read.');
  });
});

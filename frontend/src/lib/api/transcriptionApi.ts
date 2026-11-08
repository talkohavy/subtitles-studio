import { toApiError } from './api-error';
import type { TranscriptionJob, TranscriptionOptions } from './types';

const API_PATHS = {
  transcriptions: '/api/transcriptions',
  transcriptionOptions: '/api/transcription-options',
} as const;

type RequestJsonProps = {
  url: string;
  method?: 'GET' | 'DELETE';
  signal?: AbortSignal;
};

async function requestJson<T>(props: RequestJsonProps): Promise<T> {
  const { url, method = 'GET', signal } = props;

  let response: Response;

  try {
    response = await fetch(url, { method, signal, headers: { Accept: 'application/json' } });
  } catch (error) {
    signal?.throwIfAborted();
    throw toApiError({ status: 0, body: String(error) });
  }

  const body = await response.text();

  if (!response.ok) throw toApiError({ status: response.status, body });

  return JSON.parse(body) as T;
}

export async function fetchTranscriptionOptions(signal?: AbortSignal): Promise<TranscriptionOptions> {
  const options = await requestJson<TranscriptionOptions>({ url: API_PATHS.transcriptionOptions, signal });

  return options;
}

type CreateTranscriptionProps = {
  wav: ArrayBuffer;
  /**
   * A language code, or `auto`.
   */
  language: string;
  modelId: string | null;
  /**
   * Called with a number from 0 to 1 as the audio uploads.
   */
  onUploadProgress: (progress: number) => void;
  signal: AbortSignal;
};

/**
 * Uploads the audio and queues its transcription. Uses XHR, since `fetch` can't report upload progress.
 */
export async function createTranscription(props: CreateTranscriptionProps): Promise<TranscriptionJob> {
  const { wav, language, modelId, onUploadProgress, signal } = props;

  signal.throwIfAborted();

  const query = new URLSearchParams({ language });

  if (modelId) query.set('model', modelId);

  const job = await new Promise<TranscriptionJob>((resolve, reject) => {
    const request = new XMLHttpRequest();

    function abort() {
      request.abort();
    }

    request.open('POST', `${API_PATHS.transcriptions}?${query}`);
    request.setRequestHeader('Content-Type', 'audio/wav');
    request.setRequestHeader('Accept', 'application/json');
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onUploadProgress(event.loaded / event.total);
    };
    request.onload = () => {
      signal.removeEventListener('abort', abort);

      if (request.status >= 200 && request.status < 300) {
        resolve(JSON.parse(request.responseText) as TranscriptionJob);
      } else {
        reject(toApiError({ status: request.status, body: request.responseText }));
      }
    };
    request.onerror = () => {
      signal.removeEventListener('abort', abort);
      reject(toApiError({ status: 0, body: '' }));
    };
    request.onabort = () => reject(signal.reason);

    signal.addEventListener('abort', abort, { once: true });
    request.send(wav);
  });

  return job;
}

type FetchTranscriptionProps = {
  id: string;
  /**
   * Only words from this index onward are returned.
   */
  wordsFrom: number;
  signal: AbortSignal;
};

export async function fetchTranscription(props: FetchTranscriptionProps): Promise<TranscriptionJob> {
  const { id, wordsFrom, signal } = props;

  const url = `${API_PATHS.transcriptions}/${encodeURIComponent(id)}?wordsFrom=${wordsFrom}`;
  const job = await requestJson<TranscriptionJob>({ url, signal });

  return job;
}

/**
 * Cancels a transcription. Best effort: `keepalive` lets it finish even if the page is closing.
 */
export async function cancelTranscription(id: string): Promise<void> {
  const url = `${API_PATHS.transcriptions}/${encodeURIComponent(id)}`;

  try {
    await fetch(url, { method: 'DELETE', keepalive: true });
  } catch {
    // The server drops abandoned transcriptions on its own.
  }
}

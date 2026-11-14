import { parseApiResponse, toApiError } from './api-error';
import { deleteInBackground, requestJson } from './requestJson';
import type { TranscriptionJobDto, TranscriptionOptionsDto } from '@subtitles-studio/shared';

const API_PATHS = {
  transcriptions: '/api/transcriptions',
  transcriptionOptions: '/api/transcription-options',
} as const;

export async function fetchTranscriptionOptions(signal?: AbortSignal): Promise<TranscriptionOptionsDto> {
  const options = await requestJson<TranscriptionOptionsDto>({ url: API_PATHS.transcriptionOptions, signal });

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
export async function createTranscription(props: CreateTranscriptionProps): Promise<TranscriptionJobDto> {
  const { wav, language, modelId, onUploadProgress, signal } = props;

  signal.throwIfAborted();

  const query = new URLSearchParams({ language });

  if (modelId) query.set('model', modelId);

  const job = await new Promise<TranscriptionJobDto>((resolve, reject) => {
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

      const { status, responseText: body } = request;

      if (status < 200 || status >= 300) {
        reject(toApiError({ status, body }));
        return;
      }

      try {
        resolve(parseApiResponse<TranscriptionJobDto>({ status, body }));
      } catch (error) {
        reject(error);
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

export async function fetchTranscription(props: FetchTranscriptionProps): Promise<TranscriptionJobDto> {
  const { id, wordsFrom, signal } = props;

  const url = `${API_PATHS.transcriptions}/${encodeURIComponent(id)}?wordsFrom=${wordsFrom}`;
  const job = await requestJson<TranscriptionJobDto>({ url, signal });

  return job;
}

export async function cancelTranscription(id: string): Promise<void> {
  await deleteInBackground(`${API_PATHS.transcriptions}/${encodeURIComponent(id)}`);
}

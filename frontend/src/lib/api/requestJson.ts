import { toApiError } from './api-error';

type RequestJsonProps = {
  url: string;
  method?: 'GET' | 'POST' | 'DELETE';
  /**
   * Sent as JSON.
   */
  body?: unknown;
  signal?: AbortSignal;
};

export async function requestJson<T>(props: RequestJsonProps): Promise<T> {
  const { url, method = 'GET', body, signal } = props;

  const hasBody = body !== undefined;
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (hasBody) headers['Content-Type'] = 'application/json';

  let response: Response;

  try {
    response = await fetch(url, { method, signal, headers, body: hasBody ? JSON.stringify(body) : undefined });
  } catch (error) {
    signal?.throwIfAborted();
    throw toApiError({ status: 0, body: String(error) });
  }

  const responseBody = await response.text();

  if (!response.ok) throw toApiError({ status: response.status, body: responseBody });

  return JSON.parse(responseBody) as T;
}

/**
 * Best effort: `keepalive` lets the request finish even if the page is closing, and failures are ignored.
 */
export async function deleteInBackground(url: string): Promise<void> {
  try {
    await fetch(url, { method: 'DELETE', keepalive: true });
  } catch {
    // The server drops abandoned jobs on its own.
  }
}

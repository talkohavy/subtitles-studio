import { parseJson } from '@src/common/utils/parseJson';

export class ApiError extends Error {
  readonly status: number;

  constructor(props: { message: string; status: number }) {
    const { message, status } = props;

    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * The backend answers errors with `{ statusCode, message }`.
 */
export function toApiError(props: { status: number; body: string }): ApiError {
  const { status, body } = props;

  const parsedBody = parseJson<{ message?: unknown }>(body);
  const serverMessage = typeof parsedBody?.message === 'string' ? parsedBody.message : null;
  const message = serverMessage ?? getFallbackMessage(status);

  return new ApiError({ message, status });
}

/**
 * Reads a successful response's JSON body.
 *
 * @throws {ApiError} when the body isn't JSON (e.g. an HTML page from a proxy).
 */
export function parseApiResponse<T>(props: { status: number; body: string }): T {
  const { status, body } = props;

  const parsedBody = parseJson<T>(body);

  if (parsedBody === null) throw new ApiError({ message: 'The server sent a reply the app couldn’t read.', status });

  return parsedBody;
}

function getFallbackMessage(status: number): string {
  if (status === 0) return 'Can’t reach the server. Check that the backend is running.';

  if (status === 502 || status === 503 || status === 504) return 'The server is unavailable. Try again in a moment.';

  return `The server answered with an error (${status}).`;
}

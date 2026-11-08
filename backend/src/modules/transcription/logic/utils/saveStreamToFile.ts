import { createWriteStream } from 'fs';
import { Transform, type Readable, type TransformCallback } from 'stream';
import { pipeline } from 'stream/promises';

export class MaxBytesExceededError extends Error {
  constructor(maxBytes: number) {
    super(`The upload exceeds the limit of ${maxBytes} bytes`);
    this.name = MaxBytesExceededError.name;
  }
}

type SaveStreamToFileProps = {
  stream: Readable;
  filePath: string;
  maxBytes: number;
};

/**
 * Streams to disk, so even large uploads never sit in memory.
 *
 * @returns The number of bytes written.
 * @throws {MaxBytesExceededError} As soon as the stream goes over `maxBytes`.
 */
export async function saveStreamToFile(props: SaveStreamToFileProps): Promise<number> {
  const { stream, filePath, maxBytes } = props;

  let bytesWritten = 0;

  const byteLimiter = new Transform({
    transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback) {
      bytesWritten += chunk.length;

      if (bytesWritten > maxBytes) return void callback(new MaxBytesExceededError(maxBytes));

      callback(null, chunk);
    },
  });

  await pipeline(stream, byteLimiter, createWriteStream(filePath));

  return bytesWritten;
}

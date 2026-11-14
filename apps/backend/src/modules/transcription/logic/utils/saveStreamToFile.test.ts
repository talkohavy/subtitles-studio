import { mkdtemp, readFile, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { Readable } from 'stream';
import { MaxBytesExceededError, saveStreamToFile } from './saveStreamToFile';

describe('saveStreamToFile', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'save-stream-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should write the stream to the file and return its size', async () => {
    const filePath = path.join(tempDir, 'audio.wav');
    const stream = Readable.from([Buffer.from('hello '), Buffer.from('world')]);

    const bytesWritten = await saveStreamToFile({ stream, filePath, maxBytes: 100 });
    const content = await readFile(filePath, 'utf-8');
    const actualResult = { bytesWritten, content };

    const expectedResult = { bytesWritten: 11, content: 'hello world' };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should reject a stream larger than the limit', async () => {
    const filePath = path.join(tempDir, 'audio.wav');
    const stream = Readable.from([Buffer.alloc(60), Buffer.alloc(60)]);

    const actualResult = saveStreamToFile({ stream, filePath, maxBytes: 100 });

    await expect(actualResult).rejects.toBeInstanceOf(MaxBytesExceededError);
  });
});

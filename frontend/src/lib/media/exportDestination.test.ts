import { EncodedPacket, EncodedVideoPacketSource, Mp4OutputFormat, Output } from 'mediabunny';
import { describe, expect, it, vi } from 'vite-plus/test';
import { createFileDestination } from './exportDestination';
import type { ExportDestination } from './exportDestination';

function createFakeFileHandle() {
  const fileStream = {
    write: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
    abort: vi.fn(async () => {}),
  };
  const fileHandle = {
    name: 'clip-subtitled.mp4',
    createWritable: vi.fn(async () => fileStream),
    remove: vi.fn(async () => {}),
  };

  return { fileHandle: fileHandle as unknown as FileSystemFileHandle, fileStream, remove: fileHandle.remove };
}

async function startOutput(destination: ExportDestination) {
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: false }), target: destination.target });
  const source = new EncodedVideoPacketSource('vp9');
  output.addVideoTrack(source);
  await output.start();
  await source.add(new EncodedPacket(new Uint8Array(1000), 'key', 0, 1 / 30), {
    decoderConfig: { codec: 'vp09.00.10.08', codedWidth: 16, codedHeight: 16 },
  });

  return output;
}

describe('createFileDestination', () => {
  it('should save the file once the video is finished', async () => {
    const { fileHandle, fileStream, remove } = createFakeFileHandle();
    const destination = await createFileDestination(fileHandle);

    const output = await startOutput(destination);
    await output.finalize();
    const result = await destination.finish();
    const actualResult = {
      type: result.type,
      fileName: result.type === 'file' ? result.fileName : null,
      hasSize: result.type === 'file' && result.size > 1000,
      wasWritten: fileStream.write.mock.calls.length > 0,
      closeCalls: fileStream.close.mock.calls.length,
      removeCalls: remove.mock.calls.length,
    };

    const expectedResult = {
      type: 'file',
      fileName: 'clip-subtitled.mp4',
      hasSize: true,
      wasWritten: true,
      closeCalls: 1,
      removeCalls: 0,
    };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should leave no file behind when the export is canceled', async () => {
    const { fileHandle, fileStream, remove } = createFakeFileHandle();
    const destination = await createFileDestination(fileHandle);

    const output = await startOutput(destination);
    await output.cancel();
    await destination.discard();
    const actualResult = {
      closeCalls: fileStream.close.mock.calls.length,
      abortCalls: fileStream.abort.mock.calls.length,
      removeCalls: remove.mock.calls.length,
    };

    const expectedResult = { closeCalls: 0, abortCalls: 1, removeCalls: 1 };
    expect(actualResult).toEqual(expectedResult);
  });
});

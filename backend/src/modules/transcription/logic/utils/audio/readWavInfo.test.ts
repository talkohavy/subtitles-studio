import { InvalidAudioError } from './invalid-audio.error';
import { readWavInfo } from './readWavInfo';
import { createWavBuffer } from './test-utils/createWavBuffer';

describe('readWavInfo', () => {
  it('should read the format of a 16-bit mono PCM file', () => {
    const buffer = createWavBuffer({ channels: [new Array(16_000).fill(0)], sampleRate: 16_000 });

    const actualResult = readWavInfo({ buffer });

    const expectedResult = {
      sampleFormat: 'pcm',
      channelCount: 1,
      sampleRate: 16_000,
      bitsPerSample: 16,
      blockAlign: 2,
      dataOffset: 44,
      dataLength: 32_000,
      durationSec: 1,
    };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should find the data chunk after other chunks', () => {
    const buffer = createWavBuffer({
      channels: [new Array(100).fill(0)],
      sampleRate: 8000,
      extraChunks: [{ id: 'LIST', data: Buffer.from('INFOISFT') }],
    });

    const actualResult = readWavInfo({ buffer }).dataOffset;

    expect(actualResult).toBe(44 + 8 + 8);
  });

  it('should read float samples', () => {
    const buffer = createWavBuffer({ channels: [[0.5], [0.5]], sampleRate: 48_000, bitsPerSample: 32, isFloat: true });

    const actualResult = readWavInfo({ buffer }).sampleFormat;

    expect(actualResult).toBe('float');
  });

  it('should use the actual file size when a streaming writer left the data size unknown', () => {
    const buffer = createWavBuffer({
      channels: [new Array(1000).fill(0)],
      sampleRate: 1000,
      declaredDataSize: 0xffffffff,
    });

    const actualResult = readWavInfo({ buffer }).durationSec;

    expect(actualResult).toBe(1);
  });

  it('should compute the duration from the file size when only the header was read', () => {
    const buffer = createWavBuffer({ channels: [new Array(10).fill(0)], sampleRate: 1000, declaredDataSize: 4000 });
    const header = buffer.subarray(0, 44);

    const actualResult = readWavInfo({ buffer: header, fileSize: 44 + 4000 }).durationSec;

    expect(actualResult).toBe(2);
  });

  it('should ignore a trailing partial frame', () => {
    const buffer = createWavBuffer({ channels: [[0, 0, 0]], sampleRate: 1000 });
    const truncated = buffer.subarray(0, buffer.length - 1);

    const actualResult = readWavInfo({ buffer: truncated }).dataLength;

    expect(actualResult).toBe(4);
  });

  it('should reject a file that is not a WAV file', () => {
    const buffer = Buffer.from('ID3 this is an mp3 file, not a wav file');

    function actualResult() {
      readWavInfo({ buffer });
    }

    expect(actualResult).toThrow(InvalidAudioError);
  });

  it('should reject a compressed WAV file', () => {
    const buffer = createWavBuffer({ channels: [[0]], sampleRate: 8000 });
    buffer.writeUInt16LE(0x0055, 20); // MPEG layer 3

    function actualResult() {
      readWavInfo({ buffer });
    }

    expect(actualResult).toThrow(/Unsupported WAV encoding/);
  });

  it('should reject a file without a data chunk', () => {
    const buffer = createWavBuffer({ channels: [[0]], sampleRate: 8000 }).subarray(0, 36);

    function actualResult() {
      readWavInfo({ buffer });
    }

    expect(actualResult).toThrow(/no "data" chunk/);
  });
});

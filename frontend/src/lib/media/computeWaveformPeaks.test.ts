import { describe, expect, it } from 'vite-plus/test';
import { computeWaveformPeaks } from './computeWaveformPeaks';

const HEADER_BYTES = 44;
const PCM_FORMAT = 1;
const BYTES_PER_SAMPLE = 2;

type MakeWavProps = {
  /**
   * 16-bit samples, interleaved when there are several channels.
   */
  samples: Array<number>;
  sampleRate: number;
  channelCount?: number;
  /**
   * Only written to the header; the samples are always stored as 16-bit.
   */
  bitsPerSample?: number;
};

function makeWav(props: MakeWavProps): ArrayBuffer {
  const { samples, sampleRate, channelCount = 1, bitsPerSample = 16 } = props;

  const dataLength = samples.length * BYTES_PER_SAMPLE;
  const buffer = new ArrayBuffer(HEADER_BYTES + dataLength);
  const view = new DataView(buffer);

  writeChunkId({ view, offset: 0, chunkId: 'RIFF' });
  view.setUint32(4, HEADER_BYTES - 8 + dataLength, true);
  writeChunkId({ view, offset: 8, chunkId: 'WAVE' });
  writeChunkId({ view, offset: 12, chunkId: 'fmt ' });
  view.setUint32(16, 16, true);
  view.setUint16(20, PCM_FORMAT, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channelCount * BYTES_PER_SAMPLE, true);
  view.setUint16(32, channelCount * BYTES_PER_SAMPLE, true);
  view.setUint16(34, bitsPerSample, true);
  writeChunkId({ view, offset: 36, chunkId: 'data' });
  view.setUint32(40, dataLength, true);
  samples.forEach((sample, index) => view.setInt16(HEADER_BYTES + index * BYTES_PER_SAMPLE, sample, true));

  return buffer;
}

function writeChunkId(props: { view: DataView; offset: number; chunkId: string }) {
  const { view, offset, chunkId } = props;

  Array.from(chunkId).forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
}

describe('computeWaveformPeaks', () => {
  it('should keep the loudest sample of each slice, relative to the loudest moment', () => {
    const wav = makeWav({ samples: [100, -200, 50, 400], sampleRate: 4 });

    const waveform = computeWaveformPeaks({ wav, peaksPerSecond: 2 });
    const actualResult = { peaks: Array.from(waveform?.peaks ?? []), peaksPerSecond: waveform?.peaksPerSecond };

    const expectedResult = { peaks: [0.5, 1], peaksPerSecond: 2 };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should read the first channel of stereo audio', () => {
    const wav = makeWav({ samples: [100, 9000, 200, 9000], sampleRate: 2, channelCount: 2 });

    const waveform = computeWaveformPeaks({ wav, peaksPerSecond: 2 });
    const actualResult = Array.from(waveform?.peaks ?? []);

    expect(actualResult).toEqual([0.5, 1]);
  });

  it('should leave silence at zero', () => {
    const wav = makeWav({ samples: [0, 0, 0, 0], sampleRate: 4 });

    const waveform = computeWaveformPeaks({ wav, peaksPerSecond: 2 });
    const actualResult = Array.from(waveform?.peaks ?? []);

    expect(actualResult).toEqual([0, 0]);
  });

  it('should return null for anything but 16-bit PCM WAV', () => {
    const eightBitWav = makeWav({ samples: [0, 0], sampleRate: 4, bitsPerSample: 8 });
    const notWav = new ArrayBuffer(64);

    const actualResult = [
      computeWaveformPeaks({ wav: eightBitWav, peaksPerSecond: 2 }),
      computeWaveformPeaks({ wav: notWav, peaksPerSecond: 2 }),
    ];

    expect(actualResult).toEqual([null, null]);
  });
});

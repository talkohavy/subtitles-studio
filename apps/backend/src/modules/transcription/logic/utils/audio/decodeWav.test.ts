import { decodeWav } from './decodeWav';
import { createWavBuffer } from './test-utils/createWavBuffer';

function roundSamples(samples: Float32Array): Array<number> {
  return Array.from(samples, (sample) => Math.round(sample * 100) / 100);
}

describe('decodeWav', () => {
  it('should decode 16-bit stereo samples into one array per channel', () => {
    const buffer = createWavBuffer({
      channels: [
        [0.5, -0.5],
        [0.25, 1],
      ],
      sampleRate: 8000,
    });

    const decodedAudio = decodeWav(buffer);
    const actualResult = { sampleRate: decodedAudio.sampleRate, channels: decodedAudio.channels.map(roundSamples) };

    const expectedResult = {
      sampleRate: 8000,
      channels: [
        [0.5, -0.5],
        [0.25, 1],
      ],
    };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should decode 8-bit unsigned samples', () => {
    const buffer = createWavBuffer({ channels: [[0, 1, -1]], sampleRate: 8000, bitsPerSample: 8 });

    const actualResult = roundSamples(decodeWav(buffer).channels[0]!);

    expect(actualResult).toEqual([0, 0.99, -0.99]);
  });

  it('should decode 24-bit samples', () => {
    const buffer = createWavBuffer({ channels: [[0.75, -0.75]], sampleRate: 8000, bitsPerSample: 24 });

    const actualResult = roundSamples(decodeWav(buffer).channels[0]!);

    expect(actualResult).toEqual([0.75, -0.75]);
  });

  it('should decode 32-bit integer samples', () => {
    const buffer = createWavBuffer({ channels: [[0.1, -0.9]], sampleRate: 8000, bitsPerSample: 32 });

    const actualResult = roundSamples(decodeWav(buffer).channels[0]!);

    expect(actualResult).toEqual([0.1, -0.9]);
  });

  it('should decode 32-bit float samples', () => {
    const buffer = createWavBuffer({ channels: [[0.123, -0.456]], sampleRate: 8000, bitsPerSample: 32, isFloat: true });

    const actualResult = Array.from(decodeWav(buffer).channels[0]!, (sample) => Math.round(sample * 1000) / 1000);

    expect(actualResult).toEqual([0.123, -0.456]);
  });
});

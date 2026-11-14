import { resampleAudio } from './resampleAudio';

describe('resampleAudio', () => {
  it('should return the input when the sample rates match', () => {
    const samples = Float32Array.from([0.1, 0.2, 0.3]);

    const actualResult = resampleAudio({ samples, fromSampleRate: 16_000, toSampleRate: 16_000 });

    expect(actualResult).toBe(samples);
  });

  it('should average each group of samples when downsampling', () => {
    const samples = Float32Array.from([1, 0, 0, 1, 1, 1]);

    const actualResult = Array.from(resampleAudio({ samples, fromSampleRate: 48_000, toSampleRate: 16_000 }));

    expect(actualResult).toEqual([Math.fround(1 / 3), 1]);
  });

  it('should produce the expected number of samples for a fractional ratio', () => {
    const samples = new Float32Array(44_100);

    const actualResult = resampleAudio({ samples, fromSampleRate: 44_100, toSampleRate: 16_000 }).length;

    expect(actualResult).toBe(16_000);
  });

  it('should interpolate linearly when upsampling', () => {
    const samples = Float32Array.from([0, 1]);

    const actualResult = Array.from(resampleAudio({ samples, fromSampleRate: 8000, toSampleRate: 16_000 }));

    expect(actualResult).toEqual([0, 0.5, 1, 1]);
  });
});

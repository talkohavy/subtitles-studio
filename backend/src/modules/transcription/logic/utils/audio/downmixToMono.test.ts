import { downmixToMono } from './downmixToMono';

describe('downmixToMono', () => {
  it('should return a mono input as is', () => {
    const mono = Float32Array.from([0.1, 0.2]);

    const actualResult = downmixToMono([mono]);

    expect(actualResult).toBe(mono);
  });

  it('should average the channels', () => {
    const left = Float32Array.from([1, 0, 0.5]);
    const right = Float32Array.from([0, 0, -0.5]);

    const actualResult = Array.from(downmixToMono([left, right]));

    expect(actualResult).toEqual([0.5, 0, 0]);
  });

  it('should stop at the shortest channel', () => {
    const left = Float32Array.from([1, 1, 1]);
    const right = Float32Array.from([1, 1]);

    const actualResult = downmixToMono([left, right]).length;

    expect(actualResult).toBe(2);
  });
});

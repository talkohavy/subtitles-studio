import { describe, expect, it } from 'vite-plus/test';
import { isOverSizeLimit } from './exportVideo';

const MAX_BYTES = 1000;

describe('isOverSizeLimit', () => {
  it('should not guess the final size too early', () => {
    const actualResult = isOverSizeLimit({ writtenBytes: 40, progress: 0.01, maxBytes: MAX_BYTES });

    expect(actualResult).toBe(false);
  });

  it('should tell when the video is on track to get too large', () => {
    const actualResult = [
      isOverSizeLimit({ writtenBytes: 400, progress: 0.5, maxBytes: MAX_BYTES }),
      isOverSizeLimit({ writtenBytes: 600, progress: 0.5, maxBytes: MAX_BYTES }),
    ];

    const expectedResult = [false, true];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should tell when the video already is too large', () => {
    const actualResult = isOverSizeLimit({ writtenBytes: 1001, progress: 0.01, maxBytes: MAX_BYTES });

    expect(actualResult).toBe(true);
  });
});

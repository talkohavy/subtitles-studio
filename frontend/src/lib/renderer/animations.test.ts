import { describe, expect, it } from 'vite-plus/test';
import { getEntranceTransform, getWordPopScale } from './animations';
import { EntranceAnimations } from './types';

const IDLE_TRANSFORM = { opacity: 1, scale: 1, offsetY: 0 };

describe('getEntranceTransform', () => {
  it('should not animate without an entrance animation', () => {
    const actualResult = getEntranceTransform({ animation: EntranceAnimations.None, elapsed: 0 });

    expect(actualResult).toEqual(IDLE_TRANSFORM);
  });

  it('should be idle once the entrance is over', () => {
    const actualResult = getEntranceTransform({ animation: EntranceAnimations.Pop, elapsed: 1 });

    expect(actualResult).toEqual(IDLE_TRANSFORM);
  });

  it('should fade in over time', () => {
    const actualResult = getEntranceTransform({ animation: EntranceAnimations.Fade, elapsed: 0.1 });

    const expectedResult = { opacity: 0.5, scale: 1, offsetY: 0 };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should start a pop small and transparent', () => {
    const actualResult = getEntranceTransform({ animation: EntranceAnimations.Pop, elapsed: 0 });

    const expectedResult = { opacity: 0, scale: expect.closeTo(0.6), offsetY: 0 };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should start a slide below the caption’s place', () => {
    const actualResult = getEntranceTransform({ animation: EntranceAnimations.SlideUp, elapsed: 0 });

    const expectedResult = { opacity: 0, scale: 1, offsetY: 0.5 };
    expect(actualResult).toEqual(expectedResult);
  });
});

describe('getWordPopScale', () => {
  it('should grow from the normal size to the target size', () => {
    const actualResult = [
      getWordPopScale({ elapsed: 0, targetScale: 1.2 }),
      getWordPopScale({ elapsed: 0.5, targetScale: 1.2 }),
    ];

    expect(actualResult).toEqual([expect.closeTo(1), expect.closeTo(1.2)]);
  });

  it('should overshoot the target a little before settling', () => {
    const actualResult = getWordPopScale({ elapsed: 0.06, targetScale: 1.2 });

    expect(actualResult).toBeGreaterThan(1.2);
  });
});

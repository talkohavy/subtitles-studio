import { describe, expect, it } from 'vite-plus/test';
import { getNextCueStart, getPreviousCueStart } from './cueNavigation';
import type { Cue } from './types';

const CUES: Array<Cue> = [
  { id: 'a', start: 1, end: 2, text: 'a', words: [] },
  { id: 'b', start: 3, end: 4, text: 'b', words: [] },
  { id: 'c', start: 5, end: 6, text: 'c', words: [] },
];

describe('getPreviousCueStart', () => {
  it('should go back to the start of the current caption', () => {
    const actualResult = getPreviousCueStart({ cues: CUES, time: 3.5 });

    expect(actualResult).toBe(3);
  });

  it('should go to the caption before when the current one has just started', () => {
    const actualResult = getPreviousCueStart({ cues: CUES, time: 3.1 });

    expect(actualResult).toBe(1);
  });

  it('should find nothing before the first caption', () => {
    const actualResult = getPreviousCueStart({ cues: CUES, time: 0.5 });

    expect(actualResult).toBeNull();
  });
});

describe('getNextCueStart', () => {
  it('should go to the start of the next caption', () => {
    const actualResult = [getNextCueStart({ cues: CUES, time: 3.5 }), getNextCueStart({ cues: CUES, time: 0 })];

    expect(actualResult).toEqual([5, 1]);
  });

  it('should find nothing after the last caption', () => {
    const actualResult = getNextCueStart({ cues: CUES, time: 5 });

    expect(actualResult).toBeNull();
  });
});

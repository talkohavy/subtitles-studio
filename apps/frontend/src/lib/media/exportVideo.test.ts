import { describe, expect, it } from 'vite-plus/test';
import { isOverSizeLimit, shiftCues } from './exportVideo';
import type { Cue } from '@src/lib/subtitles/types';

const MAX_BYTES = 1000;

function createCue(props: { id: string; start: number; end: number }): Cue {
  const { id, start, end } = props;

  return { id, start, end, text: id, words: [] };
}

function toTimings(cues: ReadonlyArray<Cue>) {
  return cues.map(({ id, start, end }) => ({ id, start, end }));
}

describe('shiftCues', () => {
  it('should move the cues by the offset', () => {
    const cues = [createCue({ id: 'a', start: 2, end: 3 }), createCue({ id: 'b', start: 4, end: 5.5 })];

    const actualResult = toTimings(shiftCues({ cues, offset: -1.5 }));

    const expectedResult = [
      { id: 'a', start: 0.5, end: 1.5 },
      { id: 'b', start: 2.5, end: 4 },
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should cut off what moves before 0, and drop cues that end by then', () => {
    const cues = [createCue({ id: 'a', start: 0, end: 1 }), createCue({ id: 'b', start: 1, end: 3 })];

    const actualResult = toTimings(shiftCues({ cues, offset: -1 }));

    const expectedResult = [{ id: 'b', start: 0, end: 2 }];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should order the cues by start', () => {
    const cues = [createCue({ id: 'b', start: 5, end: 6 }), createCue({ id: 'a', start: 1, end: 2 })];

    const actualResult = shiftCues({ cues, offset: 0 }).map((cue) => cue.id);

    const expectedResult = ['a', 'b'];
    expect(actualResult).toEqual(expectedResult);
  });
});

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

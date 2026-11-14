import { describe, expect, it } from 'vite-plus/test';
import { computeDraggedTiming, CueDragModes } from './timelineDrag';

const CAPTION = { originalStart: 2, originalEnd: 4, minStart: 1, maxEnd: 6 };

describe('computeDraggedTiming', () => {
  it('should move the whole caption and keep its duration', () => {
    const actualResult = computeDraggedTiming({ ...CAPTION, mode: CueDragModes.Move, deltaSec: 0.25 });

    const expectedResult = { start: 2.25, end: 4.25 };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should stop a moved caption at its neighbors', () => {
    const actualResult = [
      computeDraggedTiming({ ...CAPTION, mode: CueDragModes.Move, deltaSec: 5 }),
      computeDraggedTiming({ ...CAPTION, mode: CueDragModes.Move, deltaSec: -5 }),
    ];

    const expectedResult = [
      { start: 4, end: 6 },
      { start: 1, end: 3 },
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should move only the start when dragging it, stopping at the previous caption', () => {
    const actualResult = computeDraggedTiming({ ...CAPTION, mode: CueDragModes.Start, deltaSec: -1.5 });

    const expectedResult = { start: 1, end: 4 };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should move only the end when dragging it, stopping at the next caption', () => {
    const actualResult = computeDraggedTiming({ ...CAPTION, mode: CueDragModes.End, deltaSec: 3 });

    const expectedResult = { start: 2, end: 6 };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should keep a resized caption longer than the minimum duration', () => {
    const actualResult = [
      computeDraggedTiming({ ...CAPTION, mode: CueDragModes.Start, deltaSec: 3 }),
      computeDraggedTiming({ ...CAPTION, mode: CueDragModes.End, deltaSec: -3 }),
    ];

    const expectedResult = [
      { start: 3.8, end: 4 },
      { start: 2, end: 2.2 },
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should round the times to milliseconds', () => {
    const actualResult = computeDraggedTiming({ ...CAPTION, mode: CueDragModes.Move, deltaSec: 0.12345 });

    const expectedResult = { start: 2.123, end: 4.123 };
    expect(actualResult).toEqual(expectedResult);
  });
});

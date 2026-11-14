import { clamp } from '@src/common/utils/clamp';
import { MIN_CUE_DURATION_SEC } from '@src/lib/subtitles/constants';

export const CueDragModes = {
  Move: 'move',
  Start: 'start',
  End: 'end',
} as const;

export type CueDragModeValues = (typeof CueDragModes)[keyof typeof CueDragModes];

type ComputeDraggedTimingProps = {
  mode: CueDragModeValues;
  originalStart: number;
  originalEnd: number;
  deltaSec: number;
  /**
   * The end of the previous caption (or 0).
   */
  minStart: number;
  /**
   * The start of the next caption (or the end of the video).
   */
  maxEnd: number;
};

/**
 * The caption's timing while one of its edges (or the whole caption) is dragged. Moving keeps its duration,
 * and it never overlaps its neighbors.
 */
export function computeDraggedTiming(props: ComputeDraggedTimingProps): { start: number; end: number } {
  const { mode, originalStart, originalEnd, deltaSec, minStart, maxEnd } = props;

  if (mode === CueDragModes.Move) {
    const duration = originalEnd - originalStart;
    const start = clamp({ value: originalStart + deltaSec, min: minStart, max: Math.max(minStart, maxEnd - duration) });

    return { start: roundToMs(start), end: roundToMs(start + duration) };
  }

  if (mode === CueDragModes.Start) {
    const start = clamp({ value: originalStart + deltaSec, min: minStart, max: originalEnd - MIN_CUE_DURATION_SEC });

    return { start: roundToMs(start), end: originalEnd };
  }

  const end = clamp({ value: originalEnd + deltaSec, min: originalStart + MIN_CUE_DURATION_SEC, max: maxEnd });

  return { start: originalStart, end: roundToMs(end) };
}

function roundToMs(seconds: number): number {
  return Math.round(seconds * 1000) / 1000;
}

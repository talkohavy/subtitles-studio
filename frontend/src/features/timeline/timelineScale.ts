import { clamp } from '@src/common/utils/clamp';

/**
 * Zooming in further than this shows less than a few seconds, which isn't useful for captions.
 */
export const MAX_PX_PER_SEC = 400;
/**
 * Room after the end of the video, so the last caption's handle can be grabbed.
 */
export const TIMELINE_END_PADDING_PX = 24;

const MAJOR_STEPS_SEC = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];
const MIN_MAJOR_SPACING_PX = 72;
const MIN_MINOR_SPACING_PX = 7;

export type RulerSteps = {
  /**
   * Seconds between labeled ticks.
   */
  majorStep: number;
  /**
   * Seconds between small ticks, or `null` when they'd be too close together.
   */
  minorStep: number | null;
};

export function getRulerSteps(pxPerSec: number): RulerSteps {
  const majorStep = MAJOR_STEPS_SEC.find((step) => step * pxPerSec >= MIN_MAJOR_SPACING_PX) ?? MAJOR_STEPS_SEC.at(-1)!;
  const minorCandidates = [majorStep / 5, majorStep / 2];
  const minorStep = minorCandidates.find((step) => step * pxPerSec >= MIN_MINOR_SPACING_PX) ?? null;

  return { majorStep, minorStep };
}

/**
 * A ruler label, e.g. "1:05", "1:02:00", or "0:01.5" when the steps are shorter than a second.
 */
export function formatRulerLabel(props: { seconds: number; step: number }): string {
  const { seconds, step } = props;

  const roundedSeconds = Math.round(seconds * 10) / 10;
  const hours = Math.floor(roundedSeconds / 3600);
  const minutes = Math.floor((roundedSeconds % 3600) / 60);
  const wholeSeconds = Math.floor(roundedSeconds % 60);
  const tenths = Math.round((roundedSeconds % 1) * 10);
  const secondsText = String(wholeSeconds).padStart(2, '0');
  const fractionText = step < 1 ? `.${tenths}` : '';

  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${secondsText}${fractionText}`;

  return `${minutes}:${secondsText}${fractionText}`;
}

type ZoomRange = {
  fitPxPerSec: number;
  maxPxPerSec: number;
};

/**
 * The zoom slider is logarithmic, so every step zooms by the same factor.
 */
export function zoomToSliderValue(props: ZoomRange & { pxPerSec: number }): number {
  const { pxPerSec, fitPxPerSec, maxPxPerSec } = props;

  if (maxPxPerSec <= fitPxPerSec) return 0;

  const value = (Math.log(pxPerSec / fitPxPerSec) / Math.log(maxPxPerSec / fitPxPerSec)) * 100;

  return clamp({ value, min: 0, max: 100 });
}

export function sliderValueToZoom(props: ZoomRange & { value: number }): number {
  const { value, fitPxPerSec, maxPxPerSec } = props;

  const pxPerSec = fitPxPerSec * (maxPxPerSec / fitPxPerSec) ** (value / 100);

  return pxPerSec;
}

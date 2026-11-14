import { formatRulerLabel, getRulerSteps } from './timelineScale';
import type { WaveformPeaks } from '@src/lib/media/computeWaveformPeaks';

export const TIMELINE_LAYOUT = {
  rulerHeight: 24,
  cueTrackTop: 30,
  cueTrackHeight: 52,
  waveformTop: 88,
  waveformHeight: 40,
  height: 134,
} as const;

const COLORS = {
  minorTick: 'rgba(161, 161, 170, 0.25)',
  majorTick: 'rgba(161, 161, 170, 0.55)',
  label: 'rgba(161, 161, 170, 0.9)',
  waveform: 'rgba(139, 92, 246, 0.45)',
  pastEnd: 'rgba(9, 9, 11, 0.7)',
  rulerBorder: 'rgba(63, 63, 70, 0.6)',
};

type DrawTimelineBackgroundProps = {
  ctx: CanvasRenderingContext2D;
  /**
   * The visible width, in CSS pixels.
   */
  width: number;
  pixelRatio: number;
  scrollLeft: number;
  pxPerSec: number;
  durationSec: number;
  waveform: WaveformPeaks | null;
};

/**
 * Draws the ruler and the waveform for the visible part of the timeline.
 */
export function drawTimelineBackground(props: DrawTimelineBackgroundProps) {
  const { ctx, width, pixelRatio, scrollLeft, pxPerSec, durationSec, waveform } = props;

  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.clearRect(0, 0, width, TIMELINE_LAYOUT.height);

  if (pxPerSec <= 0) return;

  drawRuler({ ctx, width, scrollLeft, pxPerSec, durationSec });

  if (waveform) drawWaveform({ ctx, width, scrollLeft, pxPerSec, waveform });

  const endX = durationSec * pxPerSec - scrollLeft;

  if (endX < width) {
    ctx.fillStyle = COLORS.pastEnd;
    ctx.fillRect(Math.max(0, endX), 0, width - Math.max(0, endX), TIMELINE_LAYOUT.height);
  }
}

type DrawRulerProps = {
  ctx: CanvasRenderingContext2D;
  width: number;
  scrollLeft: number;
  pxPerSec: number;
  durationSec: number;
};

function drawRuler(props: DrawRulerProps) {
  const { ctx, width, scrollLeft, pxPerSec, durationSec } = props;

  const { rulerHeight } = TIMELINE_LAYOUT;
  const { majorStep, minorStep } = getRulerSteps(pxPerSec);
  const startTime = scrollLeft / pxPerSec;
  const endTime = Math.min(durationSec, (scrollLeft + width) / pxPerSec);

  ctx.fillStyle = COLORS.rulerBorder;
  ctx.fillRect(0, rulerHeight - 0.5, width, 1);

  if (minorStep !== null) {
    ctx.fillStyle = COLORS.minorTick;

    const minorTimes = getStepTimes({ startTime, endTime, step: minorStep });

    minorTimes.forEach((time) => {
      const x = Math.round(time * pxPerSec - scrollLeft);
      ctx.fillRect(x, rulerHeight - 5, 1, 5);
    });
  }

  ctx.font = '500 10px "Inter Variable", system-ui, sans-serif';
  ctx.textBaseline = 'top';

  // Starts a step early, so a label whose tick scrolled out of view stays readable.
  const majorTimes = getStepTimes({ startTime: startTime - majorStep, endTime, step: majorStep });

  majorTimes.forEach((time) => {
    const x = Math.round(time * pxPerSec - scrollLeft);
    const label = formatRulerLabel({ seconds: time, step: majorStep });
    ctx.fillStyle = COLORS.majorTick;
    ctx.fillRect(x, rulerHeight - 9, 1, 9);
    ctx.fillStyle = COLORS.label;
    ctx.fillText(label, x + 4, 5);
  });
}

/**
 * Every multiple of `step` in the range. Multiplying (rather than adding up steps) avoids accumulating rounding errors.
 */
function getStepTimes(props: { startTime: number; endTime: number; step: number }): Array<number> {
  const { startTime, endTime, step } = props;

  const firstIndex = Math.max(0, Math.ceil(startTime / step - 1e-9));
  const lastIndex = Math.floor(endTime / step + 1e-9);
  const times: Array<number> = [];

  for (let index = firstIndex; index <= lastIndex; index++) {
    times.push(index * step);
  }

  return times;
}

type DrawWaveformProps = {
  ctx: CanvasRenderingContext2D;
  width: number;
  scrollLeft: number;
  pxPerSec: number;
  waveform: WaveformPeaks;
};

function drawWaveform(props: DrawWaveformProps) {
  const { ctx, width, scrollLeft, pxPerSec, waveform } = props;

  const { peaks, peaksPerSecond } = waveform;
  const { waveformTop, waveformHeight } = TIMELINE_LAYOUT;
  const middleY = waveformTop + waveformHeight / 2;
  const peaksPerPixel = peaksPerSecond / pxPerSec;

  ctx.fillStyle = COLORS.waveform;

  for (let x = 0; x < width; x++) {
    const firstPeak = Math.floor((scrollLeft + x) * peaksPerPixel);

    if (firstPeak >= peaks.length) break;

    const lastPeak = Math.min(peaks.length, Math.max(firstPeak + 1, Math.floor((scrollLeft + x + 1) * peaksPerPixel)));
    let peak = 0;

    for (let index = firstPeak; index < lastPeak; index++) {
      peak = Math.max(peak, peaks[index] ?? 0);
    }

    const barHeight = Math.max(1, peak * waveformHeight);
    ctx.fillRect(x, middleY - barHeight / 2, 1, barHeight);
  }
}

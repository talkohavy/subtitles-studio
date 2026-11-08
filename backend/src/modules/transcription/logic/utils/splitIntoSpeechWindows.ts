export type AudioWindow = {
  /**
   * Sample index (inclusive).
   */
  start: number;
  /**
   * Sample index (exclusive).
   */
  end: number;
};

type SplitIntoSpeechWindowsProps = {
  samples: Float32Array;
  sampleRate: number;
  /**
   * Whisper sees 30 seconds at a time; anything longer is truncated.
   * @default 29.5
   */
  maxWindowSec?: number;
};

type FrameRange = {
  /**
   * Inclusive.
   */
  start: number;
  /**
   * Exclusive.
   */
  end: number;
};

const FRAME_SEC = 0.02;
/**
 * Keeps soft word onsets and tails (which are quieter than the threshold) inside the active regions.
 */
const ACTIVITY_PADDING_SEC = 0.3;
/**
 * Shorter pauses stay inside a window. Longer silences are skipped: Whisper tends to hallucinate on them, and
 * skipping them means fewer windows to run.
 */
const MAX_SILENCE_INSIDE_WINDOW_SEC = 4;
/**
 * Splitting continuous speech never produces a window shorter than this.
 */
const MIN_FORCED_WINDOW_SEC = 12;
const SMOOTHING_SEC = 0.2;
/**
 * Among equally quiet cut points, prefer later ones (fuller windows mean fewer windows).
 */
const LATE_CUT_BONUS_DB_PER_SEC = 0.15;
const MIN_DB = -100;
const SILENCE_FLOOR_DB = -55;
/**
 * When even the loudest moments are below this, the audio is treated as silence.
 */
const SILENT_AUDIO_DB = -65;
const NOISE_MARGIN_DB = 12;
const DYNAMICS_MARGIN_DB = 10;

/**
 * Splits audio into windows Whisper can transcribe (at most `maxWindowSec` long each), cutting at pauses and
 * leaving out long silences.
 */
export function splitIntoSpeechWindows(props: SplitIntoSpeechWindowsProps): Array<AudioWindow> {
  const { samples, sampleRate, maxWindowSec = 29.5 } = props;

  const frameSize = Math.round(sampleRate * FRAME_SEC);
  const frameLoudness = computeFrameLoudness({ samples, frameSize });
  const threshold = computeActivityThreshold(frameLoudness);

  if (threshold === null) return [];

  const activeFrames = findActiveFrames({ frameLoudness, threshold, paddingFrames: toFrames(ACTIVITY_PADDING_SEC) });
  const regions = findActiveRegions({ activeFrames, maxGapFrames: toFrames(MAX_SILENCE_INSIDE_WINDOW_SEC) });
  const smoothedLoudness = smoothLoudness({ frameLoudness, radiusFrames: toFrames(SMOOTHING_SEC / 2) });

  const frameWindows: Array<FrameRange> = [];

  regions.forEach((region) => {
    const regionWindows = splitRegion({
      region,
      smoothedLoudness,
      maxFrames: Math.floor(maxWindowSec / FRAME_SEC),
      minFrames: toFrames(Math.min(MIN_FORCED_WINDOW_SEC, maxWindowSec / 2)),
    });

    frameWindows.push(...regionWindows);
  });

  const windows = frameWindows.map((frameWindow) => ({
    start: frameWindow.start * frameSize,
    end: Math.min(samples.length, frameWindow.end * frameSize),
  }));

  return windows;
}

function toFrames(seconds: number): number {
  return Math.round(seconds / FRAME_SEC);
}

type ComputeFrameLoudnessProps = {
  samples: Float32Array;
  frameSize: number;
};

/**
 * RMS loudness of each frame, in dBFS.
 */
function computeFrameLoudness(props: ComputeFrameLoudnessProps): Float32Array {
  const { samples, frameSize } = props;

  const frameCount = Math.ceil(samples.length / frameSize);
  const loudness = new Float32Array(frameCount);

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
    const start = frameIndex * frameSize;
    const end = Math.min(samples.length, start + frameSize);

    let sumOfSquares = 0;
    for (let sampleIndex = start; sampleIndex < end; sampleIndex++) {
      sumOfSquares += samples[sampleIndex]! * samples[sampleIndex]!;
    }

    const rms = Math.sqrt(sumOfSquares / (end - start));
    loudness[frameIndex] = rms > 0 ? Math.max(MIN_DB, 20 * Math.log10(rms)) : MIN_DB;
  }

  return loudness;
}

/**
 * Adapts to the recording: just above its noise floor, but well below its typical speech level (so audio with
 * continuous background music still has quieter moments to cut at).
 *
 * @returns `null` when the whole audio is silent.
 */
function computeActivityThreshold(frameLoudness: Float32Array): number | null {
  if (frameLoudness.length === 0) return null;

  const sortedLoudness = Float32Array.from(frameLoudness).sort();
  const peakLoudness = getPercentile({ sortedValues: sortedLoudness, fraction: 0.99 });

  if (peakLoudness < SILENT_AUDIO_DB) return null;

  const noiseFloor = getPercentile({ sortedValues: sortedLoudness, fraction: 0.1 });
  const typicalLoudness = getPercentile({ sortedValues: sortedLoudness, fraction: 0.9 });

  const threshold = Math.max(
    SILENCE_FLOOR_DB,
    Math.min(noiseFloor + NOISE_MARGIN_DB, typicalLoudness - DYNAMICS_MARGIN_DB),
  );

  return threshold;
}

type GetPercentileProps = {
  sortedValues: Float32Array;
  fraction: number;
};

function getPercentile(props: GetPercentileProps): number {
  const { sortedValues, fraction } = props;

  return sortedValues[Math.floor(fraction * (sortedValues.length - 1))]!;
}

type FindActiveFramesProps = {
  frameLoudness: Float32Array;
  threshold: number;
  paddingFrames: number;
};

/**
 * A frame is active when it, or any frame within `paddingFrames` of it, is louder than the threshold.
 */
function findActiveFrames(props: FindActiveFramesProps): Uint8Array {
  const { frameLoudness, threshold, paddingFrames } = props;

  const frameCount = frameLoudness.length;
  const activeFrames = new Uint8Array(frameCount);

  let framesSinceLoud = Number.POSITIVE_INFINITY;
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
    framesSinceLoud = frameLoudness[frameIndex]! > threshold ? 0 : framesSinceLoud + 1;
    if (framesSinceLoud <= paddingFrames) activeFrames[frameIndex] = 1;
  }

  let framesUntilLoud = Number.POSITIVE_INFINITY;
  for (let frameIndex = frameCount - 1; frameIndex >= 0; frameIndex--) {
    framesUntilLoud = frameLoudness[frameIndex]! > threshold ? 0 : framesUntilLoud + 1;
    if (framesUntilLoud <= paddingFrames) activeFrames[frameIndex] = 1;
  }

  return activeFrames;
}

type FindActiveRegionsProps = {
  activeFrames: Uint8Array;
  maxGapFrames: number;
};

/**
 * Runs of active frames, where gaps shorter than `maxGapFrames` don't break a run.
 */
function findActiveRegions(props: FindActiveRegionsProps): Array<FrameRange> {
  const { activeFrames, maxGapFrames } = props;

  const regions: Array<FrameRange> = [];
  let regionStart = -1;

  for (let frameIndex = 0; frameIndex <= activeFrames.length; frameIndex++) {
    const isActive = activeFrames[frameIndex] === 1;

    if (isActive && regionStart === -1) regionStart = frameIndex;

    if (!isActive && regionStart !== -1) {
      regions.push({ start: regionStart, end: frameIndex });
      regionStart = -1;
    }
  }

  const mergedRegions: Array<FrameRange> = [];

  regions.forEach((region) => {
    const previousRegion = mergedRegions.at(-1);

    if (previousRegion && region.start - previousRegion.end < maxGapFrames) {
      previousRegion.end = region.end;
      return;
    }

    mergedRegions.push({ ...region });
  });

  return mergedRegions;
}

type SmoothLoudnessProps = {
  frameLoudness: Float32Array;
  radiusFrames: number;
};

function smoothLoudness(props: SmoothLoudnessProps): Float32Array {
  const { frameLoudness, radiusFrames } = props;

  const frameCount = frameLoudness.length;
  const prefixSums = new Float64Array(frameCount + 1);

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
    prefixSums[frameIndex + 1] = prefixSums[frameIndex]! + frameLoudness[frameIndex]!;
  }

  const smoothed = new Float32Array(frameCount);

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
    const start = Math.max(0, frameIndex - radiusFrames);
    const end = Math.min(frameCount, frameIndex + radiusFrames + 1);
    smoothed[frameIndex] = (prefixSums[end]! - prefixSums[start]!) / (end - start);
  }

  return smoothed;
}

type SplitRegionProps = {
  region: FrameRange;
  smoothedLoudness: Float32Array;
  maxFrames: number;
  minFrames: number;
};

/**
 * Cuts a region longer than `maxFrames` at its quietest moments.
 */
function splitRegion(props: SplitRegionProps): Array<FrameRange> {
  const { region, smoothedLoudness, maxFrames, minFrames } = props;

  const windows: Array<FrameRange> = [];
  let windowStart = region.start;

  while (region.end - windowStart > maxFrames) {
    const searchStart = windowStart + minFrames;
    const searchEnd = windowStart + maxFrames;

    let cutFrame = searchEnd;
    let cutScore = Number.POSITIVE_INFINITY;

    for (let frameIndex = searchStart; frameIndex <= searchEnd; frameIndex++) {
      const secondsFromSearchStart = (frameIndex - searchStart) * FRAME_SEC;
      const score = smoothedLoudness[frameIndex]! - LATE_CUT_BONUS_DB_PER_SEC * secondsFromSearchStart;

      if (score <= cutScore) {
        cutScore = score;
        cutFrame = frameIndex;
      }
    }

    windows.push({ start: windowStart, end: cutFrame });
    windowStart = cutFrame;
  }

  windows.push({ start: windowStart, end: region.end });

  return windows;
}

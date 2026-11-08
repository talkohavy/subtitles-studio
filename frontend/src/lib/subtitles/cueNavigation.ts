import type { Cue } from './types';

/**
 * Pressing "previous" this soon after a caption starts goes to the caption before it, like in music players.
 */
const RESTART_THRESHOLD_SEC = 0.3;
const EPSILON_SEC = 0.01;

/**
 * Where "previous subtitle" jumps to: the start of the current caption, or of the one before it when already at
 * its start. `null` when there's no caption before.
 */
export function getPreviousCueStart(props: { cues: ReadonlyArray<Cue>; time: number }): number | null {
  const { cues, time } = props;

  const previousCue = cues.findLast((cue) => cue.start < time - RESTART_THRESHOLD_SEC);

  return previousCue?.start ?? null;
}

/**
 * Where "next subtitle" jumps to, or `null` when there's no caption after `time`.
 */
export function getNextCueStart(props: { cues: ReadonlyArray<Cue>; time: number }): number | null {
  const { cues, time } = props;

  const nextCue = cues.find((cue) => cue.start > time + EPSILON_SEC);

  return nextCue?.start ?? null;
}

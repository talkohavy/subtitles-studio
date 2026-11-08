import { EntranceAnimations, type EntranceAnimationValues } from './types';

export type CaptionTransform = {
  opacity: number;
  scale: number;
  /**
   * A multiple of the font size.
   */
  offsetY: number;
};

const IDLE_TRANSFORM: CaptionTransform = { opacity: 1, scale: 1, offsetY: 0 };

const ENTRANCE_DURATION_SEC: Record<EntranceAnimationValues, number> = {
  none: 0,
  fade: 0.2,
  pop: 0.25,
  'slide-up': 0.28,
};

type GetEntranceTransformProps = {
  animation: EntranceAnimationValues;
  /**
   * Seconds since the caption appeared.
   */
  elapsed: number;
};

export function getEntranceTransform(props: GetEntranceTransformProps): CaptionTransform {
  const { animation, elapsed } = props;

  const duration = ENTRANCE_DURATION_SEC[animation];

  if (duration === 0 || elapsed >= duration) return IDLE_TRANSFORM;

  const progress = Math.max(0, elapsed) / duration;

  if (animation === EntranceAnimations.Fade) return { opacity: progress, scale: 1, offsetY: 0 };

  if (animation === EntranceAnimations.Pop) {
    const opacity = Math.min(1, progress * 3);
    const scale = 0.6 + 0.4 * easeOutBack(progress);

    return { opacity, scale, offsetY: 0 };
  }

  const eased = easeOutCubic(progress);

  return { opacity: eased, scale: 1, offsetY: 0.5 * (1 - eased) };
}

type GetWordPopScaleProps = {
  /**
   * Seconds since the word started being spoken.
   */
  elapsed: number;
  targetScale: number;
};

const WORD_POP_DURATION_SEC = 0.12;

/**
 * The spoken word grows to `targetScale` over a moment instead of jumping to it.
 */
export function getWordPopScale(props: GetWordPopScaleProps): number {
  const { elapsed, targetScale } = props;

  const progress = Math.min(1, Math.max(0, elapsed) / WORD_POP_DURATION_SEC);
  const eased = easeOutBack(progress);

  return 1 + (targetScale - 1) * eased;
}

function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

function easeOutBack(progress: number): number {
  const overshoot = 1.70158;

  return 1 + (overshoot + 1) * (progress - 1) ** 3 + overshoot * (progress - 1) ** 2;
}

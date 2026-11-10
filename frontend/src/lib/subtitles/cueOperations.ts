import { MIN_CUE_DURATION_SEC } from './constants';
import { retimeWords } from './retimeWords';
import { isUnspacedLanguage, joinWords } from './tokenizeText';
import type { Cue, Word } from './types';

/**
 * Returns the index of the caption shown at `time`, or -1. Captions must be sorted by start time.
 */
export function findCueIndexAtTime(props: { cues: ReadonlyArray<Cue>; time: number }): number {
  const { cues, time } = props;

  let low = 0;
  let high = cues.length - 1;
  let candidate = -1;

  while (low <= high) {
    const middle = (low + high) >> 1;

    if (cues[middle]!.start <= time) {
      candidate = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  if (candidate === -1) return -1;

  return time < cues[candidate]!.end ? candidate : -1;
}

type SplitCueProps = {
  cue: Cue;
  /**
   * Where in the text to split. When missing or at either end, the caption is split near its middle.
   */
  textOffset: number | null;
  language: string | null;
  /**
   * The id of the second caption.
   */
  newCueId: string;
};

export function splitCue(props: SplitCueProps): [Cue, Cue] | null {
  const { cue, textOffset, language, newCueId } = props;

  const wordOffsets = getWordOffsets(cue);
  const isUsableOffset = textOffset !== null && textOffset > 0 && textOffset < cue.text.trimEnd().length;
  const splitOffset = isUsableOffset ? textOffset : findMiddleWordOffset({ cue, wordOffsets });

  if (splitOffset === null) return null;

  const leftText = cue.text.slice(0, splitOffset).trimEnd();
  const rightText = cue.text.slice(splitOffset).trimStart();

  if (!leftText || !rightText) return null;

  const rightWordIndex = wordOffsets.findIndex((offset) => offset >= splitOffset);
  const firstRightIndex = rightWordIndex === -1 ? cue.words.length : rightWordIndex;
  const leftWords = cue.words.slice(0, firstRightIndex);
  const rightWords = cue.words.slice(firstRightIndex);
  const splitTime = getSplitTime({ cue, leftWords, rightWords, splitOffset });

  const leftCue: Cue = {
    id: cue.id,
    start: cue.start,
    end: splitTime,
    text: leftText,
    words: retimeWords({ text: leftText, previousWords: leftWords, start: cue.start, end: splitTime, language }),
  };
  const rightCue: Cue = {
    id: newCueId,
    start: splitTime,
    end: cue.end,
    text: rightText,
    words: retimeWords({ text: rightText, previousWords: rightWords, start: splitTime, end: cue.end, language }),
  };

  return [leftCue, rightCue];
}

/**
 * Where each word starts in the caption's text.
 */
function getWordOffsets(cue: Cue): Array<number> {
  let searchFrom = 0;

  return cue.words.map((word) => {
    const trimmed = word.text.trim();
    const foundAt = cue.text.indexOf(trimmed, searchFrom);
    const offset = foundAt === -1 ? searchFrom : foundAt;
    searchFrom = offset + trimmed.length;

    return offset;
  });
}

function findMiddleWordOffset(props: { cue: Cue; wordOffsets: Array<number> }): number | null {
  const { cue, wordOffsets } = props;

  const candidates = wordOffsets.slice(1);

  if (candidates.length === 0) return null;

  const middle = cue.text.length / 2;
  const sortedByDistance = [...candidates].sort((a, b) => Math.abs(a - middle) - Math.abs(b - middle));

  return sortedByDistance[0]!;
}

type GetSplitTimeProps = {
  cue: Cue;
  leftWords: Array<Word>;
  rightWords: Array<Word>;
  splitOffset: number;
};

function getSplitTime(props: GetSplitTimeProps): number {
  const { cue, leftWords, rightWords, splitOffset } = props;

  const lastLeftWord = leftWords.at(-1);
  const firstRightWord = rightWords[0];
  const proportionalTime = cue.start + ((cue.end - cue.start) * splitOffset) / Math.max(1, cue.text.length);
  const wordBoundaryTime = lastLeftWord && firstRightWord ? (lastLeftWord.end + firstRightWord.start) / 2 : null;
  const splitTime = wordBoundaryTime ?? proportionalTime;
  const minTime = cue.start + Math.min(MIN_CUE_DURATION_SEC, (cue.end - cue.start) / 2);
  const maxTime = cue.end - Math.min(MIN_CUE_DURATION_SEC, (cue.end - cue.start) / 2);

  return Math.min(maxTime, Math.max(minTime, splitTime));
}

type MergeCuesProps = {
  first: Cue;
  second: Cue;
  language: string | null;
};

export function mergeCues(props: MergeCuesProps): Cue {
  const { first, second, language } = props;

  const separator = isUnspacedLanguage(language) ? '' : ' ';
  const text = [first.text.trim(), second.text.trim()].filter(Boolean).join(separator);
  const secondWords = second.words.map((word, index) =>
    index === 0 ? { ...word, text: `${separator}${word.text.trimStart()}` } : word,
  );
  const previousWords = [...first.words, ...secondWords];
  const words = retimeWords({ text, previousWords, start: first.start, end: second.end, language });

  return { id: first.id, start: first.start, end: second.end, text, words };
}

type CreateCueAfterProps = {
  cues: ReadonlyArray<Cue>;
  /**
   * The new caption goes after this one; -1 puts it first.
   */
  index: number;
  mediaDurationSec: number;
  newCueId: string;
};

const NEW_CUE_DURATION_SEC = 2;
export const NEW_CUE_TEXT = 'New subtitle';

/**
 * Creates a caption in the gap after `cues[index]`. When the gap is too small, it takes the second half of that caption.
 */
export function createCueAfter(props: CreateCueAfterProps): { cues: Array<Cue>; newCue: Cue } {
  const { cues, index, mediaDurationSec, newCueId } = props;

  const previousCue = cues[index];
  const nextCue = cues[index + 1];
  const gapStart = previousCue?.end ?? 0;
  const gapEnd = nextCue?.start ?? mediaDurationSec;
  const updatedCues = [...cues];

  let start = gapStart;
  let end = Math.min(gapEnd, gapStart + NEW_CUE_DURATION_SEC);

  if (end - start < MIN_CUE_DURATION_SEC * 2 && previousCue) {
    const previousMiddle = (previousCue.start + previousCue.end) / 2;
    start = previousMiddle;
    end = Math.max(previousCue.end, previousMiddle + MIN_CUE_DURATION_SEC);
    updatedCues[index] = retimeCue({ cue: previousCue, start: previousCue.start, end: previousMiddle });
  }

  const newCue: Cue = { id: newCueId, start, end, text: NEW_CUE_TEXT, words: [{ text: NEW_CUE_TEXT, start, end }] };
  updatedCues.splice(index + 1, 0, newCue);

  return { cues: updatedCues, newCue };
}

type CreateCueAtTimeProps = {
  cues: ReadonlyArray<Cue>;
  time: number;
  mediaDurationSec: number;
  newCueId: string;
};

/**
 * Creates a caption starting at `time` that fits before the next caption, or `null` when there is no room.
 */
export function createCueAtTime(props: CreateCueAtTimeProps): { cues: Array<Cue>; newCue: Cue } | null {
  const { cues, time, mediaDurationSec, newCueId } = props;

  const insertIndex = cues.findIndex((cue) => cue.start > time);
  const nextStart = insertIndex === -1 ? mediaDurationSec : cues[insertIndex]!.start;
  const previousCue = insertIndex === -1 ? cues.at(-1) : cues[insertIndex - 1];
  const start = Math.max(time, previousCue?.end ?? 0);
  const end = Math.min(nextStart, start + NEW_CUE_DURATION_SEC);

  if (end - start < MIN_CUE_DURATION_SEC) return null;

  const newCue: Cue = { id: newCueId, start, end, text: NEW_CUE_TEXT, words: [{ text: NEW_CUE_TEXT, start, end }] };
  const updatedCues = [...cues];
  updatedCues.splice(insertIndex === -1 ? cues.length : insertIndex, 0, newCue);

  return { cues: updatedCues, newCue };
}

type RetimeCueProps = {
  cue: Cue;
  start: number;
  end: number;
};

/**
 * Moves or stretches a caption, moving its words along with it.
 */
export function retimeCue(props: RetimeCueProps): Cue {
  const { cue, start, end } = props;

  const oldDuration = cue.end - cue.start;
  const newDuration = end - start;
  const scale = oldDuration > 0 ? newDuration / oldDuration : 1;

  const words = cue.words.map((word) => ({
    text: word.text,
    start: start + (word.start - cue.start) * scale,
    end: start + (word.end - cue.start) * scale,
  }));

  return { ...cue, start, end, words };
}

type ClampCueTimingProps = {
  cues: ReadonlyArray<Cue>;
  index: number;
  start: number;
  end: number;
  mediaDurationSec: number;
};

/**
 * Keeps a caption inside the media, longer than the minimum, and off its neighbors.
 */
export function clampCueTiming(props: ClampCueTimingProps): { start: number; end: number } {
  const { cues, index, start, end, mediaDurationSec } = props;

  const lowerBound = cues[index - 1]?.end ?? 0;
  const upperBound = cues[index + 1]?.start ?? mediaDurationSec;
  const clampedStart = Math.min(Math.max(lowerBound, start), upperBound - MIN_CUE_DURATION_SEC);
  const clampedEnd = Math.max(Math.min(upperBound, end), clampedStart + MIN_CUE_DURATION_SEC);

  return { start: Math.max(lowerBound, clampedStart), end: Math.min(upperBound, clampedEnd) };
}

type UpdateCueTextProps = {
  cue: Cue;
  text: string;
  language: string | null;
};

export function updateCueText(props: UpdateCueTextProps): Cue {
  const { cue, text, language } = props;

  const words = retimeWords({ text, previousWords: cue.words, start: cue.start, end: cue.end, language });

  return { ...cue, text, words };
}

/**
 * Rebuilds a caption's text from its words, e.g. after some words were removed.
 */
export function rebuildCueFromWords(props: { cue: Cue; words: Array<Word> }): Cue {
  const { cue, words } = props;

  const normalizedWords = words.map((word, index) => (index === 0 ? { ...word, text: word.text.trimStart() } : word));
  const text = joinWords(normalizedWords);

  return { ...cue, text, words: normalizedWords };
}

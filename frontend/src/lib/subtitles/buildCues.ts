import { createId } from '@src/common/utils/createId';
import { endsClause, endsSentence, getDisplayLength, isDanglingWord } from './breakRules';
import { CAPTION_LENGTH_OPTIONS, type CaptionLengthValues } from './constants';
import { joinWords } from './tokenizeText';
import type { Cue, Word } from './types';

type BuildCuesProps = {
  words: ReadonlyArray<Word>;
  captionLength: CaptionLengthValues;
  /**
   * Captions are never extended past the end of the media.
   */
  mediaDurationSec?: number;
};

/**
 * A pause this long always starts a new caption.
 */
const PAUSE_SPLIT_SEC = 0.7;
const MAX_CUE_DURATION_SEC = 6;
/**
 * Captions stay on screen at least this long when there is room, so short ones can be read.
 */
const MIN_DISPLAY_SEC = 0.8;
/**
 * How long a caption lingers after its last word.
 */
const LINGER_SEC = 0.2;
/**
 * Captions separated by less than this are joined end-to-start, so they don't flicker.
 */
const BRIDGE_GAP_SEC = 0.4;

/**
 * The costs below decide where captions break; the breaks with the lowest total win.
 * A caption is charged for the room it leaves unused, squared, so lengths stay balanced.
 */
const UNUSED_ROOM_COST = 2;
const MID_SENTENCE_BREAK_COST = 1;
const CLAUSE_BREAK_COST = 0.3;
const DANGLING_WORD_COST = 2;
/**
 * Charged for each sentence that ends inside a caption instead of at its end.
 */
const JOINED_SENTENCE_COST = 1.5;

/**
 * Groups transcribed words into captions. Pauses always split; within a phrase, captions break where it reads
 * best (sentence ends, then clauses, then pauses) rather than wherever the length limit happens to fall.
 */
export function buildCues(props: BuildCuesProps): Array<Cue> {
  const { words, captionLength, mediaDurationSec = Number.POSITIVE_INFINITY } = props;

  const maxChars = CAPTION_LENGTH_OPTIONS.find((option) => option.value === captionLength)?.maxChars ?? 32;
  const phrases = splitAtPauses(words);
  const cues = phrases.flatMap((phrase) => {
    const groups = breakIntoCaptions({ words: phrase, maxChars });
    const phraseCues = groups.map((group) => toCue(group));

    return phraseCues;
  });

  const adjustedCues = adjustCueTimings({ cues, mediaDurationSec });

  return adjustedCues;
}

function splitAtPauses(words: ReadonlyArray<Word>): Array<Array<Word>> {
  const phrases: Array<Array<Word>> = [];

  words.forEach((word, index) => {
    const previousWord = words[index - 1];
    const currentPhrase = phrases.at(-1);
    const isAfterPause = previousWord !== undefined && word.start - previousWord.end >= PAUSE_SPLIT_SEC;

    if (!currentPhrase || isAfterPause) {
      phrases.push([word]);
    } else {
      currentPhrase.push(word);
    }
  });

  return phrases;
}

type BreakIntoCaptionsProps = {
  words: ReadonlyArray<Word>;
  maxChars: number;
};

/**
 * Finds the cheapest way to split the words into captions that fit `maxChars` and `MAX_CUE_DURATION_SEC`.
 * A single word too long for either still gets a caption of its own.
 */
function breakIntoCaptions(props: BreakIntoCaptionsProps): Array<Array<Word>> {
  const { words, maxChars } = props;

  const lengths = words.map((word) => getDisplayLength(word.text));
  const trimmedLengths = words.map((word) => getDisplayLength(word.text.trimStart()));
  // The cheapest way to caption the first `end` words costs `bestCost[end]`; its last caption starts at `bestStart[end]`.
  const bestCost: Array<number> = [0];
  const bestStart: Array<number> = [0];

  for (let end = 1; end <= words.length; end++) {
    let cheapestCost = Number.POSITIVE_INFINITY;
    let cheapestStart = end - 1;
    let tailLength = 0;
    let joinedSentences = 0;

    for (let start = end - 1; start >= 0; start--) {
      const length = trimmedLengths[start]! + tailLength;
      const durationSec = words[end - 1]!.end - words[start]!.start;
      const isSingleWord = start === end - 1;

      if (!isSingleWord && (length > maxChars || durationSec > MAX_CUE_DURATION_SEC)) break;

      const captionCost = getCaptionCost({ words, end, length, maxChars, joinedSentences });
      const totalCost = bestCost[start]! + captionCost;

      if (totalCost < cheapestCost) {
        cheapestCost = totalCost;
        cheapestStart = start;
      }

      tailLength += lengths[start]!;

      if (start > 0 && endsSentence(words[start - 1]!.text)) joinedSentences += 1;
    }

    bestCost[end] = cheapestCost;
    bestStart[end] = cheapestStart;
  }

  const groups: Array<Array<Word>> = [];

  for (let end = words.length; end > 0; end = bestStart[end]!) {
    groups.unshift(words.slice(bestStart[end]!, end));
  }

  return groups;
}

type GetCaptionCostProps = {
  words: ReadonlyArray<Word>;
  end: number;
  length: number;
  maxChars: number;
  joinedSentences: number;
};

function getCaptionCost(props: GetCaptionCostProps): number {
  const { words, end, length, maxChars, joinedSentences } = props;

  const unusedRoom = Math.max(0, maxChars - length) / maxChars;
  const nextWord = words[end];
  const breakCost = nextWord ? getBreakCost({ lastWord: words[end - 1]!, nextWord }) : 0;
  const cost = UNUSED_ROOM_COST * unusedRoom ** 2 + breakCost + JOINED_SENTENCE_COST * joinedSentences;

  return cost;
}

type GetBreakCostProps = {
  lastWord: Word;
  nextWord: Word;
};

/**
 * The cost of ending a caption after `lastWord`, lowered by the pause before `nextWord`.
 */
function getBreakCost(props: GetBreakCostProps): number {
  const { lastWord, nextWord } = props;

  if (endsSentence(lastWord.text)) return 0;

  const pauseSec = Math.max(0, nextWord.start - lastWord.end);
  const pauseRelief = Math.min(1, pauseSec / PAUSE_SPLIT_SEC);

  if (endsClause(lastWord.text)) return CLAUSE_BREAK_COST * (1 - pauseRelief);

  const isDangling = isDanglingWord(lastWord.text);
  const cost = (MID_SENTENCE_BREAK_COST + (isDangling ? DANGLING_WORD_COST : 0)) * (1 - 0.8 * pauseRelief);

  return cost;
}

function toCue(group: ReadonlyArray<Word>): Cue {
  const words = group.map((word, index) => (index === 0 ? { ...word, text: word.text.trimStart() } : { ...word }));
  const text = joinWords(words);

  return { id: createId(), start: group[0]!.start, end: group.at(-1)!.end, text, words };
}

type AdjustCueTimingsProps = {
  cues: Array<Cue>;
  mediaDurationSec: number;
};

function adjustCueTimings(props: AdjustCueTimingsProps): Array<Cue> {
  const { cues, mediaDurationSec } = props;

  return cues.map((cue, index) => {
    const nextStart = cues[index + 1]?.start ?? mediaDurationSec;
    const desiredEnd = Math.max(cue.end + LINGER_SEC, cue.start + MIN_DISPLAY_SEC);
    const isNextClose = nextStart - cue.end < BRIDGE_GAP_SEC;
    const end = isNextClose ? nextStart : Math.min(desiredEnd, nextStart);
    const safeEnd = Math.max(cue.start + 0.05, end);

    return { ...cue, end: safeEnd };
  });
}

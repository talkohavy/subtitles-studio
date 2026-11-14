import type { TranscribedWord } from '../../types';

/**
 * A word as transformers.js returns it with `return_timestamps: 'word'`. Timestamps are relative to the window.
 */
export type RawWordChunk = {
  text: string;
  timestamp: Array<number | null>;
};

type NormalizeWordsProps = {
  chunks: Array<RawWordChunk>;
  /**
   * Where the window starts in the whole audio, in seconds.
   */
  windowStartSec: number;
  /**
   * Where the window ends in the whole audio, in seconds.
   */
  windowEndSec: number;
  language: string;
};

/**
 * Written without spaces between words. Whisper returns long phrases as single "words" for these.
 */
const LANGUAGES_WITHOUT_SPACES = ['ja', 'zh', 'yue', 'th', 'lo', 'km', 'my', 'bo'];
const SEGMENTER_LOCALE_OVERRIDES: Record<string, string> = { yue: 'zh' };
const MIN_WORD_DURATION_SEC = 0.1;
const SHORT_WORD_DURATION_SEC = 0.3;
/**
 * Words that start this far past the window's end are garbage.
 */
const OUT_OF_WINDOW_TOLERANCE_SEC = 0.5;
/**
 * A loop is a phrase repeated back-to-back at least this many times.
 */
const LOOP_MIN_REPEATS = 4;
const LOOP_MAX_PHRASE_WORDS = 6;
/**
 * Repeating a single word can be real speech ("no, no, no"), so a few repetitions are kept.
 */
const LOOP_KEPT_SINGLE_WORD_REPEATS = 3;
/**
 * A long window of audio that yields nothing but one of the phrases below is a hallucination.
 */
const HALLUCINATION_MIN_WINDOW_SEC = 8;
const KNOWN_HALLUCINATIONS = new Set([
  'you',
  'bye',
  'bye bye',
  'thank you',
  'thank you very much',
  'thank you so much',
  'thanks for watching',
  'thank you for watching',
  'thank you so much for watching',
  'thanks for watching and see you next time',
  'please subscribe',
  'please like and subscribe',
  'like and subscribe',
  'subscribe to my channel',
  'subtitles by the amaraorg community',
  'ご視聴ありがとうございました',
  '谢谢观看',
  '請不吝點贊訂閱轉發打賞支持明鏡與點點欄目',
]);
const MUSIC_SYMBOLS_REGEX = /[♪♫♬♩]/u;
const LETTER_OR_DIGIT_REGEX = /[\p{L}\p{N}]/u;
const NON_WORD_CHARACTERS_REGEX = /[^\p{L}\p{N}\s]/gu;
const LEADING_WHITESPACE_REGEX = /^\s*/u;
const WHITESPACE_REGEX = /^\s+$/u;
const OPENING_PUNCTUATION_REGEX = /^[\p{Ps}\p{Pi}]+$/u;
const STARTS_WITH_LATIN_OR_DIGIT_REGEX = /^[\p{Script=Latin}\p{N}]/u;

/**
 * Turns one window's raw word chunks into clean words with absolute timestamps: drops hallucinations and
 * repetition loops, splits unspaced (CJK, Thai…) phrases into words, and gives every word a sane duration.
 */
export function normalizeWords(props: NormalizeWordsProps): Array<TranscribedWord> {
  const { chunks, windowStartSec, windowEndSec, language } = props;

  const hasNoSpaces = LANGUAGES_WITHOUT_SPACES.includes(language);
  const absoluteWords = toAbsoluteWords({ chunks, windowStartSec, windowEndSec, hasNoSpaces });
  const spokenWords = absoluteWords.filter((word) => !isMusicSymbol(word.text));
  const isHallucination = isKnownHallucination({
    words: spokenWords,
    windowDurationSec: windowEndSec - windowStartSec,
  });

  if (isHallucination) return [];

  const wordsWithoutLoops = removeRepetitionLoops(spokenWords);
  const segmentedWords = hasNoSpaces ? splitUnspacedWords({ words: wordsWithoutLoops, language }) : wordsWithoutLoops;
  const timedWords = fixWordTimings({ words: segmentedWords, windowEndSec });

  const roundedWords = timedWords.map((word) => ({
    text: word.text,
    start: roundToMilliseconds(word.start),
    end: roundToMilliseconds(word.end),
  }));

  return roundedWords;
}

type ToAbsoluteWordsProps = {
  chunks: Array<RawWordChunk>;
  windowStartSec: number;
  windowEndSec: number;
  hasNoSpaces: boolean;
};

function toAbsoluteWords(props: ToAbsoluteWordsProps): Array<TranscribedWord> {
  const { chunks, windowStartSec, windowEndSec, hasNoSpaces } = props;

  const words: Array<TranscribedWord> = [];

  chunks.forEach((chunk) => {
    const trimmedText = chunk.text.trim();

    if (!trimmedText) return;

    const [relativeStart, relativeEnd] = chunk.timestamp;
    const start = windowStartSec + (relativeStart ?? 0);
    const end = windowStartSec + (relativeEnd ?? relativeStart ?? 0);

    if (start > windowEndSec + OUT_OF_WINDOW_TOLERANCE_SEC) return;

    const clampedStart = clamp({ value: start, min: windowStartSec, max: windowEndSec });
    const clampedEnd = clamp({ value: end, min: clampedStart, max: windowEndSec });
    const shouldDropLeadingSpace = hasNoSpaces && !STARTS_WITH_LATIN_OR_DIGIT_REGEX.test(trimmedText);
    const text = shouldDropLeadingSpace ? chunk.text.trimStart() : chunk.text;

    words.push({ text: text.trimEnd(), start: clampedStart, end: clampedEnd });
  });

  return words;
}

function isMusicSymbol(text: string): boolean {
  return MUSIC_SYMBOLS_REGEX.test(text) && !LETTER_OR_DIGIT_REGEX.test(text);
}

type IsKnownHallucinationProps = {
  words: Array<TranscribedWord>;
  windowDurationSec: number;
};

function isKnownHallucination(props: IsKnownHallucinationProps): boolean {
  const { words, windowDurationSec } = props;

  if (windowDurationSec < HALLUCINATION_MIN_WINDOW_SEC || words.length === 0) return false;

  const transcript = words.map((word) => word.text).join('');
  const normalizedTranscript = normalizeForComparison(transcript);

  return KNOWN_HALLUCINATIONS.has(normalizedTranscript);
}

function normalizeForComparison(text: string): string {
  return text.toLowerCase().replace(NON_WORD_CHARACTERS_REGEX, '').replace(/\s+/gu, ' ').trim();
}

/**
 * Collapses phrases Whisper repeats back-to-back (its "looping" failure mode).
 */
function removeRepetitionLoops(words: Array<TranscribedWord>): Array<TranscribedWord> {
  const tokens = words.map((word) => normalizeForComparison(word.text));
  const keptWords: Array<TranscribedWord> = [];

  let index = 0;
  while (index < words.length) {
    const loop = findLoopAt({ tokens, index });

    if (loop) {
      const keptRepeats = loop.phraseLength === 1 ? LOOP_KEPT_SINGLE_WORD_REPEATS : 1;
      keptWords.push(...words.slice(index, index + loop.phraseLength * keptRepeats));
      index += loop.phraseLength * loop.repeats;
    } else {
      keptWords.push(words[index]!);
      index++;
    }
  }

  return keptWords;
}

type FindLoopAtProps = {
  tokens: Array<string>;
  index: number;
};

type Loop = {
  phraseLength: number;
  repeats: number;
};

function findLoopAt(props: FindLoopAtProps): Loop | null {
  const { tokens, index } = props;

  for (let phraseLength = LOOP_MAX_PHRASE_WORDS; phraseLength >= 1; phraseLength--) {
    const repeats = countRepeats({ tokens, index, phraseLength });

    if (repeats >= LOOP_MIN_REPEATS) return { phraseLength, repeats };
  }

  return null;
}

type CountRepeatsProps = {
  tokens: Array<string>;
  index: number;
  phraseLength: number;
};

function countRepeats(props: CountRepeatsProps): number {
  const { tokens, index, phraseLength } = props;

  if (index + phraseLength > tokens.length) return 0;

  let repeats = 1;
  let nextIndex = index + phraseLength;

  while (nextIndex + phraseLength <= tokens.length) {
    let isSamePhrase = true;

    for (let offset = 0; offset < phraseLength; offset++) {
      if (tokens[nextIndex + offset] !== tokens[index + offset]) {
        isSamePhrase = false;
        break;
      }
    }

    if (!isSamePhrase) break;

    repeats++;
    nextIndex += phraseLength;
  }

  return repeats;
}

type SplitUnspacedWordsProps = {
  words: Array<TranscribedWord>;
  language: string;
};

/**
 * Splits phrases into dictionary words (with `Intl.Segmenter`) and spreads the phrase's time span over them by
 * character count. Punctuation sticks to the word before it, even across phrases (Whisper often starts one with
 * the previous phrase's comma); opening brackets and quotes stick to the word after them.
 */
function splitUnspacedWords(props: SplitUnspacedWordsProps): Array<TranscribedWord> {
  const { words, language } = props;

  const segmenter = new Intl.Segmenter(SEGMENTER_LOCALE_OVERRIDES[language] ?? language, { granularity: 'word' });
  const splitWords: Array<TranscribedWord> = [];

  words.forEach((word) => {
    const leadingWhitespace = LEADING_WHITESPACE_REGEX.exec(word.text)?.[0] ?? '';
    const body = word.text.slice(leadingWhitespace.length);
    const segments = Array.from(segmenter.segment(body));
    const pieces: Array<string> = [];
    let pendingPrefix = leadingWhitespace;

    segments.forEach(({ segment, isWordLike }) => {
      const previousWord = splitWords.at(-1);
      const sticksToNextWord = WHITESPACE_REGEX.test(segment) || OPENING_PUNCTUATION_REGEX.test(segment);

      if (isWordLike) {
        pieces.push(pendingPrefix + segment);
        pendingPrefix = '';
      } else if (sticksToNextWord) {
        pendingPrefix += segment;
      } else if (pieces.length > 0) {
        pieces[pieces.length - 1] += segment;
      } else if (previousWord && !pendingPrefix.trim()) {
        previousWord.text += segment;
      } else {
        pendingPrefix += segment;
      }
    });

    if (pendingPrefix.trim()) pieces.push(pendingPrefix);

    const pieceWords = spreadOverPieces({ word, pieces });
    splitWords.push(...pieceWords);
  });

  return splitWords;
}

type SpreadOverPiecesProps = {
  word: TranscribedWord;
  pieces: Array<string>;
};

/**
 * Gives each piece of a word a share of its time span, by character count.
 */
function spreadOverPieces(props: SpreadOverPiecesProps): Array<TranscribedWord> {
  const { word, pieces } = props;

  const totalCharacters = pieces.reduce((sum, piece) => sum + piece.trim().length, 0);
  const durationPerCharacter = totalCharacters > 0 ? (word.end - word.start) / totalCharacters : 0;
  let cursor = word.start;

  const pieceWords = pieces.map((piece) => {
    const start = cursor;
    cursor += piece.trim().length * durationPerCharacter;

    return { text: piece, start, end: cursor };
  });

  return pieceWords;
}

type FixWordTimingsProps = {
  words: Array<TranscribedWord>;
  windowEndSec: number;
};

/**
 * Keeps start times in order, and stretches near-zero durations (common for the last word before a pause) up to
 * the next word's start.
 */
function fixWordTimings(props: FixWordTimingsProps): Array<TranscribedWord> {
  const { words, windowEndSec } = props;

  let previousStart = Number.NEGATIVE_INFINITY;

  const fixedWords = words.map((word, index) => {
    const start = Math.max(word.start, previousStart);
    previousStart = start;

    const nextStart = words[index + 1]?.start ?? windowEndSec;
    const end = Math.max(word.end, start);
    const isTooShort = end - start < MIN_WORD_DURATION_SEC;
    const fixedEnd = isTooShort
      ? Math.min(start + SHORT_WORD_DURATION_SEC, Math.max(nextStart, start + MIN_WORD_DURATION_SEC))
      : end;

    return { text: word.text, start, end: fixedEnd };
  });

  return fixedWords;
}

type ClampProps = {
  value: number;
  min: number;
  max: number;
};

function clamp(props: ClampProps): number {
  const { value, min, max } = props;

  return Math.min(max, Math.max(min, value));
}

function roundToMilliseconds(seconds: number): number {
  return Math.round(seconds * 1000) / 1000;
}

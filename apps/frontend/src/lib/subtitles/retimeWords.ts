import { tokenizeText } from './tokenizeText';
import type { Word } from './types';

type RetimeWordsProps = {
  /**
   * The new caption text.
   */
  text: string;
  /**
   * The words of the caption before the edit.
   */
  previousWords: ReadonlyArray<Word>;
  start: number;
  end: number;
  language: string | null;
};

const MIN_SECONDS_PER_INSERTED_WORD = 0.1;

/**
 * Times the words of an edited caption. Untouched words keep their timing; edited ones share the time
 * between them, so word highlighting keeps working after small fixes.
 */
export function retimeWords(props: RetimeWordsProps): Array<Word> {
  const { text, previousWords, start, end, language } = props;

  const tokens = tokenizeText({ text, language });

  if (tokens.length === 0) return [];

  if (tokens.length === previousWords.length) {
    const words = tokens.map((token, index) => ({ ...previousWords[index]!, text: token }));

    return clampWords({ words, start, end });
  }

  const tokenKeys = tokens.map(toComparisonKey);
  const previousKeys = previousWords.map((word) => toComparisonKey(word.text));
  const maxShared = Math.min(tokens.length, previousWords.length);

  let prefixLength = 0;
  while (prefixLength < maxShared && tokenKeys[prefixLength] === previousKeys[prefixLength]) prefixLength++;

  let suffixLength = 0;
  while (
    suffixLength < maxShared - prefixLength &&
    tokenKeys[tokens.length - 1 - suffixLength] === previousKeys[previousWords.length - 1 - suffixLength]
  ) {
    suffixLength++;
  }

  const middleTokens = tokens.slice(prefixLength, tokens.length - suffixLength);
  const gapStart = prefixLength > 0 ? previousWords[prefixLength - 1]!.end : start;
  const gapEnd = suffixLength > 0 ? previousWords[previousWords.length - suffixLength]!.start : end;

  if (gapEnd - gapStart < middleTokens.length * MIN_SECONDS_PER_INSERTED_WORD) {
    const words = spreadTokens({ tokens, start, end });

    return clampWords({ words, start, end });
  }

  const prefixWords = tokens.slice(0, prefixLength).map((token, index) => ({ ...previousWords[index]!, text: token }));
  const middleWords = spreadTokens({ tokens: middleTokens, start: gapStart, end: gapEnd });
  const suffixWords = tokens.slice(tokens.length - suffixLength).map((token, index) => {
    const previousWord = previousWords[previousWords.length - suffixLength + index]!;

    return { ...previousWord, text: token };
  });

  const words = [...prefixWords, ...middleWords, ...suffixWords];

  return clampWords({ words, start, end });
}

type SpreadTokensProps = {
  tokens: ReadonlyArray<string>;
  start: number;
  end: number;
};

/**
 * Gives each token a share of the time proportional to its length.
 */
export function spreadTokens(props: SpreadTokensProps): Array<Word> {
  const { tokens, start, end } = props;

  const weights = tokens.map((token) => Math.max(1, token.trim().length));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const duration = Math.max(0, end - start);

  let cursor = start;

  return tokens.map((token, index) => {
    const wordDuration = (duration * weights[index]!) / totalWeight;
    const word = { text: token, start: cursor, end: cursor + wordDuration };
    cursor += wordDuration;

    return word;
  });
}

type ClampWordsProps = {
  words: Array<Word>;
  start: number;
  end: number;
};

function clampWords(props: ClampWordsProps): Array<Word> {
  const { words, start, end } = props;

  let previousStart = start;

  return words.map((word) => {
    const wordStart = Math.min(end, Math.max(previousStart, word.start));
    const wordEnd = Math.min(end, Math.max(wordStart, word.end));
    previousStart = wordStart;

    return { text: word.text, start: wordStart, end: wordEnd };
  });
}

function toComparisonKey(text: string): string {
  return text.trim().toLowerCase();
}

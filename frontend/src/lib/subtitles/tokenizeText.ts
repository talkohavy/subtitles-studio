import { UNSPACED_LANGUAGES } from './constants';

type TokenizeTextProps = {
  text: string;
  language: string | null;
};

const OPENING_PUNCTUATION = /^[\p{Ps}\p{Pi}]+$/u;
const LANGUAGE_TO_LOCALE: Record<string, string> = { yue: 'zh' };

const segmenters = new Map<string, Intl.Segmenter>();

export function isUnspacedLanguage(language: string | null): boolean {
  return language !== null && UNSPACED_LANGUAGES.has(language);
}

/**
 * Splits text into words, each keeping the whitespace before it: `"Hi there"` → `["Hi", " there"]`.
 * Text in languages written without spaces is split into dictionary words.
 */
export function tokenizeText(props: TokenizeTextProps): Array<string> {
  const { text, language } = props;

  const tokens = text.match(/\s*\S+/gu) ?? [];

  if (!isUnspacedLanguage(language)) return tokens;

  const segmenter = getWordSegmenter(language!);

  return tokens.flatMap((token) => splitUnspacedToken({ token, segmenter }));
}

type SplitUnspacedTokenProps = {
  token: string;
  segmenter: Intl.Segmenter;
};

/**
 * Punctuation stays attached to the word before it, and opening brackets and quotes to the word after them.
 */
function splitUnspacedToken(props: SplitUnspacedTokenProps): Array<string> {
  const { token, segmenter } = props;

  const pieces: Array<string> = [];
  let current = '';
  let currentHasWord = false;

  Array.from(segmenter.segment(token)).forEach(({ segment, isWordLike }) => {
    const isOpening = !isWordLike && OPENING_PUNCTUATION.test(segment);
    const startsNewPiece = currentHasWord && (isWordLike || isOpening);

    if (startsNewPiece) {
      pieces.push(current);
      current = '';
      currentHasWord = false;
    }

    current += segment;
    currentHasWord = currentHasWord || Boolean(isWordLike);
  });

  if (current) pieces.push(current);

  return pieces;
}

function getWordSegmenter(language: string): Intl.Segmenter {
  const locale = LANGUAGE_TO_LOCALE[language] ?? language;
  const cached = segmenters.get(locale);

  if (cached) return cached;

  const segmenter = new Intl.Segmenter(locale, { granularity: 'word' });
  segmenters.set(locale, segmenter);

  return segmenter;
}

/**
 * Joins words back into text; the first word's leading whitespace is dropped.
 */
export function joinWords(words: ReadonlyArray<{ text: string }>): string {
  const joined = words.map((word) => word.text).join('');

  return joined.trim();
}

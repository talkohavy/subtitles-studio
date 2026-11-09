import { detectTextLanguage } from './detectLanguage';

/**
 * The Windows code pages older subtitles files were saved in, in the order they're preferred when two read equally
 * well.
 */
export const LEGACY_ENCODINGS = [
  'windows-1252',
  'windows-1255',
  'windows-1256',
  'windows-1251',
  'windows-1253',
  'windows-1250',
  'windows-1254',
] as const;

type LegacyEncoding = (typeof LEGACY_ENCODINGS)[number];

export type DecodedText = {
  text: string;
  /**
   * A WHATWG encoding label, like `utf-8` or `windows-1255`.
   */
  encoding: string;
  /**
   * The file isn't Unicode, so its encoding was guessed from how its text reads.
   */
  isGuessed: boolean;
};

type DecodeTextProps = {
  bytes: Uint8Array;
  /**
   * Reads the bytes with this encoding instead of detecting it.
   */
  encoding?: string | null;
};

const UTF8 = 'utf-8';
const SAMPLE_BYTES = 200_000;
const UTF16_SAMPLE_BYTES = 1000;
const MIN_UTF16_ZERO_SHARE = 0.3;

export function decodeText(props: DecodeTextProps): DecodedText {
  const { bytes, encoding } = props;

  if (encoding) return { text: decode({ bytes, encoding }), encoding, isGuessed: false };

  const unicodeEncoding = getBomEncoding(bytes) ?? getUtf16Encoding(bytes);

  if (unicodeEncoding) {
    return { text: decode({ bytes, encoding: unicodeEncoding }), encoding: unicodeEncoding, isGuessed: false };
  }

  try {
    const text = new TextDecoder(UTF8, { fatal: true }).decode(bytes);

    return { text, encoding: UTF8, isGuessed: false };
  } catch {
    const guessedEncoding = guessLegacyEncoding(bytes);

    return { text: decode({ bytes, encoding: guessedEncoding }), encoding: guessedEncoding, isGuessed: true };
  }
}

function decode(props: { bytes: Uint8Array; encoding: string }): string {
  const { bytes, encoding } = props;

  const text = new TextDecoder(encoding).decode(bytes);

  return text;
}

function getBomEncoding(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return UTF8;

  if (bytes[0] === 0xff && bytes[1] === 0xfe) return 'utf-16le';

  if (bytes[0] === 0xfe && bytes[1] === 0xff) return 'utf-16be';

  return null;
}

/**
 * UTF-16 without a byte order mark: mostly-ASCII text has a zero byte in every other position.
 */
function getUtf16Encoding(bytes: Uint8Array): string | null {
  const sample = bytes.subarray(0, UTF16_SAMPLE_BYTES);
  const pairCount = Math.floor(sample.length / 2);

  if (pairCount === 0) return null;

  let evenZeros = 0;
  let oddZeros = 0;
  sample.forEach((byte, index) => {
    if (byte !== 0) return;

    if (index % 2 === 0) evenZeros++;
    else oddZeros++;
  });

  if (oddZeros / pairCount >= MIN_UTF16_ZERO_SHARE && oddZeros > evenZeros) return 'utf-16le';

  if (evenZeros / pairCount >= MIN_UTF16_ZERO_SHARE && evenZeros > oddZeros) return 'utf-16be';

  return null;
}

/**
 * The code pages of the languages whose letters Western (Windows-1252) doesn't have.
 */
const LATIN_LANGUAGE_ENCODINGS: Readonly<Record<string, LegacyEncoding>> = {
  tr: 'windows-1254',
  pl: 'windows-1250',
  cs: 'windows-1250',
  hu: 'windows-1250',
  ro: 'windows-1250',
};

function guessLegacyEncoding(bytes: Uint8Array): LegacyEncoding {
  // The code pages are one byte per character, so cutting the sample anywhere is safe.
  const sample = bytes.subarray(0, SAMPLE_BYTES);
  const readings = LEGACY_ENCODINGS.map((encoding) => ({ encoding, text: decode({ bytes: sample, encoding }) }));

  let bestReading = readings[0]!;
  let bestScore = Number.NEGATIVE_INFINITY;
  readings.forEach((reading) => {
    const score = scoreReading(reading);

    if (score <= bestScore) return;

    bestScore = score;
    bestReading = reading;
  });

  if (ENCODING_SCRIPTS[bestReading.encoding] !== Scripts.Latin) return bestReading.encoding;

  // The Latin code pages all read as plausible letters, but a language's common words are mostly plain ASCII,
  // which reads the same in all of them.
  const language = detectTextLanguage(bestReading.text);

  if (!language) return bestReading.encoding;

  return LATIN_LANGUAGE_ENCODINGS[language] ?? 'windows-1252';
}

const Scripts = {
  Latin: 'latin',
  Hebrew: 'hebrew',
  Arabic: 'arabic',
  Cyrillic: 'cyrillic',
  Greek: 'greek',
} as const;

type ScriptValues = (typeof Scripts)[keyof typeof Scripts];

const ENCODING_SCRIPTS: Record<LegacyEncoding, ScriptValues> = {
  'windows-1252': Scripts.Latin,
  'windows-1250': Scripts.Latin,
  'windows-1254': Scripts.Latin,
  'windows-1255': Scripts.Hebrew,
  'windows-1256': Scripts.Arabic,
  'windows-1251': Scripts.Cyrillic,
  'windows-1253': Scripts.Greek,
};

// Arabic vowel signs belong to no script of their own, so combining marks are allowed in every script.
const SCRIPT_WORDS: Record<ScriptValues, RegExp> = {
  latin: /^[\p{Script=Latin}\p{M}]+$/u,
  hebrew: /^[\p{Script=Hebrew}\p{M}]+$/u,
  arabic: /^[\p{Script=Arabic}\p{M}]+$/u,
  cyrillic: /^[\p{Script=Cyrillic}\p{M}]+$/u,
  greek: /^[\p{Script=Greek}\p{M}]+$/u,
};

const WORD = /[\p{L}\p{M}]+/gu;
const ASCII_WORD = /^[a-z]+$/iu;
const NON_ASCII_LETTER = /[^\p{M}a-z]/giu;
/**
 * Lowercase, Capitalized, or ALL CAPS. Misread text mixes cases inside words, like "ÙìåÍ".
 */
const WORD_CASING = /^(?:\p{Lu}?[\p{Ll}\p{M}]+|[\p{Lu}\p{M}]+)$/u;
const STARTS_WITH_MARK = /^\p{M}/u;
/**
 * A symbol right between two letters, like the "¿" and "³" of Polish "Zażółć" read as Western ("Za¿ó³æ").
 */
const WEDGED_SYMBOL = /\p{L}[^\p{L}\p{M}\s\d'’.-]\p{L}/gu;
const REPLACEMENT_CHARACTER = /\uFFFD/gu;
const MAX_ACCENTED_SHARE = 0.7;
const MIN_ACCENTED_SHARE_LENGTH = 3;
/**
 * Icelandic letters that Western reads Turkish "ğ" and "ş" as.
 */
const ICELANDIC_LETTER = /[ðþÐÞ]/u;
const HEBREW_FINAL_LETTER_INSIDE_WORD = /[ךםןףץ](?!$)/u;
const CYRILLIC_VOWEL = /[аеёиоуыэюяіїєъ]/iu;
const CYRILLIC_IMPOSSIBLE_START = /^[ъьыЪЬЫ]/u;
const CYRILLIC_IMPOSSIBLE_END = /[ъЪ]$/u;
const GREEK_VOWEL = /[αεηιουωάέήίόύώϊϋΐΰ]/iu;
const GREEK_FINAL_SIGMA_INSIDE_WORD = /ς(?!$)/u;

/**
 * How much the text reads like real words of the encoding's script: +1 for each plausible word with letters beyond
 * ASCII (those read the same in every encoding), -1 for each implausible one, and more for stray symbols.
 */
function scoreReading(props: { text: string; encoding: LegacyEncoding }): number {
  const { text, encoding } = props;

  let score = 0;
  (text.match(WORD) ?? []).forEach((word) => {
    if (ASCII_WORD.test(word)) return;

    score += isPlausibleWord({ word, encoding }) ? 1 : -1;
  });

  const wedgedSymbolCount = text.match(WEDGED_SYMBOL)?.length ?? 0;
  const replacementCount = text.match(REPLACEMENT_CHARACTER)?.length ?? 0;
  const totalScore = score - wedgedSymbolCount - 2 * replacementCount;

  return totalScore;
}

function isPlausibleWord(props: { word: string; encoding: LegacyEncoding }): boolean {
  const { word, encoding } = props;

  const script = ENCODING_SCRIPTS[encoding];

  if (!SCRIPT_WORDS[script].test(word) || STARTS_WITH_MARK.test(word)) return false;

  if (script === Scripts.Hebrew) return !HEBREW_FINAL_LETTER_INSIDE_WORD.test(word);

  if (script === Scripts.Arabic) return true;

  if (!WORD_CASING.test(word)) return false;

  if (script === Scripts.Cyrillic) {
    const hasVowel = word.length < 2 || CYRILLIC_VOWEL.test(word);

    return hasVowel && !CYRILLIC_IMPOSSIBLE_START.test(word) && !CYRILLIC_IMPOSSIBLE_END.test(word);
  }

  if (script === Scripts.Greek) {
    const hasVowel = word.length < 2 || GREEK_VOWEL.test(word);

    return hasVowel && !GREEK_FINAL_SIGMA_INSIDE_WORD.test(word);
  }

  if (encoding === 'windows-1252' && ICELANDIC_LETTER.test(word)) return false;

  const accentedShare = (word.match(NON_ASCII_LETTER)?.length ?? 0) / word.length;

  return word.length < MIN_ACCENTED_SHARE_LENGTH || accentedShare <= MAX_ACCENTED_SHARE;
}

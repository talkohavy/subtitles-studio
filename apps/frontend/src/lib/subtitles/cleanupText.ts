import { rebuildCueFromWords, updateCueText } from './cueOperations';
import type { Cue } from './types';

const FILLER_WORDS: ReadonlySet<string> = new Set([
  'um',
  'umm',
  'uh',
  'uhh',
  'uhm',
  'er',
  'erm',
  'ah',
  'ahh',
  'hmm',
  'hm',
  'mm',
  'mmm',
  'mhm',
]);

const EDGE_PUNCTUATION = /^(?:(?!['’])\p{P})+|(?:(?!['’])\p{P})+$/gu;

type CleanupResult = {
  cues: Array<Cue>;
  changedCount: number;
};

/**
 * Removes hesitations like "um" and "uh". Captions left empty are removed.
 */
export function removeFillerWords(cues: ReadonlyArray<Cue>): CleanupResult {
  let changedCount = 0;

  const updatedCues = cues.flatMap((cue) => {
    const words = cue.words.filter((word) => !FILLER_WORDS.has(toBareWord(word.text)));

    if (words.length === cue.words.length) return [cue];

    changedCount += cue.words.length - words.length;

    if (words.length === 0) return [];

    const wasCapitalized = /^\p{Lu}/u.test(cue.text);
    const rebuiltCue = rebuildCueFromWords({ cue, words });

    return [wasCapitalized ? capitalizeFirstLetter(rebuiltCue) : rebuiltCue];
  });

  return { cues: updatedCues, changedCount };
}

/**
 * Removes punctuation around words, a common style for short-form video captions. Apostrophes are kept.
 */
export function removePunctuation(cues: ReadonlyArray<Cue>): CleanupResult {
  let changedCount = 0;

  const updatedCues = cues.flatMap((cue) => {
    const words = cue.words
      .map((word) => {
        const leadingWhitespace = word.text.match(/^\s*/u)?.[0] ?? '';
        const body = word.text.slice(leadingWhitespace.length).replace(EDGE_PUNCTUATION, '');

        return { ...word, text: body ? `${leadingWhitespace}${body}` : '' };
      })
      .filter((word) => word.text);

    const rebuiltCue = rebuildCueFromWords({ cue, words });

    if (rebuiltCue.text === cue.text) return [cue];

    changedCount++;

    return rebuiltCue.text ? [rebuiltCue] : [];
  });

  return { cues: updatedCues, changedCount };
}

type FindAndReplaceProps = {
  cues: ReadonlyArray<Cue>;
  find: string;
  replaceWith: string;
  matchCase: boolean;
  language: string | null;
};

export function findAndReplace(props: FindAndReplaceProps): CleanupResult {
  const { cues, find, replaceWith, matchCase, language } = props;

  if (!find) return { cues: [...cues], changedCount: 0 };

  const escapedFind = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(escapedFind, matchCase ? 'gu' : 'giu');
  let changedCount = 0;

  const updatedCues = cues.map((cue) => {
    const matchCount = cue.text.match(pattern)?.length ?? 0;

    if (matchCount === 0) return cue;

    changedCount += matchCount;
    const text = cue.text.replace(pattern, () => replaceWith);

    return updateCueText({ cue, text, language });
  });

  return { cues: updatedCues, changedCount };
}

export function countMatches(props: Omit<FindAndReplaceProps, 'replaceWith' | 'language'>): number {
  const { cues, find, matchCase } = props;

  if (!find) return 0;

  const target = matchCase ? find : find.toLowerCase();

  return cues.reduce((total, cue) => {
    const text = matchCase ? cue.text : cue.text.toLowerCase();

    return total + text.split(target).length - 1;
  }, 0);
}

function toBareWord(text: string): string {
  const bare = text.trim().replace(EDGE_PUNCTUATION, '');

  return bare.toLowerCase();
}

function capitalizeFirstLetter(cue: Cue): Cue {
  const [firstWord, ...otherWords] = cue.words;

  if (!firstWord) return cue;

  const capitalizedText = firstWord.text.replace(/\p{L}/u, (letter) => letter.toLocaleUpperCase());
  const words = [{ ...firstWord, text: capitalizedText }, ...otherWords];

  return rebuildCueFromWords({ cue, words });
}

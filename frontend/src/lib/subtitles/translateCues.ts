import { endsClause, endsSentence, getDisplayLength } from './breakRules';
import { retimeWords } from './retimeWords';
import { splitTextByWeights } from './splitTextByWeights';
import { isUnspacedLanguage, joinWords, tokenizeText } from './tokenizeText';
import type { Cue } from './types';

type TranslationFragment = {
  cueIndex: number;
  /**
   * The part of the unit's text that this caption holds.
   */
  text: string;
};

export type TranslationUnit = {
  /**
   * What gets translated: usually one sentence, which may span several captions.
   */
  text: string;
  fragments: Array<TranslationFragment>;
};

/**
 * A sentence with no ending punctuation is cut at the next caption boundary after a pause this long, or once it
 * gets this long.
 */
const UNIT_PAUSE_SEC = 2;
const MAX_UNIT_LENGTH = 250;
/**
 * The translator tends to drop the end of a long sentence, so one longer than this is translated in pieces, split at
 * the clause end (a comma, say) nearest its middle. No piece gets shorter than `MIN_CLAUSE_LENGTH`.
 */
const MAX_SENTENCE_LENGTH = 100;
const MIN_CLAUSE_LENGTH = 30;
/**
 * Titles end with a period without ending the sentence, as in "Mr. Smith".
 */
const TITLES: ReadonlySet<string> = new Set(['mr', 'mrs', 'ms', 'dr', 'prof', 'st', 'jr', 'sr', 'vs']);
const INITIAL = /^\p{Lu}\.$/u;
const STARTS_LOWERCASE = /^\s*[\p{Ps}\p{Pi}"']*\p{Ll}/u;
/**
 * A caption left without text gives its time to the caption before it when the two touch, or else to the one after.
 */
const TOUCHING_GAP_SEC = 0.05;

type SourceToken = {
  cueIndex: number;
  text: string;
};

type BuildTranslationUnitsProps = {
  cues: ReadonlyArray<Cue>;
  language: string | null;
};

/**
 * Regroups the captions' text into sentences, since a translator does far better with whole sentences than with
 * the pieces of them that fit in a caption.
 */
export function buildTranslationUnits(props: BuildTranslationUnitsProps): Array<TranslationUnit> {
  const { cues, language } = props;

  const separator = isUnspacedLanguage(language) ? '' : ' ';
  const tokens: Array<SourceToken> = cues.flatMap((cue, cueIndex) => {
    const text = cue.text.replace(/\s*\n\s*/gu, separator);
    const cueTokens = tokenizeText({ text, language }).map((token) => ({ cueIndex, text: token }));

    return cueTokens;
  });

  const units: Array<TranslationUnit> = [];
  let unitTokens: Array<SourceToken> = [];

  tokens.forEach((token, index) => {
    unitTokens.push(token);

    const nextToken = tokens[index + 1];
    const isUnitEnd =
      !nextToken ||
      isSentenceBreak({ token: token.text, nextToken: nextToken.text }) ||
      (nextToken.cueIndex !== token.cueIndex && isRunOnBreak({ cues, unitTokens, nextCueIndex: nextToken.cueIndex }));

    if (!isUnitEnd) return;

    splitAtClauses(unitTokens).forEach((clauseTokens) => {
      units.push(toTranslationUnit({ tokens: clauseTokens, separator }));
    });
    unitTokens = [];
  });

  return units;
}

type IsSentenceBreakProps = {
  token: string;
  nextToken: string;
};

function isSentenceBreak(props: IsSentenceBreakProps): boolean {
  const { token, nextToken } = props;

  if (!endsSentence(token) || STARTS_LOWERCASE.test(nextToken)) return false;

  const word = token.trim();
  const isTitle = TITLES.has(word.replace(/\.$/u, '').toLowerCase());

  return !isTitle && !INITIAL.test(word);
}

type IsRunOnBreakProps = {
  cues: ReadonlyArray<Cue>;
  unitTokens: ReadonlyArray<SourceToken>;
  nextCueIndex: number;
};

/**
 * Whether a unit that hasn't reached a sentence end should still end before the caption at `nextCueIndex`.
 */
function isRunOnBreak(props: IsRunOnBreakProps): boolean {
  const { cues, unitTokens, nextCueIndex } = props;

  const lastCue = cues[unitTokens.at(-1)!.cueIndex]!;
  const pauseSec = cues[nextCueIndex]!.start - lastCue.end;
  const unitLength = unitTokens.reduce((sum, token) => sum + getDisplayLength(token.text), 0);

  return pauseSec >= UNIT_PAUSE_SEC || unitLength >= MAX_UNIT_LENGTH;
}

function splitAtClauses(tokens: Array<SourceToken>): Array<Array<SourceToken>> {
  const lengths = tokens.map((token) => getDisplayLength(token.text));
  const totalLength = lengths.reduce((sum, length) => sum + length, 0);

  if (totalLength <= MAX_SENTENCE_LENGTH) return [tokens];

  let splitIndex = -1;
  let splitDistance = Infinity;
  let offset = 0;

  tokens.forEach((token, index) => {
    offset += lengths[index]!;

    const leavesLongEnoughPieces = offset >= MIN_CLAUSE_LENGTH && totalLength - offset >= MIN_CLAUSE_LENGTH;
    const distance = Math.abs(offset - totalLength / 2);

    if (!endsClause(token.text) || !leavesLongEnoughPieces || distance >= splitDistance) return;

    splitIndex = index;
    splitDistance = distance;
  });

  if (splitIndex === -1) return [tokens];

  const pieces = [...splitAtClauses(tokens.slice(0, splitIndex + 1)), ...splitAtClauses(tokens.slice(splitIndex + 1))];

  return pieces;
}

type ToTranslationUnitProps = {
  tokens: ReadonlyArray<SourceToken>;
  separator: string;
};

function toTranslationUnit(props: ToTranslationUnitProps): TranslationUnit {
  const { tokens, separator } = props;

  const tokensByCue: Array<Array<SourceToken>> = [];

  tokens.forEach((token) => {
    const currentGroup = tokensByCue.at(-1);

    if (currentGroup?.[0]?.cueIndex === token.cueIndex) {
      currentGroup.push(token);
    } else {
      tokensByCue.push([token]);
    }
  });

  const fragments = tokensByCue.map((group) => ({ cueIndex: group[0]!.cueIndex, text: joinWords(group) }));
  const text = fragments.map((fragment) => fragment.text).join(separator);

  return { text, fragments };
}

type ApplyTranslationsProps = {
  cues: ReadonlyArray<Cue>;
  units: ReadonlyArray<TranslationUnit>;
  /**
   * One per unit, in the same order.
   */
  translations: ReadonlyArray<string>;
  /**
   * The language of the translations.
   */
  language: string | null;
};

/**
 * Puts each unit's translation back into the captions it came from, sharing it out in proportion to how much of the
 * original each caption held. Captions keep their timing; one left without text is removed.
 */
export function applyTranslations(props: ApplyTranslationsProps): Array<Cue> {
  const { cues, units, translations, language } = props;

  const separator = isUnspacedLanguage(language) ? '' : ' ';
  const piecesByCue: Array<Array<string>> = cues.map(() => []);

  units.forEach((unit, unitIndex) => {
    const weights = unit.fragments.map((fragment) => Math.max(1, getDisplayLength(fragment.text)));
    const text = translations[unitIndex] ?? unit.text;
    const pieces = splitTextByWeights({ text, weights, language });

    unit.fragments.forEach((fragment, fragmentIndex) => piecesByCue[fragment.cueIndex]!.push(pieces[fragmentIndex]!));
  });

  const translatedCues: Array<Cue> = [];
  // The time of captions left without text that the caption before them didn't take.
  let unclaimedTime: { start: number; end: number } | null = null;

  cues.forEach((cue, cueIndex) => {
    const text = piecesByCue[cueIndex]!.filter(Boolean).join(separator);
    const previousCue = translatedCues.at(-1);
    const touchesUnclaimedTime = unclaimedTime !== null && cue.start - unclaimedTime.end <= TOUCHING_GAP_SEC;

    if (text) {
      translatedCues.push({ ...cue, start: touchesUnclaimedTime ? unclaimedTime!.start : cue.start, text });
      unclaimedTime = null;
    } else if (touchesUnclaimedTime) {
      unclaimedTime!.end = cue.end;
    } else if (!unclaimedTime && previousCue && cue.start - previousCue.end <= TOUCHING_GAP_SEC) {
      previousCue.end = cue.end;
    } else {
      unclaimedTime = { start: cue.start, end: cue.end };
    }
  });

  const retimedCues = translatedCues.map((cue) => {
    const words = retimeWords({ text: cue.text, previousWords: [], start: cue.start, end: cue.end, language });

    return { ...cue, words };
  });

  return retimedCues;
}

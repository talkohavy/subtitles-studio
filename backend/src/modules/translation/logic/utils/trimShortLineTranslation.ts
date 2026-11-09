type TrimShortLineTranslationProps = {
  text: string;
  translation: string;
};

const MAX_SHORT_LINE_WORDS = 2;
const MAX_SHORT_LINE_LENGTH = 20;
const CLAUSE_BREAK = /[,;:.!?…،؛、，；：。！？؟]+/u;
const TRAILING_PUNCTUATION = /[,;:.!?…،؛、，；：。！？؟"'”’)\]\s]+$/u;
const SENTENCE_END = /[.!?。！？؟]$/u;

/**
 * NLLB tends to keep talking after a one- or two-word line, e.g. "Yes!" → "כן, אני יודע." ("Yes, I know."), so
 * when such a line is a single clause, only the first clause of its translation is kept.
 */
export function trimShortLineTranslation(props: TrimShortLineTranslationProps): string {
  const { text, translation } = props;

  const source = text.trim();
  const isShortLine = source.length <= MAX_SHORT_LINE_LENGTH && source.split(/\s+/u).length <= MAX_SHORT_LINE_WORDS;
  const isSingleClause = !CLAUSE_BREAK.test(source.replace(TRAILING_PUNCTUATION, ''));

  if (!isShortLine || !isSingleClause) return translation;

  const clauseBreak = CLAUSE_BREAK.exec(translation);
  const firstClause = clauseBreak ? translation.slice(0, clauseBreak.index).trim() : '';
  const hasMoreAfterBreak = clauseBreak && translation.slice(clauseBreak.index + clauseBreak[0].length).trim() !== '';

  if (!firstClause || !hasMoreAfterBreak) return translation;

  const ending = translation.match(SENTENCE_END)?.[0] ?? '';
  const trimmedTranslation = `${firstClause}${ending}`;

  return trimmedTranslation;
}

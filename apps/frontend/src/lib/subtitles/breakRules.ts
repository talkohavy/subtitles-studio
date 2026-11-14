const SENTENCE_END = /[.!?…。！？؟۔।॥።။։]["'”’)\]]*$/u;
const CLAUSE_END = /[,;:،؛、，；：]["'”’)\]]*$/u;
const WIDE_CHARACTER = /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]/u;
const NON_WORD_CHARACTERS = /[^\p{L}\p{N}']/gu;

/**
 * English and Hebrew words that lead into what follows them, so a caption reads badly when it ends on one. The two
 * languages can share a set, since their words never collide.
 */
const DANGLING_WORDS: ReadonlySet<string> = new Set([
  'a',
  'an',
  'the',
  'this',
  'that',
  'these',
  'those',
  'my',
  'your',
  'his',
  'her',
  'its',
  'our',
  'their',
  'every',
  'each',
  'some',
  'any',
  'no',
  'of',
  'to',
  'in',
  'on',
  'at',
  'by',
  'for',
  'with',
  'from',
  'into',
  'onto',
  'about',
  'over',
  'under',
  'after',
  'before',
  'between',
  'through',
  'and',
  'or',
  'but',
  'nor',
  'so',
  'if',
  'because',
  'than',
  'as',
  'when',
  'while',
  'where',
  'who',
  'which',
  'then',
  'very',
  'not',
  'will',
  'would',
  'can',
  'could',
  'should',
  'must',
  'i',
  "i'm",
  "it's",
  "don't",
  "can't",
  "won't",
  'של',
  'את',
  'על',
  'עם',
  'אל',
  'בין',
  'כמו',
  'לפני',
  'אחרי',
  'בלי',
  'עד',
  'לגבי',
  'בשביל',
  'בגלל',
  'למרות',
  'כדי',
  'כל',
  'אם',
  'כי',
  'או',
  'אבל',
  'גם',
  'רק',
  'לא',
  'אין',
  'אשר',
  'כאשר',
  'וכל',
  'ולא',
  'וגם',
  'ואם',
  'ועל',
  'ואת',
  'ועם',
  'ושל',
]);

/**
 * Whether the word ends a sentence, like `"done."` or `"right?"`.
 */
export function endsSentence(word: string): boolean {
  return SENTENCE_END.test(word.trim());
}

/**
 * Whether the word ends a clause, like `"first,"`.
 */
export function endsClause(word: string): boolean {
  return CLAUSE_END.test(word.trim());
}

/**
 * Whether a caption reads badly when it ends on this word, like "the" or "של".
 */
export function isDanglingWord(word: string): boolean {
  const bareWord = word.trim().toLowerCase().replace(NON_WORD_CHARACTERS, '');

  return DANGLING_WORDS.has(bareWord);
}

/**
 * Wide (CJK) characters count twice, since they take about twice the room of Latin letters.
 */
export function getDisplayLength(text: string): number {
  const characters = Array.from(text);
  const length = characters.reduce((sum, character) => sum + (WIDE_CHARACTER.test(character) ? 2 : 1), 0);

  return length;
}

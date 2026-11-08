/**
 * Languages written without spaces between words.
 */
export const UNSPACED_LANGUAGES: ReadonlySet<string> = new Set(['ja', 'zh', 'yue', 'th', 'lo', 'km', 'my', 'bo']);

export const CaptionLengths = {
  Word: 'word',
  Short: 'short',
  Line: 'line',
  TwoLines: 'two-lines',
} as const;

export type CaptionLengthValues = (typeof CaptionLengths)[keyof typeof CaptionLengths];

export const CAPTION_LENGTH_OPTIONS: ReadonlyArray<{ value: CaptionLengthValues; label: string; maxChars: number }> = [
  { value: CaptionLengths.Word, label: 'One word', maxChars: 1 },
  { value: CaptionLengths.Short, label: 'Short', maxChars: 18 },
  { value: CaptionLengths.Line, label: 'One line', maxChars: 32 },
  { value: CaptionLengths.TwoLines, label: 'Two lines', maxChars: 64 },
];

/**
 * The shortest a caption can be made by hand.
 */
export const MIN_CUE_DURATION_SEC = 0.2;

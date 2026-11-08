export const TextDirections = {
  Ltr: 'ltr',
  Rtl: 'rtl',
  Neutral: 'neutral',
} as const;

export type TextDirectionValues = (typeof TextDirections)[keyof typeof TextDirections];

const RTL_CHARACTER = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFC]/u;
const STRONG_CHARACTER = /\p{L}/u;

/**
 * The direction of the first character with a direction (a letter); digits and punctuation have none.
 */
export function getTextDirection(text: string): TextDirectionValues {
  const firstStrongCharacter = Array.from(text).find((character) => STRONG_CHARACTER.test(character));

  if (!firstStrongCharacter) return TextDirections.Neutral;

  return RTL_CHARACTER.test(firstStrongCharacter) ? TextDirections.Rtl : TextDirections.Ltr;
}

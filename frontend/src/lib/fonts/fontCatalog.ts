export const FontIds = {
  Inter: 'inter',
  Montserrat: 'montserrat',
  Poppins: 'poppins',
  Roboto: 'roboto',
  Rubik: 'rubik',
  Oswald: 'oswald',
  PlayfairDisplay: 'playfair-display',
  Anton: 'anton',
  BebasNeue: 'bebas-neue',
  Bangers: 'bangers',
  LuckiestGuy: 'luckiest-guy',
  PermanentMarker: 'permanent-marker',
  Pacifico: 'pacifico',
} as const;

export type FontIdValues = (typeof FontIds)[keyof typeof FontIds];

export type FontDefinition = {
  id: FontIdValues;
  label: string;
  family: string;
  weights: ReadonlyArray<number>;
};

const ALL_WEIGHTS = [400, 500, 600, 700, 800, 900];

export const FONT_CATALOG: ReadonlyArray<FontDefinition> = [
  { id: FontIds.Inter, label: 'Inter', family: 'Inter Variable', weights: ALL_WEIGHTS },
  { id: FontIds.Montserrat, label: 'Montserrat', family: 'Montserrat Variable', weights: ALL_WEIGHTS },
  { id: FontIds.Poppins, label: 'Poppins', family: 'Poppins', weights: ALL_WEIGHTS },
  { id: FontIds.Roboto, label: 'Roboto', family: 'Roboto Variable', weights: ALL_WEIGHTS },
  { id: FontIds.Rubik, label: 'Rubik', family: 'Rubik Variable', weights: ALL_WEIGHTS },
  { id: FontIds.Oswald, label: 'Oswald', family: 'Oswald Variable', weights: [400, 500, 600, 700] },
  { id: FontIds.PlayfairDisplay, label: 'Playfair Display', family: 'Playfair Display Variable', weights: ALL_WEIGHTS },
  { id: FontIds.Anton, label: 'Anton', family: 'Anton', weights: [400] },
  { id: FontIds.BebasNeue, label: 'Bebas Neue', family: 'Bebas Neue', weights: [400] },
  { id: FontIds.Bangers, label: 'Bangers', family: 'Bangers', weights: [400] },
  { id: FontIds.LuckiestGuy, label: 'Luckiest Guy', family: 'Luckiest Guy', weights: [400] },
  { id: FontIds.PermanentMarker, label: 'Permanent Marker', family: 'Permanent Marker', weights: [400] },
  { id: FontIds.Pacifico, label: 'Pacifico', family: 'Pacifico', weights: [400] },
];

/**
 * Rubik covers Hebrew, Arabic and Cyrillic; the system font covers everything else (e.g. CJK).
 */
const FALLBACK_FONTS = '"Rubik Variable", system-ui, sans-serif';

export function getFontDefinition(fontId: FontIdValues): FontDefinition {
  return FONT_CATALOG.find((font) => font.id === fontId) ?? FONT_CATALOG[0]!;
}

export function getFontStack(fontId: FontIdValues): string {
  const { family } = getFontDefinition(fontId);

  return `"${family}", ${FALLBACK_FONTS}`;
}

/**
 * The closest weight the font has, so the browser never fakes a bold.
 */
export function resolveFontWeight(props: { fontId: FontIdValues; weight: number }): number {
  const { fontId, weight } = props;

  const { weights } = getFontDefinition(fontId);
  const sortedByDistance = [...weights].sort((a, b) => Math.abs(a - weight) - Math.abs(b - weight));

  return sortedByDistance[0] ?? 400;
}

type GetCanvasFontProps = {
  fontId: FontIdValues;
  weight: number;
  sizePx: number;
};

export function getCanvasFont(props: GetCanvasFontProps): string {
  const { fontId, weight, sizePx } = props;

  const resolvedWeight = resolveFontWeight({ fontId, weight });
  const fontStack = getFontStack(fontId);

  return `${resolvedWeight} ${sizePx.toFixed(2)}px ${fontStack}`;
}

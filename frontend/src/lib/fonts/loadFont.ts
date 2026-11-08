import { getCanvasFont, type FontIdValues } from './fontCatalog';

type LoadFontProps = {
  fontId: FontIdValues;
  weight: number;
  /**
   * The text that will be drawn, so the right character subsets are downloaded.
   */
  text: string;
};

/**
 * Canvas text doesn't wait for fonts, so they have to be loaded before drawing.
 */
export async function loadFont(props: LoadFontProps): Promise<void> {
  const { fontId, weight, text } = props;

  const font = getCanvasFont({ fontId, weight, sizePx: 32 });

  try {
    await document.fonts.load(font, text || 'Aa');
  } catch {
    // The fallback font is drawn instead.
  }
}

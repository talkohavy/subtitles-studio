import { applyTextTransform } from '@src/lib/renderer/layoutCaption';
import type { SubtitleStyle } from '@src/lib/renderer/types';
import type { Cue } from '@src/lib/subtitles/types';

type GetFontSampleTextProps = {
  cues: ReadonlyArray<Cue>;
  style: SubtitleStyle;
  language: string | null;
};

/**
 * Every character the captions draw, once each and sorted. The browser downloads a font's character subsets based on
 * which characters the sample has, so this loads every subset the captions need, and stays short (and unchanged by
 * most edits) however long the transcript is.
 */
export function getFontSampleText(props: GetFontSampleTextProps): string {
  const { cues, style, language } = props;

  const characters = new Set<string>();

  cues.forEach((cue) => {
    const drawnText = applyTextTransform({ text: cue.text, style, language });

    for (const character of drawnText) {
      if (!/\s/u.test(character)) characters.add(character);
    }
  });

  const sampleText = [...characters].sort().join('');

  return sampleText;
}

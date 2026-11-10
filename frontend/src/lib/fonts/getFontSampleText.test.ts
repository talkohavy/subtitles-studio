import { describe, expect, it } from 'vite-plus/test';
import { DEFAULT_SUBTITLE_STYLE } from '@src/lib/renderer/presets';
import { TextTransforms } from '@src/lib/renderer/types';
import { getFontSampleText } from './getFontSampleText';
import type { Cue } from '@src/lib/subtitles/types';

function makeCue(text: string): Cue {
  return { id: text, start: 0, end: 1, text, words: [] };
}

describe('getFontSampleText', () => {
  it('should list every character once, without whitespace', () => {
    const cues = [makeCue('abba\ncab'), makeCue('b a')];

    const actualResult = getFontSampleText({ cues, style: DEFAULT_SUBTITLE_STYLE, language: null });

    expect(actualResult).toBe('abc');
  });

  it('should include characters from late in a long transcript', () => {
    const cues = [...Array.from({ length: 5000 }, () => makeCue('hello world')), makeCue('café שלום')];

    const actualResult = [...getFontSampleText({ cues, style: DEFAULT_SUBTITLE_STYLE, language: null })];

    expect(actualResult).toEqual(expect.arrayContaining(['é', 'ש']));
  });

  it('should sample the characters as drawn, after the text transform', () => {
    const style = { ...DEFAULT_SUBTITLE_STYLE, textTransform: TextTransforms.Uppercase };

    const actualResult = getFontSampleText({ cues: [makeCue('iki')], style, language: 'tr' });

    expect(actualResult).toBe('Kİ');
  });
});

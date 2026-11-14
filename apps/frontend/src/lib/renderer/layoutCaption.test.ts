import { describe, expect, it } from 'vite-plus/test';
import { layoutCaption, wrapTokens, type CaptionToken } from './layoutCaption';
import { DEFAULT_SUBTITLE_STYLE } from './presets';
import { TextTransforms, type SubtitleStyle } from './types';
import type { Word } from '@src/lib/subtitles/types';

const CHARACTER_WIDTH = 10;

function measure(text: string): number {
  return text.length * CHARACTER_WIDTH;
}

/**
 * `'one two\nthree'` → words with the whitespace before them, as transcription produces.
 */
function makeWords(text: string): Array<Word> {
  const words = text.split(/(?=\s)/u).map((wordText, index) => ({ text: wordText, start: index, end: index + 1 }));

  return words;
}

function makeTokens(text: string): Array<CaptionToken> {
  const tokens = makeWords(text).map((word, index) => {
    const trimmedText = word.text.trimStart();

    return {
      text: trimmedText,
      index,
      hasSpaceBefore: trimmedText !== word.text,
      forcesLineBreak: word.text.startsWith('\n'),
      start: word.start,
      end: word.end,
      isRtl: false,
      width: measure(trimmedText),
    };
  });

  return tokens;
}

function getLineTexts(lines: Array<Array<{ text: string }>>): Array<Array<string>> {
  const lineTexts = lines.map((line) => line.map((token) => token.text));

  return lineTexts;
}

type LayoutProps = {
  text: string;
  style?: Partial<SubtitleStyle>;
};

function layout(props: LayoutProps) {
  const { text, style } = props;

  const captionLayout = layoutCaption({
    words: makeWords(text),
    style: { ...DEFAULT_SUBTITLE_STYLE, ...style },
    frameWidth: 1920,
    frameHeight: 1080,
    measure,
    language: null,
  });

  return captionLayout;
}

describe('wrapTokens', () => {
  it('should keep a caption that fits on one line', () => {
    const lines = wrapTokens({ tokens: makeTokens('one two'), maxWidth: 200, spaceWidth: CHARACTER_WIDTH });

    const actualResult = getLineTexts(lines);

    expect(actualResult).toEqual([['one', 'two']]);
  });

  it('should balance the lines instead of leaving a lonely word at the end', () => {
    const tokens = makeTokens('one two three four five six');

    const actualResult = getLineTexts(wrapTokens({ tokens, maxWidth: 200, spaceWidth: CHARACTER_WIDTH }));

    const expectedResult = [
      ['one', 'two', 'three'],
      ['four', 'five', 'six'],
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should start a new line where a word starts with a line break', () => {
    const lines = wrapTokens({ tokens: makeTokens('one\ntwo'), maxWidth: 200, spaceWidth: CHARACTER_WIDTH });

    const actualResult = getLineTexts(lines);

    expect(actualResult).toEqual([['one'], ['two']]);
  });
});

describe('layoutCaption', () => {
  it('should center a line in the frame', () => {
    const { lines } = layout({ text: 'Hi' });

    const actualResult = lines[0]!.x;

    expect(actualResult).toBe((1920 - 2 * CHARACTER_WIDTH) / 2);
  });

  it('should apply the text transform', () => {
    const { lines } = layout({ text: 'hello world', style: { textTransform: TextTransforms.Uppercase } });

    const actualResult = getLineTexts(lines.map((line) => line.tokens));

    expect(actualResult).toEqual([['HELLO', 'WORLD']]);
  });

  it('should lay Hebrew words out from right to left', () => {
    const { lines, isRtl } = layout({ text: 'שלום לכולם' });

    const actualResult = { isRtl, lineTexts: getLineTexts(lines.map((line) => line.tokens)) };

    const expectedResult = { isRtl: true, lineTexts: [['לכולם', 'שלום']] };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should keep English words in reading order inside a Hebrew caption', () => {
    const { lines } = layout({ text: 'אני אוהב React Native' });

    const actualResult = getLineTexts(lines.map((line) => line.tokens));

    expect(actualResult).toEqual([['React', 'Native', 'אוהב', 'אני']]);
  });

  it('should put the period after an English word that ends a Hebrew caption at the far left, against the word', () => {
    const { lines } = layout({ text: 'ראיתי את iPhone.' });
    const [period, word] = lines[0]!.tokens;

    const actualResult = {
      lineTexts: getLineTexts(lines.map((line) => line.tokens)),
      gapAfterPeriod: word!.x - (period!.x + period!.width),
    };

    const expectedResult = { lineTexts: [['.', 'iPhone', 'את', 'ראיתי']], gapAfterPeriod: 0 };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should put the period after an English phrase that ends a Hebrew caption outside the whole phrase', () => {
    const { lines } = layout({ text: 'אני גר New York.' });

    const actualResult = getLineTexts(lines.map((line) => line.tokens));

    expect(actualResult).toEqual([['.', 'New', 'York', 'גר', 'אני']]);
  });

  it('should keep parentheses around an English word in a Hebrew caption', () => {
    const { lines } = layout({ text: 'ראיתי (iPhone) אתמול' });

    // The parentheses are drawn right-to-left, so each one shows mirrored: `(` on the left, `)` on the right.
    const actualResult = lines[0]!.tokens.map((token) => [token.text, token.isRtl]);

    const expectedResult = [
      ['אתמול', true],
      [')', true],
      ['iPhone', false],
      ['(', true],
      ['ראיתי', true],
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should draw a number that ends a Hebrew caption right-to-left, so its period goes on the left', () => {
    const { lines } = layout({ text: 'שילמתי 50.' });

    const actualResult = lines[0]!.tokens.map((token) => [token.text, token.isRtl]);

    const expectedResult = [
      ['50.', true],
      ['שילמתי', true],
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should keep a percent sign with its number', () => {
    const { lines } = layout({ text: 'הנחה של 50%' });

    const actualResult = getLineTexts(lines.map((line) => line.tokens));

    expect(actualResult).toEqual([['50%', 'של', 'הנחה']]);
  });

  it('should put the comma after a Hebrew phrase in an English caption on its right', () => {
    const { lines } = layout({ text: 'I said שלום עולם, then left' });

    const actualResult = getLineTexts(lines.map((line) => line.tokens));

    expect(actualResult).toEqual([['I', 'said', 'עולם', 'שלום', ',', 'then', 'left']]);
  });

  it('should keep a caption positioned at the very bottom inside the frame’s margin', () => {
    const { bounds } = layout({ text: 'Hello', style: { positionY: 100 } });

    const actualResult = bounds.y + bounds.height;

    expect(actualResult).toBeCloseTo(1080 * 0.97);
  });
});

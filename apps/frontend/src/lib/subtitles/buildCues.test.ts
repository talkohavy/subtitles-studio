import { describe, expect, it } from 'vite-plus/test';
import { buildCues } from './buildCues';
import { CaptionLengths } from './constants';
import type { Word } from './types';

type MakeWordsProps = {
  text: string;
  start?: number;
  wordSec?: number;
  gapSec?: number;
};

/**
 * Times the words of `text` back-to-back, like a steady speaker.
 */
function makeWords(props: MakeWordsProps): Array<Word> {
  const { text, start = 0, wordSec = 0.3, gapSec = 0.05 } = props;

  const words = text.split(' ').map((wordText, index) => {
    const wordStart = start + index * (wordSec + gapSec);

    return { text: index === 0 ? wordText : ` ${wordText}`, start: wordStart, end: wordStart + wordSec };
  });

  return words;
}

describe('buildCues', () => {
  it('should end captions at sentence ends rather than fill them up', () => {
    const words = makeWords({ text: 'Hey everyone, welcome back to the channel. Today we talk about subtitles.' });

    const cues = buildCues({ words, captionLength: CaptionLengths.Line });
    const actualResult = cues.map((cue) => cue.text);

    const expectedResult = ['Hey everyone,', 'welcome back to the channel.', 'Today we talk about subtitles.'];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should not end a caption on a word that leads into the next one', () => {
    const words = makeWords({ text: 'Put the phone on the table now' });

    const cues = buildCues({ words, captionLength: CaptionLengths.Short });
    const actualResult = cues.map((cue) => cue.text);

    const expectedResult = ['Put the phone', 'on the table now'];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should not end a caption on a Hebrew word that leads into the next one', () => {
    const words = makeWords({ text: 'היום נדבר על כתוביות, ולמה כל יוצר תוכן צריך להשתמש בהן.' });

    const cues = buildCues({ words, captionLength: CaptionLengths.Line });
    const actualResult = cues.map((cue) => cue.text);

    const expectedResult = ['היום נדבר על כתוביות, ולמה', 'כל יוצר תוכן צריך להשתמש בהן.'];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should start a new caption after a long pause, even when the words would fit', () => {
    const words = [...makeWords({ text: 'Hello there.' }), ...makeWords({ text: 'General Kenobi.', start: 1.65 })];

    const cues = buildCues({ words, captionLength: CaptionLengths.TwoLines });
    const actualResult = cues.map((cue) => cue.text);

    const expectedResult = ['Hello there.', 'General Kenobi.'];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should keep every caption within the length limit', () => {
    const words = makeWords({
      text: 'So let me show you how easy it is to add beautiful subtitles to any video in just a few seconds without any special software or skills at all',
    });

    const cues = buildCues({ words, captionLength: CaptionLengths.Line });
    const actualResult = cues.every((cue) => cue.text.length <= 32);

    expect(actualResult).toBe(true);
  });

  it('should keep every caption within the duration limit', () => {
    const words = makeWords({ text: 'one two three four five six seven eight nine ten', wordSec: 0.9, gapSec: 0.1 });

    const cues = buildCues({ words, captionLength: CaptionLengths.TwoLines });
    const actualResult = cues.every((cue) => cue.words.at(-1)!.end - cue.words[0]!.start <= 6);

    expect(actualResult).toBe(true);
  });

  it('should give each word its own caption in one-word mode', () => {
    const words = makeWords({ text: 'Short and sweet.' });

    const cues = buildCues({ words, captionLength: CaptionLengths.Word });
    const actualResult = cues.map((cue) => cue.text);

    const expectedResult = ['Short', 'and', 'sweet.'];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should give a word longer than the limit a caption of its own', () => {
    const words = makeWords({ text: 'Say supercalifragilisticexpialidocious now' });

    const cues = buildCues({ words, captionLength: CaptionLengths.Short });
    const actualResult = cues.map((cue) => cue.text);

    const expectedResult = ['Say', 'supercalifragilisticexpialidocious', 'now'];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should count wide characters twice', () => {
    const words = ['今日は', 'いい', '天気', 'ですね', '本当に'].map((text, index) => ({
      text,
      start: index * 0.4,
      end: index * 0.4 + 0.35,
    }));

    const cues = buildCues({ words, captionLength: CaptionLengths.Short });
    const actualResult = cues.length;

    expect(actualResult).toBe(2);
  });

  it('should drop the leading space of the first word of each caption', () => {
    const words = makeWords({ text: 'Put the phone on the table now' });

    const cues = buildCues({ words, captionLength: CaptionLengths.Short });
    const actualResult = cues[1]!.words[0]!.text;

    expect(actualResult).toBe('on');
  });

  it('should keep a caption up a moment after its last word', () => {
    const words = makeWords({ text: 'Hello world.' });

    const cues = buildCues({ words, captionLength: CaptionLengths.Line });
    const actualResult = cues[0]!.end;

    expect(actualResult).toBeCloseTo(0.85);
  });

  it('should keep a short caption up long enough to read', () => {
    const words = [{ text: 'Hi.', start: 0, end: 0.2 }];

    const cues = buildCues({ words, captionLength: CaptionLengths.Line });
    const actualResult = cues[0]!.end;

    expect(actualResult).toBeCloseTo(0.8);
  });

  it('should join captions that are close together end to start', () => {
    const words = makeWords({ text: 'Put the phone on the table now' });

    const cues = buildCues({ words, captionLength: CaptionLengths.Short });
    const actualResult = cues[0]!.end;

    expect(actualResult).toBe(cues[1]!.start);
  });

  it('should not keep a caption up past the end of the media', () => {
    const words = [{ text: 'Bye.', start: 4.6, end: 4.9 }];

    const cues = buildCues({ words, captionLength: CaptionLengths.Line, mediaDurationSec: 5 });
    const actualResult = cues[0]!.end;

    expect(actualResult).toBe(5);
  });
});

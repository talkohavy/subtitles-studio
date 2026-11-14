import { describe, expect, it } from 'vite-plus/test';
import { buildImportedCues } from './buildImportedCues';
import type { Cue } from '../types';
import type { SubtitleEntry, TextTimestamp } from './parseSubtitles';

function makeEntry(props: { start: number; end: number; text: string; timestamps?: Array<TextTimestamp> }) {
  const { start, end, text, timestamps = null } = props;

  const entry: SubtitleEntry = { start, end, text, timestamps };

  return entry;
}

function roundTime(seconds: number): number {
  return Math.round(seconds * 1000) / 1000;
}

function getWordTimings(cue: Cue | undefined): Array<[string, number, number]> | undefined {
  return cue?.words.map((word) => [word.text, roundTime(word.start), roundTime(word.end)]);
}

describe('buildImportedCues', () => {
  it('should give each word a share of its subtitle’s time by its length', () => {
    const entries = [makeEntry({ start: 0, end: 2.1, text: 'Hi there' })];

    const [cue] = buildImportedCues({ entries, language: 'en' });
    const actualResult = { text: cue?.text, words: getWordTimings(cue) };

    const expectedResult = {
      text: 'Hi there',
      words: [
        ['Hi', 0, 0.6],
        [' there', 0.6, 2.1],
      ],
    };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should join a subtitle’s lines, except the lines of a dialogue', () => {
    const entries = [
      makeEntry({ start: 0, end: 1, text: 'The first line\nand the second' }),
      makeEntry({ start: 1, end: 2, text: 'Are you coming?\n- In a minute.' }),
    ];

    const actualResult = buildImportedCues({ entries, language: 'en' }).map((cue) => cue.text);

    expect(actualResult).toEqual(['The first line and the second', 'Are you coming?\n- In a minute.']);
  });

  it('should join lines without a space in languages written without spaces', () => {
    const entries = [makeEntry({ start: 0, end: 1, text: '你好\n世界' })];

    const actualResult = buildImportedCues({ entries, language: 'zh' }).map((cue) => cue.text);

    expect(actualResult).toEqual(['你好世界']);
  });

  it('should time words by the file’s timestamps', () => {
    const timestamps = [
      { position: 3, time: 0.5 },
      { position: 11, time: 1.5 },
    ];
    const entries = [makeEntry({ start: 0, end: 3, text: 'hey everyone and', timestamps })];

    const [cue] = buildImportedCues({ entries, language: 'en' });
    const actualResult = getWordTimings(cue);

    const expectedResult = [
      ['hey', 0, 0.5],
      [' everyone', 0.5, 1.5],
      [' and', 1.5, 3],
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should drop the subtitles that start after the video ends, and end the rest by then', () => {
    const entries = [
      makeEntry({ start: 0, end: 1, text: 'Kept' }),
      makeEntry({ start: 9, end: 12, text: 'Shortened' }),
      makeEntry({ start: 12.5, end: 13, text: 'Dropped' }),
    ];

    const cues = buildImportedCues({ entries, language: 'en', mediaDurationSec: 10 });
    const actualResult = cues.map((cue) => [cue.text, cue.start, cue.end]);

    const expectedResult = [
      ['Kept', 0, 1],
      ['Shortened', 9, 10],
    ];
    expect(actualResult).toEqual(expectedResult);
  });
});

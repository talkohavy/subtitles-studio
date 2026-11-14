import { describe, expect, it } from 'vite-plus/test';
import { normalizeSubtitleEntries } from './normalizeSubtitleEntries';
import type { SubtitleEntry, TextTimestamp } from './parseSubtitles';

function makeEntry(props: { start: number; end: number; text: string; timestamps?: Array<TextTimestamp> }) {
  const { start, end, text, timestamps = null } = props;

  const entry: SubtitleEntry = { start, end, text, timestamps };

  return entry;
}

function getTexts(entries: ReadonlyArray<SubtitleEntry>): Array<string> {
  return normalizeSubtitleEntries(entries).map((entry) => entry.text);
}

describe('normalizeSubtitleEntries', () => {
  it('should tidy the whitespace of each line and drop empty lines and empty subtitles', () => {
    const entries = [
      makeEntry({ start: 0, end: 1, text: '  Hello \t  there \n\n world ' }),
      makeEntry({ start: 1, end: 2, text: ' \n ' }),
    ];

    const actualResult = getTexts(entries);

    expect(actualResult).toEqual(['Hello there\nworld']);
  });

  it('should drop subtitles too short to be seen', () => {
    const entries = [
      makeEntry({ start: 0, end: 0.01, text: 'Flash' }),
      makeEntry({ start: 0.01, end: 2, text: 'Real' }),
    ];

    const actualResult = getTexts(entries);

    expect(actualResult).toEqual(['Real']);
  });

  it('should order the subtitles by when they start', () => {
    const entries = [makeEntry({ start: 5, end: 6, text: 'Second' }), makeEntry({ start: 1, end: 2, text: 'First' })];

    const actualResult = getTexts(entries);

    expect(actualResult).toEqual(['First', 'Second']);
  });

  it('should end a subtitle when the next one starts while it shows', () => {
    const entries = [makeEntry({ start: 0, end: 3, text: 'A' }), makeEntry({ start: 2, end: 4, text: 'B' })];

    const actualResult = normalizeSubtitleEntries(entries).map((entry) => [entry.start, entry.end, entry.text]);

    const expectedResult = [
      [0, 2, 'A'],
      [2, 4, 'B'],
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should join subtitles that start together, and drop repeats of the same one', () => {
    const entries = [
      makeEntry({ start: 1, end: 3, text: 'Top' }),
      makeEntry({ start: 1.05, end: 2.5, text: 'Bottom' }),
      makeEntry({ start: 4, end: 5, text: 'Same' }),
      makeEntry({ start: 4, end: 6, text: 'Same' }),
    ];

    const actualResult = normalizeSubtitleEntries(entries).map((entry) => [entry.start, entry.end, entry.text]);

    const expectedResult = [
      [1, 3, 'Top\nBottom'],
      [4, 6, 'Same'],
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should remove the repeated line of rolling captions, keeping the timestamps of the rest', () => {
    const entries = [
      makeEntry({ start: 0, end: 2, text: 'hey everyone' }),
      makeEntry({ start: 2, end: 4, text: 'hey everyone\nand welcome', timestamps: [{ position: 14, time: 2.5 }] }),
      makeEntry({ start: 4, end: 6, text: 'and welcome\nto my channel', timestamps: [{ position: 12, time: 4.5 }] }),
    ];

    const actualResult = normalizeSubtitleEntries(entries).map((entry) => [entry.text, entry.timestamps]);

    const expectedResult = [
      ['hey everyone', null],
      ['and welcome', [{ position: 3, time: 2.5 }]],
      ['to my channel', [{ position: 2, time: 4.5 }]],
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should keep a line that happens to repeat the previous subtitle’s when most don’t', () => {
    const entries = [
      makeEntry({ start: 0, end: 1, text: 'No!' }),
      makeEntry({ start: 1, end: 2, text: 'No!\nStop!' }),
      makeEntry({ start: 2, end: 3, text: 'Wait,\nwhat?' }),
      makeEntry({ start: 3, end: 4, text: 'Run,\nnow!' }),
    ];

    const actualResult = getTexts(entries);

    expect(actualResult).toEqual(['No!', 'No!\nStop!', 'Wait,\nwhat?', 'Run,\nnow!']);
  });

  it('should move punctuation to the end of right-to-left lines when a file puts it first', () => {
    const entries = [
      makeEntry({ start: 0, end: 1, text: '.שלום' }),
      makeEntry({ start: 1, end: 2, text: '?מה קורה\n...אז' }),
      makeEntry({ start: 2, end: 3, text: 'אני בסדר' }),
      makeEntry({ start: 3, end: 4, text: '...and then' }),
    ];

    const actualResult = getTexts(entries);

    expect(actualResult).toEqual(['שלום.', 'מה קורה?\nאז...', 'אני בסדר', '...and then']);
  });

  it('should leave right-to-left lines alone when few start with punctuation', () => {
    const entries = [
      makeEntry({ start: 0, end: 1, text: '...ואז הלכנו' }),
      makeEntry({ start: 1, end: 2, text: 'הביתה.' }),
      makeEntry({ start: 2, end: 3, text: 'מה קורה?' }),
      makeEntry({ start: 3, end: 4, text: 'אני בסדר.' }),
      makeEntry({ start: 4, end: 5, text: 'תודה רבה!' }),
      makeEntry({ start: 5, end: 6, text: 'להתראות.' }),
    ];

    const actualResult = getTexts(entries);

    expect(actualResult).toEqual(['...ואז הלכנו', 'הביתה.', 'מה קורה?', 'אני בסדר.', 'תודה רבה!', 'להתראות.']);
  });
});

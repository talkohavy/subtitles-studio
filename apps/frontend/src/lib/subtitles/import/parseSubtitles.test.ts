import { describe, expect, it } from 'vite-plus/test';
import { parseSubtitles, parseTimestamp, SubtitlesFileFormats, type ParsedSubtitles } from './parseSubtitles';

function getTexts(parsedSubtitles: ParsedSubtitles | null): Array<string> | undefined {
  return parsedSubtitles?.entries.map((entry) => entry.text);
}

describe('parseSubtitles', () => {
  it('should read SubRip subtitles with Windows line endings', () => {
    const text =
      '1\r\n00:00:01,000 --> 00:00:02,500\r\nHello there\r\n\r\n2\r\n00:01:02,250 --> 00:01:04,000\r\nGeneral Kenobi\r\n';

    const actualResult = parseSubtitles(text);

    const expectedResult = {
      format: 'srt',
      entries: [
        { start: 1, end: 2.5, text: 'Hello there', timestamps: null },
        { start: 62.25, end: 64, text: 'General Kenobi', timestamps: null },
      ],
      declaredLanguage: null,
    };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should remove SubRip styling tags and SubStation overrides, and decode entities', () => {
    const text = '1\n00:00:01,000 --> 00:00:02,000\n{\\an8}<i>Hello</i> <font color="#ffff00">world</font> &amp; you\n';

    const actualResult = getTexts(parseSubtitles(text));

    expect(actualResult).toEqual(['Hello world & you']);
  });

  it('should keep blank lines inside a subtitle as part of its text, not end it there', () => {
    const text =
      '1\n00:00:01,000 --> 00:00:02,000\nFirst line\n\nSecond line\n\n2\n00:00:03,000 --> 00:00:04,000\nNext\n';

    const actualResult = getTexts(parseSubtitles(text));

    expect(actualResult).toEqual(['First line\n\nSecond line', 'Next']);
  });

  it('should read SubRip subtitles without numbers or blank lines between them', () => {
    const text = '00:00:01,000 --> 00:00:02,000\nOne\n2\n00:00:03,000 --> 00:00:04,000\nTwo';

    const actualResult = getTexts(parseSubtitles(text));

    expect(actualResult).toEqual(['One', 'Two']);
  });

  it('should read WebVTT, skipping its header, notes and styles and reading its language', () => {
    const text = [
      'WEBVTT - Some title',
      'Kind: captions',
      'Language: en-US',
      '',
      'STYLE',
      '::cue { color: yellow }',
      '',
      'intro',
      '00:01.000 --> 00:02.000 align:start position:10%',
      '<v Roger>Hi, <b>Anna</b></v>',
      '',
      'NOTE This is a comment',
      'that spans two lines',
      '',
      '01:00:03.500 --> 01:00:04.000',
      '<ruby>漢<rt>kan</rt>字<rt>ji</rt></ruby> &lt;3',
    ].join('\n');

    const parsedSubtitles = parseSubtitles(text);
    const actualResult = {
      format: parsedSubtitles?.format,
      timings: parsedSubtitles?.entries.map((entry) => [entry.start, entry.end]),
      texts: parsedSubtitles?.entries.map((entry) => entry.text.trim()),
      declaredLanguage: parsedSubtitles?.declaredLanguage,
    };

    const expectedResult = {
      format: 'vtt',
      timings: [
        [1, 2],
        [3603.5, 3604],
      ],
      texts: ['Hi, Anna', '漢字 <3'],
      declaredLanguage: 'en-US',
    };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should keep the word timestamps of karaoke-style WebVTT, counting only visible characters before them', () => {
    const text = [
      'WEBVTT',
      '',
      '00:00:00.030 --> 00:00:02.270 align:start position:0%',
      ' ',
      'hey<00:00:00.480><c> everyone</c><00:00:00.900><c> and</c>',
    ].join('\n');

    const [entry] = parseSubtitles(text)?.entries ?? [];
    const actualResult = { text: entry?.text.trim(), timestamps: entry?.timestamps };

    const expectedResult = {
      text: 'hey everyone and',
      timestamps: [
        { position: 3, time: 0.48 },
        { position: 11, time: 0.9 },
      ],
    };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should read Advanced SubStation dialogue, with commas in the text, line breaks, and drawings removed', () => {
    const text = [
      '[Script Info]',
      'Title: Example',
      '',
      '[V4+ Styles]',
      'Format: Name, Fontname, Fontsize',
      'Style: Default,Arial,20',
      '',
      '[Events]',
      'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
      'Comment: 0,0:00:00.00,0:00:01.00,Default,,0,0,0,,A comment',
      'Dialogue: 0,0:00:01.50,0:00:03.25,Default,,0,0,0,,{\\i1}Well, hello{\\i0}\\Nthere\\hyou',
      'Dialogue: 0,0:00:04.00,0:00:05.00,Default,,0,0,0,,{\\p1}m 0 0 l 100 0 100 100{\\p0}Sign',
    ].join('\n');

    const parsedSubtitles = parseSubtitles(text);
    const actualResult = parsedSubtitles?.entries.map((entry) => [entry.start, entry.end, entry.text]);

    const expectedResult = [
      [1.5, 3.25, 'Well, hello\nthere you'],
      [4, 5, 'Sign'],
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should read SubStation Alpha dialogue, whose first field is "Marked"', () => {
    const text = [
      '[Events]',
      'Format: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
      'Dialogue: Marked=0,0:00:01.00,0:00:02.00,Default,NTP,0000,0000,0000,!Effect,Hi',
    ].join('\n');

    const actualResult = getTexts(parseSubtitles(text));

    expect(actualResult).toEqual(['Hi']);
  });

  it('should read Advanced SubStation dialogue without its section headers', () => {
    const text =
      'Dialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,Hi\nDialogue: 0,0:00:03.00,0:00:04.00,Default,,0,0,0,,There';

    const parsedSubtitles = parseSubtitles(text);
    const actualResult = { format: parsedSubtitles?.format, texts: getTexts(parsedSubtitles) };

    const expectedResult = { format: SubtitlesFileFormats.Ass, texts: ['Hi', 'There'] };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should read SubRip whose caption starts with "Dialogue:" as SubRip', () => {
    const text = '1\n00:00:01,000 --> 00:00:02,000\nDialogue: none needed\n\n2\n00:00:03,000 --> 00:00:04,000\nRight';

    const parsedSubtitles = parseSubtitles(text);
    const actualResult = { format: parsedSubtitles?.format, texts: getTexts(parsedSubtitles) };

    const expectedResult = { format: SubtitlesFileFormats.Srt, texts: ['Dialogue: none needed', 'Right'] };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should read YouTube’s SBV subtitles', () => {
    const text = '0:00:01.000,0:00:03.500\nFirst subtitle\n\n0:00:04.000,0:00:05.000\nSecond\nsubtitle\n';

    const parsedSubtitles = parseSubtitles(text);
    const actualResult = parsedSubtitles?.entries.map((entry) => [entry.start, entry.end, entry.text.trim()]);

    const expectedResult = [
      [1, 3.5, 'First subtitle'],
      [4, 5, 'Second\nsubtitle'],
    ];
    expect(actualResult).toEqual(expectedResult);
  });

  it('should remove invisible direction marks', () => {
    const text = '1\n00:00:01,000 --> 00:00:02,000\n\u202Bשלום\u202C\u200F\n';

    const actualResult = getTexts(parseSubtitles(text));

    expect(actualResult).toEqual(['שלום']);
  });

  it('should return null for text in no subtitles format', () => {
    const actualResult = parseSubtitles('Just some notes\nabout a video');

    expect(actualResult).toBeNull();
  });
});

describe('parseTimestamp', () => {
  it('should read hours, minutes, seconds and a decimal fraction of any length', () => {
    const actualResult = ['01:02:03,500', '02:03.5', '1:02:03.50', '00:00:07'].map(parseTimestamp);

    expect(actualResult).toEqual([3723.5, 123.5, 3723.5, 7]);
  });
});

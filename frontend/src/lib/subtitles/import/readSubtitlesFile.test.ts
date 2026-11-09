import { describe, expect, it } from 'vite-plus/test';
import { readSubtitlesFile } from './readSubtitlesFile';

const SUBRIP = [
  '1',
  '00:00:01,000 --> 00:00:03,000',
  'I don’t know what you’re talking about.',
  '',
  '2',
  '00:00:03,500 --> 00:00:06,000',
  'We have to get out of here right now,',
  'before they find us.',
  '',
].join('\n');

describe('readSubtitlesFile', () => {
  it('should read a subtitles file, detecting its encoding and language', async () => {
    const file = new File([SUBRIP], 'clip.srt');

    const subtitlesFile = await readSubtitlesFile({ file });
    const actualResult = {
      fileName: subtitlesFile.fileName,
      format: subtitlesFile.format,
      encoding: subtitlesFile.encoding,
      isEncodingGuessed: subtitlesFile.isEncodingGuessed,
      texts: subtitlesFile.entries.map((entry) => entry.text),
      language: subtitlesFile.language,
    };

    const expectedResult = {
      fileName: 'clip.srt',
      format: 'srt',
      encoding: 'utf-8',
      isEncodingGuessed: false,
      texts: ['I don’t know what you’re talking about.', 'We have to get out of here right now,\nbefore they find us.'],
      language: 'en',
    };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should fall back to the language in the file’s name when the text doesn’t tell', async () => {
    const file = new File(['1\n00:00:01,000 --> 00:00:02,000\nOK\n'], 'clip.heb.srt');

    const actualResult = (await readSubtitlesFile({ file })).language;

    expect(actualResult).toBe('he');
  });

  it('should explain when a file isn’t subtitles, or has none', async () => {
    const notSubtitles = new File(['Just some notes about a video'], 'notes.srt');
    const empty = new File(['WEBVTT\n\nNOTE nothing here\n'], 'empty.vtt');

    const actualResult = await Promise.all(
      [notSubtitles, empty].map((file) => readSubtitlesFile({ file }).catch((error: Error) => error.message)),
    );

    const expectedResult = [
      '“notes.srt” isn’t a subtitles file. Try an SRT, VTT, ASS or SBV file.',
      '“empty.vtt” has no subtitles in it.',
    ];
    expect(actualResult).toEqual(expectedResult);
  });
});

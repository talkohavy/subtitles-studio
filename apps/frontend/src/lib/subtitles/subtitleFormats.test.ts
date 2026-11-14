import { describe, expect, it } from 'vite-plus/test';
import { serializeSubtitles, SubtitleFormats } from './subtitleFormats';
import type { Cue } from './types';

function makeCue(props: { start: number; end: number; text: string }): Cue {
  const { start, end, text } = props;

  const cue = { id: text, start, end, text, words: [{ text, start, end }] };

  return cue;
}

const CUES = [makeCue({ start: 0.5, end: 2, text: 'Hello' }), makeCue({ start: 2, end: 63.25, text: 'World' })];

describe('serializeSubtitles', () => {
  it('should write numbered SubRip blocks with comma milliseconds', () => {
    const actualResult = serializeSubtitles({ cues: CUES, format: SubtitleFormats.Srt });

    const expectedResult = '1\n00:00:00,500 --> 00:00:02,000\nHello\n\n2\n00:00:02,000 --> 00:01:03,250\nWorld\n';
    expect(actualResult).toBe(expectedResult);
  });

  it('should write WebVTT with a header and dot milliseconds', () => {
    const actualResult = serializeSubtitles({ cues: CUES, format: SubtitleFormats.Vtt });

    const expectedResult = 'WEBVTT\n\n00:00:00.500 --> 00:00:02.000\nHello\n\n00:00:02.000 --> 00:01:03.250\nWorld\n';
    expect(actualResult).toBe(expectedResult);
  });

  it('should escape what WebVTT would read as markup or a timing arrow', () => {
    const cues = [makeCue({ start: 0, end: 1, text: 'a < b & c --> d' })];

    const actualResult = serializeSubtitles({ cues, format: SubtitleFormats.Vtt });

    expect(actualResult).toContain('\na &lt; b &amp; c → d\n');
  });

  it('should drop blank lines inside a caption, since they would end its block', () => {
    const cues = [makeCue({ start: 0, end: 1, text: 'Line one\n\n Line two' })];

    const actualResult = serializeSubtitles({ cues, format: SubtitleFormats.Srt });

    expect(actualResult).toBe('1\n00:00:00,000 --> 00:00:01,000\nLine one\nLine two\n');
  });

  it('should skip empty captions and keep the numbering continuous', () => {
    const cues = [makeCue({ start: 0, end: 1, text: ' ' }), makeCue({ start: 1, end: 2, text: 'Only one' })];

    const actualResult = serializeSubtitles({ cues, format: SubtitleFormats.Srt });

    expect(actualResult).toBe('1\n00:00:01,000 --> 00:00:02,000\nOnly one\n');
  });

  it('should write plain text with one caption per line', () => {
    const cues = [makeCue({ start: 0, end: 1, text: 'Hello\nthere' }), makeCue({ start: 1, end: 2, text: 'World' })];

    const actualResult = serializeSubtitles({ cues, format: SubtitleFormats.Txt });

    expect(actualResult).toBe('Hello there\nWorld\n');
  });
});

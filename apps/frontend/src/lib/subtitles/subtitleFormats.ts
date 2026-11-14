import { formatTimestamp } from '@src/common/utils/formatTime';
import type { Cue } from './types';

export const SubtitleFormats = {
  Srt: 'srt',
  Vtt: 'vtt',
  Txt: 'txt',
} as const;

export type SubtitleFormatValues = (typeof SubtitleFormats)[keyof typeof SubtitleFormats];

export const SUBTITLE_FORMAT_MIME_TYPES: Record<SubtitleFormatValues, string> = {
  srt: 'application/x-subrip',
  vtt: 'text/vtt',
  txt: 'text/plain',
};

type SerializeSubtitlesProps = {
  cues: ReadonlyArray<Cue>;
  format: SubtitleFormatValues;
};

export function serializeSubtitles(props: SerializeSubtitlesProps): string {
  const { cues, format } = props;

  const nonEmptyCues = cues.filter((cue) => cue.text.trim());

  if (format === SubtitleFormats.Srt) return toSrt(nonEmptyCues);

  if (format === SubtitleFormats.Vtt) return toVtt(nonEmptyCues);

  return toTxt(nonEmptyCues);
}

function toSrt(cues: ReadonlyArray<Cue>): string {
  const blocks = cues.map((cue, index) => {
    const start = formatTimestamp({ seconds: cue.start, millisecondsSeparator: ',' });
    const end = formatTimestamp({ seconds: cue.end, millisecondsSeparator: ',' });
    const text = toSubtitleBlockText(cue.text);

    return `${index + 1}\n${start} --> ${end}\n${text}`;
  });

  return `${blocks.join('\n\n')}\n`;
}

function toVtt(cues: ReadonlyArray<Cue>): string {
  const blocks = cues.map((cue) => {
    const start = formatTimestamp({ seconds: cue.start, millisecondsSeparator: '.' });
    const end = formatTimestamp({ seconds: cue.end, millisecondsSeparator: '.' });
    const text = toSubtitleBlockText(cue.text).replaceAll('-->', '→').replaceAll('&', '&amp;').replaceAll('<', '&lt;');

    return `${start} --> ${end}\n${text}`;
  });

  return `WEBVTT\n\n${blocks.join('\n\n')}\n`;
}

function toTxt(cues: ReadonlyArray<Cue>): string {
  const lines = cues.map((cue) => cue.text.trim().replace(/\s*\n\s*/g, ' '));

  return `${lines.join('\n')}\n`;
}

/**
 * Blank lines end a subtitle block, so they can't appear inside one.
 */
function toSubtitleBlockText(text: string): string {
  return text
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

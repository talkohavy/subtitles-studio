import { createId } from '@src/common/utils/createId';
import { MIN_CUE_DURATION_SEC } from '../constants';
import { spreadTokens } from '../retimeWords';
import { isUnspacedLanguage, tokenizeText } from '../tokenizeText';
import type { Cue, Word } from '../types';
import type { SubtitleEntry, TextTimestamp } from './parseSubtitles';

type BuildImportedCuesProps = {
  /**
   * Sorted and not overlapping, as `normalizeSubtitleEntries` leaves them.
   */
  entries: ReadonlyArray<SubtitleEntry>;
  language: string | null;
  /**
   * Subtitles that start after the end of the media are dropped, and the rest end by then.
   */
  mediaDurationSec?: number;
};

const DIALOGUE_LINE = /^[-–—]/u;
const WHITESPACE = /\s/gu;

/**
 * Turns a subtitles file's entries into captions. Words are timed by the file's timestamps where it has them, and
 * otherwise share their caption's time by length.
 */
export function buildImportedCues(props: BuildImportedCuesProps): Array<Cue> {
  const { entries, language, mediaDurationSec = Number.POSITIVE_INFINITY } = props;

  const cues = entries
    .filter((entry) => entry.start <= mediaDurationSec - MIN_CUE_DURATION_SEC)
    .map((entry) => {
      const { start, timestamps } = entry;
      const end = Math.min(entry.end, mediaDurationSec);
      const text = joinLines({ text: entry.text, language });
      const words = timestamps
        ? timeWordsByTimestamps({ text, timestamps, start, end, language })
        : spreadTokens({ tokens: tokenizeText({ text, language }), start, end });
      const cue = { id: createId(), start, end, text, words };

      return cue;
    });

  return cues;
}

/**
 * Captions are laid out to fit the video, so a file's line breaks are only kept between the speakers of a dialogue.
 */
function joinLines(props: { text: string; language: string | null }): string {
  const { text, language } = props;

  const lines = text.split('\n');
  const isDialogue = lines.slice(1).some((line) => DIALOGUE_LINE.test(line));

  if (isDialogue) return text;

  const joinedText = lines.join(isUnspacedLanguage(language) ? '' : ' ');

  return joinedText;
}

type TimeWordsByTimestampsProps = {
  text: string;
  timestamps: ReadonlyArray<TextTimestamp>;
  start: number;
  end: number;
  language: string | null;
};

/**
 * Each word starts at the last timestamp before it; words between two timestamps share the time between them.
 */
function timeWordsByTimestamps(props: TimeWordsByTimestampsProps): Array<Word> {
  const { text, timestamps, start, end, language } = props;

  const groups: Array<{ start: number; tokens: Array<string> }> = [];
  let position = 0;

  tokenizeText({ text, language }).forEach((token) => {
    const timestamp = timestamps.findLast((candidate) => candidate.position <= position);
    const previousGroup = groups.at(-1);
    const groupStart = Math.min(end, Math.max(previousGroup?.start ?? start, timestamp?.time ?? start));

    if (previousGroup?.start === groupStart) previousGroup.tokens.push(token);
    else groups.push({ start: groupStart, tokens: [token] });

    position += token.replace(WHITESPACE, '').length;
  });

  const words = groups.flatMap((group, index) =>
    spreadTokens({ tokens: group.tokens, start: group.start, end: groups[index + 1]?.start ?? end }),
  );

  return words;
}

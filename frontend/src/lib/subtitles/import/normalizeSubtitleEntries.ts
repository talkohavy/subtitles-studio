import { getTextDirection, TextDirections } from '@src/lib/renderer/textDirection';
import { MIN_CUE_DURATION_SEC } from '../constants';
import type { SubtitleEntry } from './parseSubtitles';

/**
 * Shorter subtitles can't be seen. YouTube's rolling captions have 10ms ones between the real ones.
 */
const MIN_ENTRY_DURATION_SEC = 0.05;
/**
 * The share of multi-line subtitles that must start with the previous subtitle's last line for a file to count as
 * rolling captions, whose lines scroll up one at a time (like YouTube's automatic ones).
 */
const MIN_ROLLING_SHARE = 0.5;
/**
 * The share of right-to-left lines that must start with end punctuation for a file to count as made for players
 * that lay out text left to right only, which put the punctuation of Hebrew and Arabic lines first so it shows at
 * their (visual) end.
 */
const MIN_REVERSED_PUNCTUATION_SHARE = 0.2;
const LEADING_END_PUNCTUATION = /^([.,!?:;…]+)\s*(.+)$/u;
const INLINE_WHITESPACE = /[^\S\n]+/gu;
const WHITESPACE = /\s/gu;

/**
 * Tidies parsed subtitles: cleans their text, drops empty and invisible ones, and orders them so they don't overlap.
 */
export function normalizeSubtitleEntries(entries: ReadonlyArray<SubtitleEntry>): Array<SubtitleEntry> {
  const cleanEntries = entries
    .map(cleanEntryText)
    .filter((entry) => entry.text !== '' && entry.end - entry.start >= MIN_ENTRY_DURATION_SEC);
  const sortedEntries = cleanEntries.toSorted((a, b) => a.start - b.start || a.end - b.end);
  const readableEntries = fixReversedPunctuation(sortedEntries);
  const dedupedEntries = removeRollingRepeats(readableEntries);
  const normalizedEntries = resolveOverlaps(dedupedEntries);

  return normalizedEntries;
}

function cleanEntryText(entry: SubtitleEntry): SubtitleEntry {
  const lines = entry.text
    .split('\n')
    .map((line) => line.replace(INLINE_WHITESPACE, ' ').trim())
    .filter((line) => line !== '');

  return { ...entry, text: lines.join('\n') };
}

function fixReversedPunctuation(entries: Array<SubtitleEntry>): Array<SubtitleEntry> {
  const rightToLeftLines = entries.flatMap((entry) => entry.text.split('\n')).filter(isRightToLeft);
  const reversedLineCount = rightToLeftLines.filter((line) => LEADING_END_PUNCTUATION.test(line)).length;
  const isReversed =
    reversedLineCount > 0 && reversedLineCount >= rightToLeftLines.length * MIN_REVERSED_PUNCTUATION_SHARE;

  if (!isReversed) return entries;

  const fixedEntries = entries.map((entry) => {
    const text = entry.text.split('\n').map(moveLeadingPunctuationToEnd).join('\n');

    return text === entry.text ? entry : { ...entry, text, timestamps: null };
  });

  return fixedEntries;
}

function moveLeadingPunctuationToEnd(line: string): string {
  const match = LEADING_END_PUNCTUATION.exec(line);

  if (!match || !isRightToLeft(line)) return line;

  const [, punctuation, rest] = match;

  return `${rest}${punctuation}`;
}

function isRightToLeft(line: string): boolean {
  return getTextDirection(line) === TextDirections.Rtl;
}

function removeRollingRepeats(entries: Array<SubtitleEntry>): Array<SubtitleEntry> {
  const repeatsPrevious = entries.map((entry, index) => {
    const previousEntry = entries[index - 1];

    if (!previousEntry || !entry.text.includes('\n')) return false;

    return entry.text.split('\n')[0] === previousEntry.text.split('\n').at(-1);
  });
  const repeatCount = repeatsPrevious.filter(Boolean).length;
  const multiLineCount = entries.filter((entry) => entry.text.includes('\n')).length;

  if (repeatCount === 0 || repeatCount < multiLineCount * MIN_ROLLING_SHARE) return entries;

  const dedupedEntries = entries.map((entry, index) => (repeatsPrevious[index] ? removeFirstLine(entry) : entry));

  return dedupedEntries;
}

function removeFirstLine(entry: SubtitleEntry): SubtitleEntry {
  const [firstLine = '', ...otherLines] = entry.text.split('\n');
  const removedLength = firstLine.replace(WHITESPACE, '').length;
  const timestamps = (entry.timestamps ?? [])
    .filter((timestamp) => timestamp.position >= removedLength)
    .map((timestamp) => ({ position: timestamp.position - removedLength, time: timestamp.time }));

  return { ...entry, text: otherLines.join('\n'), timestamps: timestamps.length > 0 ? timestamps : null };
}

/**
 * A subtitle that starts while the previous one is showing cuts it short; two that start together become one.
 */
function resolveOverlaps(entries: Array<SubtitleEntry>): Array<SubtitleEntry> {
  const resolvedEntries: Array<SubtitleEntry> = [];

  entries.forEach((entry) => {
    const previousIndex = resolvedEntries.length - 1;
    const previousEntry = resolvedEntries[previousIndex];

    if (!previousEntry || entry.start >= previousEntry.end) {
      resolvedEntries.push(entry);
      return;
    }

    if (entry.text === previousEntry.text) {
      resolvedEntries[previousIndex] = { ...previousEntry, end: Math.max(previousEntry.end, entry.end) };
      return;
    }

    if (entry.start - previousEntry.start >= MIN_CUE_DURATION_SEC) {
      resolvedEntries[previousIndex] = { ...previousEntry, end: entry.start };
      resolvedEntries.push(entry);
      return;
    }

    resolvedEntries[previousIndex] = {
      start: previousEntry.start,
      end: Math.max(previousEntry.end, entry.end),
      text: `${previousEntry.text}\n${entry.text}`,
      timestamps: null,
    };
  });

  return resolvedEntries;
}

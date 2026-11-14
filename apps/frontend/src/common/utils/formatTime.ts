/**
 * Formats seconds for display, e.g. `0:01.5` or `1:02:03.4`.
 */
export function formatTime(seconds: number): string {
  const tenths = Math.max(0, Math.round(seconds * 10));
  const hours = Math.floor(tenths / 36_000);
  const minutes = Math.floor((tenths % 36_000) / 600);
  const wholeSeconds = Math.floor((tenths % 600) / 10);
  const fraction = tenths % 10;
  const paddedSeconds = String(wholeSeconds).padStart(2, '0');

  if (hours > 0) {
    const paddedMinutes = String(minutes).padStart(2, '0');

    return `${hours}:${paddedMinutes}:${paddedSeconds}.${fraction}`;
  }

  return `${minutes}:${paddedSeconds}.${fraction}`;
}

type FormatTimestampProps = {
  seconds: number;
  /**
   * SRT uses a comma before the milliseconds, WebVTT a dot.
   */
  millisecondsSeparator: ',' | '.';
};

/**
 * Formats seconds as a subtitle-file timestamp, e.g. `00:01:02,345`.
 */
export function formatTimestamp(props: FormatTimestampProps): string {
  const { seconds, millisecondsSeparator } = props;

  const totalMilliseconds = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(totalMilliseconds / 3_600_000);
  const minutes = Math.floor((totalMilliseconds % 3_600_000) / 60_000);
  const wholeSeconds = Math.floor((totalMilliseconds % 60_000) / 1000);
  const milliseconds = totalMilliseconds % 1000;

  const timePart = [hours, minutes, wholeSeconds].map((part) => String(part).padStart(2, '0')).join(':');
  const millisecondsPart = String(milliseconds).padStart(3, '0');

  return `${timePart}${millisecondsSeparator}${millisecondsPart}`;
}

/**
 * Parses what a user typed as a time: `83.5`, `1:23.5` or `1:01:23.5`. Returns `null` when it isn't a time.
 */
export function parseTime(text: string): number | null {
  const parts = text.trim().replace(',', '.').split(':');

  if (parts.length > 3 || parts.some((part) => !/^\d+(\.\d*)?$/.test(part))) return null;

  const seconds = parts.reduce((total, part) => total * 60 + Number(part), 0);

  return Number.isFinite(seconds) ? seconds : null;
}

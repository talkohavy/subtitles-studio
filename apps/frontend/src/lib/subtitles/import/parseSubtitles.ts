export const SubtitlesFileFormats = {
  Srt: 'srt',
  Vtt: 'vtt',
  Ass: 'ass',
  Sbv: 'sbv',
} as const;

export type SubtitlesFileFormatValues = (typeof SubtitlesFileFormats)[keyof typeof SubtitlesFileFormats];

export type TextTimestamp = {
  /**
   * How many non-whitespace characters of the text come before it.
   */
  position: number;
  time: number;
};

export type SubtitleEntry = {
  start: number;
  end: number;
  /**
   * Plain text, without styling tags. Lines are separated by `\n`.
   */
  text: string;
  /**
   * When words are spoken, where the file says so: WebVTT's karaoke-style `<00:00:01.500>` tags.
   */
  timestamps: Array<TextTimestamp> | null;
};

export type ParsedSubtitles = {
  format: SubtitlesFileFormatValues;
  entries: Array<SubtitleEntry>;
  /**
   * The language the file declares (WebVTT's `Language:` header), as written there.
   */
  declaredLanguage: string | null;
};

/**
 * Invisible characters that only steer how text is laid out; some files are full of them.
 */
const INVISIBLE_CHARACTERS = /[\u200B\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/gu;
const TIMESTAMP = String.raw`(?:\d+:)?\d{1,2}:\d{1,2}(?:[,.]\d{1,3})?`;
const ARROW_TIMING = new RegExp(String.raw`^\s*(${TIMESTAMP})[ \t]*-->[ \t]*(${TIMESTAMP})`, 'u');
const SBV_TIMING = /^\s*(\d+:\d{1,2}:\d{1,2}\.\d{1,3})\s*,\s*(\d+:\d{1,2}:\d{1,2}\.\d{1,3})\s*$/u;
const WEBVTT_HEADER = /^WEBVTT(?:[ \t\n]|$)/u;
const VTT_HEADER_LANGUAGE = /^Language:[ \t]*(\S+)/imu;
const VTT_METADATA_BLOCK = /^(?:NOTE|STYLE|REGION)(?:[ \t]|$)/u;
const ASS_SECTION = /^\[(?:Script Info|V4\+? Styles|Events)\]/imu;
const ASS_TIMESTAMP = String.raw`\d+:\d{1,2}:\d{1,2}[.,]\d{1,3}`;
/**
 * A dialogue line with its layer, start and end, as in ASS files that lack their section headers.
 */
const ASS_DIALOGUE = new RegExp(String.raw`^Dialogue\s*:[^,\n]*,\s*${ASS_TIMESTAMP}\s*,\s*${ASS_TIMESTAMP}\s*,`, 'imu');
const INDEX_LINE = /^\s*\d+\s*$/u;

/**
 * Reads SubRip (`.srt`), WebVTT (`.vtt`), Advanced SubStation (`.ass`, `.ssa`) and YouTube (`.sbv`) subtitles.
 *
 * @returns `null` when the text is in none of those formats.
 */
export function parseSubtitles(text: string): ParsedSubtitles | null {
  const normalizedText = text.replace(/\r\n?/gu, '\n').replace(INVISIBLE_CHARACTERS, '');
  const lines = normalizedText.split('\n');

  if (WEBVTT_HEADER.test(normalizedText.trimStart()))
    return parseTimedBlocks({ lines, format: SubtitlesFileFormats.Vtt });

  if (ASS_SECTION.test(normalizedText)) return parseAss(lines);

  // Before the dialogue-line check, since a SubRip caption can itself start with "Dialogue:".
  if (lines.some((line) => ARROW_TIMING.test(line)))
    return parseTimedBlocks({ lines, format: SubtitlesFileFormats.Srt });

  if (lines.some((line) => SBV_TIMING.test(line))) return parseTimedBlocks({ lines, format: SubtitlesFileFormats.Sbv });

  if (ASS_DIALOGUE.test(normalizedText)) return parseAss(lines);

  return null;
}

type RawEntry = {
  start: number;
  end: number;
  lines: Array<string>;
};

type ParseTimedBlocksProps = {
  lines: ReadonlyArray<string>;
  format: SubtitlesFileFormatValues;
};

/**
 * SubRip, WebVTT and SBV: a timing line, then the text. A subtitle's text runs until the next timing line rather than
 * the next blank line, since many files have blank (or space-only, like YouTube's) lines inside subtitles.
 */
function parseTimedBlocks(props: ParseTimedBlocksProps): ParsedSubtitles {
  const { lines, format } = props;

  const isVtt = format === SubtitlesFileFormats.Vtt;
  const timing = format === SubtitlesFileFormats.Sbv ? SBV_TIMING : ARROW_TIMING;
  const rawEntries: Array<RawEntry> = [];
  const headerLines: Array<string> = [];
  let isInMetadataBlock = false;

  lines.forEach((line, index) => {
    const isBlank = line.trim() === '';
    const previousLine = lines[index - 1];
    const isBlockStart = index === 0 || previousLine === undefined || previousLine.trim() === '';

    if (isBlank) {
      isInMetadataBlock = false;
      rawEntries.at(-1)?.lines.push(line);
      return;
    }

    if (isVtt && isBlockStart && VTT_METADATA_BLOCK.test(line)) isInMetadataBlock = true;

    if (isInMetadataBlock) return;

    const timingMatch = timing.exec(line);

    if (!timingMatch) {
      const currentEntry = rawEntries.at(-1);

      if (currentEntry) currentEntry.lines.push(line);
      else headerLines.push(line);

      return;
    }

    // The line before a timing line is the subtitle's number (or WebVTT identifier), not the previous one's text.
    const previousEntry = rawEntries.at(-1);
    const lineBeforeTiming = previousEntry?.lines.at(-1);
    const isIdentifier =
      lineBeforeTiming !== undefined &&
      lineBeforeTiming === previousLine &&
      (INDEX_LINE.test(lineBeforeTiming) || (lines[index - 2] ?? '').trim() === '');

    if (isIdentifier) previousEntry?.lines.pop();

    rawEntries.push({ start: parseTimestamp(timingMatch[1]!), end: parseTimestamp(timingMatch[2]!), lines: [] });
  });

  const entries = rawEntries.map((rawEntry) => {
    const payload = rawEntry.lines.join('\n').trim();
    const { text, timestamps } = isVtt ? stripVttMarkup(payload) : { text: stripSrtMarkup(payload), timestamps: null };

    return { start: rawEntry.start, end: rawEntry.end, text, timestamps };
  });
  const declaredLanguage = isVtt ? (VTT_HEADER_LANGUAGE.exec(headerLines.join('\n'))?.[1] ?? null) : null;

  return { format, entries, declaredLanguage };
}

const DEFAULT_ASS_FIELDS = [
  'layer',
  'start',
  'end',
  'style',
  'name',
  'marginl',
  'marginr',
  'marginv',
  'effect',
  'text',
];
const ASS_SECTION_HEADER = /^\[(.+)\]$/u;
const ASS_FORMAT_LINE = /^Format\s*:/iu;
const ASS_DIALOGUE_LINE = /^Dialogue\s*:/iu;

function parseAss(lines: ReadonlyArray<string>): ParsedSubtitles {
  const entries: Array<SubtitleEntry> = [];
  let fields = DEFAULT_ASS_FIELDS;
  let section = '';

  lines.forEach((line) => {
    const trimmedLine = line.trim();
    const sectionHeader = ASS_SECTION_HEADER.exec(trimmedLine);

    if (sectionHeader) {
      section = sectionHeader[1]!.trim().toLowerCase();
      return;
    }

    const value = trimmedLine.slice(trimmedLine.indexOf(':') + 1);

    // Styles have a format line of their own.
    if (section === 'events' && ASS_FORMAT_LINE.test(trimmedLine)) {
      fields = value.split(',').map((field) => field.trim().toLowerCase());
      return;
    }

    if (!ASS_DIALOGUE_LINE.test(trimmedLine)) return;

    // Only the last field (the text) may contain commas.
    const parts = value.split(',');
    const values = [...parts.slice(0, fields.length - 1), parts.slice(fields.length - 1).join(',')];
    const start = values[fields.indexOf('start')];
    const end = values[fields.indexOf('end')];
    const text = values[fields.indexOf('text')];

    if (start === undefined || end === undefined || text === undefined) return;

    entries.push({
      start: parseTimestamp(start.trim()),
      end: parseTimestamp(end.trim()),
      text: stripAssMarkup(text),
      timestamps: null,
    });
  });

  return { format: SubtitlesFileFormats.Ass, entries, declaredLanguage: null };
}

/**
 * `01:02:03,500`, `02:03.5` or `1:02:03.50`, in seconds. Fractions are decimals, whatever their length.
 */
export function parseTimestamp(value: string): number {
  const [clock = '', fraction = '0'] = value.split(/[,.]/u);
  const seconds = clock.split(':').reduce((total, part) => total * 60 + Number(part), 0);
  const timestamp = seconds + Number(`0.${fraction}`);

  return timestamp;
}

const ASS_OVERRIDE = /\{\\[^}]*\}/gu;
const HTML_TAG = /<\/?[a-z][^>]*>/giu;

/**
 * SubRip allows HTML-like tags (`<i>`, `<font color="…">`), and many files have SubStation overrides like `{\an8}`.
 */
function stripSrtMarkup(text: string): string {
  const plainText = decodeEntities(text.replace(ASS_OVERRIDE, '').replace(HTML_TAG, ''));

  return plainText;
}

const VTT_TAG = /<([^>]*)>/gu;
const VTT_TIMESTAMP_TAG = /^(?:\d+:)?\d{1,2}:\d{1,2}\.\d{1,3}$/u;
const VTT_RUBY_TEXT = /<rt>[\s\S]*?<\/rt>/gu;
const WHITESPACE = /\s/gu;

/**
 * Removes WebVTT's tags (voices, classes, styling, ruby annotations), keeping the timestamps among them.
 */
function stripVttMarkup(payload: string): { text: string; timestamps: Array<TextTimestamp> | null } {
  const markup = payload.replace(VTT_RUBY_TEXT, '');
  const timestamps: Array<TextTimestamp> = [];
  let text = '';
  let position = 0;
  let lastIndex = 0;

  function appendText(chunk: string) {
    const decodedChunk = decodeEntities(chunk);
    text += decodedChunk;
    position += decodedChunk.replace(WHITESPACE, '').length;
  }

  Array.from(markup.matchAll(VTT_TAG)).forEach((match) => {
    appendText(markup.slice(lastIndex, match.index));
    lastIndex = match.index + match[0].length;

    const tag = match[1]!;

    if (VTT_TIMESTAMP_TAG.test(tag)) timestamps.push({ position, time: parseTimestamp(tag) });
  });
  appendText(markup.slice(lastIndex));

  return { text, timestamps: timestamps.length > 0 ? timestamps : null };
}

const ASS_BLOCK = /(\{[^}]*\})/u;
const ASS_DRAWING_MODE = /\\p(\d+)/u;
const ASS_LINE_BREAK = /\\[Nn]/gu;
const ASS_HARD_SPACE = /\\h/gu;

/**
 * Removes SubStation's `{…}` override blocks, and the vector drawings that `{\p1}` starts.
 */
function stripAssMarkup(text: string): string {
  let plainText = '';
  let isDrawing = false;

  text.split(ASS_BLOCK).forEach((part) => {
    if (part.startsWith('{') && part.endsWith('}')) {
      const drawingMode = ASS_DRAWING_MODE.exec(part);

      if (drawingMode) isDrawing = Number(drawingMode[1]) > 0;

      return;
    }

    if (!isDrawing) plainText += part;
  });

  return plainText.replace(ASS_LINE_BREAK, '\n').replace(ASS_HARD_SPACE, ' ');
}

const ENTITY = /&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/giu;
const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00A0',
  lrm: '',
  rlm: '',
};
const MAX_CODE_POINT = 0x10ffff;

function decodeEntities(text: string): string {
  const decodedText = text.replace(ENTITY, (entity, decimal?: string, hex?: string, name?: string) => {
    if (name) return NAMED_ENTITIES[name.toLowerCase()] ?? entity;

    const codePoint = decimal ? Number(decimal) : Number.parseInt(hex ?? '', 16);

    return codePoint > 0 && codePoint <= MAX_CODE_POINT ? String.fromCodePoint(codePoint) : entity;
  });

  return decodedText;
}

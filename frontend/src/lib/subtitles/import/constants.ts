export const ACCEPTED_SUBTITLES_EXTENSIONS: ReadonlyArray<string> = ['.srt', '.vtt', '.ass', '.ssa', '.sbv'];

/**
 * For the `accept` attribute of file inputs.
 */
export const ACCEPTED_SUBTITLES_TYPES = ACCEPTED_SUBTITLES_EXTENSIONS.join(',');

/**
 * Far more than any subtitles file needs; a feature-length film's is a few hundred kilobytes.
 */
export const MAX_SUBTITLES_FILE_BYTES = 10 * 1024 ** 2;

/**
 * The encodings a subtitles file can be read with, for when the guessed one is wrong.
 */
export const SUBTITLES_ENCODINGS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'utf-8', label: 'Unicode (UTF-8)' },
  { value: 'utf-16le', label: 'Unicode (UTF-16)' },
  { value: 'windows-1252', label: 'Western (Windows-1252)' },
  { value: 'windows-1255', label: 'Hebrew (Windows-1255)' },
  { value: 'windows-1256', label: 'Arabic (Windows-1256)' },
  { value: 'windows-1251', label: 'Cyrillic (Windows-1251)' },
  { value: 'windows-1253', label: 'Greek (Windows-1253)' },
  { value: 'windows-1250', label: 'Central European (Windows-1250)' },
  { value: 'windows-1254', label: 'Turkish (Windows-1254)' },
];

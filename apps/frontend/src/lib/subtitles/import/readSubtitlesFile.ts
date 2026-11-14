import { MAX_SUBTITLES_FILE_BYTES } from './constants';
import { decodeText } from './decodeText';
import { detectTextLanguage, getFileNameLanguage, toLanguageCode } from './detectLanguage';
import { normalizeSubtitleEntries } from './normalizeSubtitleEntries';
import { parseSubtitles, type SubtitleEntry, type SubtitlesFileFormatValues } from './parseSubtitles';

export type SubtitlesFile = {
  fileName: string;
  format: SubtitlesFileFormatValues;
  /**
   * The encoding the text was read with.
   */
  encoding: string;
  /**
   * The file isn't Unicode, so its encoding was guessed.
   */
  isEncodingGuessed: boolean;
  /**
   * Sorted and not overlapping.
   */
  entries: Array<SubtitleEntry>;
  /**
   * From the file's header, its text, or its name; `null` when none of them tell.
   */
  language: string | null;
};

type ReadSubtitlesFileProps = {
  file: File;
  /**
   * Reads the text with this encoding instead of detecting it.
   */
  encoding?: string | null;
};

const LANGUAGE_SAMPLE_LENGTH = 20_000;

/**
 * @throws with a message for the user when the file can't be read as subtitles.
 */
export async function readSubtitlesFile(props: ReadSubtitlesFileProps): Promise<SubtitlesFile> {
  const { file, encoding } = props;

  if (file.size > MAX_SUBTITLES_FILE_BYTES) throw new Error(`“${file.name}” is too large for a subtitles file.`);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const decodedText = decodeText({ bytes, encoding });
  const parsedSubtitles = parseSubtitles(decodedText.text);

  if (!parsedSubtitles) throw new Error(`“${file.name}” isn’t a subtitles file. Try an SRT, VTT, ASS or SBV file.`);

  const entries = normalizeSubtitleEntries(parsedSubtitles.entries);

  if (entries.length === 0) throw new Error(`“${file.name}” has no subtitles in it.`);

  const { declaredLanguage } = parsedSubtitles;
  const sampleText = entries
    .map((entry) => entry.text)
    .join('\n')
    .slice(0, LANGUAGE_SAMPLE_LENGTH);
  const language =
    (declaredLanguage ? toLanguageCode(declaredLanguage) : null) ??
    detectTextLanguage(sampleText) ??
    getFileNameLanguage(file.name);

  const subtitlesFile: SubtitlesFile = {
    fileName: file.name,
    format: parsedSubtitles.format,
    encoding: decodedText.encoding,
    isEncodingGuessed: decodedText.isGuessed,
    entries,
    language,
  };

  return subtitlesFile;
}

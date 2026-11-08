import { downloadBlob, getBaseFileName } from '@src/common/utils/downloadBlob';
import {
  serializeSubtitles,
  SUBTITLE_FORMAT_MIME_TYPES,
  SubtitleFormats,
  type SubtitleFormatValues,
} from '@src/lib/subtitles/subtitleFormats';
import type { Cue } from '@src/lib/subtitles/types';

type DownloadSubtitlesProps = {
  cues: ReadonlyArray<Cue>;
  format: SubtitleFormatValues;
  videoFileName: string;
};

/**
 * Some players (and Windows Notepad) only read non-Latin SRT text correctly with a byte order mark.
 */
const BYTE_ORDER_MARK = '\uFEFF';

export function downloadSubtitles(props: DownloadSubtitlesProps) {
  const { cues, format, videoFileName } = props;

  const content = serializeSubtitles({ cues, format });
  const prefix = format === SubtitleFormats.Srt ? BYTE_ORDER_MARK : '';
  const blob = new Blob([prefix, content], { type: `${SUBTITLE_FORMAT_MIME_TYPES[format]};charset=utf-8` });
  const baseName = getBaseFileName(videoFileName);

  downloadBlob({ blob, fileName: `${baseName}.${format}` });
}

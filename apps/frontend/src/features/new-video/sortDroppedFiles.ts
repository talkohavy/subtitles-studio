import { isVideoFile } from '@src/lib/media/isVideoFile';
import { isSubtitlesFile } from '@src/lib/subtitles/import/isSubtitlesFile';

export type SortedFiles = {
  videoFile: File | null;
  subtitlesFile: File | null;
  /**
   * The first file that's neither, to name in an error.
   */
  otherFile: File | null;
};

/**
 * Picks the video and the subtitles file out of files dropped or chosen together. Only the first of each counts.
 */
export function sortDroppedFiles(files: ReadonlyArray<File>): SortedFiles {
  const subtitlesFile = files.find((file) => isSubtitlesFile(file)) ?? null;
  const videoFile = files.find((file) => !isSubtitlesFile(file) && isVideoFile(file)) ?? null;
  const otherFile = files.find((file) => !isSubtitlesFile(file) && !isVideoFile(file)) ?? null;

  return { videoFile, subtitlesFile, otherFile };
}

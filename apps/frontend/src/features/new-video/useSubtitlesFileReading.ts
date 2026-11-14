import { useEffect, useState } from 'react';
import { getErrorMessage } from '@src/common/utils/getErrorMessage';
import { readSubtitlesFile, type SubtitlesFile } from '@src/lib/subtitles/import/readSubtitlesFile';

export const ReadingStatuses = {
  Reading: 'reading',
  Ready: 'ready',
  Failed: 'failed',
} as const;

export type SubtitlesFileReading = {
  file: File;
  /**
   * The encoding chosen to read it with; `null` when it's detected.
   */
  encoding: string | null;
} & (
  | { status: typeof ReadingStatuses.Reading }
  | { status: typeof ReadingStatuses.Ready; subtitles: SubtitlesFile }
  | { status: typeof ReadingStatuses.Failed; error: string }
);

type UseSubtitlesFileReadingProps = {
  file: File | null;
  encoding: string | null;
};

/**
 * Reads a subtitles file, and again whenever the file or the encoding changes.
 */
export function useSubtitlesFileReading(props: UseSubtitlesFileReadingProps): SubtitlesFileReading | null {
  const { file, encoding } = props;

  const [reading, setReading] = useState<SubtitlesFileReading | null>(null);

  useEffect(() => {
    if (!file) return;

    let isCurrent = true;

    readSubtitlesFile({ file, encoding }).then(
      (subtitles) => {
        if (isCurrent) setReading({ file, encoding, status: ReadingStatuses.Ready, subtitles });
      },
      (error: unknown) => {
        if (isCurrent) setReading({ file, encoding, status: ReadingStatuses.Failed, error: getErrorMessage(error) });
      },
    );

    return () => {
      isCurrent = false;
    };
  }, [file, encoding]);

  if (!file) return null;

  const isCurrentReading = reading?.file === file && reading.encoding === encoding;
  const currentReading = isCurrentReading ? reading : { file, encoding, status: ReadingStatuses.Reading };

  return currentReading;
}

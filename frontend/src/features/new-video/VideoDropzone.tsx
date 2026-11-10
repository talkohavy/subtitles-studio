import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@src/common/utils/cn';
import { ACCEPTED_VIDEO_TYPES } from '@src/lib/media/constants';
import { ACCEPTED_SUBTITLES_TYPES } from '@src/lib/subtitles/import/constants';
import { useFileDrop } from '../../hooks/useFileDrop';
import { useFilePicker } from '../../hooks/useFilePicker';
import { sortDroppedFiles } from './sortDroppedFiles';

type VideoDropzoneProps = {
  /**
   * Called with the video, and the subtitles file dropped or chosen with it, if any.
   */
  onFiles: (files: { videoFile: File; subtitlesFile: File | null }) => void;
  className?: string;
};

export function VideoDropzone(props: VideoDropzoneProps) {
  const { onFiles, className } = props;

  function handleFiles(files: Array<File>) {
    const { videoFile, subtitlesFile, otherFile } = sortDroppedFiles(files);

    if (videoFile) {
      onFiles({ videoFile, subtitlesFile });
      return;
    }

    if (subtitlesFile) {
      toast.error(`Add the video of “${subtitlesFile.name}” too: drop or choose them together.`);
      return;
    }

    if (otherFile) toast.error(`“${otherFile.name}” isn’t a video. Try an MP4, MOV, WebM or MKV file.`);
  }

  const { isDragOver, dropHandlers } = useFileDrop({ onFiles: handleFiles });
  const { fileInput, openFilePicker } = useFilePicker({
    accept: `${ACCEPTED_VIDEO_TYPES},${ACCEPTED_SUBTITLES_TYPES}`,
    onFiles: handleFiles,
    multiple: true,
  });

  return (
    <>
      <button
        type='button'
        onClick={openFilePicker}
        {...dropHandlers}
        className={cn(
          'flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          'outline-none focus-visible:border-violet-500',
          isDragOver
            ? 'border-violet-500 bg-violet-500/10'
            : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/40',
          className,
        )}
      >
        <span className='flex size-12 items-center justify-center rounded-full bg-violet-500/15 text-violet-300'>
          <Upload className='size-5' />
        </span>
        <span className='text-sm font-medium text-zinc-100'>
          Drop a video or <span className='text-violet-400'>click to browse</span>
        </span>
        <span className='text-xs text-zinc-500'>
          MP4, MOV, WebM, MKV up to 2 GB. Have subtitles for it? Add the file too.
        </span>
      </button>
      {fileInput}
    </>
  );
}

import { useRef, useState, type DragEvent } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@src/common/utils/cn';
import { ACCEPTED_VIDEO_TYPES } from '@src/lib/media/constants';
import { isVideoFile } from '@src/lib/media/isVideoFile';

type VideoDropzoneProps = {
  onFile: (file: File) => void;
  disabled?: boolean;
  className?: string;
};

export function VideoDropzone(props: VideoDropzoneProps) {
  const { onFile, disabled, className } = props;

  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];

    if (!file) return;

    if (!isVideoFile(file)) {
      toast.error(`“${file.name}” isn’t a video. Try an MP4, MOV, WebM or MKV file.`);
      return;
    }

    onFile(file);
  }

  function handleDragOver(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();

    if (!disabled) setIsDragOver(true);
  }

  function handleDragLeave(event: DragEvent<HTMLButtonElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragOver(false);
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    // The window-wide drop handler would open the file a second time.
    event.stopPropagation();
    setIsDragOver(false);

    if (!disabled) handleFiles(event.dataTransfer.files);
  }

  return (
    <>
      <button
        type='button'
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        disabled={disabled}
        className={cn(
          'flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          'outline-none focus-visible:border-violet-500 disabled:cursor-not-allowed disabled:opacity-50',
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
        <span className='text-xs text-zinc-500'>MP4, MOV, WebM, MKV up to 2 GB</span>
      </button>
      <input
        ref={inputRef}
        type='file'
        accept={ACCEPTED_VIDEO_TYPES}
        className='hidden'
        onChange={(event) => {
          handleFiles(event.currentTarget.files);
          // So choosing the same file again still triggers a change.
          event.currentTarget.value = '';
        }}
      />
    </>
  );
}

import { useEffect, useEffectEvent, useState } from 'react';
import { FileVideoCamera } from 'lucide-react';
import { toast } from 'sonner';
import { isVideoFile } from '@src/lib/media/isVideoFile';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectCues, selectHasProject } from '../../store/selectors';
import { newVideoDialogToggled } from '../../store/slices/ui.slice';
import { openVideo } from '../transcription/transcriptionPipeline';

function hasFiles(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes('Files') ?? false;
}

/**
 * Lets a video be dropped anywhere on the page.
 */
export function GlobalDropOverlay() {
  const dispatch = useAppDispatch();
  const hasCues = useAppSelector(selectCues).length > 0;
  const hasProject = useAppSelector(selectHasProject);
  const isNewVideoDialogOpen = useAppSelector((state) => state.ui.isNewVideoDialogOpen);
  const [isDragging, setIsDragging] = useState(false);

  const isDropzoneVisible = !hasProject || isNewVideoDialogOpen;

  const openDroppedFile = useEffectEvent((file: File) => {
    if (!isVideoFile(file)) {
      toast.error(`“${file.name}” isn’t a video. Try an MP4, MOV, WebM or MKV file.`);
      return;
    }

    const shouldReplace = !hasCues || window.confirm('Open this video instead? The current subtitles will be lost.');

    if (!shouldReplace) return;

    dispatch(newVideoDialogToggled(false));
    void dispatch(openVideo(file));
  });

  useEffect(() => {
    // `dragenter` and `dragleave` fire for every element crossed, so only the outermost pair counts.
    let dragDepth = 0;

    function handleDragEnter(event: DragEvent) {
      if (!hasFiles(event)) return;

      dragDepth++;
      setIsDragging(true);
    }

    function handleDragOver(event: DragEvent) {
      if (!hasFiles(event)) return;

      // Without this, the browser opens the dropped file itself.
      event.preventDefault();
    }

    function handleDragLeave(event: DragEvent) {
      if (!hasFiles(event)) return;

      dragDepth = Math.max(0, dragDepth - 1);

      if (dragDepth === 0) setIsDragging(false);
    }

    // Runs first (capturing), so the overlay hides even when a dropzone handles the drop.
    function handleDropCapture() {
      dragDepth = 0;
      setIsDragging(false);
    }

    function handleDrop(event: DragEvent) {
      if (!hasFiles(event)) return;

      event.preventDefault();

      const file = event.dataTransfer?.files[0];

      if (file) openDroppedFile(file);
    }

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDropCapture, true);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDropCapture, true);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  if (!isDragging || isDropzoneVisible) return null;

  return (
    <div className='pointer-events-none fixed inset-0 z-[60] flex animate-fade-in items-center justify-center bg-zinc-950/80 p-6 backdrop-blur-sm'>
      <div className='flex size-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-violet-500/80 bg-violet-500/5'>
        <span className='flex size-16 items-center justify-center rounded-full bg-violet-500/20 text-violet-300'>
          <FileVideoCamera className='size-7' />
        </span>
        <p className='text-lg font-medium text-zinc-50'>Drop your video to create subtitles</p>
        <p className='text-sm text-zinc-400'>MP4, MOV, WebM, MKV up to 2 GB</p>
      </div>
    </div>
  );
}

import { useEffect, useEffectEvent, useState } from 'react';
import { FileVideoCamera } from 'lucide-react';
import { toast } from 'sonner';
import { mediaStore } from '@src/lib/media/mediaStore';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectHasProject, selectIsEditable, selectIsProcessing, selectSession } from '../../store/selectors';
import { newVideoDialogToggled } from '../../store/slices/ui.slice';
import { importSubtitlesFile } from '../subtitles/subtitlesFileThunks';
import { sortDroppedFiles } from './sortDroppedFiles';
import { useVideoSetup, videoSetupStore } from './videoSetupStore';

function hasFiles(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes('Files') ?? false;
}

/**
 * Lets a video, or a subtitles file for the open one, be dropped anywhere on the page.
 */
export function GlobalDropOverlay() {
  const dispatch = useAppDispatch();
  const hasProject = useAppSelector(selectHasProject);
  const isEditable = useAppSelector(selectIsEditable);
  const isProcessing = useAppSelector(selectIsProcessing);
  const { video } = useAppSelector(selectSession);
  const isNewVideoDialogOpen = useAppSelector((state) => state.ui.isNewVideoDialogOpen);
  const isVideoSetupOpen = useVideoSetup() !== null;
  const [isDragging, setIsDragging] = useState(false);

  // These show what a drop does themselves.
  const isDropTargetShown = !hasProject || isNewVideoDialogOpen || isVideoSetupOpen;

  function addDroppedSubtitlesFile(subtitlesFile: File) {
    if (isVideoSetupOpen) {
      videoSetupStore.setSubtitlesFile(subtitlesFile);
      return;
    }

    if (!hasProject || isNewVideoDialogOpen) {
      toast.error(`Add the video of “${subtitlesFile.name}” too: drop them together.`);
      return;
    }

    if (isProcessing) {
      toast.error('Wait for the subtitles to be ready, then drop the file again.');
      return;
    }

    if (isEditable) {
      void dispatch(importSubtitlesFile(subtitlesFile));
      return;
    }

    // It failed, so the video starts over with the file's subtitles, if it opened at all.
    const { file } = mediaStore.getSnapshot();

    if (file && video) videoSetupStore.open({ videoFile: file, subtitlesFile });
    else toast.error(`Add the video of “${subtitlesFile.name}” too: drop them together.`);
  }

  const openDroppedFiles = useEffectEvent((files: Array<File>) => {
    const { videoFile, subtitlesFile, otherFile } = sortDroppedFiles(files);

    if (videoFile) {
      dispatch(newVideoDialogToggled(false));
      videoSetupStore.open({ videoFile, subtitlesFile });
      return;
    }

    if (subtitlesFile) {
      addDroppedSubtitlesFile(subtitlesFile);
      return;
    }

    if (otherFile) toast.error(`“${otherFile.name}” isn’t a video or a subtitles file.`);
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

      const files = Array.from(event.dataTransfer?.files ?? []);

      if (files.length > 0) openDroppedFiles(files);
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

  if (!isDragging || isDropTargetShown) return null;

  return (
    <div className='pointer-events-none fixed inset-0 z-[60] flex animate-fade-in items-center justify-center bg-zinc-950/80 p-6 backdrop-blur-sm'>
      <div className='flex size-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-violet-500/80 bg-violet-500/5'>
        <span className='flex size-16 items-center justify-center rounded-full bg-violet-500/20 text-violet-300'>
          <FileVideoCamera className='size-7' />
        </span>
        <p className='text-lg font-medium text-zinc-50'>Drop a video or a subtitles file</p>
        <p className='text-sm text-zinc-400'>A video starts over. A subtitles file replaces the current subtitles.</p>
      </div>
    </div>
  );
}

import { RotateCcw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { useMediaState } from '../../hooks/useMediaState';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectIsEditable, selectSession } from '../../store/selectors';
import { newVideoDialogToggled } from '../../store/slices/ui.slice';
import { VideoDropzone } from './VideoDropzone';
import { videoSetupStore } from './videoSetupStore';

export function NewVideoDialog() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.ui.isNewVideoDialogOpen);
  const { fileName } = useAppSelector(selectSession);
  const isEditable = useAppSelector(selectIsEditable);
  const { file } = useMediaState();

  function close() {
    dispatch(newVideoDialogToggled(false));
  }

  function handleFiles(files: { videoFile: File; subtitlesFile: File | null }) {
    close();
    videoSetupStore.open(files);
  }

  function handleRedoSubtitles() {
    close();
    videoSetupStore.open({ videoFile: null, subtitlesFile: null });
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => dispatch(newVideoDialogToggled(open))}
      title='New Video'
      description='Drop a video. Next, you’ll choose whether to transcribe it or use a subtitles file you have.'
    >
      <div className='space-y-5'>
        <VideoDropzone onFiles={handleFiles} />
        {file && isEditable && (
          <div className='flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3.5'>
            <div className='min-w-0 space-y-0.5'>
              <p className='text-sm text-zinc-200'>Not happy with the subtitles?</p>
              <p className='text-xs break-words text-zinc-500'>
                Transcribe “{fileName}” again, or use a subtitles file.
              </p>
            </div>
            <Button size='sm' onClick={handleRedoSubtitles}>
              <RotateCcw className='size-3.5' />
              Redo subtitles
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}

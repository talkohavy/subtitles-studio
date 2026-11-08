import { RotateCcw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { useMediaState } from '../../hooks/useMediaState';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectCues, selectIsProcessing, selectSession, selectSettings } from '../../store/selectors';
import { newVideoDialogToggled } from '../../store/slices/ui.slice';
import { openVideo, retranscribe } from '../transcription/transcriptionPipeline';
import { TranscriptionSettingsFields } from './TranscriptionSettingsFields';
import { VideoDropzone } from './VideoDropzone';

export function NewVideoDialog() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.ui.isNewVideoDialogOpen);
  const { fileName, video } = useAppSelector(selectSession);
  const { language, modelId } = useAppSelector(selectSettings);
  const isProcessing = useAppSelector(selectIsProcessing);
  const hasCues = useAppSelector(selectCues).length > 0;
  const { file } = useMediaState();

  function close() {
    dispatch(newVideoDialogToggled(false));
  }

  function handleFile(newFile: File) {
    close();
    void dispatch(openVideo(newFile));
  }

  function handleTranscribeAgain() {
    close();
    void dispatch(retranscribe({ language, modelId }));
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => dispatch(newVideoDialogToggled(open))}
      title='New Video'
      description='Pick the spoken language (or let it be detected), then drop a video.'
    >
      <div className='space-y-5'>
        <TranscriptionSettingsFields />
        <VideoDropzone onFile={handleFile} />
        {file && video?.hasAudio && (
          <div className='flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3.5'>
            <div className='min-w-0 space-y-0.5'>
              <p className='text-sm text-zinc-200'>Not happy with the transcript?</p>
              <p className='truncate text-xs text-zinc-500'>
                Transcribe “{fileName}” again with the settings above
                {hasCues ? '. This replaces its current subtitles.' : '.'}
              </p>
            </div>
            <Button size='sm' onClick={handleTranscribeAgain} disabled={isProcessing}>
              <RotateCcw className='size-3.5' />
              Transcribe again
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}

import { CircleExclamationPoint, RotateCcw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useMediaState } from '../../hooks/useMediaState';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectCues, selectSession, selectSettings } from '../../store/selectors';
import { sessionReady } from '../../store/slices/session.slice';
import { newVideoDialogToggled } from '../../store/slices/ui.slice';
import { retranscribe } from '../transcription/transcriptionPipeline';

export function FailureOverlay() {
  const dispatch = useAppDispatch();
  const { error } = useAppSelector(selectSession);
  const { language, modelId } = useAppSelector(selectSettings);
  const hasCues = useAppSelector(selectCues).length > 0;
  const { file } = useMediaState();

  return (
    <div className='absolute inset-0 z-10 flex animate-fade-in items-center justify-center bg-zinc-950/75 p-4 backdrop-blur-sm'>
      <div className='w-full max-w-md animate-scale-in rounded-2xl border border-zinc-800 bg-zinc-900/95 p-6 shadow-2xl'>
        <div className='flex gap-3'>
          <CircleExclamationPoint className='size-6 shrink-0 text-red-400' />
          <div className='space-y-1.5'>
            <h2 className='text-base font-semibold text-zinc-50'>The subtitles couldn’t be created</h2>
            <p className='text-sm text-zinc-400'>{error ?? 'Something went wrong.'}</p>
          </div>
        </div>
        <div className='mt-6 flex flex-wrap justify-end gap-2'>
          <Button variant='ghost' size='sm' onClick={() => dispatch(newVideoDialogToggled(true))}>
            Choose another video
          </Button>
          {hasCues && (
            <Button size='sm' onClick={() => dispatch(sessionReady())}>
              Keep my subtitles
            </Button>
          )}
          {file && (
            <Button variant='primary' size='sm' onClick={() => void dispatch(retranscribe({ language, modelId }))}>
              <RotateCcw className='size-3.5' />
              Try again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

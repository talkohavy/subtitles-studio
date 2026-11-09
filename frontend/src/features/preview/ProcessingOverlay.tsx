import { Check, LoaderCircle } from 'lucide-react';
import { cn } from '@src/common/utils/cn';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectSession } from '../../store/selectors';
import { ProcessingTasks, SessionPhases, type SessionState } from '../../store/slices/session.slice';
import { getLanguageName } from '../new-video/languages';
import { useTranscriptionOptions } from '../new-video/useTranscriptionOptions';
import { cancelProcessing } from '../transcription/transcriptionPipeline';
import { getProcessingSteps, ProcessingStepStatuses, type ProcessingStep } from './processingSteps';

export function ProcessingOverlay() {
  const dispatch = useAppDispatch();
  const session = useAppSelector(selectSession);
  const { options } = useTranscriptionOptions();

  function getModelName(modelId: string): string {
    const model = options?.models.find((transcriptionModel) => transcriptionModel.id === modelId);

    return model?.name ?? modelId;
  }

  const steps = getProcessingSteps({ session, getLanguageName, getModelName });

  return (
    <div className='absolute inset-0 z-10 flex animate-fade-in items-center justify-center bg-zinc-950/75 p-4 backdrop-blur-sm'>
      <div className='w-full max-w-md animate-scale-in rounded-2xl border border-zinc-800 bg-zinc-900/95 p-6 shadow-2xl'>
        <h2 className='text-base font-semibold text-zinc-50'>{getTitle(session)}</h2>
        {session.fileName && <p className='mt-0.5 truncate text-sm text-zinc-500'>{session.fileName}</p>}
        <ol className='mt-5 space-y-3.5'>
          {steps.map((step) => (
            <ProcessingStepRow key={step.id} step={step} />
          ))}
        </ol>
        {session.transcriptPreview && (
          <p
            dir='auto'
            className='mt-5 line-clamp-3 rounded-lg bg-zinc-950/70 px-3 py-2.5 text-sm leading-relaxed text-zinc-300'
          >
            …{session.transcriptPreview}
          </p>
        )}
        <div className='mt-5 flex justify-end'>
          <Button variant='ghost' size='sm' onClick={() => dispatch(cancelProcessing())}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function getTitle(session: SessionState): string {
  const isTranslating = session.phase === SessionPhases.Translating;

  if (session.task === ProcessingTasks.Translate) return 'Translating your subtitles';

  if (session.task === ProcessingTasks.AddSubtitlesFile) {
    return isTranslating ? 'Translating your subtitles' : 'Adding your subtitles';
  }

  return 'Creating your subtitles';
}

function ProcessingStepRow(props: { step: ProcessingStep }) {
  const { step } = props;

  const isDone = step.status === ProcessingStepStatuses.Done;
  const isActive = step.status === ProcessingStepStatuses.Active;

  return (
    <li className='flex gap-3'>
      <span
        className={cn(
          'mt-px flex size-5 shrink-0 items-center justify-center rounded-full',
          isDone && 'bg-violet-600 text-white',
          isActive && 'text-violet-400',
          !isDone && !isActive && 'border border-zinc-700',
        )}
      >
        {isDone && <Check className='size-3' strokeWidth={3} />}
        {isActive && <LoaderCircle className='size-5 animate-spin' />}
      </span>
      <div className='min-w-0 flex-1 space-y-1.5'>
        <div className='flex items-baseline justify-between gap-3 text-sm'>
          <span className={cn(isDone || isActive ? 'text-zinc-100' : 'text-zinc-500')}>{step.label}</span>
          {step.detail && <span className='truncate text-xs text-zinc-400'>{step.detail}</span>}
        </div>
        {isActive && step.progress !== null && <ProgressBar progress={step.progress} />}
      </div>
    </li>
  );
}

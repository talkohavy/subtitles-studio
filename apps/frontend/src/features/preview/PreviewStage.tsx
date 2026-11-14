import { useAppSelector } from '../../store';
import { selectIsProcessing, selectSession } from '../../store/selectors';
import { SessionPhases } from '../../store/slices/session.slice';
import { EmptyStage } from '../new-video/EmptyStage';
import { FailureOverlay } from './FailureOverlay';
import { PreviewCanvas } from './PreviewCanvas';
import { ProcessingOverlay } from './ProcessingOverlay';

export function PreviewStage() {
  const { phase } = useAppSelector(selectSession);
  const isProcessing = useAppSelector(selectIsProcessing);

  if (phase === SessionPhases.Idle) {
    return (
      <div className='flex min-h-0 flex-1 overflow-y-auto p-6'>
        <EmptyStage />
      </div>
    );
  }

  return (
    <div className='relative min-h-0 flex-1 p-4'>
      <PreviewCanvas />
      {isProcessing && <ProcessingOverlay />}
      {phase === SessionPhases.Failed && <FailureOverlay />}
    </div>
  );
}

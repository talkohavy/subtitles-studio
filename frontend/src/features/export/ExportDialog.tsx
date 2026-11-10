import { useRef, useState, type RefObject } from 'react';
import { CircleCheck, CircleExclamationPoint, Download } from 'lucide-react';
import { downloadBlob, getBaseFileName } from '@src/common/utils/downloadBlob';
import { formatTime } from '@src/common/utils/formatTime';
import { getErrorMessage, isAbortError } from '@src/common/utils/getErrorMessage';
import { ExportQualities, type ExportQualityValues } from '@src/lib/media/constants';
import { exportVideo } from '@src/lib/media/exportVideo';
import { AudioNotExportableError } from '@src/lib/media/media-error';
import { mediaStore } from '@src/lib/media/mediaStore';
import { player } from '@src/lib/player/playerController';
import { computeOutputSize } from '@src/lib/renderer/geometry';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  selectCanvasSettings,
  selectCues,
  selectLanguage,
  selectSession,
  selectSettings,
  selectStyle,
} from '../../store/selectors';
import { settingsChanged } from '../../store/slices/settings.slice';
import { exportDialogToggled } from '../../store/slices/ui.slice';

const PROGRESS_UPDATE_INTERVAL_MS = 150;
/**
 * Below this, the time left is too noisy to show.
 */
const MIN_PROGRESS_FOR_ESTIMATE = 0.03;

const QUALITY_OPTIONS: ReadonlyArray<{ value: ExportQualityValues; label: string }> = [
  { value: ExportQualities.Standard, label: 'Standard' },
  { value: ExportQualities.High, label: 'High' },
];

type ExportState =
  | { status: 'idle' }
  | { status: 'confirmingNoAudio'; message: string }
  | { status: 'exporting'; progress: number; elapsedSec: number }
  | { status: 'done'; blob: Blob; fileName: string; elapsedSec: number }
  | { status: 'failed'; error: string };

const IDLE_STATE: ExportState = { status: 'idle' };

const CAN_ENCODE_VIDEO = typeof VideoEncoder !== 'undefined';

export function ExportDialog() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.ui.isExportDialogOpen);
  const [exportState, setExportState] = useState<ExportState>(IDLE_STATE);
  const controllerRef = useRef<AbortController | null>(null);

  const isExporting = exportState.status === 'exporting';

  function handleOpenChange(open: boolean) {
    if (open) return;

    dispatch(exportDialogToggled(false));
    setExportState(IDLE_STATE);
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={handleOpenChange}
      title='Export video'
      description='The video is re-encoded with the subtitles burned in, right here in your browser.'
      isDismissible={!isExporting}
    >
      <ExportDialogContent
        exportState={exportState}
        setExportState={setExportState}
        controllerRef={controllerRef}
        onClose={() => handleOpenChange(false)}
      />
    </Dialog>
  );
}

type ExportDialogContentProps = {
  exportState: ExportState;
  setExportState: (updater: ExportState | ((previous: ExportState) => ExportState)) => void;
  controllerRef: RefObject<AbortController | null>;
  onClose: () => void;
};

function ExportDialogContent(props: ExportDialogContentProps) {
  const { exportState, setExportState, controllerRef, onClose } = props;

  const dispatch = useAppDispatch();
  const cues = useAppSelector(selectCues);
  const style = useAppSelector(selectStyle);
  const canvasSettings = useAppSelector(selectCanvasSettings);
  const language = useAppSelector(selectLanguage);
  const { video, fileName } = useAppSelector(selectSession);
  const { exportQuality } = useAppSelector(selectSettings);

  const outputSize = video
    ? computeOutputSize({
        sourceWidth: video.width,
        sourceHeight: video.height,
        aspectRatio: canvasSettings.aspectRatio,
      })
    : null;

  async function startExport(allowDroppingAudio: boolean) {
    const { file } = mediaStore.getSnapshot();

    if (!file) return;

    const controller = new AbortController();
    controllerRef.current = controller;
    const startedAt = performance.now();
    let lastUpdateAt = 0;

    player.pause();
    setExportState({ status: 'exporting', progress: 0, elapsedSec: 0 });

    function handleProgress(progress: number) {
      const now = performance.now();

      if (now - lastUpdateAt < PROGRESS_UPDATE_INTERVAL_MS) return;

      lastUpdateAt = now;
      const elapsedSec = (now - startedAt) / 1000;
      setExportState((previous) =>
        previous.status === 'exporting' ? { status: 'exporting', progress, elapsedSec } : previous,
      );
    }

    try {
      const blob = await exportVideo({
        file,
        cues,
        style,
        canvasSettings,
        language,
        quality: exportQuality,
        allowDroppingAudio,
        onProgress: handleProgress,
        signal: controller.signal,
      });
      const outputFileName = `${getBaseFileName(fileName ?? 'video')}-subtitled.mp4`;
      downloadBlob({ blob, fileName: outputFileName });
      setExportState({
        status: 'done',
        blob,
        fileName: outputFileName,
        elapsedSec: (performance.now() - startedAt) / 1000,
      });
    } catch (error) {
      const wasCanceled = controller.signal.aborted || isAbortError(error);

      if (wasCanceled) {
        setExportState(IDLE_STATE);
      } else if (error instanceof AudioNotExportableError) {
        setExportState({ status: 'confirmingNoAudio', message: error.message });
      } else {
        setExportState({ status: 'failed', error: getErrorMessage(error) });
      }
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }

  function cancelExport() {
    controllerRef.current?.abort(new DOMException('Canceled', 'AbortError'));
  }

  if (!CAN_ENCODE_VIDEO) {
    return (
      <p className='rounded-lg bg-amber-500/10 p-3 text-sm text-amber-200'>
        Your browser can’t encode video. Use a recent version of Chrome, Edge, Firefox or Safari, or download the
        subtitles as an SRT file instead.
      </p>
    );
  }

  if (exportState.status === 'exporting') {
    const { progress, elapsedSec } = exportState;
    const remainingSec = progress >= MIN_PROGRESS_FOR_ESTIMATE ? (elapsedSec / progress) * (1 - progress) : null;

    return (
      <div className='space-y-4'>
        <div className='flex items-baseline justify-between text-sm'>
          <span className='text-zinc-200'>Exporting… {Math.round(progress * 100)}%</span>
          <span className='text-xs text-zinc-500'>
            {remainingSec === null ? 'Estimating time left…' : `About ${formatDuration(remainingSec)} left`}
          </span>
        </div>
        <ProgressBar progress={progress} />
        <p className='text-xs text-zinc-500'>Keep this tab open until the export finishes.</p>
        <div className='flex justify-end'>
          <Button variant='ghost' size='sm' onClick={cancelExport}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (exportState.status === 'confirmingNoAudio') {
    return (
      <div className='space-y-5'>
        <div className='flex gap-2.5 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-200'>
          <CircleExclamationPoint className='mt-0.5 size-4 shrink-0' />
          
          <p>
            {exportState.message} To keep the sound, convert the video’s audio to AAC first (e.g. with HandBrake or
            ffmpeg).
          </p>
        </div>
        
        <div className='flex justify-end gap-2'>
          <Button variant='ghost' size='sm' onClick={() => setExportState(IDLE_STATE)}>
            Cancel
          </Button>
          
          <Button variant='primary' size='sm' onClick={() => startExport(true)}>
            <Download className='size-4' />
            Export without sound
          </Button>
        </div>
      </div>
    );
  }

  if (exportState.status === 'done') {
    const { blob, fileName: outputFileName, elapsedSec } = exportState;

    return (
      <div className='space-y-5'>
        <div className='flex gap-3'>
          <CircleCheck className='size-6 shrink-0 text-emerald-400' />
          <div className='min-w-0 space-y-1'>
            <p className='text-sm font-medium text-zinc-100'>Your video is ready</p>
            <p className='truncate text-xs text-zinc-500'>
              {outputFileName} · {formatFileSize(blob.size)} · made in {formatDuration(elapsedSec)}
            </p>
          </div>
        </div>
        <div className='flex justify-end gap-2'>
          <Button variant='ghost' size='sm' onClick={onClose}>
            Close
          </Button>
          <Button variant='primary' size='sm' onClick={() => downloadBlob({ blob, fileName: outputFileName })}>
            <Download className='size-4' />
            Download again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-5'>
      {exportState.status === 'failed' && (
        <div className='flex gap-2.5 rounded-lg bg-red-500/10 p-3 text-sm text-red-200'>
          <CircleExclamationPoint className='mt-0.5 size-4 shrink-0' />
          {exportState.error}
        </div>
      )}
      
      <dl className='grid grid-cols-3 gap-3'>
        <SummaryItem label='Size' value={outputSize ? `${outputSize.width}×${outputSize.height}` : '—'} />
        <SummaryItem label='Length' value={video ? formatTime(video.durationSec) : '—'} />
        <SummaryItem label='Subtitles' value={String(cues.length)} />
      </dl>
      
      <SegmentedControl
        label='Quality'
        value={exportQuality}
        options={QUALITY_OPTIONS}
        onChange={(value) => dispatch(settingsChanged({ exportQuality: value }))}
      />
      
      <div className='flex justify-end'>
        <Button variant='primary' onClick={() => void startExport(false)}>
          <Download className='size-4' />
          {exportState.status === 'failed' ? 'Try again' : 'Export MP4'}
        </Button>
      </div>
    </div>
  );
}

function SummaryItem(props: { label: string; value: string }) {
  const { label, value } = props;

  return (
    <div className='rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5'>
      <dt className='text-[11px] text-zinc-500'>{label}</dt>
      <dd className='mt-0.5 text-sm font-medium text-zinc-100 tabular-nums'>{value}</dd>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))} s`;

  return `${Math.round(seconds / 60)} min`;
}

function formatFileSize(bytes: number): string {
  const megabytes = bytes / (1024 * 1024);

  return megabytes >= 1 ? `${megabytes.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

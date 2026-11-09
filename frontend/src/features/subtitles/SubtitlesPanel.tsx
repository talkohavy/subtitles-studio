import { useEffect, useRef } from 'react';
import { Captions, FileUp, Plus } from 'lucide-react';
import { formatTime } from '@src/common/utils/formatTime';
import { player } from '@src/lib/player/playerController';
import { usePlayerState } from '@src/lib/player/usePlayerState';
import { findCueIndexAtTime } from '@src/lib/subtitles/cueOperations';
import { ACCEPTED_SUBTITLES_TYPES } from '@src/lib/subtitles/import/constants';
import { Button, IconButton } from '../../components/ui/Button';
import { useFilePicker } from '../../hooks/useFilePicker';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectCues, selectIsEditable, selectIsProcessing, selectSelectedCueId } from '../../store/selectors';
import { PanelLayout } from '../side-panel/PanelLayout';
import { CaptionSettingsPopover } from './CaptionSettingsPopover';
import { CueCard } from './CueCard';
import { addCueAtTime } from './cueThunks';
import { importSubtitlesFile } from './subtitlesFileThunks';

export function SubtitlesPanel() {
  const cues = useAppSelector(selectCues);
  const isEditable = useAppSelector(selectIsEditable);
  const isProcessing = useAppSelector(selectIsProcessing);
  const selectedCueId = useAppSelector(selectSelectedCueId);
  const focusRequest = useAppSelector((state) => state.ui.focusRequest);
  const activeCueIndex = usePlayerState((state) => findCueIndexAtTime({ cues, time: state.currentTime }));
  const isPlaying = usePlayerState((state) => state.isPlaying);
  const listRef = useRef<HTMLDivElement>(null);

  // Follows the spoken caption while playing, unless a caption is being edited.
  useEffect(() => {
    const list = listRef.current;

    if (!isPlaying || activeCueIndex < 0 || !list) return;

    const isEditing = document.activeElement instanceof HTMLTextAreaElement && list.contains(document.activeElement);

    if (isEditing) return;

    const card = list.querySelector(`[data-cue-index="${activeCueIndex}"]`);
    card?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeCueIndex, isPlaying]);

  const isWaitingForTranscript = isProcessing && cues.length === 0;

  return (
    <PanelLayout
      title='Subtitles'
      badge={cues.length > 0 ? cues.length : undefined}
      actions={
        <>
          <ImportSubtitlesFileButton isEditable={isEditable} />
          <CaptionSettingsPopover />
        </>
      }
      footer={isEditable ? <AddCueAtPlayheadButton /> : undefined}
    >
      {isWaitingForTranscript && <TranscriptPlaceholder />}
      {!isWaitingForTranscript && cues.length === 0 && <NoCues isEditable={isEditable} />}
      {cues.length > 0 && (
        <div ref={listRef} className='space-y-2 p-3'>
          {cues.map((cue, index) => (
            <CueCard
              key={cue.id}
              cue={cue}
              index={index}
              isActive={index === activeCueIndex}
              isSelected={cue.id === selectedCueId}
              isLast={index === cues.length - 1}
              isEditable={isEditable}
              focusNonce={focusRequest?.cueId === cue.id ? focusRequest.nonce : null}
            />
          ))}
        </div>
      )}
    </PanelLayout>
  );
}

function AddCueAtPlayheadButton() {
  const dispatch = useAppDispatch();
  const currentTime = usePlayerState((state) => state.currentTime);

  return (
    <Button className='w-full' onClick={() => dispatch(addCueAtTime(player.getCurrentTime()))}>
      <Plus className='size-4' />
      Add subtitle at {formatTime(currentTime)}
    </Button>
  );
}

function TranscriptPlaceholder() {
  return (
    <div className='space-y-2 p-3' aria-hidden>
      {[0.9, 0.7, 0.8, 0.6, 0.75].map((width, index) => (
        <div key={index} className='animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/60 p-3'>
          <div className='mb-3 h-2.5 w-24 rounded bg-zinc-800' />
          <div className='h-3 rounded bg-zinc-800' style={{ width: `${width * 100}%` }} />
        </div>
      ))}
      <p className='px-1 pt-2 text-center text-xs text-zinc-500'>
        Your subtitles will show up here once they’re ready.
      </p>
    </div>
  );
}

function NoCues(props: { isEditable: boolean }) {
  const { isEditable } = props;

  const { fileInput, openFilePicker } = useSubtitlesFileImport();

  return (
    <div className='flex flex-col items-center gap-3 px-6 py-16 text-center'>
      <span className='flex size-12 items-center justify-center rounded-full bg-zinc-900 text-zinc-500'>
        <Captions className='size-5' />
      </span>
      <p className='text-sm text-zinc-300'>No subtitles yet</p>
      <p className='text-xs text-zinc-500'>
        {isEditable
          ? 'Add one at the playhead, double-click the timeline, or use a subtitles file you have.'
          : 'Drop a video to transcribe it into subtitles.'}
      </p>
      {isEditable && (
        <Button size='sm' onClick={openFilePicker} className='mt-1'>
          <FileUp className='size-3.5' />
          Import a subtitles file
        </Button>
      )}
      {fileInput}
    </div>
  );
}

function ImportSubtitlesFileButton(props: { isEditable: boolean }) {
  const { isEditable } = props;

  const { fileInput, openFilePicker } = useSubtitlesFileImport();

  return (
    <>
      <IconButton
        label='Import a subtitles file'
        icon={<FileUp className='size-4' />}
        onClick={openFilePicker}
        disabled={!isEditable}
      />
      {fileInput}
    </>
  );
}

/**
 * A file picker whose subtitles file replaces the open video's subtitles.
 */
function useSubtitlesFileImport() {
  const dispatch = useAppDispatch();

  const filePicker = useFilePicker({
    accept: ACCEPTED_SUBTITLES_TYPES,
    onFiles: ([file]) => {
      if (file) void dispatch(importSubtitlesFile(file));
    },
  });

  return filePicker;
}

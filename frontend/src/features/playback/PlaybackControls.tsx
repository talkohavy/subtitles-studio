import { Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { formatTime } from '@src/common/utils/formatTime';
import { player } from '@src/lib/player/playerController';
import { usePlayerState } from '@src/lib/player/usePlayerState';
import { IconButton } from '../../components/ui/Button';
import { Tooltip } from '../../components/ui/Tooltip';
import { useAppDispatch } from '../../store';
import { seekToNextCue, seekToPreviousCue } from '../subtitles/cueThunks';
import { SpeedMenu } from './SpeedMenu';
import { VolumeControl } from './VolumeControl';
import { ZoomControl, type ZoomState } from './ZoomControl';

export function PlaybackControls(props: { zoom: ZoomState }) {
  const { zoom } = props;

  const dispatch = useAppDispatch();
  const isPlaying = usePlayerState((state) => state.isPlaying);
  const hasVideo = usePlayerState((state) => state.duration > 0);

  return (
    <div className='@container grid h-12 grid-cols-[1fr_auto_1fr] items-center gap-3 px-3'>
      <div className='flex items-center gap-1'>
        <VolumeControl disabled={!hasVideo} />
      </div>
      <div className='flex items-center gap-1.5'>
        <IconButton
          label='Previous subtitle'
          shortcut='↑'
          icon={<SkipBack className='size-4' />}
          disabled={!hasVideo}
          onClick={() => dispatch(seekToPreviousCue())}
        />
        <Tooltip label={isPlaying ? 'Pause' : 'Play'} shortcut='Space'>
          <button
            type='button'
            aria-label={isPlaying ? 'Pause' : 'Play'}
            disabled={!hasVideo}
            onClick={() => void player.togglePlay()}
            className='flex size-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-950 transition-transform outline-none hover:scale-105 focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-40 disabled:hover:scale-100'
          >
            {isPlaying ? (
              <Pause className='size-4' fill='currentColor' />
            ) : (
              <Play className='ml-0.5 size-4' fill='currentColor' />
            )}
          </button>
        </Tooltip>
        <IconButton
          label='Next subtitle'
          shortcut='↓'
          icon={<SkipForward className='size-4' />}
          disabled={!hasVideo}
          onClick={() => dispatch(seekToNextCue())}
        />
        <TimeDisplay />
      </div>
      <div className='flex items-center justify-end gap-2'>
        <SpeedMenu disabled={!hasVideo} />
        <ZoomControl zoom={zoom} disabled={!hasVideo} />
      </div>
    </div>
  );
}

function TimeDisplay() {
  const currentTime = usePlayerState((state) => state.currentTime);
  const duration = usePlayerState((state) => state.duration);

  return (
    <span className='ml-2 min-w-[7.5rem] font-mono text-xs text-zinc-400 tabular-nums'>
      <span className='text-zinc-100'>{formatTime(currentTime)}</span> / {formatTime(duration)}
    </span>
  );
}

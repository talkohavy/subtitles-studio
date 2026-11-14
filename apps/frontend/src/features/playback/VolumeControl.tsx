import { Volume1, Volume2, VolumeX } from 'lucide-react';
import { player } from '@src/lib/player/playerController';
import { usePlayerState } from '@src/lib/player/usePlayerState';
import { IconButton } from '../../components/ui/Button';
import { SliderControl } from '../../components/ui/SliderField';

export function VolumeControl(props: { disabled?: boolean }) {
  const { disabled } = props;

  const volume = usePlayerState((state) => state.volume);
  const isMuted = usePlayerState((state) => state.isMuted);

  const effectiveVolume = isMuted ? 0 : volume;
  const icon = getVolumeIcon(effectiveVolume);

  function handleVolumeChange(values: Array<number>) {
    const [nextVolume] = values;

    if (nextVolume !== undefined) player.setVolume(nextVolume);
  }

  return (
    <div className='flex items-center gap-1.5'>
      <IconButton
        label={isMuted ? 'Unmute' : 'Mute'}
        shortcut='M'
        icon={icon}
        disabled={disabled}
        onClick={() => player.toggleMute()}
      />
      <SliderControl
        label='Volume'
        value={effectiveVolume}
        min={0}
        max={1}
        step={0.05}
        onValueChange={handleVolumeChange}
        disabled={disabled}
        className='hidden w-20 @md:flex'
      />
    </div>
  );
}

function getVolumeIcon(volume: number) {
  if (volume === 0) return <VolumeX className='size-4' />;

  if (volume < 0.5) return <Volume1 className='size-4' />;

  return <Volume2 className='size-4' />;
}

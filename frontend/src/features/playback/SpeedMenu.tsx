import { DropdownMenu } from 'radix-ui';
import { player } from '@src/lib/player/playerController';
import { usePlayerState } from '@src/lib/player/usePlayerState';

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function SpeedMenu(props: { disabled?: boolean }) {
  const { disabled } = props;

  const playbackRate = usePlayerState((state) => state.playbackRate);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        disabled={disabled}
        aria-label='Playback speed'
        className='h-7 min-w-10 rounded-md px-2 text-xs font-semibold text-zinc-300 tabular-nums outline-none hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-violet-500/60 disabled:opacity-40'
      >
        {playbackRate}x
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side='top'
          sideOffset={6}
          className='z-50 min-w-24 animate-fade-in rounded-lg border border-zinc-800 bg-zinc-900 p-1 shadow-xl'
        >
          <DropdownMenu.RadioGroup
            value={String(playbackRate)}
            onValueChange={(value) => player.setPlaybackRate(Number(value))}
          >
            {PLAYBACK_RATES.map((rate) => (
              <DropdownMenu.RadioItem
                key={rate}
                value={String(rate)}
                className='cursor-pointer rounded-md px-2.5 py-1.5 text-sm text-zinc-300 tabular-nums outline-none data-[highlighted]:bg-zinc-800 data-[state=checked]:text-violet-300'
              >
                {rate === 1 ? 'Normal' : `${rate}x`}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

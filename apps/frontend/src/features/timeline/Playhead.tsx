import { usePlayerState } from '@src/lib/player/usePlayerState';

export function Playhead(props: { pxPerSec: number }) {
  const { pxPerSec } = props;

  const currentTime = usePlayerState((state) => state.currentTime);

  return (
    <div
      aria-hidden
      className='pointer-events-none absolute inset-y-0 left-0 z-20 w-px bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.7)]'
      style={{ transform: `translateX(${currentTime * pxPerSec}px)` }}
    >
      <div className='absolute top-0 -left-[5px] h-3 w-[11px] rounded-b-sm bg-violet-400 [clip-path:polygon(0_0,100%_0,100%_55%,50%_100%,0_55%)]' />
    </div>
  );
}

import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { cn } from '@src/common/utils/cn';
import { createId } from '@src/common/utils/createId';
import { formatTime } from '@src/common/utils/formatTime';
import { player } from '@src/lib/player/playerController';
import { useAppDispatch } from '../../store';
import { cueTimingChanged } from '../../store/slices/project.slice';
import { cueFocusRequested, cueSelected } from '../../store/slices/ui.slice';
import { computeDraggedTiming, CueDragModes, type CueDragModeValues } from './timelineDrag';
import type { Cue } from '@src/lib/subtitles/types';

const DRAG_THRESHOLD_PX = 3;
/**
 * How wide the resize grips at each end of a caption are.
 */
const EDGE_GRIP_PX = 7;
/**
 * Narrower captions can only be moved, not resized.
 */
const MIN_RESIZABLE_WIDTH_PX = 3 * EDGE_GRIP_PX;
const MIN_BLOCK_WIDTH_PX = 3;
/**
 * Narrower captions hide their text, since not even one letter and an ellipsis would fit.
 */
const MIN_LABEL_WIDTH_PX = 22;
const EDGE_CURSOR = 'ew-resize';

type CueDrag = {
  pointerId: number;
  mode: CueDragModeValues;
  startClientX: number;
  originalStart: number;
  originalEnd: number;
  gestureId: string;
  hasMoved: boolean;
};

type TimelineCueProps = {
  cue: Cue;
  minStart: number;
  maxEnd: number;
  pxPerSec: number;
  mediaDurationSec: number;
  isActive: boolean;
  isSelected: boolean;
  isEditable: boolean;
};

export function TimelineCue(props: TimelineCueProps) {
  const { cue, minStart, maxEnd, pxPerSec, mediaDurationSec, isActive, isSelected, isEditable } = props;

  const dispatch = useAppDispatch();
  const dragRef = useRef<CueDrag | null>(null);

  const left = cue.start * pxPerSec;
  const width = Math.max(MIN_BLOCK_WIDTH_PX, (cue.end - cue.start) * pxPerSec);
  const canResize = isEditable && width >= MIN_RESIZABLE_WIDTH_PX;

  function getDragMode(event: PointerEvent<HTMLDivElement>): CueDragModeValues {
    if (!canResize) return CueDragModes.Move;

    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;

    if (offsetX <= EDGE_GRIP_PX) return CueDragModes.Start;

    if (offsetX >= rect.width - EDGE_GRIP_PX) return CueDragModes.End;

    return CueDragModes.Move;
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;

    // The timeline would otherwise start scrubbing.
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      mode: getDragMode(event),
      startClientX: event.clientX,
      originalStart: cue.start,
      originalEnd: cue.end,
      gestureId: `drag:${createId()}`,
      hasMoved: false,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      const mode = getDragMode(event);
      event.currentTarget.style.cursor = mode === CueDragModes.Move ? '' : EDGE_CURSOR;
      return;
    }

    const deltaX = event.clientX - drag.startClientX;

    if (!drag.hasMoved && Math.abs(deltaX) < DRAG_THRESHOLD_PX) return;

    dragRef.current = { ...drag, hasMoved: true };

    if (!isEditable) return;

    const timing = computeDraggedTiming({
      mode: drag.mode,
      originalStart: drag.originalStart,
      originalEnd: drag.originalEnd,
      deltaSec: deltaX / pxPerSec,
      minStart,
      maxEnd,
    });

    dispatch(cueTimingChanged({ cueId: cue.id, ...timing, mediaDurationSec, gestureId: drag.gestureId }));

    // Shows the frame where the moved edge now is.
    if (drag.mode === CueDragModes.End) player.seek(Math.max(timing.start, timing.end - 0.05));
    else player.seek(timing.start);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    dragRef.current = null;

    if (!drag || drag.pointerId !== event.pointerId || drag.hasMoved) return;

    dispatch(cueSelected(cue.id));
    player.seek(cue.start);
  }

  function handlePointerCancel() {
    dragRef.current = null;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Enter') return;

    event.preventDefault();
    dispatch(cueFocusRequested(cue.id));
  }

  return (
    <div
      role='button'
      tabIndex={0}
      aria-label={`Subtitle from ${formatTime(cue.start)} to ${formatTime(cue.end)}: ${cue.text}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onDoubleClick={() => dispatch(cueFocusRequested(cue.id))}
      onKeyDown={handleKeyDown}
      className={cn(
        'group absolute inset-y-1 flex cursor-grab items-center overflow-hidden rounded-md border px-1.5 text-xs leading-tight outline-none active:cursor-grabbing',
        'focus-visible:ring-2 focus-visible:ring-violet-300',
        isActive
          ? 'border-violet-300/70 bg-violet-500/90 text-white'
          : 'border-violet-400/30 bg-violet-600/55 text-violet-50',
        isSelected && 'ring-2 ring-white/80',
        !isEditable && 'cursor-pointer',
      )}
      style={{ left, width }}
    >
      {width >= MIN_LABEL_WIDTH_PX && (
        <span dir='auto' className='pointer-events-none truncate'>
          {cue.text}
        </span>
      )}
      {canResize && (
        <>
          <span className='pointer-events-none absolute inset-y-2 left-0.5 w-1 rounded-full bg-white/0 transition-colors group-hover:bg-white/50' />
          <span className='pointer-events-none absolute inset-y-2 right-0.5 w-1 rounded-full bg-white/0 transition-colors group-hover:bg-white/50' />
        </>
      )}
    </div>
  );
}

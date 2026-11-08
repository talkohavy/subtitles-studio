import { useRef, type PointerEvent, type RefObject } from 'react';
import { clamp } from '@src/common/utils/clamp';
import { player } from '@src/lib/player/playerController';
import { findCueIndexAtTime } from '@src/lib/subtitles/cueOperations';
import { useAppDispatch } from '../../store';
import { styleChanged } from '../../store/slices/project.slice';
import { cueFocusRequested } from '../../store/slices/ui.slice';
import type { Rect } from '@src/lib/renderer/types';
import type { Cue } from '@src/lib/subtitles/types';

const DRAG_THRESHOLD_PX = 3;
/**
 * Extra room around the caption that still counts as grabbing it, in CSS pixels.
 */
const GRAB_MARGIN_PX = 10;
const MIN_POSITION_Y = 4;
const MAX_POSITION_Y = 96;

type DragState = {
  pointerId: number;
  startClientY: number;
  startPositionY: number;
  isOnCaption: boolean;
  hasMoved: boolean;
};

type UseCaptionDragProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  captionBoundsRef: RefObject<Rect | null>;
  cues: ReadonlyArray<Cue>;
  positionY: number;
  isEditable: boolean;
};

/**
 * Dragging the caption moves it up or down; clicking it edits its text; clicking elsewhere plays or pauses.
 */
export function useCaptionDrag(props: UseCaptionDragProps) {
  const { canvasRef, captionBoundsRef, cues, positionY, isEditable } = props;

  const dispatch = useAppDispatch();
  const dragRef = useRef<DragState | null>(null);

  function isPointOnCaption(event: PointerEvent<HTMLCanvasElement>): boolean {
    const canvas = canvasRef.current;
    const bounds = captionBoundsRef.current;

    if (!canvas || !bounds || !isEditable) return false;

    const rect = canvas.getBoundingClientRect();
    const pixelsPerCssPixel = canvas.width / rect.width;
    const x = (event.clientX - rect.left) * pixelsPerCssPixel;
    const y = (event.clientY - rect.top) * pixelsPerCssPixel;
    const margin = GRAB_MARGIN_PX * pixelsPerCssPixel;

    return (
      x >= bounds.x - margin &&
      x <= bounds.x + bounds.width + margin &&
      y >= bounds.y - margin &&
      y <= bounds.y + bounds.height + margin
    );
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startClientY: event.clientY,
      startPositionY: positionY,
      isOnCaption: isPointOnCaption(event),
      hasMoved: false,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      canvas.style.cursor = isPointOnCaption(event) ? 'grab' : 'pointer';
      return;
    }

    const deltaY = event.clientY - drag.startClientY;

    if (!drag.hasMoved && Math.abs(deltaY) < DRAG_THRESHOLD_PX) return;

    dragRef.current = { ...drag, hasMoved: true };

    if (!drag.isOnCaption) return;

    canvas.style.cursor = 'grabbing';

    const height = canvas.getBoundingClientRect().height;
    const nextPositionY = clamp({
      value: drag.startPositionY + (deltaY / height) * 100,
      min: MIN_POSITION_Y,
      max: MAX_POSITION_Y,
    });

    dispatch(styleChanged({ positionY: Math.round(nextPositionY * 10) / 10 }));
  }

  function handlePointerUp(event: PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    dragRef.current = null;

    if (!drag || drag.pointerId !== event.pointerId) return;

    event.currentTarget.style.cursor = drag.isOnCaption ? 'grab' : 'pointer';

    if (drag.hasMoved) return;

    if (!drag.isOnCaption) {
      void player.togglePlay();
      return;
    }

    const cueIndex = findCueIndexAtTime({ cues, time: player.getCurrentTime() });
    const cue = cues[cueIndex];

    if (cue) dispatch(cueFocusRequested(cue.id));
  }

  function handlePointerCancel() {
    dragRef.current = null;
  }

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
  };
}

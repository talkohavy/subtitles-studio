import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { clamp } from '@src/common/utils/clamp';
import { player } from '@src/lib/player/playerController';
import { usePlayerState } from '@src/lib/player/usePlayerState';
import { findCueIndexAtTime } from '@src/lib/subtitles/cueOperations';
import { useMediaState } from '../../hooks/useMediaState';
import { usePixelRatio } from '../../hooks/usePixelRatio';
import { useAppDispatch, useAppSelector } from '../../store';
import { selectCues, selectIsEditable, selectSelectedCueId } from '../../store/selectors';
import { timelineZoomChanged } from '../../store/slices/ui.slice';
import { addCueAtTime } from '../subtitles/cueThunks';
import { drawTimelineBackground, TIMELINE_LAYOUT } from './drawTimelineBackground';
import { Playhead } from './Playhead';
import { TimelineCue } from './TimelineCue';
import { TIMELINE_END_PADDING_PX } from './timelineScale';

/**
 * While playing, the view jumps ahead once the playhead gets this close to its right edge.
 */
const FOLLOW_MARGIN_PX = 48;
/**
 * Captions this far outside the visible area are still rendered, so scrolling doesn't reveal gaps.
 */
const RENDER_MARGIN_PX = 600;
const WHEEL_ZOOM_SENSITIVITY = 0.01;

type ZoomAnchor = {
  time: number;
  /**
   * Where that time should stay, in pixels from the left edge of the view.
   */
  offsetX: number;
};

type TimelineProps = {
  pxPerSec: number;
  fitPxPerSec: number;
  maxPxPerSec: number;
  viewportWidth: number;
  durationSec: number;
};

export function Timeline(props: TimelineProps) {
  const { pxPerSec, fitPxPerSec, maxPxPerSec, viewportWidth, durationSec } = props;

  const dispatch = useAppDispatch();
  const cues = useAppSelector(selectCues);
  const selectedCueId = useAppSelector(selectSelectedCueId);
  const isEditable = useAppSelector(selectIsEditable);
  const { waveform } = useMediaState();
  const pixelRatio = usePixelRatio();

  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isScrubbingRef = useRef(false);
  const zoomAnchorRef = useRef<ZoomAnchor | null>(null);
  const previousPxPerSecRef = useRef(pxPerSec);
  const [scrollLeft, setScrollLeft] = useState(0);

  const isRendered = durationSec > 0 && viewportWidth > 0;
  const activeCueIndex = usePlayerState((state) => findCueIndexAtTime({ cues, time: state.currentTime }));
  const contentWidth = Math.max(viewportWidth, durationSec * pxPerSec + TIMELINE_END_PADDING_PX);
  const visibleStart = (scrollLeft - RENDER_MARGIN_PX) / pxPerSec;
  const visibleEnd = (scrollLeft + viewportWidth + RENDER_MARGIN_PX) / pxPerSec;

  useLayoutEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');

    if (!ctx) return;

    drawTimelineBackground({ ctx, width: viewportWidth, pixelRatio, scrollLeft, pxPerSec, durationSec, waveform });
  }, [viewportWidth, pixelRatio, scrollLeft, pxPerSec, durationSec, waveform]);

  // Keeps the playhead (or the point under the cursor, when zooming with the wheel) in place while zooming.
  useLayoutEffect(() => {
    const previousPxPerSec = previousPxPerSecRef.current;
    previousPxPerSecRef.current = pxPerSec;
    const scroller = scrollRef.current;

    if (!scroller || previousPxPerSec === pxPerSec || previousPxPerSec === 0) return;

    const anchor = zoomAnchorRef.current ?? getPlayheadAnchor({ scroller, pxPerSec: previousPxPerSec });
    zoomAnchorRef.current = null;
    scroller.scrollLeft = anchor.time * pxPerSec - anchor.offsetX;
  }, [pxPerSec]);

  const followPlayhead = useEffectEvent(() => {
    const scroller = scrollRef.current;

    if (!scroller || !player.getSnapshot().isPlaying || isScrubbingRef.current) return;

    const x = player.getCurrentTime() * pxPerSec;
    const isOutOfView = x < scroller.scrollLeft || x > scroller.scrollLeft + scroller.clientWidth - FOLLOW_MARGIN_PX;

    if (isOutOfView) scroller.scrollLeft = x - scroller.clientWidth * 0.1;
  });

  useEffect(() => {
    const unsubscribe = player.subscribeToFrames(() => followPlayhead());

    return unsubscribe;
  }, []);

  const zoomWithWheel = useEffectEvent((event: WheelEvent) => {
    const scroller = scrollRef.current;

    if (!scroller || fitPxPerSec <= 0) return;

    const offsetX = event.clientX - scroller.getBoundingClientRect().left;
    const time = (scroller.scrollLeft + offsetX) / pxPerSec;
    const nextPxPerSec = clamp({
      value: pxPerSec * Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY),
      min: fitPxPerSec,
      max: maxPxPerSec,
    });

    zoomAnchorRef.current = { time, offsetX };
    dispatch(timelineZoomChanged(nextPxPerSec <= fitPxPerSec * 1.001 ? null : nextPxPerSec));
  });

  useEffect(() => {
    const scroller = scrollRef.current;

    if (!scroller) return;

    // React's wheel listeners are passive, so they can't stop the page from zooming.
    function handleWheel(event: WheelEvent) {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        zoomWithWheel(event);
        return;
      }

      const isVerticalScroll = Math.abs(event.deltaY) > Math.abs(event.deltaX);

      if (isVerticalScroll && scroller) {
        event.preventDefault();
        scroller.scrollLeft += event.deltaY;
      }
    }

    scroller.addEventListener('wheel', handleWheel, { passive: false });

    return () => scroller.removeEventListener('wheel', handleWheel);
  }, [isRendered]);

  const revealSelectedCue = useEffectEvent((cueId: string) => {
    const scroller = scrollRef.current;
    const cue = cues.find((existingCue) => existingCue.id === cueId);

    if (!scroller || !cue) return;

    const startX = cue.start * pxPerSec;
    const endX = cue.end * pxPerSec;
    const isVisible = startX >= scroller.scrollLeft && endX <= scroller.scrollLeft + scroller.clientWidth;

    if (!isVisible) scroller.scrollTo({ left: startX - scroller.clientWidth * 0.2, behavior: 'smooth' });
  });

  useEffect(() => {
    if (selectedCueId) revealSelectedCue(selectedCueId);
  }, [selectedCueId]);

  function getTimeAtPointer(event: MouseEvent<HTMLElement>): number {
    const scroller = scrollRef.current;

    if (!scroller) return 0;

    const x = event.clientX - scroller.getBoundingClientRect().left + scroller.scrollLeft;

    return clamp({ value: x / pxPerSec, min: 0, max: durationSec });
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || pxPerSec <= 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    isScrubbingRef.current = true;
    player.seek(getTimeAtPointer(event));
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (isScrubbingRef.current) player.seek(getTimeAtPointer(event));
  }

  function handlePointerUp() {
    isScrubbingRef.current = false;
  }

  function handleTrackDoubleClick(event: MouseEvent<HTMLDivElement>) {
    if (!isEditable || event.target !== event.currentTarget) return;

    dispatch(addCueAtTime(getTimeAtPointer(event)));
  }

  if (!isRendered) {
    return <div style={{ height: TIMELINE_LAYOUT.height }} className='border-t border-zinc-900' />;
  }

  return (
    <div
      ref={scrollRef}
      onScroll={(event) => setScrollLeft(event.currentTarget.scrollLeft)}
      className='relative overflow-x-auto overflow-y-hidden overscroll-x-contain border-t border-zinc-900 select-none'
      style={{ height: TIMELINE_LAYOUT.height + 10 }}
    >
      <div
        className='relative cursor-text'
        style={{ width: contentWidth, height: TIMELINE_LAYOUT.height }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <canvas
          ref={canvasRef}
          width={Math.round(viewportWidth * pixelRatio)}
          height={Math.round(TIMELINE_LAYOUT.height * pixelRatio)}
          className='pointer-events-none sticky left-0 block'
          style={{ width: viewportWidth, height: TIMELINE_LAYOUT.height }}
        />
        <div
          className='absolute inset-x-0'
          style={{ top: TIMELINE_LAYOUT.cueTrackTop, height: TIMELINE_LAYOUT.cueTrackHeight }}
          onDoubleClick={handleTrackDoubleClick}
          title={isEditable ? 'Double-click to add a subtitle' : undefined}
        >
          {cues.map((cue, index) => {
            const isVisible = cue.end >= visibleStart && cue.start <= visibleEnd;

            if (!isVisible) return null;

            return (
              <TimelineCue
                key={cue.id}
                cue={cue}
                minStart={cues[index - 1]?.end ?? 0}
                maxEnd={cues[index + 1]?.start ?? durationSec}
                pxPerSec={pxPerSec}
                mediaDurationSec={durationSec}
                isActive={index === activeCueIndex}
                isSelected={cue.id === selectedCueId}
                isEditable={isEditable}
              />
            );
          })}
        </div>
        <Playhead pxPerSec={pxPerSec} />
      </div>
    </div>
  );
}

function getPlayheadAnchor(props: { scroller: HTMLElement; pxPerSec: number }): ZoomAnchor {
  const { scroller, pxPerSec } = props;

  const time = player.getCurrentTime();
  const offsetX = time * pxPerSec - scroller.scrollLeft;
  const isPlayheadVisible = offsetX >= 0 && offsetX <= scroller.clientWidth;

  return { time, offsetX: isPlayheadVisible ? offsetX : scroller.clientWidth / 2 };
}

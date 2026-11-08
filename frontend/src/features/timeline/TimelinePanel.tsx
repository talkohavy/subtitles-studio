import { useRef } from 'react';
import { clamp } from '@src/common/utils/clamp';
import { useElementSize } from '../../hooks/useElementSize';
import { useAppSelector } from '../../store';
import { selectMediaDuration } from '../../store/selectors';
import { PlaybackControls } from '../playback/PlaybackControls';
import { Timeline } from './Timeline';
import { MAX_PX_PER_SEC, TIMELINE_END_PADDING_PX } from './timelineScale';

/**
 * The playback controls and the timeline under them, which share the timeline's zoom.
 */
export function TimelinePanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useElementSize(containerRef);
  const durationSec = useAppSelector(selectMediaDuration);
  const zoom = useAppSelector((state) => state.ui.timelineZoom);

  const fitPxPerSec =
    durationSec > 0 && width > 0 ? Math.max(0.001, (width - TIMELINE_END_PADDING_PX) / durationSec) : 0;
  const maxPxPerSec = Math.max(fitPxPerSec, MAX_PX_PER_SEC);
  const pxPerSec = zoom === null ? fitPxPerSec : clamp({ value: zoom, min: fitPxPerSec, max: maxPxPerSec });

  return (
    <div ref={containerRef} className='shrink-0 border-t border-zinc-800 bg-zinc-950'>
      <PlaybackControls zoom={{ pxPerSec, fitPxPerSec, maxPxPerSec }} />
      <Timeline
        pxPerSec={pxPerSec}
        fitPxPerSec={fitPxPerSec}
        maxPxPerSec={maxPxPerSec}
        viewportWidth={width}
        durationSec={durationSec}
      />
    </div>
  );
}

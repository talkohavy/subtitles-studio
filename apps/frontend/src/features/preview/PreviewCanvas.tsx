import { useEffect, useRef, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { player } from '@src/lib/player/playerController';
import { computeOutputSize, fitRect } from '@src/lib/renderer/geometry';
import { useElementSize } from '../../hooks/useElementSize';
import { useMediaState } from '../../hooks/useMediaState';
import { usePixelRatio } from '../../hooks/usePixelRatio';
import { useAppSelector } from '../../store';
import {
  selectCanvasSettings,
  selectCues,
  selectIsEditable,
  selectLanguage,
  selectStyle,
  selectVideoInfo,
} from '../../store/selectors';
import { useCaptionDrag } from './useCaptionDrag';
import { usePreviewRenderer } from './usePreviewRenderer';

const FALLBACK_SOURCE_SIZE = { width: 1920, height: 1080 };

export function PreviewCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPlaybackError, setHasPlaybackError] = useState(false);

  const { objectUrl } = useMediaState();
  const cues = useAppSelector(selectCues);
  const style = useAppSelector(selectStyle);
  const canvasSettings = useAppSelector(selectCanvasSettings);
  const language = useAppSelector(selectLanguage);
  const videoInfo = useAppSelector(selectVideoInfo);
  const isEditable = useAppSelector(selectIsEditable);
  const containerSize = useElementSize(containerRef);
  const pixelRatio = usePixelRatio();

  const sourceWidth = videoInfo?.width ?? FALLBACK_SOURCE_SIZE.width;
  const sourceHeight = videoInfo?.height ?? FALLBACK_SOURCE_SIZE.height;
  const outputSize = computeOutputSize({ sourceWidth, sourceHeight, aspectRatio: canvasSettings.aspectRatio });
  const displayRect = fitRect({
    sourceWidth: outputSize.width,
    sourceHeight: outputSize.height,
    frameWidth: containerSize.width,
    frameHeight: containerSize.height,
    fit: 'contain',
  });
  const canvasWidth = Math.max(1, Math.round(displayRect.width * pixelRatio));
  const canvasHeight = Math.max(1, Math.round(displayRect.height * pixelRatio));

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    player.attach(video);

    return () => player.detach();
  }, [objectUrl]);

  const captionBoundsRef = usePreviewRenderer({
    canvasRef,
    frameState: { cues, style, canvasSettings, language, sourceWidth, sourceHeight },
  });

  const pointerHandlers = useCaptionDrag({
    canvasRef,
    captionBoundsRef,
    cues,
    positionY: style.positionY,
    isEditable,
  });

  const displayStyle = {
    left: displayRect.x,
    top: displayRect.y,
    width: displayRect.width,
    height: displayRect.height,
  };

  return (
    <div ref={containerRef} className='relative size-full'>
      {/* Kept on screen (but invisible), so the browser keeps decoding its frames for the canvas. */}
      <video
        ref={videoRef}
        src={objectUrl ?? undefined}
        preload='auto'
        playsInline
        onError={() => setHasPlaybackError(true)}
        onLoadedData={() => setHasPlaybackError(false)}
        className='pointer-events-none absolute opacity-0'
        style={displayStyle}
      />
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        aria-label='Video preview with subtitles'
        className='absolute touch-none rounded-lg bg-black shadow-2xl ring-1 ring-white/5'
        style={displayStyle}
        {...pointerHandlers}
      />
      {hasPlaybackError && (
        <div className='absolute inset-x-0 top-4 mx-auto flex w-fit max-w-[90%] items-center gap-2 rounded-lg border border-amber-500/30 bg-zinc-900/95 px-3 py-2 text-xs text-amber-200'>
          <TriangleAlert className='size-4 shrink-0' />
          Your browser can’t play this video format, so the preview is blank. The subtitles still work.
        </div>
      )}
    </div>
  );
}

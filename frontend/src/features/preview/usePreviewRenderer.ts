import { useEffect, useEffectEvent, useLayoutEffect, useRef, type RefObject } from 'react';
import { loadFont } from '@src/lib/fonts/loadFont';
import { player } from '@src/lib/player/playerController';
import { renderFrame, type DrawSource } from '@src/lib/renderer/renderFrame';
import type { CanvasSettings, Rect, SubtitleStyle } from '@src/lib/renderer/types';
import type { Cue } from '@src/lib/subtitles/types';

export type PreviewFrameState = {
  cues: ReadonlyArray<Cue>;
  style: SubtitleStyle;
  canvasSettings: CanvasSettings;
  language: string | null;
  sourceWidth: number;
  sourceHeight: number;
};

/**
 * Enough of the transcript to make the browser download every character subset the captions need.
 */
const FONT_SAMPLE_LENGTH = 4000;

type UsePreviewRendererProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  frameState: PreviewFrameState;
};

/**
 * Draws the preview whenever the video shows a new frame or anything about the captions changes.
 * Returns the area of the caption being shown, in canvas pixels.
 */
export function usePreviewRenderer(props: UsePreviewRendererProps): RefObject<Rect | null> {
  const { canvasRef, frameState } = props;

  const captionBoundsRef = useRef<Rect | null>(null);

  const redraw = useEffectEvent(() => {
    captionBoundsRef.current = drawPreviewFrame({ canvas: canvasRef.current, frameState });
  });

  // Resizing a canvas clears it, and every change to the captions should show at once.
  useLayoutEffect(() => {
    redraw();
  });

  useEffect(() => {
    const unsubscribeFromFrames = player.subscribeToFrames(() => redraw());

    function handleFontsLoaded() {
      redraw();
    }

    document.fonts.addEventListener('loadingdone', handleFontsLoaded);

    return () => {
      unsubscribeFromFrames();
      document.fonts.removeEventListener('loadingdone', handleFontsLoaded);
    };
  }, []);

  const { fontId, fontWeight } = frameState.style;
  const fontSample = frameState.cues
    .map((cue) => cue.text)
    .join(' ')
    .slice(0, FONT_SAMPLE_LENGTH);

  useEffect(() => {
    let isCurrent = true;

    async function loadCaptionFont() {
      await loadFont({ fontId, weight: fontWeight, text: fontSample });

      if (isCurrent) redraw();
    }

    void loadCaptionFont();

    return () => {
      isCurrent = false;
    };
  }, [fontId, fontWeight, fontSample]);

  return captionBoundsRef;
}

function drawPreviewFrame(props: { canvas: HTMLCanvasElement | null; frameState: PreviewFrameState }): Rect | null {
  const { canvas, frameState } = props;

  const ctx = canvas?.getContext('2d');

  if (!canvas || !ctx) return null;

  const video = player.getVideo();
  const drawSource: DrawSource | null =
    video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      ? (rect) => ctx.drawImage(video, rect.x, rect.y, rect.width, rect.height)
      : null;

  const captionBounds = renderFrame({
    ctx,
    frameWidth: canvas.width,
    frameHeight: canvas.height,
    drawSource,
    sourceWidth: frameState.sourceWidth,
    sourceHeight: frameState.sourceHeight,
    time: player.getCurrentTime(),
    cues: frameState.cues,
    style: frameState.style,
    canvasSettings: frameState.canvasSettings,
    language: frameState.language,
  });

  return captionBounds;
}

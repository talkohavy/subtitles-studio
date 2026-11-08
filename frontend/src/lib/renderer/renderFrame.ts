import { getCanvasFont } from '@src/lib/fonts/fontCatalog';
import { findCueIndexAtTime } from '@src/lib/subtitles/cueOperations';
import { drawCaption } from './drawCaption';
import { fitRect, getStyleScale } from './geometry';
import { layoutCaption } from './layoutCaption';
import { CanvasFills, type Canvas2D, type CanvasSettings, type Rect, type SubtitleStyle } from './types';
import type { Cue } from '@src/lib/subtitles/types';

/**
 * Draws the video frame into a rectangle of the canvas.
 */
export type DrawSource = (rect: Rect) => void;

type RenderFrameProps = {
  ctx: Canvas2D;
  frameWidth: number;
  frameHeight: number;
  /**
   * `null` draws a black frame, e.g. before the video loads.
   */
  drawSource: DrawSource | null;
  sourceWidth: number;
  sourceHeight: number;
  time: number;
  cues: ReadonlyArray<Cue>;
  style: SubtitleStyle;
  canvasSettings: CanvasSettings;
  language: string | null;
};

/**
 * Draws one frame with its caption. Shared by the preview and the export, so they always match.
 * Returns the caption's area in the frame, or `null` when no caption is showing.
 */
export function renderFrame(props: RenderFrameProps): Rect | null {
  const { ctx, frameWidth, frameHeight, drawSource, sourceWidth, sourceHeight } = props;
  const { time, cues, style, canvasSettings, language } = props;

  ctx.save();
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, frameWidth, frameHeight);

  const videoRect = fitRect({ sourceWidth, sourceHeight, frameWidth, frameHeight, fit: 'contain' });
  const isLetterboxed = videoRect.width < frameWidth - 1 || videoRect.height < frameHeight - 1;

  if (isLetterboxed)
    drawLetterbox({ ctx, frameWidth, frameHeight, drawSource, sourceWidth, sourceHeight, canvasSettings });

  drawSource?.(videoRect);
  ctx.restore();

  const cueIndex = findCueIndexAtTime({ cues, time });
  const cue = cues[cueIndex];

  if (!cue) return null;

  const scale = getStyleScale({ frameWidth, frameHeight });

  ctx.save();
  ctx.font = getCanvasFont({ fontId: style.fontId, weight: style.fontWeight, sizePx: style.fontSize * scale });
  ctx.letterSpacing = `${(style.letterSpacing * scale).toFixed(2)}px`;

  const layout = layoutCaption({
    words: cue.words,
    style,
    frameWidth,
    frameHeight,
    measure: (text) => ctx.measureText(text).width,
    language,
  });

  drawCaption({ ctx, layout, style, time, cueStart: cue.start });
  ctx.restore();

  return layout.lines.length > 0 ? layout.bounds : null;
}

type DrawLetterboxProps = {
  ctx: Canvas2D;
  frameWidth: number;
  frameHeight: number;
  drawSource: DrawSource | null;
  sourceWidth: number;
  sourceHeight: number;
  canvasSettings: CanvasSettings;
};

function drawLetterbox(props: DrawLetterboxProps) {
  const { ctx, frameWidth, frameHeight, drawSource, sourceWidth, sourceHeight, canvasSettings } = props;

  if (canvasSettings.fill === CanvasFills.Color || !drawSource) {
    ctx.fillStyle = canvasSettings.fillColor;
    ctx.fillRect(0, 0, frameWidth, frameHeight);
    return;
  }

  const blurRadius = Math.round(Math.min(frameWidth, frameHeight) * 0.04);
  const coverRect = fitRect({ sourceWidth, sourceHeight, frameWidth, frameHeight, fit: 'cover' });
  // Overscan by the blur radius, so the blurred edges don't fade to black.
  const overscanRect = {
    x: coverRect.x - blurRadius * 2,
    y: coverRect.y - blurRadius * 2,
    width: coverRect.width + blurRadius * 4,
    height: coverRect.height + blurRadius * 4,
  };

  ctx.save();
  ctx.filter = `blur(${blurRadius}px) brightness(0.65)`;
  drawSource(overscanRect);
  ctx.restore();
}

import { AspectRatios, type AspectRatioValues, type Rect } from './types';

type FitRectProps = {
  sourceWidth: number;
  sourceHeight: number;
  frameWidth: number;
  frameHeight: number;
  fit: 'contain' | 'cover';
};

/**
 * Where to draw a source so it's contained in (or covers) the frame, centered.
 */
export function fitRect(props: FitRectProps): Rect {
  const { sourceWidth, sourceHeight, frameWidth, frameHeight, fit } = props;

  if (sourceWidth <= 0 || sourceHeight <= 0) return { x: 0, y: 0, width: frameWidth, height: frameHeight };

  const widthRatio = frameWidth / sourceWidth;
  const heightRatio = frameHeight / sourceHeight;
  const scale = fit === 'contain' ? Math.min(widthRatio, heightRatio) : Math.max(widthRatio, heightRatio);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;

  return { x: (frameWidth - width) / 2, y: (frameHeight - height) / 2, width, height };
}

const ASPECT_RATIO_VALUES: Record<Exclude<AspectRatioValues, 'original'>, number> = {
  '9:16': 9 / 16,
  '1:1': 1,
  '4:5': 4 / 5,
  '16:9': 16 / 9,
};

/**
 * Reframed videos keep the source's pixel count, up to Full HD.
 */
const MAX_REFRAMED_PIXELS = 1920 * 1080;

type ComputeOutputSizeProps = {
  sourceWidth: number;
  sourceHeight: number;
  aspectRatio: AspectRatioValues;
};

/**
 * The exported frame size. Dimensions are even, as video encoders require.
 */
export function computeOutputSize(props: ComputeOutputSizeProps): { width: number; height: number } {
  const { sourceWidth, sourceHeight, aspectRatio } = props;

  if (aspectRatio === AspectRatios.Original) {
    return { width: toEven(sourceWidth), height: toEven(sourceHeight) };
  }

  const ratio = ASPECT_RATIO_VALUES[aspectRatio];
  const pixels = Math.min(sourceWidth * sourceHeight, MAX_REFRAMED_PIXELS);
  const width = Math.sqrt(pixels * ratio);
  const height = width / ratio;

  return { width: toEven(width), height: toEven(height) };
}

/**
 * The scale applied to style lengths, which are defined for a frame whose shorter side is 1080px.
 */
export function getStyleScale(props: { frameWidth: number; frameHeight: number }): number {
  const { frameWidth, frameHeight } = props;

  return Math.min(frameWidth, frameHeight) / 1080;
}

function toEven(value: number): number {
  return Math.max(2, Math.round(value / 2) * 2);
}

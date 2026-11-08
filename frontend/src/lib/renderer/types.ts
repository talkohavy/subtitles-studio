import type { FontIdValues } from '@src/lib/fonts/fontCatalog';

export const TextTransforms = {
  None: 'none',
  Uppercase: 'uppercase',
  Lowercase: 'lowercase',
} as const;

export type TextTransformValues = (typeof TextTransforms)[keyof typeof TextTransforms];

export const BackgroundModes = {
  None: 'none',
  Line: 'line',
  Block: 'block',
} as const;

export type BackgroundModeValues = (typeof BackgroundModes)[keyof typeof BackgroundModes];

export const HighlightModes = {
  None: 'none',
  Color: 'color',
  Box: 'box',
  Reveal: 'reveal',
} as const;

export type HighlightModeValues = (typeof HighlightModes)[keyof typeof HighlightModes];

export const EntranceAnimations = {
  None: 'none',
  Fade: 'fade',
  Pop: 'pop',
  SlideUp: 'slide-up',
} as const;

export type EntranceAnimationValues = (typeof EntranceAnimations)[keyof typeof EntranceAnimations];

export const TextAligns = {
  Left: 'left',
  Center: 'center',
  Right: 'right',
} as const;

export type TextAlignValues = (typeof TextAligns)[keyof typeof TextAligns];

export const AspectRatios = {
  Original: 'original',
  Portrait: '9:16',
  Square: '1:1',
  Vertical: '4:5',
  Landscape: '16:9',
} as const;

export type AspectRatioValues = (typeof AspectRatios)[keyof typeof AspectRatios];

export const CanvasFills = {
  Blur: 'blur',
  Color: 'color',
} as const;

export type CanvasFillValues = (typeof CanvasFills)[keyof typeof CanvasFills];

/**
 * Lengths are in pixels of a frame whose shorter side is 1080px, and scale with the actual frame,
 * so captions look the same in the preview and in the export.
 */
export type SubtitleStyle = {
  fontId: FontIdValues;
  fontSize: number;
  fontWeight: number;
  textTransform: TextTransformValues;
  letterSpacing: number;
  /**
   * A multiple of the font size.
   */
  lineHeight: number;
  textColor: string;
  outlineColor: string;
  /**
   * 0 means no outline.
   */
  outlineWidth: number;
  shadowColor: string;
  /**
   * 0 means no shadow.
   */
  shadowBlur: number;
  shadowOffsetY: number;
  backgroundMode: BackgroundModeValues;
  backgroundColor: string;
  /**
   * From 0 to 1.
   */
  backgroundOpacity: number;
  backgroundPadding: number;
  backgroundRadius: number;
  highlightMode: HighlightModeValues;
  /**
   * The spoken word's text color in `color` mode, and its box color in `box` mode.
   */
  highlightColor: string;
  /**
   * The spoken word's text color in `box` mode.
   */
  highlightTextColor: string;
  /**
   * How much the spoken word grows, e.g. 1.15.
   */
  activeWordScale: number;
  animation: EntranceAnimationValues;
  /**
   * Where the middle of the caption sits, as a percentage of the frame height.
   */
  positionY: number;
  align: TextAlignValues;
  /**
   * The widest a caption line can be, as a percentage of the frame width.
   */
  maxWidth: number;
};

export type CanvasSettings = {
  aspectRatio: AspectRatioValues;
  /**
   * What fills the frame around the video when the aspect ratios differ.
   */
  fill: CanvasFillValues;
  fillColor: string;
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Canvas2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

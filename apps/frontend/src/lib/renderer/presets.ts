import { FontIds } from '@src/lib/fonts/fontCatalog';
import {
  AspectRatios,
  BackgroundModes,
  CanvasFills,
  EntranceAnimations,
  HighlightModes,
  TextAligns,
  TextTransforms,
  type CanvasSettings,
  type SubtitleStyle,
} from './types';

/**
 * Presets restyle the text; where the caption sits is left as it is.
 */
export type StylePresetStyle = Omit<SubtitleStyle, 'positionY' | 'align' | 'maxWidth'>;

export type StylePreset = {
  id: string;
  name: string;
  style: StylePresetStyle;
};

const BASE_PRESET_STYLE: StylePresetStyle = {
  fontId: FontIds.Inter,
  fontSize: 58,
  fontWeight: 700,
  textTransform: TextTransforms.None,
  letterSpacing: 0,
  lineHeight: 1.25,
  textColor: '#ffffff',
  outlineColor: '#000000',
  outlineWidth: 0,
  shadowColor: '#000000',
  shadowBlur: 0,
  shadowOffsetY: 0,
  backgroundMode: BackgroundModes.Line,
  backgroundColor: '#000000',
  backgroundOpacity: 0.85,
  backgroundPadding: 22,
  backgroundRadius: 10,
  highlightMode: HighlightModes.None,
  highlightColor: '#facc15',
  highlightTextColor: '#000000',
  activeWordScale: 1,
  animation: EntranceAnimations.None,
};

export const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  ...BASE_PRESET_STYLE,
  positionY: 82,
  align: TextAligns.Center,
  maxWidth: 80,
};

export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
  aspectRatio: AspectRatios.Original,
  fill: CanvasFills.Blur,
  fillColor: '#000000',
};

const NO_BACKGROUND = { backgroundMode: BackgroundModes.None } as const;

export const STYLE_PRESETS: ReadonlyArray<StylePreset> = [
  { id: 'boxed', name: 'Boxed', style: BASE_PRESET_STYLE },
  {
    id: 'classic',
    name: 'Classic',
    style: { ...BASE_PRESET_STYLE, ...NO_BACKGROUND, outlineWidth: 4, shadowBlur: 8, shadowOffsetY: 3 },
  },
  {
    id: 'karaoke',
    name: 'Karaoke',
    style: {
      ...BASE_PRESET_STYLE,
      ...NO_BACKGROUND,
      fontId: FontIds.Montserrat,
      fontWeight: 800,
      fontSize: 62,
      textTransform: TextTransforms.Uppercase,
      outlineWidth: 5,
      highlightMode: HighlightModes.Color,
      highlightColor: '#facc15',
      activeWordScale: 1.08,
      animation: EntranceAnimations.Pop,
    },
  },
  {
    id: 'highlight-box',
    name: 'Highlight',
    style: {
      ...BASE_PRESET_STYLE,
      ...NO_BACKGROUND,
      fontId: FontIds.Montserrat,
      fontWeight: 900,
      fontSize: 64,
      textTransform: TextTransforms.Uppercase,
      outlineWidth: 5,
      shadowBlur: 10,
      shadowOffsetY: 4,
      highlightMode: HighlightModes.Box,
      highlightColor: '#7c3aed',
      highlightTextColor: '#ffffff',
      activeWordScale: 1.1,
      animation: EntranceAnimations.Pop,
    },
  },
  {
    id: 'bold-yellow',
    name: 'Bold Yellow',
    style: {
      ...BASE_PRESET_STYLE,
      ...NO_BACKGROUND,
      fontId: FontIds.Anton,
      fontWeight: 400,
      fontSize: 72,
      textTransform: TextTransforms.Uppercase,
      letterSpacing: 1,
      lineHeight: 1.15,
      textColor: '#ffe14d',
      outlineWidth: 6,
      animation: EntranceAnimations.SlideUp,
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    style: {
      ...BASE_PRESET_STYLE,
      ...NO_BACKGROUND,
      fontWeight: 500,
      fontSize: 50,
      shadowColor: '#000000',
      shadowBlur: 14,
      shadowOffsetY: 2,
      animation: EntranceAnimations.Fade,
    },
  },
  {
    id: 'neon',
    name: 'Neon',
    style: {
      ...BASE_PRESET_STYLE,
      ...NO_BACKGROUND,
      fontId: FontIds.BebasNeue,
      fontWeight: 400,
      fontSize: 78,
      letterSpacing: 2,
      lineHeight: 1.1,
      textColor: '#a5f3fc',
      outlineColor: '#0e7490',
      outlineWidth: 2,
      shadowColor: '#22d3ee',
      shadowBlur: 26,
      highlightMode: HighlightModes.Color,
      highlightColor: '#f0abfc',
      animation: EntranceAnimations.Fade,
    },
  },
  {
    id: 'comic',
    name: 'Comic',
    style: {
      ...BASE_PRESET_STYLE,
      ...NO_BACKGROUND,
      fontId: FontIds.Bangers,
      fontWeight: 400,
      fontSize: 76,
      letterSpacing: 2,
      lineHeight: 1.1,
      outlineWidth: 6,
      shadowColor: '#000000',
      shadowOffsetY: 6,
      highlightMode: HighlightModes.Color,
      highlightColor: '#fde047',
      activeWordScale: 1.15,
      animation: EntranceAnimations.Pop,
    },
  },
  {
    id: 'typewriter',
    name: 'Word by word',
    style: {
      ...BASE_PRESET_STYLE,
      ...NO_BACKGROUND,
      fontId: FontIds.Poppins,
      fontWeight: 800,
      fontSize: 62,
      outlineWidth: 4,
      highlightMode: HighlightModes.Reveal,
      activeWordScale: 1.12,
    },
  },
  {
    id: 'marker',
    name: 'Marker',
    style: {
      ...BASE_PRESET_STYLE,
      fontId: FontIds.PermanentMarker,
      fontWeight: 400,
      fontSize: 56,
      textColor: '#111111',
      backgroundMode: BackgroundModes.Block,
      backgroundColor: '#fde047',
      backgroundOpacity: 1,
      backgroundPadding: 26,
      backgroundRadius: 4,
      animation: EntranceAnimations.Pop,
    },
  },
  {
    id: 'elegant',
    name: 'Elegant',
    style: {
      ...BASE_PRESET_STYLE,
      ...NO_BACKGROUND,
      fontId: FontIds.PlayfairDisplay,
      fontWeight: 600,
      fontSize: 56,
      textColor: '#fef3c7',
      shadowColor: '#000000',
      shadowBlur: 16,
      shadowOffsetY: 2,
      animation: EntranceAnimations.Fade,
    },
  },
  {
    id: 'soft-box',
    name: 'Soft Box',
    style: {
      ...BASE_PRESET_STYLE,
      fontId: FontIds.Rubik,
      fontWeight: 600,
      fontSize: 54,
      backgroundMode: BackgroundModes.Block,
      backgroundColor: '#18181b',
      backgroundOpacity: 0.6,
      backgroundPadding: 30,
      backgroundRadius: 24,
      highlightMode: HighlightModes.Color,
      highlightColor: '#c4b5fd',
      animation: EntranceAnimations.SlideUp,
    },
  },
];

/**
 * Whether the style looks exactly like the preset (ignoring position).
 */
export function matchesPreset(props: { style: SubtitleStyle; preset: StylePreset }): boolean {
  const { style, preset } = props;

  const presetEntries = Object.entries(preset.style) as Array<[keyof StylePresetStyle, unknown]>;

  return presetEntries.every(([key, value]) => style[key] === value);
}

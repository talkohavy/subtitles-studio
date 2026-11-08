import { useEffect, useRef } from 'react';
import { cn } from '@src/common/utils/cn';
import { loadFont } from '@src/lib/fonts/loadFont';
import { DEFAULT_CANVAS_SETTINGS, matchesPreset, STYLE_PRESETS, type StylePreset } from '@src/lib/renderer/presets';
import { renderFrame } from '@src/lib/renderer/renderFrame';
import { TextAligns, type SubtitleStyle } from '@src/lib/renderer/types';
import { useAppDispatch } from '../../store';
import { presetApplied } from '../../store/slices/project.slice';
import { PanelLayout } from '../side-panel/PanelLayout';
import { useStyleEditor } from './useStyleEditor';
import type { Cue } from '@src/lib/subtitles/types';

const THUMBNAIL_WIDTH = 320;
const THUMBNAIL_HEIGHT = 180;
/**
 * At their real size, captions would be unreadable in a thumbnail.
 */
const THUMBNAIL_SCALE = 1.9;
const SAMPLE_TEXT = 'Your subtitles here';
const SAMPLE_CUES: ReadonlyArray<Cue> = [
  {
    id: 'sample',
    start: 0,
    end: 1.4,
    text: SAMPLE_TEXT,
    words: [
      { text: 'Your', start: 0, end: 0.4 },
      { text: ' subtitles', start: 0.4, end: 0.9 },
      { text: ' here', start: 0.9, end: 1.4 },
    ],
  },
];
/**
 * When the second word is being spoken, and any entrance animation is over.
 */
const SAMPLE_TIME = 0.7;

export function StylesPanel() {
  const dispatch = useAppDispatch();
  const { style, isEditable } = useStyleEditor();

  return (
    <PanelLayout title='Styles'>
      <div className='grid grid-cols-2 gap-3 p-4'>
        {STYLE_PRESETS.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            isSelected={matchesPreset({ style, preset })}
            disabled={!isEditable}
            onSelect={() => dispatch(presetApplied({ presetId: preset.id }))}
          />
        ))}
      </div>
      <p className='px-4 pb-5 text-xs leading-relaxed text-zinc-500'>
        A style sets the font, colors, background and animation. Fine-tune them in the other tabs.
      </p>
    </PanelLayout>
  );
}

type PresetCardProps = {
  preset: StylePreset;
  isSelected: boolean;
  disabled: boolean;
  onSelect: () => void;
};

function PresetCard(props: PresetCardProps) {
  const { preset, isSelected, disabled, onSelect } = props;

  return (
    <button
      type='button'
      aria-pressed={isSelected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'group overflow-hidden rounded-xl border text-left transition-colors outline-none',
        'focus-visible:ring-2 focus-visible:ring-violet-500/60 disabled:cursor-not-allowed disabled:opacity-60',
        isSelected ? 'border-violet-500 ring-1 ring-violet-500' : 'border-zinc-800 hover:border-zinc-600',
      )}
    >
      <PresetThumbnail preset={preset} />
      <span className={cn('block px-2.5 py-2 text-xs font-medium', isSelected ? 'text-violet-200' : 'text-zinc-300')}>
        {preset.name}
      </span>
    </button>
  );
}

function PresetThumbnail(props: { preset: StylePreset }) {
  const { preset } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let isCurrent = true;

    async function draw() {
      const ctx = canvasRef.current?.getContext('2d');

      if (!ctx) return;

      drawThumbnail({ ctx, preset, cues: [] });
      await loadFont({ fontId: preset.style.fontId, weight: preset.style.fontWeight, text: SAMPLE_TEXT });

      if (isCurrent) drawThumbnail({ ctx, preset, cues: SAMPLE_CUES });
    }

    void draw();

    return () => {
      isCurrent = false;
    };
  }, [preset]);

  return (
    <canvas ref={canvasRef} width={THUMBNAIL_WIDTH} height={THUMBNAIL_HEIGHT} className='block aspect-video w-full' />
  );
}

type DrawThumbnailProps = {
  ctx: CanvasRenderingContext2D;
  preset: StylePreset;
  cues: ReadonlyArray<Cue>;
};

function drawThumbnail(props: DrawThumbnailProps) {
  const { ctx, preset, cues } = props;

  renderFrame({
    ctx,
    frameWidth: THUMBNAIL_WIDTH,
    frameHeight: THUMBNAIL_HEIGHT,
    drawSource: (rect) => {
      const gradient = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.width, rect.y + rect.height);
      gradient.addColorStop(0, '#4c3a7a');
      gradient.addColorStop(1, '#1d3f5e');
      ctx.fillStyle = gradient;
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    },
    sourceWidth: THUMBNAIL_WIDTH,
    sourceHeight: THUMBNAIL_HEIGHT,
    time: SAMPLE_TIME,
    cues,
    style: getThumbnailStyle(preset),
    canvasSettings: DEFAULT_CANVAS_SETTINGS,
    language: 'en',
  });
}

function getThumbnailStyle(preset: StylePreset): SubtitleStyle {
  const { style } = preset;

  return {
    ...style,
    fontSize: style.fontSize * THUMBNAIL_SCALE,
    letterSpacing: style.letterSpacing * THUMBNAIL_SCALE,
    outlineWidth: style.outlineWidth * THUMBNAIL_SCALE,
    shadowBlur: style.shadowBlur * THUMBNAIL_SCALE,
    shadowOffsetY: style.shadowOffsetY * THUMBNAIL_SCALE,
    backgroundPadding: style.backgroundPadding * THUMBNAIL_SCALE,
    backgroundRadius: style.backgroundRadius * THUMBNAIL_SCALE,
    positionY: 50,
    align: TextAligns.Center,
    maxWidth: 92,
  };
}

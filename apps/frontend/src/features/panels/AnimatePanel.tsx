import { ArrowUpFromLine, Ban, Blend, ZoomIn } from 'lucide-react';
import {
  EntranceAnimations,
  HighlightModes,
  type EntranceAnimationValues,
  type HighlightModeValues,
} from '@src/lib/renderer/types';
import { ChoiceGrid, type Choice } from '../../components/ui/ChoiceGrid';
import { ColorField } from '../../components/ui/ColorField';
import { PanelSection } from '../../components/ui/PanelSection';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { SliderField } from '../../components/ui/SliderField';
import { PanelBody, PanelLayout } from '../side-panel/PanelLayout';
import { useStyleEditor } from './useStyleEditor';

const ENTRANCE_CHOICES: ReadonlyArray<Choice<EntranceAnimationValues>> = [
  { value: EntranceAnimations.None, label: 'None', icon: <Ban className='size-5' /> },
  { value: EntranceAnimations.Fade, label: 'Fade', icon: <Blend className='size-5' /> },
  { value: EntranceAnimations.Pop, label: 'Pop', icon: <ZoomIn className='size-5' /> },
  { value: EntranceAnimations.SlideUp, label: 'Slide up', icon: <ArrowUpFromLine className='size-5' /> },
];

const HIGHLIGHT_OPTIONS: ReadonlyArray<{ value: HighlightModeValues; label: string }> = [
  { value: HighlightModes.None, label: 'None' },
  { value: HighlightModes.Color, label: 'Color' },
  { value: HighlightModes.Box, label: 'Box' },
  { value: HighlightModes.Reveal, label: 'Reveal' },
];

const HIGHLIGHT_DESCRIPTIONS: Record<HighlightModeValues, string> = {
  none: 'Every word looks the same.',
  color: 'The word being spoken changes color, karaoke style.',
  box: 'The word being spoken gets a colored box behind it.',
  reveal: 'Words appear one by one as they’re spoken.',
};

export function AnimatePanel() {
  const { style, setStyle, isEditable } = useStyleEditor();

  const hasHighlightColor = style.highlightMode === HighlightModes.Color || style.highlightMode === HighlightModes.Box;
  const growPercent = Math.round((style.activeWordScale - 1) * 100);

  return (
    <PanelLayout title='Animate'>
      <PanelBody>
        <PanelSection title='Entrance'>
          <ChoiceGrid
            label='Entrance animation'
            value={style.animation}
            choices={ENTRANCE_CHOICES}
            onChange={(animation) => setStyle({ animation })}
            disabled={!isEditable}
          />
        </PanelSection>
        <PanelSection title='Spoken word'>
          <SegmentedControl
            ariaLabel='Spoken word highlight'
            value={style.highlightMode}
            options={HIGHLIGHT_OPTIONS}
            onChange={(highlightMode) => setStyle({ highlightMode })}
            disabled={!isEditable}
          />
          <p className='text-xs text-zinc-500'>{HIGHLIGHT_DESCRIPTIONS[style.highlightMode]}</p>
          {hasHighlightColor && (
            <ColorField
              label={style.highlightMode === HighlightModes.Box ? 'Box color' : 'Highlight color'}
              value={style.highlightColor}
              onChange={(highlightColor) => setStyle({ highlightColor })}
              disabled={!isEditable}
            />
          )}
          {style.highlightMode === HighlightModes.Box && (
            <ColorField
              label='Text color in the box'
              value={style.highlightTextColor}
              onChange={(highlightTextColor) => setStyle({ highlightTextColor })}
              disabled={!isEditable}
            />
          )}
          <SliderField
            label='Grow the spoken word'
            value={growPercent}
            min={0}
            max={40}
            formatValue={(value) => (value === 0 ? 'Off' : `${value}%`)}
            onChange={(value) => setStyle({ activeWordScale: 1 + value / 100 })}
            disabled={!isEditable}
          />
        </PanelSection>
        <p className='rounded-lg bg-zinc-900 px-3 py-2.5 text-xs text-zinc-400'>
          Play the video to see the animations.
        </p>
      </PanelBody>
    </PanelLayout>
  );
}

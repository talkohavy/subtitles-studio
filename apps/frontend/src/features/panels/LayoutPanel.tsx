import type { ReactNode } from 'react';
import {
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignStart,
} from 'lucide-react';
import { TextAligns, type TextAlignValues } from '@src/lib/renderer/types';
import { ChoiceGrid, type Choice } from '../../components/ui/ChoiceGrid';
import { PanelSection } from '../../components/ui/PanelSection';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { SliderField } from '../../components/ui/SliderField';
import { PanelBody, PanelLayout } from '../side-panel/PanelLayout';
import { useStyleEditor } from './useStyleEditor';

const POSITIONS = {
  top: 14,
  middle: 50,
  bottom: 82,
} as const;

type PositionValues = keyof typeof POSITIONS | 'custom';

const POSITION_CHOICES: ReadonlyArray<Choice<PositionValues>> = [
  { value: 'top', label: 'Top', icon: <AlignVerticalJustifyStart className='size-5' /> },
  { value: 'middle', label: 'Middle', icon: <AlignVerticalJustifyCenter className='size-5' /> },
  { value: 'bottom', label: 'Bottom', icon: <AlignVerticalJustifyEnd className='size-5' /> },
];

const ALIGN_OPTIONS: ReadonlyArray<{ value: TextAlignValues; label: ReactNode; ariaLabel: string }> = [
  { value: TextAligns.Left, label: <TextAlignStart className='size-4' />, ariaLabel: 'Align left' },
  { value: TextAligns.Center, label: <TextAlignCenter className='size-4' />, ariaLabel: 'Center' },
  { value: TextAligns.Right, label: <TextAlignEnd className='size-4' />, ariaLabel: 'Align right' },
];

function getPositionValue(positionY: number): PositionValues {
  const entries = Object.entries(POSITIONS) as Array<[keyof typeof POSITIONS, number]>;
  const match = entries.find(([, value]) => Math.abs(value - positionY) < 0.5);

  return match?.[0] ?? 'custom';
}

export function LayoutPanel() {
  const { style, setStyle, isEditable } = useStyleEditor();

  function handlePositionChange(position: PositionValues) {
    if (position !== 'custom') setStyle({ positionY: POSITIONS[position] });
  }

  return (
    <PanelLayout title='Layout'>
      <PanelBody>
        <PanelSection title='Position'>
          <ChoiceGrid
            label='Position'
            value={getPositionValue(style.positionY)}
            choices={POSITION_CHOICES}
            onChange={handlePositionChange}
            columns={3}
            disabled={!isEditable}
          />
          <SliderField
            label='Height on screen'
            value={style.positionY}
            min={4}
            max={96}
            step={0.5}
            formatValue={(value) => `${Math.round(value)}%`}
            onChange={(positionY) => setStyle({ positionY })}
            disabled={!isEditable}
          />
          <p className='text-xs text-zinc-500'>Tip: you can also drag the subtitles up and down on the video.</p>
        </PanelSection>
        <PanelSection title='Lines'>
          <SegmentedControl
            label='Alignment'
            value={style.align}
            options={ALIGN_OPTIONS}
            onChange={(align) => setStyle({ align })}
            disabled={!isEditable}
          />
          <SliderField
            label='Maximum width'
            value={style.maxWidth}
            min={30}
            max={100}
            formatValue={(value) => `${value}%`}
            onChange={(maxWidth) => setStyle({ maxWidth })}
            disabled={!isEditable}
          />
        </PanelSection>
      </PanelBody>
    </PanelLayout>
  );
}

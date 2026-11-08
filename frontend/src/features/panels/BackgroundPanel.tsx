import { BackgroundModes, type BackgroundModeValues } from '@src/lib/renderer/types';
import { ColorField } from '../../components/ui/ColorField';
import { PanelSection } from '../../components/ui/PanelSection';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { SliderField } from '../../components/ui/SliderField';
import { PanelBody, PanelLayout } from '../side-panel/PanelLayout';
import { useStyleEditor } from './useStyleEditor';

const MODE_OPTIONS: ReadonlyArray<{ value: BackgroundModeValues; label: string }> = [
  { value: BackgroundModes.None, label: 'None' },
  { value: BackgroundModes.Line, label: 'Per line' },
  { value: BackgroundModes.Block, label: 'Block' },
];

const MODE_DESCRIPTIONS: Record<BackgroundModeValues, string> = {
  none: 'The text sits right on the video. An outline or shadow keeps it readable.',
  line: 'Each line gets its own box, hugging the text.',
  block: 'One box behind the whole caption.',
};

export function BackgroundPanel() {
  const { style, setStyle, isEditable } = useStyleEditor();

  const hasBackground = style.backgroundMode !== BackgroundModes.None;

  return (
    <PanelLayout title='Background'>
      <PanelBody>
        <PanelSection title='Box'>
          <SegmentedControl
            value={style.backgroundMode}
            options={MODE_OPTIONS}
            onChange={(backgroundMode) => setStyle({ backgroundMode })}
            disabled={!isEditable}
          />
          <p className='text-xs text-zinc-500'>{MODE_DESCRIPTIONS[style.backgroundMode]}</p>
        </PanelSection>
        {hasBackground && (
          <PanelSection title='Look'>
            <ColorField
              label='Color'
              value={style.backgroundColor}
              onChange={(backgroundColor) => setStyle({ backgroundColor })}
              disabled={!isEditable}
            />
            <SliderField
              label='Opacity'
              value={Math.round(style.backgroundOpacity * 100)}
              min={0}
              max={100}
              formatValue={(value) => `${value}%`}
              onChange={(value) => setStyle({ backgroundOpacity: value / 100 })}
              disabled={!isEditable}
            />
            <SliderField
              label='Padding'
              value={style.backgroundPadding}
              min={0}
              max={60}
              onChange={(backgroundPadding) => setStyle({ backgroundPadding })}
              disabled={!isEditable}
            />
            <SliderField
              label='Rounded corners'
              value={style.backgroundRadius}
              min={0}
              max={40}
              onChange={(backgroundRadius) => setStyle({ backgroundRadius })}
              disabled={!isEditable}
            />
          </PanelSection>
        )}
      </PanelBody>
    </PanelLayout>
  );
}

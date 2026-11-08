import { cn } from '@src/common/utils/cn';
import { FONT_CATALOG, getFontDefinition, getFontStack, resolveFontWeight } from '@src/lib/fonts/fontCatalog';
import { TextTransforms, type TextTransformValues } from '@src/lib/renderer/types';
import { ColorField } from '../../components/ui/ColorField';
import { PanelSection } from '../../components/ui/PanelSection';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { SelectField } from '../../components/ui/SelectField';
import { SliderField } from '../../components/ui/SliderField';
import { PanelBody, PanelLayout } from '../side-panel/PanelLayout';
import { useStyleEditor } from './useStyleEditor';

const WEIGHT_NAMES: Record<number, string> = {
  100: 'Thin',
  200: 'Extra light',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'Semibold',
  700: 'Bold',
  800: 'Extra bold',
  900: 'Black',
};

const TEXT_CASE_OPTIONS: ReadonlyArray<{ value: TextTransformValues; label: string; ariaLabel: string }> = [
  { value: TextTransforms.None, label: 'Aa', ariaLabel: 'As typed' },
  { value: TextTransforms.Uppercase, label: 'AA', ariaLabel: 'Uppercase' },
  { value: TextTransforms.Lowercase, label: 'aa', ariaLabel: 'Lowercase' },
];

export function FontPanel() {
  const { style, setStyle, isEditable } = useStyleEditor();

  const { weights } = getFontDefinition(style.fontId);
  const resolvedWeight = resolveFontWeight({ fontId: style.fontId, weight: style.fontWeight });
  const weightOptions = weights.map((weight) => ({
    value: String(weight),
    label: WEIGHT_NAMES[weight] ?? String(weight),
  }));

  return (
    <PanelLayout title='Font'>
      <PanelBody>
        <PanelSection title='Typeface'>
          <div className='grid grid-cols-2 gap-2'>
            {FONT_CATALOG.map((font) => {
              const isSelected = font.id === style.fontId;

              return (
                <button
                  key={font.id}
                  type='button'
                  aria-pressed={isSelected}
                  disabled={!isEditable}
                  onClick={() => setStyle({ fontId: font.id })}
                  className={cn(
                    'truncate rounded-lg border px-3 py-2.5 text-left text-[15px] transition-colors outline-none',
                    'focus-visible:ring-2 focus-visible:ring-violet-500/60 disabled:cursor-not-allowed disabled:opacity-50',
                    isSelected
                      ? 'border-violet-500/70 bg-violet-500/10 text-zinc-50'
                      : 'border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-700',
                  )}
                  style={{
                    fontFamily: getFontStack(font.id),
                    fontWeight: resolveFontWeight({ fontId: font.id, weight: 600 }),
                  }}
                >
                  {font.label}
                </button>
              );
            })}
          </div>
          <SelectField
            label='Weight'
            value={String(resolvedWeight)}
            options={weightOptions}
            onChange={(value) => setStyle({ fontWeight: Number(value) })}
            disabled={!isEditable || weights.length < 2}
          />
        </PanelSection>
        <PanelSection title='Text'>
          <SliderField
            label='Size'
            value={style.fontSize}
            min={24}
            max={140}
            onChange={(fontSize) => setStyle({ fontSize })}
            disabled={!isEditable}
          />
          <SegmentedControl
            label='Case'
            value={style.textTransform}
            options={TEXT_CASE_OPTIONS}
            onChange={(textTransform) => setStyle({ textTransform })}
            disabled={!isEditable}
          />
          <SliderField
            label='Letter spacing'
            value={style.letterSpacing}
            min={-4}
            max={20}
            step={0.5}
            onChange={(letterSpacing) => setStyle({ letterSpacing })}
            disabled={!isEditable}
          />
          <SliderField
            label='Line height'
            value={style.lineHeight}
            min={0.9}
            max={1.8}
            step={0.05}
            formatValue={(value) => value.toFixed(2)}
            onChange={(lineHeight) => setStyle({ lineHeight })}
            disabled={!isEditable}
          />
          <ColorField
            label='Color'
            value={style.textColor}
            onChange={(textColor) => setStyle({ textColor })}
            disabled={!isEditable}
          />
        </PanelSection>
        <PanelSection title='Outline'>
          <SliderField
            label='Thickness'
            value={style.outlineWidth}
            min={0}
            max={14}
            step={0.5}
            formatValue={(value) => (value === 0 ? 'Off' : String(value))}
            onChange={(outlineWidth) => setStyle({ outlineWidth })}
            disabled={!isEditable}
          />
          {style.outlineWidth > 0 && (
            <ColorField
              label='Outline color'
              value={style.outlineColor}
              onChange={(outlineColor) => setStyle({ outlineColor })}
              disabled={!isEditable}
            />
          )}
        </PanelSection>
        <PanelSection title='Shadow'>
          <SliderField
            label='Blur'
            value={style.shadowBlur}
            min={0}
            max={40}
            formatValue={(value) => (value === 0 ? 'Off' : String(value))}
            onChange={(shadowBlur) => setStyle({ shadowBlur })}
            disabled={!isEditable}
          />
          <SliderField
            label='Distance'
            value={style.shadowOffsetY}
            min={0}
            max={16}
            onChange={(shadowOffsetY) => setStyle({ shadowOffsetY })}
            disabled={!isEditable}
          />
          {(style.shadowBlur > 0 || style.shadowOffsetY > 0) && (
            <ColorField
              label='Shadow color'
              value={style.shadowColor}
              onChange={(shadowColor) => setStyle({ shadowColor })}
              disabled={!isEditable}
            />
          )}
        </PanelSection>
      </PanelBody>
    </PanelLayout>
  );
}

import { useId, useState } from 'react';
import { cn } from '@src/common/utils/cn';

type ColorFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

const SWATCHES = ['#ffffff', '#000000', '#facc15', '#ffe14d', '#22c55e', '#22d3ee', '#7c3aed', '#ec4899', '#ef4444'];
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function ColorField(props: ColorFieldProps) {
  const { label, value, onChange, disabled } = props;

  const inputId = useId();
  const [draftHex, setDraftHex] = useState<string | null>(null);

  function handleHexChange(text: string) {
    const hex = text.startsWith('#') ? text : `#${text}`;
    setDraftHex(hex);

    if (HEX_COLOR.test(hex)) onChange(hex.toLowerCase());
  }

  return (
    <div className={cn('space-y-2', disabled && 'pointer-events-none opacity-50')}>
      <label htmlFor={inputId} className='block text-xs text-zinc-400'>
        {label}
      </label>
      <div className='flex items-center gap-2'>
        <span
          className='relative size-8 shrink-0 overflow-hidden rounded-md border border-zinc-600'
          style={{ backgroundColor: value }}
        >
          <input
            type='color'
            aria-label={`${label} picker`}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            className='absolute inset-0 size-full cursor-pointer opacity-0'
          />
        </span>
        <input
          id={inputId}
          value={draftHex ?? value}
          onChange={(event) => handleHexChange(event.target.value)}
          onBlur={() => setDraftHex(null)}
          maxLength={7}
          spellCheck={false}
          disabled={disabled}
          className='h-8 w-20 rounded-md border border-zinc-700 bg-zinc-900 px-2 font-mono text-xs text-zinc-200 uppercase outline-none focus:border-violet-500'
        />
        <div className='flex flex-wrap gap-1'>
          {SWATCHES.map((swatch) => (
            <button
              key={swatch}
              type='button'
              aria-label={`Use ${swatch}`}
              onClick={() => onChange(swatch)}
              disabled={disabled}
              className={cn(
                'size-5 rounded-full border border-zinc-600 transition-transform hover:scale-110',
                swatch.toLowerCase() === value.toLowerCase() &&
                  'ring-2 ring-violet-500 ring-offset-1 ring-offset-zinc-900',
              )}
              style={{ backgroundColor: swatch }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

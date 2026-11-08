import { Slider } from 'radix-ui';
import { cn } from '@src/common/utils/cn';

type SliderFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  disabled?: boolean;
  className?: string;
};

export function SliderField(props: SliderFieldProps) {
  const { label, value, min, max, step = 1, onChange, formatValue = String, disabled, className } = props;

  function handleValueChange(values: Array<number>) {
    const [nextValue] = values;

    if (nextValue !== undefined) onChange(nextValue);
  }

  return (
    <div className={cn('space-y-2', disabled && 'opacity-50', className)}>
      <div className='flex items-center justify-between text-xs'>
        <span className='text-zinc-400'>{label}</span>
        <span className='text-zinc-300 tabular-nums'>{formatValue(value)}</span>
      </div>
      <SliderControl
        label={label}
        value={value}
        min={min}
        max={max}
        step={step}
        onValueChange={handleValueChange}
        disabled={disabled}
      />
    </div>
  );
}

type SliderControlProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (values: Array<number>) => void;
  disabled?: boolean;
  className?: string;
};

export function SliderControl(props: SliderControlProps) {
  const { label, value, min, max, step, onValueChange, disabled, className } = props;

  return (
    <Slider.Root
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={onValueChange}
      disabled={disabled}
      className={cn('relative flex h-4 w-full touch-none items-center select-none', className)}
    >
      <Slider.Track className='relative h-1 grow overflow-hidden rounded-full bg-zinc-700/70'>
        <Slider.Range className='absolute h-full rounded-full bg-violet-500' />
      </Slider.Track>
      <Slider.Thumb
        aria-label={label}
        className='block size-3.5 rounded-full bg-white shadow outline-none focus-visible:ring-4 focus-visible:ring-violet-500/40'
      />
    </Slider.Root>
  );
}

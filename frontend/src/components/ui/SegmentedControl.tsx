import type { ReactNode } from 'react';
import { ToggleGroup } from 'radix-ui';
import { cn } from '@src/common/utils/cn';

export type SegmentedOption<T extends string> = {
  value: T;
  label: ReactNode;
  /**
   * Accessible name, for options labeled with an icon.
   */
  ariaLabel?: string;
};

type SegmentedControlProps<T extends string> = {
  label?: string;
  value: T;
  options: ReadonlyArray<SegmentedOption<T>>;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
};

export function SegmentedControl<T extends string>(props: SegmentedControlProps<T>) {
  const { label, value, options, onChange, disabled, className } = props;

  function handleValueChange(nextValue: string) {
    // Clicking the selected option would otherwise deselect it.
    if (nextValue) onChange(nextValue as T);
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && <span className='block text-xs text-zinc-400'>{label}</span>}
      <ToggleGroup.Root
        type='single'
        value={value}
        onValueChange={handleValueChange}
        disabled={disabled}
        aria-label={label}
        className='flex w-full gap-1 rounded-lg bg-zinc-900 p-1 ring-1 ring-zinc-800'
      >
        {options.map((option) => (
          <ToggleGroup.Item
            key={option.value}
            value={option.value}
            aria-label={option.ariaLabel}
            className={cn(
              'flex h-7 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium text-zinc-400',
              'outline-none hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-violet-500/60',
              'data-[state=on]:bg-zinc-700 data-[state=on]:text-white data-[state=on]:shadow-sm',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {option.label}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
    </div>
  );
}

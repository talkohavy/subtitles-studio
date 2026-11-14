import type { ReactNode } from 'react';
import { RadioGroup } from 'radix-ui';
import { cn } from '@src/common/utils/cn';

export type Choice<T extends string> = {
  value: T;
  label: string;
  description?: string;
  icon?: ReactNode;
};

type ChoiceGridProps<T extends string> = {
  label: string;
  value: T;
  choices: ReadonlyArray<Choice<T>>;
  onChange: (value: T) => void;
  columns?: 2 | 3;
  disabled?: boolean;
};

const COLUMN_CLASSES = { 2: 'grid-cols-2', 3: 'grid-cols-3' } as const;

/**
 * A group of large options, one of which is selected. A single Tab stop; the arrow keys move between options.
 */
export function ChoiceGrid<T extends string>(props: ChoiceGridProps<T>) {
  const { label, value, choices, onChange, columns = 2, disabled } = props;

  return (
    <RadioGroup.Root
      value={value}
      onValueChange={(nextValue) => onChange(nextValue as T)}
      disabled={disabled}
      aria-label={label}
      className={cn('grid gap-2', COLUMN_CLASSES[columns])}
    >
      {choices.map((choice) => {
        const isSelected = choice.value === value;

        return (
          <RadioGroup.Item
            key={choice.value}
            value={choice.value}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-colors outline-none',
              'focus-visible:ring-2 focus-visible:ring-violet-500/60 disabled:cursor-not-allowed disabled:opacity-50',
              isSelected
                ? 'border-violet-500/70 bg-violet-500/10 text-zinc-50'
                : 'border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/50',
            )}
          >
            {choice.icon && <span className={cn(isSelected ? 'text-violet-300' : 'text-zinc-400')}>{choice.icon}</span>}
            <span className='text-xs font-medium'>{choice.label}</span>
            {choice.description && (
              <span className='text-[10px] leading-tight text-zinc-500'>{choice.description}</span>
            )}
          </RadioGroup.Item>
        );
      })}
    </RadioGroup.Root>
  );
}

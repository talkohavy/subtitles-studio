import type { ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Select } from 'radix-ui';
import { cn } from '@src/common/utils/cn';

export type SelectOption<T extends string> = {
  value: T;
  label: ReactNode;
  /**
   * Shown under the label in the list.
   */
  description?: ReactNode;
  disabled?: boolean;
};

type SelectFieldProps<T extends string> = {
  label?: string;
  value: T;
  options: ReadonlyArray<SelectOption<T>>;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
};

export function SelectField<T extends string>(props: SelectFieldProps<T>) {
  const { label, value, options, onChange, disabled, className, triggerClassName } = props;

  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && <span className='block text-xs text-zinc-400'>{label}</span>}
      <Select.Root value={value} onValueChange={(nextValue) => onChange(nextValue as T)} disabled={disabled}>
        <Select.Trigger
          aria-label={label}
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-left text-sm',
            'text-zinc-100 outline-none hover:border-zinc-600 focus-visible:ring-2 focus-visible:ring-violet-500/60',
            'disabled:cursor-not-allowed disabled:opacity-50',
            triggerClassName,
          )}
        >
          <Select.Value>{selectedOption?.label}</Select.Value>
          <Select.Icon>
            <ChevronDown className='size-4 text-zinc-400' />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            position='popper'
            sideOffset={4}
            className='z-50 max-h-[min(24rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] animate-fade-in overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl'
          >
            <Select.Viewport className='p-1'>
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className='relative flex cursor-pointer flex-col rounded-md py-1.5 pr-8 pl-2.5 text-sm text-zinc-200 outline-none select-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 data-[highlighted]:bg-zinc-800 data-[highlighted]:text-white'
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  {option.description && <span className='text-xs text-zinc-500'>{option.description}</span>}
                  <Select.ItemIndicator className='absolute top-2 right-2'>
                    <Check className='size-4 text-violet-400' />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}

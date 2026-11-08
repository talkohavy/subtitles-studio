import { useId } from 'react';
import { Switch } from 'radix-ui';

type SwitchFieldProps = {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function SwitchField(props: SwitchFieldProps) {
  const { label, description, checked, onChange, disabled } = props;

  const switchId = useId();

  return (
    <div className='flex items-center justify-between gap-4'>
      <label htmlFor={switchId} className='space-y-0.5'>
        <span className='block text-sm text-zinc-200'>{label}</span>
        {description && <span className='block text-xs text-zinc-500'>{description}</span>}
      </label>
      <Switch.Root
        id={switchId}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className='relative h-5 w-9 shrink-0 rounded-full bg-zinc-700 outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 disabled:opacity-50 data-[state=checked]:bg-violet-600'
      >
        <Switch.Thumb className='block size-4 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px]' />
      </Switch.Root>
    </div>
  );
}

import type { ReactElement, ReactNode } from 'react';
import { Tooltip as TooltipPrimitive } from 'radix-ui';

type TooltipProps = {
  label: ReactNode;
  children: ReactElement;
  shortcut?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
};

export function Tooltip(props: TooltipProps) {
  const { label, children, shortcut, side = 'top' } = props;

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className='z-50 flex animate-fade-in items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100 shadow-lg'
        >
          {label}
          {shortcut && (
            <kbd className='rounded border border-zinc-600 bg-zinc-900 px-1 font-sans text-[10px] text-zinc-400'>
              {shortcut}
            </kbd>
          )}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

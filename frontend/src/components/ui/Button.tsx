import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@src/common/utils/cn';
import { Tooltip } from './Tooltip';

const VARIANT_CLASSES = {
  primary: 'bg-violet-600 text-white hover:bg-violet-500 disabled:bg-violet-600/40 disabled:text-white/50',
  secondary: 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 disabled:text-zinc-500 disabled:hover:bg-zinc-800',
  ghost: 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 disabled:text-zinc-600 disabled:hover:bg-transparent',
  danger: 'bg-red-600/90 text-white hover:bg-red-500 disabled:bg-red-600/40',
} as const;

const SIZE_CLASSES = {
  sm: 'h-8 gap-1.5 rounded-md px-2.5 text-xs',
  md: 'h-9 gap-2 rounded-lg px-3.5 text-sm',
  lg: 'h-11 gap-2 rounded-lg px-5 text-sm',
  icon: 'size-8 rounded-md',
} as const;

export type ButtonProps = ComponentProps<'button'> & {
  variant?: keyof typeof VARIANT_CLASSES;
  size?: keyof typeof SIZE_CLASSES;
};

export function Button(props: ButtonProps) {
  const { variant = 'secondary', size = 'md', className, type = 'button', ...buttonProps } = props;

  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-colors select-none',
        'outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70 disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...buttonProps}
    />
  );
}

type IconButtonProps = Omit<ButtonProps, 'children' | 'size'> & {
  /**
   * Shown as a tooltip and read by screen readers.
   */
  label: string;
  icon: ReactNode;
  shortcut?: string;
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right';
  isActive?: boolean;
};

export function IconButton(props: IconButtonProps) {
  const { label, icon, shortcut, tooltipSide, isActive, variant = 'ghost', className, ...buttonProps } = props;

  return (
    <Tooltip label={label} shortcut={shortcut} side={tooltipSide}>
      <Button
        aria-label={label}
        aria-pressed={isActive}
        variant={variant}
        size='icon'
        className={cn(isActive && 'bg-zinc-800 text-violet-300', className)}
        {...buttonProps}
      >
        {icon}
      </Button>
    </Tooltip>
  );
}

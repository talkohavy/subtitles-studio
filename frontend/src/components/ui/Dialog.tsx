import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { cn } from '@src/common/utils/cn';

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  /**
   * When false, the dialog can't be closed by clicking outside, pressing Escape, or the close button.
   */
  isDismissible?: boolean;
};

export function Dialog(props: DialogProps) {
  const { open, onOpenChange, title, description, children, className, isDismissible = true } = props;

  function preventDismiss(event: Event) {
    if (!isDismissible) event.preventDefault();
  }

  // Radix warns about a missing description unless it's explicitly opted out of.
  const descriptionProps = description ? {} : { 'aria-describedby': undefined };

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => (isDismissible || nextOpen) && onOpenChange(nextOpen)}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className='fixed inset-0 z-40 animate-fade-in bg-black/60 backdrop-blur-sm' />
        <DialogPrimitive.Content
          onEscapeKeyDown={preventDismiss}
          onPointerDownOutside={preventDismiss}
          onInteractOutside={preventDismiss}
          {...descriptionProps}
          className={cn(
            'fixed top-1/2 left-1/2 z-50 w-[min(92vw,34rem)] -translate-x-1/2 -translate-y-1/2 animate-scale-in',
            'rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl outline-none',
            className,
          )}
        >
          <div className='mb-5 flex items-start justify-between gap-4'>
            <div className='space-y-1'>
              <DialogPrimitive.Title className='text-lg font-semibold text-zinc-50'>{title}</DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className='text-sm text-zinc-400'>
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            {isDismissible && (
              <DialogPrimitive.Close
                aria-label='Close'
                className='-mt-1 -mr-2 rounded-md p-1.5 text-zinc-400 outline-none hover:bg-zinc-800 hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-violet-500/60'
              >
                <X className='size-4' />
              </DialogPrimitive.Close>
            )}
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

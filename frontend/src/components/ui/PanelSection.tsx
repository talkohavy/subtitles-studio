import type { ReactNode } from 'react';
import { cn } from '@src/common/utils/cn';

type PanelSectionProps = {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function PanelSection(props: PanelSectionProps) {
  const { title, children, action, className } = props;

  return (
    <section className={cn('space-y-3', className)}>
      <div className='flex items-center justify-between gap-2'>
        <h3 className='text-[11px] font-semibold tracking-wider text-zinc-500 uppercase'>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

import { cn } from '@src/common/utils/cn';

type ProgressBarProps = {
  /**
   * From 0 to 1, or `null` while the progress isn't known.
   */
  progress: number | null;
  className?: string;
};

export function ProgressBar(props: ProgressBarProps) {
  const { progress, className } = props;

  const percent = progress === null ? null : Math.round(Math.min(1, Math.max(0, progress)) * 100);

  return (
    <div
      role='progressbar'
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent ?? undefined}
      className={cn('relative h-1.5 overflow-hidden rounded-full bg-zinc-800', className)}
    >
      {percent === null ? (
        <div className='absolute inset-y-0 w-1/3 animate-indeterminate rounded-full bg-violet-500' />
      ) : (
        <div
          className='h-full rounded-full bg-violet-500 transition-[width] duration-200'
          style={{ width: `${percent}%` }}
        />
      )}
    </div>
  );
}

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...classNames: Array<ClassValue>): string {
  const merged = clsx(classNames);

  return twMerge(merged);
}

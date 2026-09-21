import { cn } from '@/lib/utils';

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn('inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium', className)}>{children}</span>;
}

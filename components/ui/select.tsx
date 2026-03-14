import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-400',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});

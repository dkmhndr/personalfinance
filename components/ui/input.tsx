import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-slate-100 placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-400',
        className,
      )}
      {...props}
    />
  );
});

export { Input };

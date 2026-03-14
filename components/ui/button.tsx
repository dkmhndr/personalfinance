import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', ...props },
  ref,
) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed';
  const variants: Record<string, string> = {
    primary:
      'bg-gradient-to-r from-brand-400 to-emerald-400 text-slate-900 shadow-lg shadow-emerald-500/20 hover:brightness-105',
    ghost: 'bg-transparent hover:bg-white/5 text-slate-100',
    outline: 'border border-border hover:bg-white/5 text-slate-100',
  };
  const sizes: Record<string, string> = {
    sm: 'px-2.5 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };
  return <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props} />;
});

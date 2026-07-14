import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'h-11 w-full rounded-xl border border-border bg-surface-1 px-3.5 text-sm text-foreground',
      'placeholder:text-muted-foreground/60',
      'transition-colors focus:border-primary/60 focus:bg-surface-2',
      'aria-[invalid=true]:border-danger/70',
      className
    )}
    {...props}
  />
));

Input.displayName = 'Input';

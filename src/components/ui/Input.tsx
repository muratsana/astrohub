import { forwardRef } from 'react';
import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const fieldClasses = cn(
  'h-10 w-full rounded-card border border-border bg-surface-1 px-3 text-body-sm text-foreground',
  'placeholder:text-faint',
  'transition-colors focus:border-primary focus:bg-surface-2',
  'aria-[invalid=true]:border-danger'
);

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(fieldClasses, className)} {...props} />
));

Input.displayName = 'Input';

/** Aynı görsel dilde açılır liste — filtre ve seçicilerde kullanılır. */
export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(fieldClasses, 'appearance-none pr-8', className)}
    {...props}
  />
));

Select.displayName = 'Select';

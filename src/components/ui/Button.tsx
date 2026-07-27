import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

/**
 * Buton — terminal dili.
 *
 * Köşeli (2px), gölgesiz, büyük harf mono etiket ve geniş harf aralığı.
 * Bir cihaz düğmesi gibi okunur: yuvarlak hap biçimi yoktur.
 */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-foreground hover:bg-primary-hover border border-primary',
  secondary:
    'border border-border-strong text-foreground hover:border-primary hover:text-primary',
  ghost:
    'border border-transparent text-muted-foreground hover:text-foreground hover:border-border',
  danger: 'border border-danger/60 text-danger hover:bg-danger/10',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-[10px]',
  md: 'h-10 px-5 text-[11px]',
  lg: 'h-12 px-7 text-xs',
};

function buttonClasses(variant: Variant, size: Size, className?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-card font-medium uppercase tracking-[0.16em]',
    'transition-colors disabled:pointer-events-none disabled:opacity-45',
    variantClasses[variant],
    sizeClasses[size],
    className
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, ...props }, ref) => (
    <button
      ref={ref}
      className={buttonClasses(variant, size, className)}
      {...props}
    />
  )
);

Button.displayName = 'Button';

/** Button görünümünde bir router bağlantısı (CTA'lar için). */
export function ButtonLink({
  to,
  variant = 'primary',
  size = 'md',
  className,
  children,
}: {
  to: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className={buttonClasses(variant, size, className)}>
      {children}
    </Link>
  );
}

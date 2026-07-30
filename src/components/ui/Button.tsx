import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/cn';

/**
 * Buton — terminal dili.
 *
 * Köşeli (2px), gölgesiz, büyük harf mono etiket ve geniş harf aralığı.
 * Bir cihaz düğmesi gibi okunur: yuvarlak hap biçimi yoktur.
 *
 * Taşma önlemleri:
 *  - `whitespace-nowrap` — etiket iki satıra bölünüp butonu deforme etmez.
 *  - `shrink-0` — dar flex kaplarda buton sıkışıp metni kırpmaz.
 *  - `[text-indent]` — harf aralığı son harften sonra da uygulanır ve metni
 *    optik olarak sola kaydırır; sağdaki fazla boşluk kadar indent verilerek
 *    etiket yeniden ortalanır.
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
  sm: 'h-8 px-3.5 text-meta',
  md: 'h-10 px-5 text-meta',
  lg: 'h-12 px-7 text-xs',
};

function buttonClasses(variant: Variant, size: Size, className?: string) {
  return cn(
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-card',
    'whitespace-nowrap text-center font-medium leading-none tracking-[0.03em]',
    // Harf aralığının sondaki fazlalığını dengeler — etiket gerçekten ortalanır.
    '[text-indent:0.14em]',
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
/**
 * Bağlantı görünümlü düğme.
 *
 * `aria-label`/`title` GEÇİRİLİYOR — geçmiyordu ve bu sessiz bir
 * erişilebilirlik hatasıydı: üst çubuktaki ikon bağlantısına (mobil
 * giriş/hesap) etiket yazılmıştı ama bileşen onu DOM'a taşımadığı için
 * ekran okuyucuda hâlâ adsızdı. Denetimde yakalandı (QA GUI-11);
 * `check-a11y` betiği bir daha kaçmasını engelliyor.
 *
 * Rest-spread yerine açık alan listesi: hangi özniteliğin geçtiği
 * okunabilir kalsın ve yanlışlıkla `onClick` gibi şeyler bağlantıya
 * sızmasın.
 */
export function ButtonLink({
  to,
  variant = 'primary',
  size = 'md',
  className,
  children,
  ariaLabel,
  title,
}: {
  to: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
  title?: string;
}) {
  return (
    <Link
      to={to}
      aria-label={ariaLabel}
      title={title}
      className={buttonClasses(variant, size, className)}
    >
      {children}
    </Link>
  );
}

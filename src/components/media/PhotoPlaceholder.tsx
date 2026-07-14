import { cn } from '@/lib/cn';

/**
 * Gerçek görsel gelene kadar kullanılan gradient placeholder.
 * Üzerine hafif yıldız dokusu bindirir. Aspect-ratio sabit tutulur (CLS — §16.5).
 * `alt` erişilebilirlik için zorunludur (§6.7 anlamlı alt metin).
 */
export function PhotoPlaceholder({
  gradient,
  alt,
  className,
  rounded = 'rounded-card',
}: {
  gradient: string;
  alt: string;
  className?: string;
  rounded?: string;
}) {
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn('relative overflow-hidden bg-surface-2', rounded, className)}
      style={{ backgroundImage: gradient }}
    >
      {/* Yıldız dokusu: iki katmanlı radial-gradient deseni */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-70 mix-blend-screen"
        style={{
          backgroundImage:
            'radial-gradient(1px 1px at 20% 30%, #fff, transparent), radial-gradient(1px 1px at 70% 60%, #fff, transparent), radial-gradient(1px 1px at 40% 80%, #e2e8f0, transparent), radial-gradient(1.5px 1.5px at 85% 25%, #fff, transparent), radial-gradient(1px 1px at 55% 15%, #cbd5e1, transparent), radial-gradient(1px 1px at 10% 65%, #fff, transparent)',
          backgroundSize: '260px 260px',
        }}
      />
    </div>
  );
}

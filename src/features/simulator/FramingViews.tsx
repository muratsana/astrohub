import { NavLink } from 'react-router';
import { cn } from '@/lib/cn';

/**
 * KADRAJ MODÜLÜNÜN GÖRÜNÜM ŞERİDİ.
 *
 * "Hedef bu setup'a sığıyor mu?" sorusunun iki cevabı var: tek kare
 * (`/araclar/kadraj`) ve birden çok kare (`/araclar/kadraj/mozaik`).
 * İkisi de aynı girdiyi okuyor — aktif setup, sensör, odak — ve
 * kullanıcı çoğu zaman birinden diğerine geçmek zorunda kalıyor:
 * "sığmıyor" cevabını alan kişinin bir sonraki sorusu zaten "kaç
 * parçaya bölerim". Ayrı adreslerde durmaları o geçişi araçlar
 * listesine dönmeye zorluyordu (denetim §3.6).
 *
 * Gece modülüyle aynı desen ve aynı gerekçelerle `role="tablist"`
 * DEĞİL: bunlar bir panelin sekmeleri değil, kendi `h1`i ve kendi
 * paylaşılabilir adresi olan ayrı belgeler.
 */

const GORUNUMLER = [
  { to: '/araclar/kadraj', label: 'Kadraj', end: true },
  { to: '/araclar/kadraj/mozaik', label: 'Mozaik', end: false },
];

export function FramingViews({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Kadraj modülü görünümleri"
      className={cn(
        'mb-4 flex flex-wrap gap-1 rounded-card border border-border bg-surface-1 p-1',
        className
      )}
    >
      {GORUNUMLER.map((gorunum) => (
        <NavLink
          key={gorunum.to}
          to={gorunum.to}
          end={gorunum.end}
          className={({ isActive }) =>
            cn(
              'rounded-card px-3 py-1.5 text-body-sm font-medium transition-colors',
              isActive
                ? 'bg-surface-2 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )
          }
        >
          {gorunum.label}
        </NavLink>
      ))}
    </nav>
  );
}

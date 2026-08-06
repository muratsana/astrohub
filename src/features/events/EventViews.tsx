import { NavLink } from 'react-router';
import { cn } from '@/lib/cn';

/**
 * ETKİNLİK MODÜLÜNÜN GÖRÜNÜM ŞERİDİ.
 *
 * Aynı etkinlik listesinin iki sorusu var: "nerede?" (harita) ve
 * "ne zaman?" (takvim). Gece ve Kadraj modüllerinde kurulan desenin
 * aynısı — ayrı adres, ortak şerit, `role="tablist"` değil `nav`.
 */

const GORUNUMLER = [
  { to: '/etkinlikler', label: 'Harita', end: true },
  { to: '/etkinlikler/takvim', label: 'Takvim', end: false },
];

export function EventViews({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Etkinlik modülü görünümleri"
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

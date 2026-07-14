import { NavLink } from 'react-router-dom';
import { mobileNav } from '@/app/navigation';
import {
  ImageIcon,
  CalendarIcon,
  MapIcon,
  SparkleIcon,
  GraduationIcon,
} from '@/components/ui/icons';
import { cn } from '@/lib/cn';

const iconFor: Record<string, typeof ImageIcon> = {
  '/': SparkleIcon,
  '/fotograflar': ImageIcon,
  '/etkinlikler': CalendarIcon,
  '/harita': MapIcon,
  '/panel': GraduationIcon,
};

/**
 * Mobil alt navigasyon (§5.3). Yalnızca küçük ekranlarda görünür.
 * Beş ana giriş; diğer modüller "Daha Fazla" çekmecesine bırakılır (sonraki sprint).
 */
export function MobileNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md lg:hidden"
      aria-label="Mobil navigasyon"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {mobileNav.map((item) => {
          const Icon = iconFor[item.to] ?? SparkleIcon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

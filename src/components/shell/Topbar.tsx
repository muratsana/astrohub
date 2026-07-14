import { NavLink } from 'react-router-dom';
import { Logo } from './Logo';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { SearchIcon, MoonIcon } from '@/components/ui/icons';
import { primaryNav } from '@/app/navigation';
import { cn } from '@/lib/cn';

/**
 * Masaüstü üst navigasyon (§5.1). Sağ bölüm: arama, tema, giriş, üye ol.
 * Koyu, ince alt border; sticky. Mobilde nav gizli (alt navigasyon devreye girer).
 */
export function Topbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center justify-between gap-6">
          <Logo />

          <nav className="hidden items-center gap-1 lg:flex">
            {primaryNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
              aria-label="Ara"
            >
              <SearchIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
              aria-label="Tema değiştir"
            >
              <MoonIcon className="h-5 w-5" />
            </button>
            <NavLink
              to="/giris"
              className="hidden px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-block"
            >
              Giriş Yap
            </NavLink>
            <ButtonLink to="/kayit" size="sm">
              Üye Ol
            </ButtonLink>
          </div>
        </div>
      </Container>
    </header>
  );
}

import { NavLink } from 'react-router-dom';
import { Logo } from './Logo';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { SearchIcon, MoonIcon } from '@/components/ui/icons';
import { primaryNav } from '@/app/navigation';
import { useTheme } from '@/features/theme/ThemeContext';
import { cn } from '@/lib/cn';

/**
 * ÜST NAVİGASYON.
 *
 * Yedi ana giriş, düz — açılır menü yoktur (§5.2 komut paletine devredildi).
 * Girişler hairline bölmelerle ayrılır; aktif olan altında kehribar bir
 * çizgi taşır. Sağda: komut paleti tetikleyicisi, saha modu, hesap.
 */
export function Topbar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const { fieldMode, toggleFieldMode } = useTheme();

  return (
    <header className="border-b border-border bg-background">
      <Container>
        <div className="flex h-14 items-center gap-4">
          <Logo />

          <nav
            aria-label="Ana navigasyon"
            className="ml-2 hidden items-stretch self-stretch lg:flex"
          >
            {primaryNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center border-l border-border px-4 text-[11px] font-medium uppercase tracking-[0.14em] transition-colors last:border-r',
                    isActive
                      ? 'text-primary shadow-[inset_0_-2px_0_var(--color-primary)]'
                      : 'text-muted-foreground hover:text-foreground'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {/* Komut paleti tetikleyicisi — kısayolu görünür biçimde taşır */}
            <button
              type="button"
              onClick={onOpenPalette}
              aria-keyshortcuts="Control+K Meta+K"
              className="inline-flex h-8 items-center gap-2 rounded-card border border-border px-2.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
            >
              <SearchIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Komut</span>
              <kbd className="hidden rounded-[2px] border border-border px-1 py-px text-[9px] text-faint sm:inline">
                ⌘K
              </kbd>
            </button>

            <button
              type="button"
              onClick={toggleFieldMode}
              aria-pressed={fieldMode}
              title={
                fieldMode
                  ? 'Saha modu açık — kapatmak için tıkla'
                  : 'Saha modu: karanlık adaptasyonunu koruyan kırmızı arayüz'
              }
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-card border px-2.5 text-[10px] uppercase tracking-[0.14em] transition-colors',
                fieldMode
                  ? 'border-primary text-primary'
                  : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
              )}
            >
              <MoonIcon className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Saha</span>
            </button>

            <NavLink
              to="/giris"
              className="hidden text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              Giriş
            </NavLink>
            <ButtonLink to="/kayit" size="sm">
              Kayıt Aç
            </ButtonLink>
          </div>
        </div>
      </Container>
    </header>
  );
}

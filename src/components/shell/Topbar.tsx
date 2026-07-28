import { NavLink } from 'react-router-dom';
import { Logo } from './Logo';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { MenuIcon, MoonIcon } from '@/components/ui/icons';
import { primaryNav } from '@/app/navigation';
import { useTheme } from '@/features/theme/ThemeContext';
import { cn } from '@/lib/cn';

/**
 * ÜST NAVİGASYON.
 *
 * Dokuz ana giriş, düz — açılır menü yoktur (§5.2). Girişler hairline
 * bölmelerle ayrılır; aktif olan altında kehribar bir çizgi taşır.
 *
 * Komut paleti tetikleyicisi kaldırıldı: ⌘K kısayolu çalışmaya devam eder
 * ama üst çubukta yer kaplamaz. Dokuz modül genişliği zaten sıkıyordu ve
 * paletin kendisi keşif değil hızlandırma aracı — düğmesi olmadan da
 * bilenler kullanır.
 *
 * Kırılım `xl`: dokuz giriş 1024px'te sığmıyor. Altındaki her genişlikte
 * modül haritasını açan bir düğme gösterilir — üst çubuk hiçbir zaman
 * gezinme girişi olmadan kalmaz.
 */
export function Topbar({ onOpenNav }: { onOpenNav: () => void }) {
  const { fieldMode, toggleFieldMode } = useTheme();

  return (
    <header className="border-b border-border bg-background">
      <Container>
        <div className="flex h-14 items-center gap-3">
          <Logo />

          <nav
            aria-label="Ana navigasyon"
            className="ml-1 hidden items-stretch self-stretch xl:flex"
          >
            {primaryNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center border-l border-border px-3 text-[11px] font-medium uppercase tracking-[0.12em] transition-colors last:border-r',
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
            {/*
              `xl` altında düz menü gizlendiği için burası navigasyonun ÜST
              çubuktaki tek girişi. Önceden yalnızca lg–xl aralığında
              gösteriliyordu; gerekçe mobil alt çubuğun aynı çekmeceyi
              açmasıydı. Ama alt çubuk `fixed` ve gömülü/dar bir görünüm
              alanında (yan panel, küçültülmüş pencere) görüş dışında
              kalabiliyor — o durumda üst çubukta Giriş/Kaydol dışında hiçbir
              gezinme girişi kalmıyordu. Yedeği olmayan tek giriş, olmayan
              giriştir; düğme artık `xl` altında her genişlikte duruyor.

              Dar ekranda taşmayı önleyen şey görünürlük değil, etiket:
              `lg` altında yalnızca ikon kalır, erişilebilir ad `aria-label`
              ile korunur (§6.7).
            */}
            <button
              type="button"
              onClick={onOpenNav}
              aria-label="Modül haritasını aç"
              className="inline-flex h-8 items-center gap-1.5 rounded-card border border-border px-2.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground xl:hidden"
            >
              <MenuIcon className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Modüller</span>
            </button>

            <button
              type="button"
              onClick={toggleFieldMode}
              aria-pressed={fieldMode}
              /*
                Etiket 2xl altında gizleniyor ve düğme ikon-only kalıyordu;
                `title` çoğu ekran okuyucuda ad olarak okunsa da güvenilir
                değil. Açık `aria-label` durumu da bildiriyor (§6.7).
              */
              aria-label={
                fieldMode ? 'Saha modunu kapat (tema)' : 'Saha modunu aç (tema)'
              }
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
              <span className="hidden 2xl:inline">Saha</span>
            </button>

            <ButtonLink to="/giris" size="sm" variant="secondary">
              Giriş
            </ButtonLink>
            <ButtonLink to="/kayit" size="sm">
              Kaydol
            </ButtonLink>
          </div>
        </div>
      </Container>
    </header>
  );
}

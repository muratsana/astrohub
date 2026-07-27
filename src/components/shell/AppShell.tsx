import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Outlet, ScrollRestoration } from 'react-router-dom';
import { StatusBar } from './StatusBar';
import { Topbar } from './Topbar';
import { Footer } from './Footer';
import { MobileNav } from './MobileNav';

/**
 * UYGULAMA KABUĞU — Rasathane Terminali.
 *
 * Yapışkan başlık iki katmandır: gökyüzü durum çubuğu + navigasyon. Sağ
 * enstrüman rayı yoktur (o karar geri alındı) — içerik tam genişlikte akar.
 *
 * Komut paleti tüm modüllerin verisini indeksler; ilk yüklemede indirilmesi
 * gereksiz ağırlık olur (§16.4), bu yüzden yalnızca açıldığında yüklenir.
 */
const CommandPalette = lazy(() =>
  import('@/features/search/CommandPalette').then((m) => ({
    default: m.CommandPalette,
  }))
);

export function AppShell() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Klavye kullanıcıları için içeriğe atlama bağlantısı (§6.7) */}
      <a
        href="#icerik"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-card focus:bg-primary focus:px-4 focus:py-2 focus:text-[11px] focus:font-medium focus:uppercase focus:tracking-[0.14em] focus:text-primary-foreground"
      >
        İçeriğe atla
      </a>

      {/* Durum çubuğu ve nav birlikte yapışkan — gece durumu hep görünür */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md">
        <StatusBar />
        <Topbar onOpenPalette={openPalette} />
      </div>

      <main id="icerik" className="flex-1 pb-16 lg:pb-0">
        <Outlet />
      </main>

      <Footer />
      <MobileNav onOpenPalette={openPalette} />

      {paletteOpen && (
        <Suspense fallback={null}>
          <CommandPalette open onClose={closePalette} />
        </Suspense>
      )}

      <ScrollRestoration />
    </div>
  );
}

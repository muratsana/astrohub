import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Outlet, ScrollRestoration } from 'react-router-dom';
import { Topbar } from './Topbar';
import { Footer } from './Footer';
import { MobileNav } from './MobileNav';

/**
 * Arama katmanı tüm modüllerin verisini indeksler; ilk yüklemede indirilmesi
 * gereksiz ağırlık olur (§16.4). Yalnızca kullanıcı aramayı açtığında
 * indirilir.
 */
const SearchDialog = lazy(() =>
  import('@/features/search/SearchDialog').then((m) => ({
    default: m.SearchDialog,
  }))
);

/**
 * Genel uygulama kabuğu (§2.2 AppShell). Topbar + içerik + Footer +
 * mobil alt navigasyon. Rota içeriği <Outlet /> ile render edilir.
 *
 * Global arama katmanı (§16.1) burada tutulur; hem üst bardaki arama
 * butonu hem de ⌘K / Ctrl+K kısayolu aynı durumu açar.
 */
export function AppShell() {
  const [searchOpen, setSearchOpen] = useState(false);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Klavye kullanıcıları için içeriğe atlama bağlantısı (§6.7).
          Yalnızca odaklanınca görünür. */}
      <a
        href="#icerik"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        İçeriğe atla
      </a>

      <Topbar onOpenSearch={openSearch} />
      <main id="icerik" className="flex-1 pb-20 lg:pb-0">
        <Outlet />
      </main>
      <Footer />
      <MobileNav onOpenSearch={openSearch} />
      {searchOpen && (
        <Suspense fallback={null}>
          <SearchDialog open onClose={closeSearch} />
        </Suspense>
      )}
      <ScrollRestoration />
    </div>
  );
}

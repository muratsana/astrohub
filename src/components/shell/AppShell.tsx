import { Outlet, ScrollRestoration } from 'react-router-dom';
import { Topbar } from './Topbar';
import { Footer } from './Footer';
import { MobileNav } from './MobileNav';

/**
 * Genel uygulama kabuğu (§2.2 AppShell). Topbar + içerik + Footer +
 * mobil alt navigasyon. Rota içeriği <Outlet /> ile render edilir.
 */
export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Topbar />
      <main id="icerik" className="flex-1 pb-20 lg:pb-0">
        <Outlet />
      </main>
      <Footer />
      <MobileNav />
      <ScrollRestoration />
    </div>
  );
}

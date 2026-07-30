import { Link } from 'react-router';
import { Logo } from './Logo';
import { Container } from '@/components/ui/Container';
import { primaryNav } from '@/app/navigation';

/**
 * FOOTER — kompakt.
 *
 * Önceki sürümde tüm modül haritası (dokuz grup, ~30 bağlantı) footer'a
 * seriliyordu ve sayfanın üçte birini kaplıyordu. Artık yalnızca yedi ana
 * modül ve kurumsal bağlantılar var.
 *
 * Alt sayfalara erişim kaybolmuyor: ⌘K komut paleti tüm modül haritasını
 * indeksliyor ve mobil çekmece tam listeyi göstermeye devam ediyor.
 */
const legal = [
  { label: 'Hakkında', to: '/hakkinda' },
  { label: 'KVKK', to: '/kvkk' },
  { label: 'Kullanım Koşulları', to: '/kullanim-kosullari' },
];

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-surface-1">
      <Container className="py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Logo />

          <nav aria-label="Modüller" className="flex flex-wrap gap-x-5 gap-y-2">
            {primaryNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-meta tracking-[0.03em] text-muted-foreground transition-colors hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4 text-meta tracking-[0.03em] text-faint sm:flex-row sm:items-center sm:justify-between">
          <p className="tabular">© {new Date().getFullYear()} Astrohub</p>

          <nav aria-label="Kurumsal" className="flex flex-wrap gap-x-4 gap-y-1">
            {legal.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="transition-colors hover:text-muted-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <p className="hidden lg:block">
            Gökyüzü verisi istemcide hesaplanır
          </p>
        </div>
      </Container>
    </footer>
  );
}

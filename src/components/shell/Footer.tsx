import { Link } from 'react-router';
import { Logo } from './Logo';
import { Container } from '@/components/ui/Container';
import { useMenu } from '@/features/site/SiteConfigContext';

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
export function Footer() {
  /*
    İKİ MENÜ DE `nav_links`ten (§13.2). Kurumsal satır buraya gömülü bir
    dizideydi; panelden yönetilebilmesi için `navigation.ts`e taşındı ve
    tabloya tohumlandı — yedek olarak orada duruyor.
  */
  const modules = useMenu('header');
  const legal = useMenu('footer');

  return (
    <footer className="mt-12 border-t border-border bg-surface-1">
      <Container className="py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Logo />

          <nav aria-label="Modüller" className="flex flex-wrap gap-x-5 gap-y-2">
            {modules.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                target={item.new_tab ? '_blank' : undefined}
                rel={item.new_tab ? 'noopener noreferrer' : undefined}
                /* inline-block + py-1: dokunma hedefi 24px'e çıkar
                   (WCAG 2.2 AA, 2.5.8). Satır yüksekliği tek başına 17px
                   veriyordu. */
                className="inline-block py-1 text-meta tracking-[0.03em] text-muted-foreground transition-colors hover:text-primary"
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
                key={item.path}
                to={item.path}
                target={item.new_tab ? '_blank' : undefined}
                rel={item.new_tab ? 'noopener noreferrer' : undefined}
                className="inline-block py-1 transition-colors hover:text-muted-foreground"
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

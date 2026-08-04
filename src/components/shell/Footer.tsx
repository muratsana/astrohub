import { Link } from 'react-router';
import { Logo } from './Logo';
import { Container } from '@/components/ui/Container';
import { useMenu } from '@/features/site/SiteConfigContext';

/**
 * FOOTER — kompakt.
 *
 * Önceki sürümde tüm modül haritası (dokuz grup, ~30 bağlantı) footer'a
 * seriliyordu, sonra üst menü footer'da tekrar ediyordu. Footer artık
 * yalnızca marka, kurumsal bağlantılar ve kısa veri notunu taşır.
 *
 * Alt sayfalara erişim kaybolmuyor: ⌘K komut paleti tüm modül haritasını
 * indeksliyor ve mobil çekmece tam listeyi göstermeye devam ediyor.
 */
export function Footer() {
  /*
    Kurumsal satır `nav_links`ten (§13.2). Panelden yönetilebilmesi için
    `navigation.ts`e taşındı ve tabloya tohumlandı — yedek olarak orada duruyor.
  */
  const legal = useMenu('footer');
  const hasContact = legal.some((item) => item.path === '/iletisim');
  const hasFaq = legal.some((item) => item.path === '/sss');

  return (
    <footer className="mt-12 border-t border-border bg-surface-1">
      <Container className="py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Logo />
            <p className="text-meta tracking-[0.03em] text-faint">
              © {new Date().getFullYear()} Astrohub
            </p>
          </div>

          <nav
            aria-label="Kurumsal"
            className="flex flex-wrap gap-x-5 gap-y-2 text-meta tracking-[0.03em]"
          >
            {legal.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                target={item.new_tab ? '_blank' : undefined}
                rel={item.new_tab ? 'noopener noreferrer' : undefined}
                /* inline-block + py-1: dokunma hedefi 24px'e çıkar
                   (WCAG 2.2 AA, 2.5.8). Satır yüksekliği tek başına 17px
                   veriyordu. */
                className="inline-block py-1 text-muted-foreground transition-colors hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
            {!hasFaq && (
              <Link
                to="/sss"
                className="inline-block py-1 text-muted-foreground transition-colors hover:text-primary"
              >
                Sık Sorulan Sorular
              </Link>
            )}
            {!hasContact && (
              <Link
                to="/iletisim"
                className="inline-block rounded-card border border-border px-2.5 py-1 text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                İletişim
              </Link>
            )}
          </nav>
        </div>
      </Container>
    </footer>
  );
}

import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { Container } from '@/components/ui/Container';
import { siteMap } from '@/app/navigation';

/**
 * FOOTER — tam modül haritası.
 *
 * Üst menüde açılır menü olmadığı için footer keşfin ikinci ayağıdır:
 * sitedeki her sayfa burada görünür olmalıdır. Yayında olmayan bölümler
 * açıkça işaretlenir; kullanıcı tıklamadan önce ne bulacağını bilir.
 */
export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-surface-1">
      <Container className="py-10">
        <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4 border-b border-border pb-6">
          <Logo compact />
          <p className="max-w-md text-[11px] leading-relaxed text-muted-foreground">
            Türkiye'nin astronomi, astrofotoğrafçılık ve karanlık gökyüzü
            kayıt ağı. Her kare, onu üreten geceyle birlikte arşivlenir.
          </p>
        </div>

        <nav
          aria-label="Modül haritası"
          className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        >
          {siteMap.map((group) => (
            <div key={group.title}>
              <h3 className="label mb-2.5 border-b border-border pb-1.5">
                {group.title}
              </h3>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.to + item.label}>
                    <Link
                      to={item.to}
                      className="group flex items-baseline gap-1.5 text-[11.5px] text-muted-foreground transition-colors hover:text-primary"
                    >
                      {item.label}
                      {item.soon && (
                        <span className="text-[9px] uppercase tracking-widest text-faint">
                          yakında
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-5 text-[10px] uppercase tracking-[0.14em] text-faint sm:flex-row sm:items-center sm:justify-between">
          <p className="tabular">
            © {new Date().getFullYear()} Astrohub · Gözlem Ağı
          </p>
          <p>
            Gökyüzü verisi istemcide hesaplanır · Konum sunucuya gönderilmez
          </p>
        </div>
      </Container>
    </footer>
  );
}

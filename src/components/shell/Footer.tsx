import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { Container } from '@/components/ui/Container';
import { footerGroups } from '@/app/navigation';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-surface-1">
      <Container className="py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Türkiye'nin astronomi, astrofotoğrafçılık ve astrocamping
              platformu. Gökyüzünü keşfet, paylaş, öğren.
            </p>
          </div>

          {footerGroups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                {group.title}
              </h3>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Astrohub</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link to="/kvkk" className="hover:text-foreground">
              KVKK & Gizlilik
            </Link>
            <Link to="/kullanim-kosullari" className="hover:text-foreground">
              Kullanım Koşulları
            </Link>
            <Link to="/hakkinda" className="hover:text-foreground">
              Hakkında
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}

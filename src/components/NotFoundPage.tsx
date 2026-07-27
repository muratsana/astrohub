import { Link, useLocation } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { ButtonLink } from '@/components/ui/Button';
import { PageMeta } from '@/components/seo/PageMeta';
import { primaryNav } from '@/app/navigation';

/**
 * 404 sayfası. Kullanıcıyı çıkmazda bırakmamak için ana modüllere
 * yönlendirme sunar; arama motorlarına `noindex` verilir (§16.2).
 */
export function NotFoundPage() {
  const { pathname } = useLocation();

  return (
    <>
      <PageMeta
        title="Sayfa bulunamadı"
        description="Aradığınız sayfa mevcut değil ya da adresi değişmiş olabilir."
        noIndex
      />
      <Container className="flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <p className="tabular text-5xl font-bold text-primary">404</p>
        <h1 className="mt-4 text-2xl font-semibold text-foreground sm:text-3xl">
          Sayfa bulunamadı
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          <code className="rounded bg-surface-2 px-1.5 py-0.5 text-sm text-foreground">
            {pathname}
          </code>{' '}
          adresinde bir sayfa yok. Adres değişmiş ya da bu bölüm henüz yayına
          alınmamış olabilir.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink to="/">Ana sayfaya dön</ButtonLink>
          <ButtonLink to="/galeri" variant="secondary">
            Fotoğrafları keşfet
          </ButtonLink>
        </div>

        <nav aria-label="Ana modüller" className="mt-10">
          <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">
            Ana modüller
          </p>
          <ul className="flex flex-wrap justify-center gap-2">
            {primaryNav.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="inline-block rounded-full border border-border px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </>
  );
}

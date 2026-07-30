import { Link, useLocation } from 'react-router';
import { Container } from '@/components/ui/Container';
import { ButtonLink } from '@/components/ui/Button';
import { PageMeta } from '@/components/seo/PageMeta';
import { primaryNav } from '@/app/navigation';

/**
 * 404 sayfası. Kullanıcıyı çıkmazda bırakmamak için ana modüllere
 * yönlendirme sunar; arama motorlarına `noindex` verilir (§16.2).
 *
 * Terminal dilinde bir hata çıktısı gibi kurgulanır: solda kalın durum kodu,
 * yanında ne olduğu, altında istenen yolun ham hâli. Ortalanmış bir "üzgünüz"
 * ekranı yerine okunabilir bir kayıt satırı.
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
      <Container className="py-16 sm:py-24">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-start gap-4 border-b border-border pb-6">
            <p className="tabular font-display text-[46px] font-bold leading-none text-primary sm:text-[58px]">
              404
            </p>
            <div className="min-w-0 pt-1">
              <h1 className="text-[22px] text-foreground sm:text-[26px]">
                Sayfa Bulunamadı
              </h1>
              <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                Bu adres değişmiş ya da bu bölüm henüz yayına alınmamış olabilir.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-card border border-border bg-surface-1 px-3 py-2.5">
            <p className="label">İstenen yol</p>
            <p className="tabular mt-1 break-all text-[12px] text-foreground">
              {pathname}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <ButtonLink to="/" size="sm">
              Ana Sayfa
            </ButtonLink>
            <ButtonLink to="/galeri" variant="secondary" size="sm">
              Galeriye Git
            </ButtonLink>
          </div>

          <nav aria-label="Ana modüller" className="mt-10">
            <div className="mb-3 flex items-center gap-3">
              <p className="label whitespace-nowrap">Ana modüller</p>
              <span aria-hidden className="h-px flex-1 bg-border" />
            </div>
            <ul className="flex flex-wrap gap-1.5">
              {primaryNav.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="inline-block rounded-card border border-border px-2.5 py-1 text-[10px] tracking-[0.03em] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </Container>
    </>
  );
}

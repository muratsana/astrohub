import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PhotoPlaceholder } from '@/components/media/PhotoPlaceholder';
import { PlaceholderPage } from '@/components/PlaceholderPage';
import { photos } from '@/features/photos/data';
import { getTargetBySlug, targetKindLabels } from './data';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';

/**
 * Hedef detay sayfası (§8.2): teknik künye + bu hedefin Astrohub'daki
 * fotoğrafları (veri zinciri: hedef → fotoğraf ilişkisi).
 */
export function TargetDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const target = slug ? getTargetBySlug(slug) : undefined;

  const targetPhotos = useMemo(
    () =>
      target
        ? photos.filter(
            (p) =>
              p.target.catalog === target.catalog ||
              target.aliases.includes(p.target.catalog)
          )
        : [],
    [target]
  );

  if (!target) {
    return (
      <PlaceholderPage
        title="Hedef bulunamadı"
        description="Bu hedef katalogda yok ya da bağlantı hatalı."
      />
    );
  }

  return (
    <>
      <PageMeta
        title={`${target.catalog} — ${target.name}`}
        description={`${targetKindLabels[target.kind]}, ${target.constellation} takımyıldızında. Astrohub topluluğundan ${targetPhotos.length} fotoğraf, teknik künye ve gözlem önerileri.`}
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Hedefler', path: '/hedefler' },
          {
            name: `${target.catalog} ${target.name}`,
            path: `/hedef/${target.slug}`,
          },
        ])}
      />
      <Container className="py-8 sm:py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <PhotoPlaceholder
            gradient={target.gradient}
            alt={`${target.name} (${target.catalog})`}
            className="aspect-[4/3] w-full border border-border"
          />

          <div>
            <p className="text-sm font-medium text-primary">
              {target.catalog}
              {target.aliases.length > 0 && (
                <span className="text-muted-foreground">
                  {' '}
                  · {target.aliases.join(', ')}
                </span>
              )}
            </p>
            <h1 className="mt-1 text-[26px] text-foreground sm:text-[30px]">
              {target.name}
            </h1>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone="primary">{targetKindLabels[target.kind]}</Badge>
              <Badge>{target.constellation}</Badge>
              <Badge
                tone={
                  target.difficulty === 'Kolay'
                    ? 'success'
                    : target.difficulty === 'Orta'
                      ? 'primary'
                      : 'danger'
                }
              >
                {target.difficulty}
              </Badge>
            </div>

            <p className="mt-4 leading-relaxed text-muted-foreground">
              {target.description}
            </p>

            <dl className="tabular mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Row label="Sağ açıklık (RA)" value={target.ra} />
              <Row label="Yükselim (DEC)" value={target.dec} />
              <Row
                label="Görünür parlaklık"
                value={target.magnitude ? `${target.magnitude} kadir` : '—'}
              />
              <Row label="Açısal boyut" value={target.angularSize} />
              <Row label="En uygun aylar" value={target.bestMonths} />
              <Row label="Önerilen odak" value={target.recommendedFocal} />
              <Row
                label="Önerilen filtreler"
                value={target.recommendedFilters}
              />
            </dl>

            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink to="/araclar/fov" variant="secondary" size="sm">
                FOV'da dene
              </ButtonLink>
              <ButtonLink to="/hedefler" variant="ghost" size="sm">
                ← Tüm hedefler
              </ButtonLink>
            </div>
          </div>
        </div>

        {/* Bu hedefin fotoğrafları */}
        <section className="mt-14 border-t border-border pt-10">
          <SectionHeader
            title={`${target.catalog} Fotoğrafları`}
            description="Bu hedefin Astrohub topluluğundaki kareleri"
            linkTo="/galeri"
          />
          {targetPhotos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Bu hedef için henüz fotoğraf yayımlanmamış. İlk paylaşan sen ol!
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {targetPhotos.map((p) => (
                <li key={p.slug}>
                  <Link to={`/fotograf/${p.slug}`} className="group block">
                    <PhotoPlaceholder
                      gradient={p.gradient}
                      alt={p.title}
                      className="aspect-[4/3] w-full border border-border transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    <p className="mt-2 truncate text-sm font-medium text-foreground">
                      {p.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{p.user.username}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Container>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
    </div>
  );
}

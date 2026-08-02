import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PhotoPlaceholder } from '@/components/media/PhotoPlaceholder';
import { RemoteImage } from '@/components/media/RemoteImage';
import { PlaceholderPage } from '@/components/PlaceholderPage';
import { usePhotoCatalog } from '@/services/content/photos';
import { getTargetBySlug, targetKindLabels } from './data';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { FavoriteTargetButton } from './FavoriteTargetButton';
import { tintForPhoto } from '@/features/photos/tint';
import { CopyIcon } from '@/components/ui/icons';
import { deepSkyImages } from '@/lib/commons';

/**
 * Hedef detay sayfası (§8.2): teknik künye + bu hedefin Astrohub'daki
 * fotoğrafları (veri zinciri: hedef → fotoğraf ilişkisi).
 */
export function TargetDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const target = slug ? getTargetBySlug(slug) : undefined;
  const [copiedCoord, setCopiedCoord] = useState<string | null>(null);

  const photos = usePhotoCatalog().items;

  const targetPhotos = useMemo(
    () =>
      target
        ? photos.filter(
            (p) =>
              p.target.catalog === target.catalog ||
              target.aliases.includes(p.target.catalog)
          )
        : [],
    [photos, target]
  );
  const heroPhoto = targetPhotos.find((p) => p.image?.url);
  const fallbackImage = target ? deepSkyImages[target.slug] : undefined;

  if (!target) {
    return (
      <PlaceholderPage
        title="Hedef bulunamadı"
        description="Bu hedef katalogda yok ya da bağlantı hatalı."
      />
    );
  }

  async function copyCoord(key: string, value: string) {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    await navigator.clipboard.writeText(value);
    setCopiedCoord(key);
    window.setTimeout(() => {
      setCopiedCoord((current) => (current === key ? null : current));
    }, 1200);
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
          <div className="aspect-[4/3] overflow-hidden rounded-card border border-border bg-surface-2">
            {heroPhoto?.image?.url || fallbackImage?.url ? (
              <RemoteImage
                src={heroPhoto?.image?.url ?? fallbackImage?.url}
                alt={`${target.name} (${target.catalog})`}
                seed={heroPhoto?.slug ?? target.slug}
                tint={
                  heroPhoto
                    ? tintForPhoto(heroPhoto.target.catalog)
                    : tintForPhoto(target.catalog)
                }
                sizes="(min-width: 1024px) 52vw, 100vw"
                priority
              />
            ) : (
              <PhotoPlaceholder
                gradient={target.gradient}
                alt={`${target.name} (${target.catalog})`}
                className="h-full w-full"
                rounded="rounded-none"
              />
            )}
          </div>

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
            <h1 className="mt-1 type-page text-foreground">
              {target.name}
            </h1>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone="primary">{targetKindLabels[target.kind]}</Badge>
              <Badge>{target.constellation}</Badge>
            </div>

            {/* Favori / gözlem listesi (§14.1) — oturum yoksa hiç
                çizilmiyor, gerekçe bileşenin başlığında. */}
            <FavoriteTargetButton slug={target.slug} />

            <p className="mt-4 leading-relaxed text-muted-foreground">
              {target.description}
            </p>

            <dl className="tabular mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Row
                label="Sağ açıklık (RA)"
                value={target.ra}
                copyLabel="RA"
                copied={copiedCoord === 'ra'}
                onCopy={() => copyCoord('ra', target.ra)}
              />
              <Row
                label="Yükselim (DEC)"
                value={target.dec}
                copyLabel="DEC"
                copied={copiedCoord === 'dec'}
                onCopy={() => copyCoord('dec', target.dec)}
              />
              <Row
                label="Görünür parlaklık"
                value={target.magnitude ? `${target.magnitude} kadir` : '—'}
              />
              <Row label="Açısal boyut" value={target.angularSize} />
              <Row label="En uygun aylar" value={target.bestMonths} />
              <Row
                label="Önerilen odak"
                value={target.recommendedFocal}
                hint="Açısal boyuttan türetilir: hedef, APS-C benzeri kadrajın yaklaşık yarısını dolduracak aralık."
              />
              <Row
                label="Önerilen filtreler"
                value={target.recommendedFilters}
                className="col-span-2"
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
            /* Başlık zaten hedefin adını taşıyor; açıklama onu uzun
               yoldan tekrar ediyordu. */
            title={`${target.catalog} Fotoğrafları`}
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
                    <div className="aspect-[4/3] overflow-hidden rounded-card border border-border bg-surface-2">
                      <RemoteImage
                        src={p.image?.url ?? fallbackImage?.url}
                        alt={p.title}
                        seed={p.slug}
                        tint={tintForPhoto(p.target.catalog)}
                        sizes="(min-width: 1024px) 25vw, 50vw"
                        className="transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </div>
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

function Row({
  label,
  value,
  copyLabel,
  copied = false,
  onCopy,
  hint,
  className,
}: {
  label: string;
  value: string;
  copyLabel?: string;
  copied?: boolean;
  onCopy?: () => void;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 flex items-center gap-2 font-medium text-foreground">
        <span>{value}</span>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
            aria-label={`${copyLabel ?? label} kopyala`}
            title={copied ? 'Kopyalandı' : `${copyLabel ?? label} kopyala`}
          >
            <CopyIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </dd>
      {hint && (
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

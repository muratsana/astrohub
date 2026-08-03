import { useParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { PhotoPlaceholder } from '@/components/media/PhotoPlaceholder';
import { PlaceholderPage } from '@/components/PlaceholderPage';
import { useSiteCatalog } from '@/services/content/sites';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd, placeJsonLd } from '@/lib/seo';

/** Kamp/gözlem noktası detayı (§7.8): gökyüzü + kamp + erişim kriterleri. */
export function SiteDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const catalog = useSiteCatalog();
  const site = slug
    ? catalog.items.find((item) => item.slug === slug)
    : undefined;

  if (!site) {
    return (
      <PlaceholderPage
        title="Gözlem noktası bulunamadı"
        description="Bu nokta yayından kaldırılmış ya da bağlantı hatalı olabilir."
      />
    );
  }

  const f = site.facilities;
  const facilityRows: [string, boolean][] = [
    ['Su', f.water],
    ['Tuvalet', f.toilet],
    ['Elektrik', f.electricity],
    ['Mobil sinyal', f.cellSignal],
    ['Çadır alanı', f.tentArea],
    ['Karavan uygun', f.caravanOk],
  ];

  return (
    <>
      <PageMeta
        title={`${site.name} — ${site.region}`}
        description={`Bortle ${site.bortle}, ${site.altitude} m rakım, ${site.roadAccess.toLocaleLowerCase('tr-TR')} yol. ${site.description.slice(0, 140)}`}
        jsonLd={[
          placeJsonLd({
            name: site.name,
            path: `/saha/${site.slug}`,
            description: site.description,
            region: site.region,
            altitude: site.altitude,
          }),
          breadcrumbJsonLd([
            { name: 'Ana Sayfa', path: '/' },
            { name: 'Gözlem Noktaları', path: '/saha' },
            { name: site.name, path: `/saha/${site.slug}` },
          ]),
        ]}
      />
      <Container className="py-8 sm:py-10">
        <PhotoPlaceholder
          gradient={site.gradient}
          alt={site.name}
          className="aspect-[3/1] w-full border border-border"
        />

        <div className="mt-6 flex flex-col gap-8 lg:flex-row">
          <div className="min-w-0 flex-1">
            <h1 className="type-page text-foreground">
              {site.name}
            </h1>
            <p className="tabular mt-1 text-sm text-muted-foreground">
              {site.region} · {site.altitude} m rakım · ★{' '}
              {site.rating.toFixed(1)} ({site.reviewCount} değerlendirme)
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone="primary">Bortle {site.bortle}</Badge>
              {site.sqm && (
                <Badge tone="cold">SQM {site.sqm} mag/arcsec²</Badge>
              )}
              <Badge>Güney ufku: {site.southHorizon}</Badge>
              <Badge>{site.bestMonths}</Badge>
            </div>

            <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
              {site.description}
            </p>

            {site.warnings && site.warnings.length > 0 && (
              <div className="mt-6 rounded-card border border-warning/30 bg-warning/10 p-4">
                <h2 className="text-body-sm font-semibold text-warning">Uyarılar</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {site.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <section className="mt-8">
              <h2 className="type-section mb-3 font-semibold text-foreground">
                Erişim ve Tesisler
              </h2>
              <p className="mb-3 text-sm text-muted-foreground">
                Yol durumu:{' '}
                <span className="text-foreground">{site.roadAccess}</span>
              </p>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {facilityRows.map(([label, ok]) => (
                  <li
                    key={label}
                    className="flex items-center gap-2 rounded-card border border-border bg-surface-1 px-3 py-2 text-sm"
                  >
                    <span
                      aria-hidden
                      className={
                        ok ? 'text-success' : 'text-muted-foreground/50'
                      }
                    >
                      {ok ? '✓' : '✗'}
                    </span>
                    <span
                      className={
                        ok ? 'text-foreground' : 'text-muted-foreground/60'
                      }
                    >
                      {label}
                      <span className="sr-only">{ok ? ' var' : ' yok'}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="w-full shrink-0 lg:w-72">
            <div className="rounded-card border border-border bg-surface-1 p-4 text-meta leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground">Konum bilgisi</p>
              <p className="mt-2 text-xs leading-relaxed">
                Koordinatlar gizlilik politikası gereği yaklaşık paylaşılır
                (§15.3). Harita görünümü ve yol tarifi, harita katmanı devreye
                alınınca eklenecek.
              </p>
              <hr className="my-4 border-border" />
              <p className="text-xs">
                Canlı saha raporları (yol/gökyüzü/kalabalık) Faz 2'de açılacak.
              </p>
            </div>
            <ButtonLink
              to={`/galeri?sehir=${encodeURIComponent(site.region)}`}
              variant="secondary"
              className="mt-4 w-full"
            >
              Bu bölgeden fotoğraflar
            </ButtonLink>
            <ButtonLink
              to="/saha"
              variant="ghost"
              className="mt-4 w-full"
            >
              ← Tüm noktalar
            </ButtonLink>
          </aside>
        </div>
      </Container>
    </>
  );
}

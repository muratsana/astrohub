import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { PhotoPlaceholder } from '@/components/media/PhotoPlaceholder';
import { sites } from './data';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';

/**
 * Kamp ve gözlem noktaları listesi (§7.7 alt kümesi).
 * Tam ekran ışık kirliliği haritası, tile sağlayıcısı lisansı doğrulandıktan
 * sonra Faz 1.7'de eklenecek (§14.1); şimdilik kart listesi.
 */
export function SitesPage() {
  return (
    <>
      <PageMeta
        title="Kamp ve Gözlem Noktaları"
        description="Türkiye'nin karanlık gökyüzü noktaları: Bortle sınıfı, SQM, rakım, yol erişimi ve kamp olanaklarıyla değerlendirilmiş astrocamping alanları."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Harita', path: '/harita' },
          { name: 'Gözlem Noktaları', path: '/harita/gozlem-noktalari' },
        ])}
      />
      <Container className="py-10 sm:py-14">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Kamp ve Gözlem Noktaları
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Türkiye'nin karanlık gökyüzü noktaları — Bortle/SQM ölçümleri,
            erişim ve tesis bilgileriyle.
          </p>
        </header>

        <ul className="grid gap-4 sm:grid-cols-2">
          {sites.map((site) => (
            <li key={site.slug}>
              <Link
                to={`/gozlem-noktasi/${site.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface-1 transition-colors hover:border-white/20"
              >
                <PhotoPlaceholder
                  gradient={site.gradient}
                  alt={site.name}
                  rounded="rounded-none"
                  className="aspect-[21/9] w-full"
                />
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-foreground">
                        {site.name}
                      </h2>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {site.region} · {site.altitude} m
                      </p>
                    </div>
                    <p className="tabular shrink-0 text-sm text-muted-foreground">
                      ★ {site.rating.toFixed(1)}{' '}
                      <span className="text-muted-foreground/60">
                        ({site.reviewCount})
                      </span>
                    </p>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                    <Badge tone="primary">Bortle {site.bortle}</Badge>
                    {site.sqm && <Badge tone="blue">SQM {site.sqm}</Badge>}
                    <Badge>{site.roadAccess}</Badge>
                    {site.facilities.tentArea && (
                      <Badge tone="teal">Çadır</Badge>
                    )}
                    {site.facilities.caravanOk && (
                      <Badge tone="teal">Karavan</Badge>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-8 rounded-2xl border border-border bg-surface-1 p-4 text-center text-xs text-muted-foreground">
          Işık kirliliği haritası, veri lisansı doğrulandıktan sonra bu sayfaya
          eklenecek. Konumlar gizlilik politikası gereği yaklaşık gösterilir.
        </p>
      </Container>
    </>
  );
}

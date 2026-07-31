import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { CardGrid } from '@/components/ui/CardGrid';
import { ToolBar, ResultCount } from '@/components/ui/ToolBar';
import { useViewMode } from '@/components/ui/useViewMode';
import { PlateFrame } from '@/components/media/PlateFrame';
import { StarField } from '@/components/media/StarField';
import { tintFromSeed } from '@/components/media/tints';
import { useSiteCatalog } from '@/services/content/sites';
import { CatalogSourceNote } from '@/components/ui/CatalogSourceNote';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { cn } from '@/lib/cn';

/**
 * Kamp ve gözlem noktaları listesi (§7.7 alt kümesi).
 *
 * Tam ekran ışık kirliliği haritası, tile sağlayıcısı lisansı doğrulandıktan
 * sonra Faz 1.7'de eklenecek (§14.1); şimdilik kart listesi.
 *
 * Bortle sınıfı burada rozet değil, ölçüm okuması gibi gösterilir: bu sayfada
 * karşılaştırmayı yapan tek sayı odur.
 */
export function SitesPage() {
  const [view, setView] = useViewMode('saha');
  const catalog = useSiteCatalog();

  return (
    <>
      <PageMeta
        title="Kamp ve Gözlem Noktaları"
        description="Türkiye'nin karanlık gökyüzü noktaları: Bortle sınıfı, SQM, rakım, yol erişimi ve kamp olanaklarıyla değerlendirilmiş astrocamping alanları."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Saha', path: '/saha' },
        ])}
      />
      <Container className="py-8 sm:py-10">
        <PageHeader
          title="Kamp ve Gözlem Noktaları"
          description="Türkiye'nin karanlık gökyüzü noktaları — Bortle/SQM ölçümleri, erişim ve tesis bilgileriyle."
        />

        <CatalogSourceNote selection={catalog} />

        <ToolBar
          left={
            <ResultCount
              current={catalog.items.length}
              total={catalog.items.length}
              noun="nokta"
            />
          }
          view={{ mode: view, onChange: setView }}
        />

        <CardGrid view={view}>
          {catalog.items.map((site) => {
            const facilities = [
              site.facilities.tentArea && 'Çadır',
              site.facilities.caravanOk && 'Karavan',
            ].filter(Boolean) as string[];

            if (view === 'list') {
              return (
                <li key={site.slug}>
                  <Link
                    to={`/saha/${site.slug}`}
                    className="group flex items-center gap-3 rounded-card border border-border bg-surface-1 px-3 py-2.5 transition-colors hover:border-border-strong"
                  >
                    <BortleBlock bortle={site.bortle} />
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-[13px] font-medium text-foreground group-hover:text-primary">
                        {site.name}
                      </h2>
                      <p className="tabular mt-0.5 truncate text-meta text-muted-foreground">
                        {site.region} · {site.altitude} m · {site.roadAccess}
                        {site.sqm && ` · SQM ${site.sqm}`}
                      </p>
                    </div>
                    <p className="tabular shrink-0 text-meta text-muted-foreground">
                      ★ {site.rating.toFixed(1)}{' '}
                      <span className="text-faint">({site.reviewCount})</span>
                    </p>
                  </Link>
                </li>
              );
            }

            return (
              <li key={site.slug}>
                <Link
                  to={`/saha/${site.slug}`}
                  className="group flex h-full flex-col rounded-card border border-border bg-surface-1 transition-colors hover:border-border-strong"
                >
                  <PlateFrame
                    ratio="aspect-[21/9]"
                    className="border-0 border-b border-border"
                    badge={
                      <Badge tone="primary" className="bg-background/85">
                        Bortle {site.bortle}
                      </Badge>
                    }
                    fieldOfView={site.sqm ? `SQM ${site.sqm}` : undefined}
                  >
                    <StarField seed={site.slug} tint={tintFromSeed(site.slug)} />
                  </PlateFrame>

                  <div className="flex flex-1 flex-col px-2.5 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-[13px] font-medium leading-snug text-foreground group-hover:text-primary">
                        {site.name}
                      </h2>
                      <p className="tabular shrink-0 text-meta text-muted-foreground">
                        ★ {site.rating.toFixed(1)}
                      </p>
                    </div>
                    <p className="tabular mt-0.5 text-meta text-muted-foreground">
                      {site.region} · {site.altitude} m
                    </p>
                    <div className="mt-auto flex flex-wrap gap-1 pt-2">
                      <Badge>{site.roadAccess}</Badge>
                      {facilities.map((f) => (
                        <Badge key={f} tone="cold">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </CardGrid>

        <p className="mt-4 rounded-card border border-border bg-surface-1 px-3 py-2.5 text-meta leading-relaxed text-muted-foreground">
          Işık kirliliği haritası, veri lisansı doğrulandıktan sonra bu sayfaya
          eklenecek. Konumlar gizlilik politikası gereği yaklaşık gösterilir.
        </p>
      </Container>
    </>
  );
}

/**
 * Bortle okuması. Ölçek 1–9 arasıdır ve **küçük iyidir**; renk bu yüzden
 * değerin kendisine bağlanır — 1–3 arası soğuk mavi (karanlık), 7+ kehribar
 * (kirli). Renk tek başına anlam taşımasın diye sayı her zaman yazılır (§6.7).
 */
function BortleBlock({ bortle }: { bortle: number }) {
  const tone =
    bortle <= 3 ? 'text-cold' : bortle <= 5 ? 'text-foreground' : 'text-primary';

  return (
    <div className="flex w-11 shrink-0 flex-col items-center rounded-card border border-border bg-surface-2 py-1">
      <span
        className={cn(
          'tabular font-display text-[17px] font-bold leading-none',
          tone
        )}
      >
        {bortle}
      </span>
      <span className="mt-0.5 text-meta tracking-[0.02em] text-muted-foreground">
        Bortle
      </span>
    </div>
  );
}

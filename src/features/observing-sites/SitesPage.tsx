import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { CardGrid } from '@/components/ui/CardGrid';
import { ToolBar, ResultCount } from '@/components/ui/ToolBar';
import { useViewMode } from '@/components/ui/useViewMode';
import {
  ContentCard,
  ContentCardActions,
  ContentCardBody,
  ContentCardMedia,
  ContentCardMeta,
  ContentCardTitle,
} from '@/components/ui/ContentCard';
import { StarField } from '@/components/media/StarField';
import { tintFromSeed } from '@/components/media/tints';
import { useSiteCatalog } from '@/services/content/sites';
import { CatalogSourceNote } from '@/components/ui/CatalogSourceNote';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { Input, Select } from '@/components/ui/Input';
import { FilterBar, FilterCell, filterControlClass } from '@/components/ui/FilterBar';
import { useExplorer } from '@/features/explorer/useExplorer';
import { sitesSpec } from './sitesSpec';
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

  /*
   * ORTAK DATA EXPLORER (Faz 4).
   *
   * Bu sayfada HİÇ filtre yoktu — ne arama, ne sıralama. Katalog
   * büyüdükçe kullanıcı aradığı sahayı gözle taramak zorundaydı.
   * Varsayılan sıralama "en karanlık": sayfaya gelen soru bu.
   */
  const ex = useExplorer(catalog.items, sitesSpec);

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

        <FilterBar columns={2}>
          <FilterCell label="Ara" htmlFor="site-search">
            <Input
              id="site-search"
              type="search"
              placeholder="Saha adı, bölge veya yol erişimi"
              value={ex.searchInput}
              onChange={(e) => ex.setSearch(e.target.value)}
              className={filterControlClass}
            />
          </FilterCell>
          <FilterCell label="Bortle" htmlFor="site-bortle">
            <Select
              id="site-bortle"
              value={ex.query.facets.bortle?.[0] ?? 'hepsi'}
              onChange={(e) => {
                const mevcut = ex.query.facets.bortle?.[0];
                if (mevcut) ex.toggleFacet('bortle', mevcut);
                if (e.target.value !== 'hepsi') {
                  ex.toggleFacet('bortle', e.target.value);
                }
              }}
              className={filterControlClass}
            >
              <option value="hepsi">Tüm sınıflar</option>
              {[...ex.counts('bortle').entries()]
                .sort((a, b) => Number(a[0]) - Number(b[0]))
                .map(([v, n]) => (
                  <option key={v} value={v}>
                    Bortle {v} ({n})
                  </option>
                ))}
            </Select>
          </FilterCell>
        </FilterBar>

        <CatalogSourceNote selection={catalog} />

        <ToolBar
          left={
            <ResultCount
              current={ex.total}
              total={catalog.items.length}
              noun="nokta"
            />
          }
          sort={{
            id: 'site-sort',
            value: ex.query.sort,
            onChange: ex.setSort,
            options: sitesSpec.sorts.map((s) => ({
              value: s.value,
              label: s.label,
            })),
          }}
          view={{ mode: view, onChange: setView }}
        />

        <CardGrid view={view}>
          {ex.items.map((site) => {
            const facilities = [
              site.facilities.tentArea && 'Çadır',
              site.facilities.caravanOk && 'Karavan',
            ].filter(Boolean) as string[];

            if (view === 'list') {
              return (
                <li key={site.slug}>
                  <ContentCard to={`/saha/${site.slug}`} variant="list">
                    <BortleBlock bortle={site.bortle} />
                    <div className="min-w-0 flex-1">
                      <ContentCardTitle className="font-medium">
                        {site.name}
                      </ContentCardTitle>
                      <ContentCardMeta className="mt-0.5">
                        {site.region} · {site.altitude} m · {site.roadAccess}
                        {site.sqm && ` · SQM ${site.sqm}`}
                      </ContentCardMeta>
                    </div>
                    <p className="tabular shrink-0 text-meta text-muted-foreground">
                      ★ {site.rating.toFixed(1)}{' '}
                      <span className="text-faint">({site.reviewCount})</span>
                    </p>
                  </ContentCard>
                </li>
              );
            }

            return (
              <li key={site.slug}>
                <ContentCard to={`/saha/${site.slug}`}>
                  {/* Standart oran. Panoramik 21:9 kullanılıyordu; aynı
                      ızgaradaki ilan ve hedef kartlarından alçak kalıyor,
                      satır hizasını bozuyordu (bkz. CARD_RATIO). */}
                  <ContentCardMedia
                    badge={
                      <Badge tone="primary" className="bg-background/85">
                        Bortle {site.bortle}
                      </Badge>
                    }
                    fieldOfView={site.sqm ? `SQM ${site.sqm}` : undefined}
                  >
                    <StarField seed={site.slug} tint={tintFromSeed(site.slug)} />
                  </ContentCardMedia>

                  <ContentCardBody>
                    <div className="flex items-start justify-between gap-2">
                      <ContentCardTitle
                        lines={2}
                        className="font-medium leading-snug"
                      >
                        {site.name}
                      </ContentCardTitle>
                      <p className="tabular shrink-0 text-meta text-muted-foreground">
                        ★ {site.rating.toFixed(1)}
                      </p>
                    </div>
                    <ContentCardMeta className="mt-0.5">
                      {site.region} · {site.altitude} m
                    </ContentCardMeta>
                    <ContentCardActions>
                      <Badge>{site.roadAccess}</Badge>
                      {facilities.map((f) => (
                        <Badge key={f} tone="cold">
                          {f}
                        </Badge>
                      ))}
                    </ContentCardActions>
                  </ContentCardBody>
                </ContentCard>
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
          'tabular font-display text-readout-sm font-bold leading-none',
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

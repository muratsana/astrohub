import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardGrid } from '@/components/ui/CardGrid';
import { ModuleToolbar } from '@/components/ui/ModuleToolbar';
import { useStoredChoice, type ListView } from '@/components/ui/useViewMode';
import { DataTable, type Column } from '@/components/ui/DataTable';
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
import {
  FilterCell,
  filterControlClass,
} from '@/components/ui/FilterBar';
import { useExplorer } from '@/features/explorer/useExplorer';
import { sitesSpec } from './sitesSpec';
import { siteTypeLabels, type ObservingSite, type SiteType } from './data';
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
  const [view, setView] = useStoredChoice<ListView>(
    'saha',
    ['grid', 'list', 'table'],
    'grid'
  );
  const catalog = useSiteCatalog();

  /*
   * ORTAK DATA EXPLORER (Faz 4).
   *
   * Bu sayfada HİÇ filtre yoktu — ne arama, ne sıralama. Katalog
   * büyüdükçe kullanıcı aradığı sahayı gözle taramak zorundaydı.
   * Varsayılan sıralama "en karanlık": sayfaya gelen soru bu.
   */
  const ex = useExplorer(catalog.items, sitesSpec);
  const siteTypes = Object.entries(siteTypeLabels) as [SiteType, string][];

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

        <ModuleToolbar
          columns={2}
          activeFilters={{
            chips: ex.chips,
            onRemove: ex.removeChip,
            onClearAll: ex.clearAll,
          }}
          result={{
            current: ex.total,
            total: catalog.items.length,
            noun: 'nokta',
          }}
          sort={{
            id: 'site-sort',
            value: ex.query.sort,
            onChange: ex.setSort,
            options: sitesSpec.sorts.map((s) => ({
              value: s.value,
              label: s.label,
            })),
          }}
          view={{
            mode: view,
            onChange: setView,
            modes: ['grid', 'list', 'table'],
          }}
        >
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
          <FilterCell label="Tür" htmlFor="site-type">
            <Select
              id="site-type"
              value={ex.query.facets.tur?.[0] ?? 'hepsi'}
              onChange={(e) => {
                const mevcut = ex.query.facets.tur?.[0];
                if (mevcut) ex.toggleFacet('tur', mevcut);
                if (e.target.value !== 'hepsi') {
                  ex.toggleFacet('tur', e.target.value);
                }
              }}
              className={filterControlClass}
            >
              <option value="hepsi">Tüm türler</option>
              {siteTypes.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
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
        </ModuleToolbar>

        <CatalogSourceNote selection={catalog} />

        {ex.items.length === 0 ? (
          <EmptyState
            message="Eşleşen saha yok"
            hint="Bortle veya tür filtresini gevşetmeyi deneyin."
          />
        ) : view === 'table' ? (
          <DataTable
            caption="Gözlem noktaları"
            preferenceKey="saha"
            rows={ex.items}
            rowKey={(site) => site.slug}
            rowHref={(site) => `/saha/${site.slug}`}
            sort={{ value: ex.query.sort, onChange: ex.setSort }}
            columns={siteColumns}
          />
        ) : (
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
                          {site.region} · {siteTypeLabels[site.siteType]} ·{' '}
                          {site.altitude} m · {site.roadAccess}
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
                      <StarField
                        seed={site.slug}
                        tint={tintFromSeed(site.slug)}
                      />
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
                        {site.region} · {siteTypeLabels[site.siteType]} ·{' '}
                        {site.altitude} m
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
        )}

        <p className="mt-4 rounded-card border border-border bg-surface-1 px-3 py-2.5 text-meta leading-relaxed text-muted-foreground">
          Işık kirliliği haritası, veri lisansı doğrulandıktan sonra bu sayfaya
          eklenecek. Konumlar gizlilik politikası gereği yaklaşık gösterilir.
        </p>
      </Container>
    </>
  );
}

const siteColumns: Column<ObservingSite>[] = [
  {
    key: 'ad',
    header: 'Saha adı',
    cell: (site) => site.name,
    alwaysVisible: true,
    sort: { asc: 'ad' },
  },
  { key: 'konum', header: 'Konum', cell: (site) => site.region },
  { key: 'tur', header: 'Tür', cell: (site) => siteTypeLabels[site.siteType] },
  {
    key: 'bortle',
    header: 'Bortle',
    numeric: true,
    cell: (site) => site.bortle,
    sort: { asc: 'karanlik', desc: 'bortle-yuksek' },
  },
  {
    key: 'rakim',
    header: 'Rakım',
    numeric: true,
    cell: (site) => `${site.altitude} m`,
    sort: { desc: 'rakim' },
  },
  {
    key: 'dogrulama',
    header: 'Son doğrulama',
    cell: () => 'Tohum veri',
  },
];

/**
 * Bortle okuması. Ölçek 1–9 arasıdır ve **küçük iyidir**; renk bu yüzden
 * değerin kendisine bağlanır — 1–3 arası soğuk mavi (karanlık), 7+ kehribar
 * (kirli). Renk tek başına anlam taşımasın diye sayı her zaman yazılır (§6.7).
 */
function BortleBlock({ bortle }: { bortle: number }) {
  const tone =
    bortle <= 3
      ? 'text-cold'
      : bortle <= 5
        ? 'text-foreground'
        : 'text-primary';

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

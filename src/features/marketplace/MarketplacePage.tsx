import { Container } from '@/components/ui/Container';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardGrid } from '@/components/ui/CardGrid';
import { ButtonLink } from '@/components/ui/Button';
import { ToolBar, ResultCount } from '@/components/ui/ToolBar';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { CatalogSourceNote } from '@/components/ui/CatalogSourceNote';
import { useStoredChoice, type ListView } from '@/components/ui/useViewMode';
import { DataTable, type Column } from '@/components/ui/DataTable';
import {
  FilterBar,
  FilterCell,
  FilterToggle,
  filterControlClass,
} from '@/components/ui/FilterBar';
import { ActiveFilters } from '@/components/ui/ActiveFilters';
import { RangeFilter } from '@/components/ui/RangeFilter';
import {
  ContentCard,
  ContentCardBody,
  ContentCardMedia,
  ContentCardMeta,
  ContentCardTitle,
} from '@/components/ui/ContentCard';
import { RemoteImage } from '@/components/media/RemoteImage';
import { tintFromSeed } from '@/components/media/tints';
import {
  equipmentCategoryLabels,
  type EquipmentCategory,
} from '@/features/equipment/data';
import { useListings } from '@/services/content/listings';
import { useExplorer } from '@/features/explorer/useExplorer';
import { listingsSpec } from './listingsSpec';
import type { Listing } from './data';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { useMemo } from 'react';

const categories: (EquipmentCategory | 'hepsi')[] = [
  'hepsi',
  'optik-tup',
  'lens',
  'montur',
  'astro-kamera',
  'filtre',
  'guide',
  'aksesuar',
];

const categoryOptions = categories.map((c) => ({
  value: c,
  label: c === 'hepsi' ? 'Tümü' : equipmentCategoryLabels[c],
}));

/**
 * İKİNCİ EL PAZARYERİ (§7.13).
 *
 * Güven sinyali kartın süsü değil filtresidir: "yalnızca faturalı" bir
 * onay kutusu, kartın altında tekrar eden bir rozet değil. Kart üzerinde
 * yalnızca ekipman tipi duruyor ve o da görselin üstünde — kartın gövdesi
 * başlık, fiyat ve satıcıya kalıyor.
 *
 * Satıcı doğrulaması kavram olarak kalktı: ilan yalnızca kayıtlı
 * kullanıcıdan açılıyor, yani hem rozet hem süzgeç herkes için aynı
 * sonucu veriyordu.
 */
export function MarketplacePage() {
  /*
   * PAZARYERİ TABLO GÖRÜNÜMÜNÜ DESTEKLİYOR (§7.3).
   *
   * Neden burası: ilanın karar verdiren alanları (fiyat, şehir, durum,
   * tarih) sayısal ve karşılaştırmalı. Kart ızgarası bir ilana bakmak
   * için, tablo ON İLANI KARŞILAŞTIRMAK için iyi — ikinci el alırken
   * kullanıcının yaptığı da bu.
   */
  const [view, setView] = useStoredChoice<ListView>(
    'ilanlar',
    ['grid', 'list', 'table'],
    'grid'
  );
  const catalog = useListings();

  /*
   * ORTAK DATA EXPLORER (Faz 4). Sayfanın kendi filtre durumu bıraktı;
   * arama artık ASCII katlıyor ("sanliurfa" → Şanlıurfa) ve şehir
   * filtresi geldi — ikinci elde elden teslim yaygın olduğu için "hangi
   * şehirde" fiyat kadar belirleyici, ama sayfada hiç yoktu.
   */
  const ex = useExplorer(catalog.items, listingsSpec);
  const result = ex.items;
  const category = ex.query.facets.kategori?.[0] ?? 'hepsi';
  const cities = useMemo(
    () =>
      [...new Set(catalog.items.map((l) => l.city))].sort((a, b) =>
        a.localeCompare(b, 'tr')
      ),
    [catalog.items]
  );

  /** Kategori sekmeleri tek seçim: bir sekme şeridi, çoklu liste değil. */
  const setCategory = (next: string) => {
    if (category !== 'hepsi') ex.toggleFacet('kategori', category);
    if (next !== 'hepsi' && next !== category) ex.toggleFacet('kategori', next);
  };

  return (
    <>
      <PageMeta
        title="İkinci El Astronomi Ekipmanları"
        description="Ekipman veritabanına bağlı, güven sinyalleriyle desteklenen ikinci el astronomi pazaryeri: teleskop, montür, kamera ve filtre ilanları."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'İlanlar', path: '/ilanlar' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          title="İkinci El İlanlar"
          description="Ekipman veritabanına bağlı astronomi pazaryeri. İletişim platform içinden yürür; Astrohub ödemeye aracılık etmez, emanet (escrow) hizmeti sunmaz."
          actions={
            <ButtonLink to="/ilan/yeni" size="sm">
              İlan ver
            </ButtonLink>
          }
        />

        <SegmentedControl
          ariaLabel="İlan kategorileri"
          value={category}
          onChange={setCategory}
          options={categoryOptions}
          className="mb-4"
        />

        <FilterBar activeCount={ex.chips.length}>
          <FilterCell
            label="Ara"
            htmlFor="listing-search"
            className="lg:col-span-2"
          >
            <Input
              id="listing-search"
              type="search"
              placeholder="İlan başlığı, şehir veya satıcı"
              value={ex.searchInput}
              onChange={(e) => ex.setSearch(e.target.value)}
              className={filterControlClass}
            />
          </FilterCell>
          {/* Fiyat ARALIK, facet değil: her ilan kendi fiyatının
              kutucuğunu açsaydı süzgeç kayıt sayısı kadar uzardı. */}
          <RangeFilter
            spec={listingsSpec.ranges![0]}
            value={ex.query.ranges.fiyat}
            onChange={(next) => ex.setRange('fiyat', next)}
          />
          <FilterCell label="Şehir" htmlFor="listing-city">
            <Select
              id="listing-city"
              value={ex.query.facets.sehir?.[0] ?? 'hepsi'}
              onChange={(e) => {
                const mevcut = ex.query.facets.sehir?.[0];
                if (mevcut) ex.toggleFacet('sehir', mevcut);
                if (e.target.value !== 'hepsi') {
                  ex.toggleFacet('sehir', e.target.value);
                }
              }}
              className={filterControlClass}
            >
              <option value="hepsi">Tüm şehirler</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </Select>
          </FilterCell>
          <FilterToggle
            id="listing-invoice"
            label="Yalnızca faturalı"
            checked={(ex.query.facets.faturali?.length ?? 0) > 0}
            onChange={() => ex.toggleFacet('faturali', 'evet')}
          />
          {/* "Doğrulanmış satıcı" süzgeci kalktı: ilan yalnızca kayıtlı
              kullanıcıdan açılıyor, yani süzgeç herkesi geçiriyordu. */}
        </FilterBar>

        <ActiveFilters
          chips={ex.chips}
          onRemove={ex.removeChip}
          onClearAll={ex.clearAll}
        />

        <CatalogSourceNote selection={catalog} />

        <ToolBar
          left={
            <ResultCount
              current={ex.total}
              total={catalog.items.length}
              noun="ilan"
            />
          }
          sort={{
            id: 'listing-sort',
            value: ex.query.sort,
            onChange: ex.setSort,
            options: listingsSpec.sorts.map((s) => ({
              value: s.value,
              label: s.label,
            })),
          }}
          view={{
            mode: view,
            onChange: setView,
            modes: ['grid', 'list', 'table'],
          }}
        />

        {result.length === 0 ? (
          <EmptyState
            message="Eşleşen ilan yok"
            hint="Filtreleri gevşetmeyi deneyin — ya da elinizdeki ekipman için ilan açın."
          />
        ) : view === 'table' ? (
          /*
             SIRALAMA TABLONUN İÇİNDE TUTULMUYOR: başlıklar motorun
             `sort` değerini değiştiriyor, yani tablodan ızgaraya geçen
             kullanıcı sıralamasını koruyor ve URL'deki `?sirala=` ile
             başlıktaki ok her zaman aynı şeyi söylüyor.
          */
          <DataTable
            caption="İlanlar"
            preferenceKey="ilanlar"
            rows={result}
            rowKey={(l) => l.slug}
            rowHref={(l) => `/ilan/${l.slug}`}
            sort={{ value: ex.query.sort, onChange: ex.setSort }}
            columns={listingColumns}
          />
        ) : (
          /* Yoğunluk `tight`: kart ölçüsü galeriyle aynı olsun.
             Pazaryeri tek başına 4 kolonda duruyordu ve aynı ekranda
             galeri karolarından belirgin biçimde iri görünüyordu. */
          <CardGrid view={view}>
            {result.map((listing) => (
              <li key={listing.slug}>
                <ListingCard listing={listing} variant={view} />
              </li>
            ))}
          </CardGrid>
        )}

        <p className="mt-6 text-center text-meta leading-relaxed text-faint">
          Platform içi ödeme/escrow MVP kapsamı dışındadır. Alım-satımda elden
          teslim ve yerinde deneme önerilir.
        </p>
      </Container>
    </>
  );
}

/**
 * TABLO SÜTUNLARI — kararın hangi alanlarda verildiği.
 *
 * Sıralama değerleri `listingsSpec.sorts` ile AYNI adları taşıyor;
 * başlık tıklaması açılır kutuyla aynı durumu kuruyor. Sütun kendi
 * sıralamasını hesaplasaydı iki farklı "en ucuz" tanımı olurdu.
 */
const listingColumns: Column<Listing>[] = [
  {
    key: 'baslik',
    header: 'İlan',
    cell: (l) => l.title,
    alwaysVisible: true,
    sort: { asc: 'baslik' },
  },
  {
    key: 'fiyat',
    header: 'Fiyat',
    numeric: true,
    cell: (l) => `${l.price.toLocaleString('tr-TR')} ₺`,
    sort: { asc: 'ucuz', desc: 'pahali' },
  },
  { key: 'durum', header: 'Durum', cell: (l) => l.condition },
  { key: 'sehir', header: 'Şehir', cell: (l) => l.city },
  {
    key: 'satici',
    header: 'Satıcı',
    cell: (l) => `@${l.seller.username}`,
    sort: { desc: 'satici' },
  },
  {
    key: 'tarih',
    header: 'Yayın',
    cell: (l) => new Date(l.postedAt).toLocaleDateString('tr-TR'),
    sort: { desc: 'yeni' },
  },
];

function ListingCard({
  listing,
  variant,
}: {
  listing: Listing;
  variant: 'grid' | 'list';
}) {
  /*
    KARTIN ALTINDA ROZET YOK.

    Önce durum / faturalı / kargo üç ayrı rozet olarak duruyordu. Üçü
    de kartın altında bir satır kaplıyor ama hiçbiri seçim yaptırmıyordu:
    "çok iyi" ile "sıfır gibi" arasındaki fark satıcı beyanı, "faturalı"
    zaten filtrede var. Kalan tek ayırt edici bilgi ekipman tipi ve o da
    görselin üstünde duruyor — kartın gövdesi başlık, fiyat ve satıcıya
    kalıyor.

    "Doğrulanmış" rozeti de kalktı: ilan yalnızca kayıtlı kullanıcıdan
    açılıyor, yani rozet herkeste aynı şeyi söylüyordu.
  */
  if (variant === 'list') {
    return (
      <ContentCard to={`/ilan/${listing.slug}`} variant="list">
        <div className="min-w-0 flex-1">
          <ContentCardTitle className="font-medium">
            {listing.title}
          </ContentCardTitle>
          <ContentCardMeta className="mt-0.5">
            {listing.city} · @{listing.seller.username} · ★{' '}
            {listing.seller.rating.toFixed(1)}
          </ContentCardMeta>
        </div>
        <span className="tabular shrink-0 font-display text-body font-bold text-primary">
          {listing.price.toLocaleString('tr-TR')} ₺
        </span>
        <Badge tone="muted" className="hidden shrink-0 sm:inline-flex">
          {equipmentCategoryLabels[listing.category]}
        </Badge>
      </ContentCard>
    );
  }

  return (
    <ContentCard to={`/ilan/${listing.slug}`}>
      {/* Standart oran (4:3): ilan kartı galeri karosuyla aynı ızgarada
          duruyor; ayrı bir oran seçilseydi satır hizası bozulurdu. */}
      <ContentCardMedia
        badge={
          <Badge tone="muted" className="bg-background/85">
            {equipmentCategoryLabels[listing.category]}
          </Badge>
        }
      >
        <RemoteImage
          src={listing.imageUrl}
          alt={`${listing.title} fotoğrafı`}
          seed={listing.slug}
          tint={tintFromSeed(listing.slug)}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
        />
      </ContentCardMedia>

      <ContentCardBody>
        <ContentCardTitle lines={2} className="font-medium leading-snug">
          {listing.title}
        </ContentCardTitle>
        <p className="tabular mt-1.5 font-display text-readout-sm font-bold leading-none text-primary">
          {listing.price.toLocaleString('tr-TR')} ₺
        </p>
        <ContentCardMeta className="mt-auto pt-1">
          {listing.city} · @{listing.seller.username} · ★{' '}
          {listing.seller.rating.toFixed(1)}
        </ContentCardMeta>
      </ContentCardBody>
    </ContentCard>
  );
}

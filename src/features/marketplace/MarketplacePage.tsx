import { useEffect, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardGrid } from '@/components/ui/CardGrid';
import { ButtonLink } from '@/components/ui/Button';
import { ModuleToolbar } from '@/components/ui/ModuleToolbar';
import { CatalogSourceNote } from '@/components/ui/CatalogSourceNote';
import { useStoredChoice, type ListView } from '@/components/ui/useViewMode';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { FilterCell, filterControlClass } from '@/components/ui/FilterBar';
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
import { DistrictFilterCell } from '@/features/explorer/DistrictFilterCell';
import type { RangeValue } from '@/features/explorer/query';
import { listingsSpec } from './listingsSpec';
import type { Listing } from './data';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { cities as turkeyCities } from '@/features/location/cities';

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
  const cities = turkeyCities.map((city) => city.name);

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

        <ModuleToolbar
          activeFilters={{
            chips: ex.chips,
            onRemove: ex.removeChip,
            onClearAll: ex.clearAll,
          }}
          result={{
            current: ex.total,
            total: catalog.items.length,
            noun: 'ilan',
          }}
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
          primaryFilters={99}
          filterClassName="flex-wrap"
          showResultCount={false}
        >
          <FilterCell
            label="Ara"
            htmlFor="listing-search"
            active={ex.searchInput.trim().length > 0}
            className="min-w-[21rem] flex-[2_1_21rem]"
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
          <FilterCell
            label="Kategori"
            htmlFor="listing-category"
            active={category !== 'hepsi'}
            className="min-w-[12rem]"
          >
            <Select
              id="listing-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={filterControlClass}
            >
              {categoryOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </FilterCell>
          <ListingPriceFilter
            value={ex.query.ranges.fiyat}
            onChange={(next) => ex.setRange('fiyat', next)}
          />
          <FilterCell
            label="Şehir"
            htmlFor="listing-city"
            active={(ex.query.facets.sehir?.[0] ?? 'hepsi') !== 'hepsi'}
          >
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
          <DistrictFilterCell
            id="listing-district"
            counts={ex.counts('ilce')}
            selected={ex.query.facets.ilce?.[0]}
            onSelect={(next) => {
              const mevcut = ex.query.facets.ilce?.[0];
              if (mevcut) ex.toggleFacet('ilce', mevcut);
              if (next) ex.toggleFacet('ilce', next);
            }}
          />
          <FilterCell
            label="Fatura"
            htmlFor="listing-invoice"
            active={(ex.query.facets.faturali?.length ?? 0) > 0}
            className="min-w-[11rem]"
          >
            <Select
              id="listing-invoice"
              value={ex.query.facets.faturali?.[0] ?? 'hepsi'}
              onChange={(event) => {
                const mevcut = ex.query.facets.faturali?.[0];
                if (mevcut) ex.toggleFacet('faturali', mevcut);
                if (event.target.value !== 'hepsi') {
                  ex.toggleFacet('faturali', event.target.value);
                }
              }}
              className={filterControlClass}
            >
              <option value="hepsi">Tüm ilanlar</option>
              <option value="evet">Faturalı</option>
            </Select>
          </FilterCell>
          {/* "Doğrulanmış satıcı" süzgeci kalktı: ilan yalnızca kayıtlı
              kullanıcıdan açılıyor, yani süzgeç herkesi geçiriyordu. */}
        </ModuleToolbar>

        <CatalogSourceNote selection={catalog} />

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

function ListingPriceFilter({
  value,
  onChange,
}: {
  value: RangeValue | undefined;
  onChange: (next: Partial<RangeValue>) => void;
}) {
  const toText = (n: number | null | undefined) =>
    n === null || n === undefined ? '' : String(n);
  const [min, setMin] = useState(() => toText(value?.min));
  const [max, setMax] = useState(() => toText(value?.max));

  useEffect(() => setMin(toText(value?.min)), [value?.min]);
  useEffect(() => setMax(toText(value?.max)), [value?.max]);

  const parse = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const apply = (edge: 'min' | 'max', raw: string) =>
    onChange({ [edge]: parse(raw), includeEmpty: false });

  const input = (
    edge: 'min' | 'max',
    current: string,
    setCurrent: (value: string) => void
  ) => (
    <span className="flex min-w-0 flex-1 items-center gap-1">
      <input
        type="number"
        inputMode="numeric"
        step={500}
        value={current}
        aria-label={`Fiyat ${edge === 'min' ? 'en az' : 'en çok'}`}
        placeholder={edge === 'min' ? 'en az' : 'en çok'}
        onChange={(event) => setCurrent(event.target.value)}
        onBlur={(event) => apply(edge, event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          apply(edge, (event.target as HTMLInputElement).value);
        }}
        className={`${filterControlClass} min-w-0 font-sans`}
      />
      <span aria-hidden className="shrink-0 text-meta text-faint">
        ₺
      </span>
    </span>
  );

  return (
    <FilterCell
      label="Fiyat"
      active={Boolean(value && (value.min !== null || value.max !== null))}
      className="min-w-[16rem]"
    >
      <span className="flex items-center gap-1.5">
        {input('min', min, setMin)}
        <span aria-hidden className="shrink-0 text-meta text-faint">
          –
        </span>
        {input('max', max, setMax)}
      </span>
    </FilterCell>
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

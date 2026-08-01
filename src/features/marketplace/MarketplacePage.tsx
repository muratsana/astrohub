import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardGrid } from '@/components/ui/CardGrid';
import { ButtonLink } from '@/components/ui/Button';
import { ToolBar, ResultCount } from '@/components/ui/ToolBar';
import { CatalogSourceNote } from '@/components/ui/CatalogSourceNote';
import { useViewMode } from '@/components/ui/useViewMode';
import {
  FilterBar,
  FilterCell,
  FilterToggle,
  filterControlClass,
} from '@/components/ui/FilterBar';
import { ActiveFilters } from '@/components/ui/ActiveFilters';
import {
  ContentCard,
  ContentCardBody,
  ContentCardMedia,
  ContentCardMeta,
  ContentCardTitle,
} from '@/components/ui/ContentCard';
import { StarField } from '@/components/media/StarField';
import { tintFromSeed } from '@/components/media/tints';
import {
  equipmentCategoryLabels,
  type EquipmentCategory,
} from '@/features/equipment/data';
import { useListings } from '@/services/content/listings';
import { useExplorer } from '@/features/explorer/useExplorer';
import { listingsSpec } from './listingsSpec';
import type { Listing } from './data';
import { cn } from '@/lib/cn';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';

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
  const [view, setView] = useViewMode('ilanlar');
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
          actions={<ButtonLink to="/ilan/yeni" size="sm">İlan ver</ButtonLink>}
        />

        <div
          role="tablist"
          aria-label="İlan kategorileri"
          className="mb-4 flex flex-wrap items-center gap-1.5"
        >
          {categories.map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={category === c}
              onClick={() => setCategory(c)}
              className={cn(
                'rounded-card border px-2.5 py-1 text-meta tracking-[0.03em] transition-colors',
                category === c
                  ? 'border-foreground/40 bg-surface-2 text-foreground'
                  : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
              )}
            >
              {c === 'hepsi' ? 'Tümü' : equipmentCategoryLabels[c]}
            </button>
          ))}
        </div>

        <FilterBar activeCount={ex.chips.length}>
          <FilterCell label="Ara" htmlFor="listing-search" className="lg:col-span-2">
            <Input
              id="listing-search"
              type="search"
              placeholder="İlan başlığı, şehir veya satıcı"
              value={ex.searchInput}
              onChange={(e) => ex.setSearch(e.target.value)}
              className={filterControlClass}
            />
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
          view={{ mode: view, onChange: setView }}
        />

        {result.length === 0 ? (
          <EmptyState
            message="Eşleşen ilan yok"
            hint="Filtreleri gevşetmeyi deneyin — ya da elinizdeki ekipman için ilan açın."
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
        <StarField seed={listing.slug} tint={tintFromSeed(listing.slug)} />
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

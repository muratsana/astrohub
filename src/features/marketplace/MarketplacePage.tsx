import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardGrid } from '@/components/ui/CardGrid';
import { ToolBar, ResultCount } from '@/components/ui/ToolBar';
import { useViewMode } from '@/components/ui/useViewMode';
import {
  FilterBar,
  FilterCell,
  FilterToggle,
  filterControlClass,
} from '@/components/ui/FilterBar';
import { PlateFrame } from '@/components/media/PlateFrame';
import { StarField } from '@/components/media/StarField';
import { tintFromSeed } from '@/components/media/tints';
import {
  equipmentCategoryLabels,
  type EquipmentCategory,
} from '@/features/equipment/data';
import { listings, type Listing } from './data';
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

type SortKey = 'yeni' | 'ucuz' | 'pahali';

/**
 * İKİNCİ EL PAZARYERİ (§7.13).
 *
 * Güven sinyalleri (fatura, doğrulanmış satıcı, değerlendirme) kartın
 * süsü değil filtresidir: ikinci el ekipmanda karar veren şey fiyat kadar
 * satıcının geçmişidir. Bu yüzden "yalnızca faturalı" ve "yalnızca
 * doğrulanmış satıcı" birer onay kutusu olarak duruyor.
 */
export function MarketplacePage() {
  const [category, setCategory] = useState<EquipmentCategory | 'hepsi'>('hepsi');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('yeni');
  const [onlyInvoice, setOnlyInvoice] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [view, setView] = useViewMode('ilanlar');

  const result = useMemo(() => {
    let items = listings;

    if (category !== 'hepsi') items = items.filter((l) => l.category === category);
    if (onlyInvoice) items = items.filter((l) => l.hasInvoice);
    if (onlyVerified) items = items.filter((l) => l.seller.verified);

    const q = search.trim().toLocaleLowerCase('tr-TR');
    if (q) {
      items = items.filter((l) =>
        `${l.title} ${l.city} ${l.seller.username}`
          .toLocaleLowerCase('tr-TR')
          .includes(q)
      );
    }

    return [...items].sort((a, b) => {
      if (sort === 'ucuz') return a.price - b.price;
      if (sort === 'pahali') return b.price - a.price;
      return b.postedAt.localeCompare(a.postedAt);
    });
  }, [category, search, sort, onlyInvoice, onlyVerified]);

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
                'rounded-card border px-2.5 py-1 text-[10px] tracking-[0.03em] transition-colors',
                category === c
                  ? 'border-foreground/40 bg-surface-2 text-foreground'
                  : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
              )}
            >
              {c === 'hepsi' ? 'Tümü' : equipmentCategoryLabels[c]}
            </button>
          ))}
        </div>

        <FilterBar>
          <FilterCell label="Ara" htmlFor="listing-search" className="lg:col-span-2">
            <Input
              id="listing-search"
              type="search"
              placeholder="İlan başlığı, şehir veya satıcı"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={filterControlClass}
            />
          </FilterCell>
          <FilterToggle
            id="listing-invoice"
            label="Yalnızca faturalı"
            checked={onlyInvoice}
            onChange={setOnlyInvoice}
          />
          <FilterToggle
            id="listing-verified"
            label="Doğrulanmış satıcı"
            checked={onlyVerified}
            onChange={setOnlyVerified}
          />
        </FilterBar>

        <ToolBar
          left={
            <ResultCount
              current={result.length}
              total={listings.length}
              noun="ilan"
            />
          }
          sort={{
            id: 'listing-sort',
            value: sort,
            onChange: (v) => setSort(v as SortKey),
            options: [
              { value: 'yeni', label: 'En yeni' },
              { value: 'ucuz', label: 'Artan fiyat' },
              { value: 'pahali', label: 'Azalan fiyat' },
            ],
          }}
          view={{ mode: view, onChange: setView }}
        />

        {result.length === 0 ? (
          <EmptyState
            message="Eşleşen ilan yok"
            hint="Filtreleri gevşetmeyi deneyin. İlan verme akışı hesap sistemiyle birlikte (Faz 1.8) açılacak."
          />
        ) : (
          <CardGrid view={view}>
            {result.map((listing) => (
              <li key={listing.slug}>
                <ListingCard listing={listing} variant={view} />
              </li>
            ))}
          </CardGrid>
        )}

        <p className="mt-6 text-center text-[10.5px] leading-relaxed text-faint">
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
  const badges = (
    <div className="flex flex-wrap gap-1">
      <Badge>{listing.condition}</Badge>
      {listing.hasInvoice && <Badge tone="success">Faturalı</Badge>}
      {listing.shippingOk && <Badge tone="cold">Kargo</Badge>}
    </div>
  );

  if (variant === 'list') {
    return (
      <Link
        to={`/ilan/${listing.slug}`}
        className="group flex h-full items-center gap-3 rounded-card border border-border bg-surface-1 px-3 py-2.5 transition-colors hover:border-border-strong"
      >
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[13px] font-medium text-foreground group-hover:text-primary">
            {listing.title}
          </h2>
          <p className="tabular mt-0.5 truncate text-[10px] text-muted-foreground">
            {listing.city} · @{listing.seller.username} · ★{' '}
            {listing.seller.rating.toFixed(1)}
          </p>
        </div>
        <span className="tabular shrink-0 font-display text-[15px] font-bold text-primary">
          {listing.price.toLocaleString('tr-TR')} ₺
        </span>
        <div className="hidden shrink-0 sm:block">{badges}</div>
      </Link>
    );
  }

  return (
    <Link
      to={`/ilan/${listing.slug}`}
      className="group flex h-full flex-col rounded-card border border-border bg-surface-1 transition-colors hover:border-border-strong"
    >
      <PlateFrame
        ratio="aspect-[16/9]"
        className="border-0 border-b border-border"
        flag={
          listing.seller.verified ? (
            <Badge tone="cold" className="bg-background/85">
              Doğrulanmış
            </Badge>
          ) : undefined
        }
      >
        <StarField seed={listing.slug} tint={tintFromSeed(listing.slug)} />
      </PlateFrame>

      <div className="flex flex-1 flex-col px-2.5 py-2">
        <h2 className="text-[13px] font-medium leading-snug text-foreground group-hover:text-primary">
          {listing.title}
        </h2>
        <p className="tabular mt-1.5 font-display text-[17px] font-bold leading-none text-primary">
          {listing.price.toLocaleString('tr-TR')} ₺
        </p>
        <p className="tabular mt-1 truncate text-[10px] text-muted-foreground">
          {listing.city} · @{listing.seller.username} · ★{' '}
          {listing.seller.rating.toFixed(1)}
        </p>
        <div className="mt-auto pt-2">{badges}</div>
      </div>
    </Link>
  );
}

import { useMemo, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { PhotoPlaceholder } from '@/components/media/PhotoPlaceholder';
import {
  equipmentCategoryLabels,
  type EquipmentCategory,
} from '@/features/equipment/data';
import { listings } from './data';
import { cn } from '@/lib/cn';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';

const categories: (EquipmentCategory | 'hepsi')[] = [
  'hepsi',
  'optik-tup',
  'montur',
  'astro-kamera',
  'filtre',
  'guide',
  'aksesuar',
];

/** İkinci el pazaryeri listesi (§7.13): kategori filtresi + güven sinyalleri. */
export function MarketplacePage() {
  const [category, setCategory] = useState<EquipmentCategory | 'hepsi'>(
    'hepsi'
  );

  const result = useMemo(
    () =>
      category === 'hepsi'
        ? listings
        : listings.filter((l) => l.category === category),
    [category]
  );

  return (
    <>
      <PageMeta
        title="İkinci El Astronomi Ekipmanları"
        description="Ekipman veritabanına bağlı, güven sinyalleriyle desteklenen ikinci el astronomi pazaryeri: teleskop, montür, kamera ve filtre ilanları."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'İkinci El', path: '/ikinci-el' },
        ])}
      />
      <Container className="py-10 sm:py-14">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            İkinci El İlanlar
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Ekipman veritabanına bağlı, güven sinyalleriyle desteklenen
            astronomi pazaryeri. Alım-satım iletişimi platform içinden yürür.
          </p>
        </header>

        <div
          role="tablist"
          aria-label="İlan kategorileri"
          className="mb-8 flex flex-wrap gap-1.5"
        >
          {categories.map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={category === c}
              onClick={() => setCategory(c)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                category === c
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {c === 'hepsi' ? 'Tümü' : equipmentCategoryLabels[c]}
            </button>
          ))}
        </div>

        {result.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">
            Bu kategoride aktif ilan yok.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.map((l) => (
              <li
                key={l.slug}
                className="flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface-1"
              >
                <PhotoPlaceholder
                  gradient={l.gradient}
                  alt={l.title}
                  rounded="rounded-none"
                  className="aspect-[16/9] w-full"
                />
                <div className="flex flex-1 flex-col p-4">
                  <h2 className="text-sm font-semibold leading-snug text-foreground">
                    {l.title}
                  </h2>
                  <p className="tabular mt-2 text-lg font-bold text-primary">
                    {l.price.toLocaleString('tr-TR')} ₺
                  </p>
                  <p className="tabular mt-0.5 text-xs text-muted-foreground">
                    {l.city} · @{l.seller.username} · ★{' '}
                    {l.seller.rating.toFixed(1)}
                    {l.seller.verified && ' · Doğrulanmış satıcı'}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                    <Badge>{l.condition}</Badge>
                    {l.hasInvoice && <Badge tone="success">Faturalı</Badge>}
                    {l.shippingOk && <Badge tone="teal">Kargo var</Badge>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground/70">
          İlan verme, mesajlaşma ve moderasyon akışı hesap sistemiyle birlikte
          (Faz 1.8) devreye alınacak. Platform içi ödeme/escrow MVP kapsamı
          dışındadır.
        </p>
      </Container>
    </>
  );
}

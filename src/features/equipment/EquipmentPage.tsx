import { useMemo, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import {
  equipment,
  equipmentCategoryLabels,
  type EquipmentCategory,
} from './data';
import { cn } from '@/lib/cn';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';

function trLower(s: string): string {
  return s.toLocaleLowerCase('tr-TR');
}

/**
 * Ekipman veritabanı listesi (§7.11): kategori sekmeleri + marka/model arama.
 * Ürün detay sayfası ve karşılaştırma Faz 1.5'te; FOV hesaplayıcıya bağlanır.
 */
export function EquipmentPage() {
  const [category, setCategory] = useState<EquipmentCategory | 'hepsi'>(
    'hepsi'
  );
  const [search, setSearch] = useState('');

  const result = useMemo(() => {
    let items = equipment;
    if (category !== 'hepsi')
      items = items.filter((e) => e.category === category);
    const q = trLower(search.trim());
    if (q) {
      items = items.filter((e) => trLower(`${e.brand} ${e.model}`).includes(q));
    }
    return items;
  }, [category, search]);

  const categories: (EquipmentCategory | 'hepsi')[] = [
    'hepsi',
    'optik-tup',
    'montur',
    'astro-kamera',
    'filtre',
    'guide',
    'aksesuar',
  ];

  return (
    <>
      <PageMeta
        title="Ekipman Veritabanı"
        description="Teleskop, montür, astro kamera, filtre ve guide sistemleri — kategoriye göre değişen teknik alanlarla marka/model kataloğu."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Ekipman', path: '/ekipman' },
        ])}
      />
      <Container className="py-10 sm:py-14">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Ekipman Veritabanı
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Standartlaştırılmış teknik verilerle astronomi ekipmanları. FOV
            hesaplayıcı ve setup'larla entegre çalışır.
          </p>
        </header>

        {/* Kategori sekmeleri */}
        <div
          role="tablist"
          aria-label="Ekipman kategorileri"
          className="mb-5 flex flex-wrap gap-1.5"
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

        <div className="mb-8 max-w-md">
          <label htmlFor="eq-search" className="sr-only">
            Marka veya model ara
          </label>
          <Input
            id="eq-search"
            type="search"
            placeholder="Marka veya model ara (ör. EQ6, ASI2600…)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {result.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">
            Eşleşen ekipman yok. Yeni model talebi Faz 1.5'te açılacak.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.map((e) => (
              <li
                key={e.slug}
                className="flex h-full flex-col rounded-card border border-border bg-surface-1 p-5"
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">{e.brand}</p>
                    <h2 className="text-base font-semibold text-foreground">
                      {e.model}
                    </h2>
                  </div>
                  <Badge>{equipmentCategoryLabels[e.category]}</Badge>
                </div>
                <dl className="tabular mt-3 space-y-1.5 text-sm">
                  {Object.entries(e.specs).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="text-right font-medium text-foreground">
                        {v}
                      </dd>
                    </div>
                  ))}
                </dl>
                {e.priceHint && (
                  <p className="mt-auto pt-3 text-xs text-muted-foreground/70">
                    {e.priceHint}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-10 rounded-2xl border border-border bg-surface-1 p-5 text-center">
          <p className="text-sm text-muted-foreground">
            Setup'ını kur, görüş alanını hemen hesapla.
          </p>
          <ButtonLink to="/araclar/fov" variant="secondary" className="mt-3">
            FOV Hesaplayıcıyı Aç
          </ButtonLink>
        </div>
      </Container>
    </>
  );
}

import { useMemo, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { EditorialList, type EditorialItem } from '@/components/ui/EditorialList';
import { useViewMode } from '@/components/ui/useViewMode';
import { cn } from '@/lib/cn';
import { newsCategoryLabels, type NewsCategory } from './data';
import { useNewsItems } from './useNews';

/**
 * HABERLER — güncel astronomi ve uzay gündemi.
 *
 * Her kayıt kaynağıyla birlikte gösterilir (etkinlik modülündeki kaynak
 * şeffaflığı ilkesinin aynısı). İlk haber geniş bir "manşet" olarak,
 * kalanlar liste hâlinde sunulur.
 */
const categories: (NewsCategory | 'hepsi')[] = [
  'hepsi',
  'gokyuzu-olayi',
  'uzay-misyonu',
  'kesif',
  'turkiye',
  'ekipman',
  'duyuru',
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function NewsPage() {
  const [category, setCategory] = useState<NewsCategory | 'hepsi'>('hepsi');
  const [view, setView] = useViewMode('haberler');

  // Tohum + panelden yayımlananlar tek listede (useNews.ts).
  const { items: all } = useNewsItems();
  const result = useMemo(
    () => (category === 'hepsi' ? all : all.filter((n) => n.category === category)),
    [all, category]
  );

  /* Ortak editöryel düzen — yazı ve etkinlikle aynı kart yapısı. */
  const items: EditorialItem[] = useMemo(
    () =>
      result.map((item) => ({
        slug: item.slug,
        to: `/haber/${item.slug}`,
        title: item.title,
        summary: item.summary,
        category: newsCategoryLabels[item.category],
        meta: formatDate(item.publishedAt),
        tint: item.tint,
        imageUrl: item.image?.url,
        imageCredit: item.image?.credit,
        footer: <p className="label">Kaynak · {item.source.name}</p>,
      })),
    [result]
  );

  return (
    <>
      <PageMeta
        title="Haberler"
        description="Astronomi ve uzay gündemi: gökyüzü olayları, uzay misyonları, keşifler ve Türkiye'den haberler — her kayıt kaynağıyla birlikte."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Haberler', path: '/haberler' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <header className="mb-5 border-b border-border pb-5">
          <h1 className="text-[26px] text-foreground sm:text-[30px]">Haberler</h1>
          <p className="mt-2 max-w-[70ch] text-[12px] leading-relaxed text-muted-foreground">
            Astronomi ve uzay gündemi. Her haber, dayandığı kaynağın adıyla
            birlikte yayımlanır.
          </p>
        </header>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Haber kategorileri"
          className="flex flex-wrap gap-1.5"
        >
          {categories.map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={category === c}
              onClick={() => setCategory(c)}
              className={cn(
                'rounded-card border px-3 py-1.5 text-meta tracking-[0.03em] transition-colors',
                category === c
                  ? 'border-primary text-primary'
                  : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
              )}
            >
              {c === 'hepsi' ? 'Tümü' : newsCategoryLabels[c]}
            </button>
          ))}
        </div>
        <ViewToggle mode={view} onChange={setView} />
        </div>

        <EditorialList
          view={view}
          items={items}
          emptyMessage="Bu kategoride haber yok."
        />
      </Container>
    </>
  );
}

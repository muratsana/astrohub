import { useMemo } from 'react';
import { Container } from '@/components/ui/Container';
import {
  FilterBar,
  FilterCell,
  filterControlClass,
} from '@/components/ui/FilterBar';
import { ActiveFilters } from '@/components/ui/ActiveFilters';
import { Input } from '@/components/ui/Input';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ToolBar, ResultCount } from '@/components/ui/ToolBar';
import {
  EditorialList,
  type EditorialItem,
} from '@/components/ui/EditorialList';
import { useViewMode } from '@/components/ui/useViewMode';
import { newsCategoryLabels, type NewsCategory } from './data';
import { useNewsItems } from './useNews';
import { useExplorer } from '@/features/explorer/useExplorer';
import { newsSpec } from './newsSpec';

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
  const [view, setView] = useViewMode('haberler');

  // Tohum + panelden yayımlananlar tek listede (useNews.ts).
  const { items: all } = useNewsItems();

  /*
   * ORTAK DATA EXPLORER (Faz 4). Sayfada arama HİÇ yoktu ve kategori
   * `useState`teydi — yani seçilen kategori paylaşılamıyordu.
   */
  const ex = useExplorer(all, newsSpec);
  const result = ex.items;
  const category = ex.query.facets.kategori?.[0] ?? 'hepsi';

  /** Kategori sekmeleri tek seçim. */
  const setCategory = (next: string) => {
    if (category !== 'hepsi') ex.toggleFacet('kategori', category);
    if (next !== 'hepsi' && next !== category) ex.toggleFacet('kategori', next);
  };

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
          <h1 className="type-page text-foreground">Haberler</h1>
          <p className="mt-2 max-w-[70ch] text-meta leading-relaxed text-muted-foreground">
            Astronomi ve uzay gündemi. Her haber, dayandığı kaynağın adıyla
            birlikte yayımlanır.
          </p>
        </header>

        {/*
          ARAMA KUTUSU BURAYA GEÇ GELDİ. Motor (`useExplorer`) tam metin
          aramayı en baştan destekliyordu; bu iki sayfada yalnızca ARAYÜZ
          yoktu. Kategori sekmesi az sayıda kategoriyi iyi gösteriyor ama
          "perseid" arayan kullanıcı sekmelerde gezinmek zorunda kalıyordu.
        */}
        <FilterBar activeCount={ex.chips.length} columns={2}>
          <FilterCell label="Ara" htmlFor="news-search">
            <Input
              id="news-search"
              type="search"
              placeholder="Haber başlığı veya kaynak"
              value={ex.searchInput}
              onChange={(e) => ex.setSearch(e.target.value)}
              className={filterControlClass}
            />
          </FilterCell>
        </FilterBar>

        <ActiveFilters
          chips={ex.chips}
          onRemove={ex.removeChip}
          onClearAll={ex.clearAll}
        />

        <div className="mb-4 grid gap-px border border-border bg-border">
          <div className="bg-surface-1 px-3 py-2">
            <p className="label mb-2">Kategori</p>
            <SegmentedControl
              value={category}
              options={categories.map((c) => ({
                value: c,
                label: c === 'hepsi' ? 'Tümü' : newsCategoryLabels[c],
                selectedClassName: 'border-primary bg-primary/10 text-primary',
              }))}
              onChange={setCategory}
              ariaLabel="Haber kategorileri"
            />
          </div>
        </div>

        <ToolBar
          left={
            <ResultCount current={ex.total} total={all.length} noun="haber" />
          }
          sort={{
            id: 'news-sort',
            value: ex.query.sort,
            onChange: ex.setSort,
            options: newsSpec.sorts.map((s) => ({
              value: s.value,
              label: s.label,
            })),
          }}
          view={{ mode: view, onChange: setView }}
        />

        <EditorialList
          view={view}
          items={items}
          emptyMessage="Bu kategoride haber yok."
        />
      </Container>
    </>
  );
}

import { useMemo } from 'react';
import { Container } from '@/components/ui/Container';
import { FilterCell, filterControlClass } from '@/components/ui/FilterBar';
import { Input, Select } from '@/components/ui/Input';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { ModuleToolbar } from '@/components/ui/ModuleToolbar';
import {
  EditorialList,
  type EditorialItem,
} from '@/components/ui/EditorialList';
import { AdminEditLink } from '@/components/admin/AdminEditLink';
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
        action: (
          <AdminEditLink to={`/admin/content?kind=haber&slug=${item.slug}`} />
        ),
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
        <ModuleToolbar
          activeFilters={{
            chips: ex.chips,
            onRemove: ex.removeChip,
            onClearAll: ex.clearAll,
          }}
          result={{ current: ex.total, total: all.length, noun: 'haber' }}
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
        >
          <FilterCell
            label="Ara"
            htmlFor="news-search"
            active={ex.searchInput.trim().length > 0}
            className="min-w-[20rem] flex-[2_1_20rem]"
          >
            <Input
              id="news-search"
              type="search"
              placeholder="Haber başlığı veya kaynak"
              value={ex.searchInput}
              onChange={(e) => ex.setSearch(e.target.value)}
              className={filterControlClass}
            />
          </FilterCell>
          <FilterCell
            label="Kategori"
            htmlFor="news-category"
            active={category !== 'hepsi'}
            className="min-w-[12rem]"
          >
            <Select
              id="news-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={filterControlClass}
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item === 'hepsi'
                    ? 'Tüm kategoriler'
                    : newsCategoryLabels[item]}
                </option>
              ))}
            </Select>
          </FilterCell>
        </ModuleToolbar>

        <EditorialList
          view={view}
          items={items}
          emptyMessage="Bu kategoride haber yok."
        />
      </Container>
    </>
  );
}

import { useMemo } from 'react';
import { entryEditPath } from '@/components/admin/adminEditPath';
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
import { useViewMode } from '@/components/ui/useViewMode';
import { AdminEditLink } from '@/components/admin/AdminEditLink';
import {
  articleCategoryLabels,
  articleHref,
  type ArticleCategory,
} from './data';
import { useArticles } from './useArticles';
import { useExplorer } from '@/features/explorer/useExplorer';
import { articlesSpec } from './articlesSpec';

/**
 * YAZILAR — teknik astrofotoğraf serisi.
 *
 * Her yazının konusuyla ilgili bir kapak görseli var: liste önce
 * görselsizdi ve "tipografi yeter" diye savunulmuştu, ama aynı sayfada
 * galeri ve haber kartları görselliyken yazılar sönük bir metin bloğu
 * gibi duruyor, tıklanmıyordu. Görsel dekorasyon değil: kutup yıldızı
 * izleri polar alignment yazısını, Hubble paleti narrowband yazısını
 * bir bakışta anlatıyor. Ürün yüzeyinde seviye rozeti yok; konu ve arama
 * okurun ihtiyacını daha doğrudan karşılıyor.
 */
const categories: (ArticleCategory | 'hepsi')[] = [
  'hepsi',
  'rehber',
  'isleme',
  'teknik',
  'gozlem',
  'inceleme',
];

const categoryOptions = categories.map((c) => ({
  value: c,
  label: c === 'hepsi' ? 'Tümü' : articleCategoryLabels[c],
}));

export function ArticlesPage() {
  const [view, setView] = useViewMode('yazilar');

  // Tohum + panelden yayımlananlar tek listede (useArticles.ts).
  const { items: allArticles } = useArticles();

  /*
   * ORTAK DATA EXPLORER (Faz 4). Sayfada arama HİÇ yoktu; kategori
   * `useState`teydi, yani "işleme yazıları" gibi bir seçim
   * paylaşılamıyordu.
   */
  const ex = useExplorer(allArticles, articlesSpec);
  const result = ex.items;
  const category = ex.query.facets.kategori?.[0] ?? 'hepsi';

  /** Sekme şeritleri tek seçim. */
  const tekSec = (param: string, mevcut: string, next: string) => {
    if (mevcut !== 'hepsi') ex.toggleFacet(param, mevcut);
    if (next !== 'hepsi' && next !== mevcut) ex.toggleFacet(param, next);
  };
  const setCategory = (next: string) => tekSec('kategori', category, next);

  /*
   * Haber, yazı ve etkinlik aynı editöryel düzeni paylaşıyor
   * (`EditorialList`). Sayfanın işi veriyi o düzenin beklediği alanlara
   * eşlemek; kart yapısı, manşet ve kolon sayısı orada bir kez tanımlı.
   */
  const items: EditorialItem[] = useMemo(
    () =>
      result.map((article) => ({
        slug: article.slug,
        to: articleHref(article),
        title: article.title,
        summary: article.summary,
        category: articleCategoryLabels[article.category],
        meta: article.duration,
        tint: article.tint,
        imageUrl: article.image?.url,
        action: <AdminEditLink to={entryEditPath('yazi', article.slug)} />,
        footer: (
          <span className="tabular text-meta text-faint">{article.author}</span>
        ),
      })),
    [result]
  );

  return (
    <>
      <PageMeta
        title="Yazılar"
        description="Astrofotoğrafçılık teknik serisi: gürültü, gain, odak, filtreler, ışık kirliliği, guiding, kutup hizalaması ve drizzle."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Yazılar', path: '/yazilar' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <header className="mb-5 border-b border-border pb-5">
          <h1 className="type-page text-foreground">Yazılar</h1>
          <p className="mt-2 max-w-[70ch] text-meta leading-relaxed text-muted-foreground">
            Zip paketindeki teknik seri ayrı yazılar olarak içe aktarıldı. Her
            yazı gürültü, optik, filtre, gökyüzü kalitesi ya da takip gibi tek
            bir problemi derli toplu ele alır.
          </p>
        </header>

        <EditorialList
          view={view}
          items={items}
          leadLabel="Öne çıkan"
          afterLead={
            <ModuleToolbar
              activeFilters={{
                chips: ex.chips,
                onRemove: ex.removeChip,
                onClearAll: ex.clearAll,
              }}
              result={{
                current: ex.total,
                total: allArticles.length,
                noun: 'yazı',
              }}
              sort={{
                id: 'article-sort',
                value: ex.query.sort,
                onChange: ex.setSort,
                options: articlesSpec.sorts.map((s) => ({
                  value: s.value,
                  label: s.label,
                })),
              }}
              view={{ mode: view, onChange: setView }}
            >
              <FilterCell
                label="Ara"
                htmlFor="articles-search"
                active={ex.searchInput.trim().length > 0}
                className="min-w-[20rem] flex-[2_1_20rem]"
              >
                <Input
                  id="articles-search"
                  type="search"
                  placeholder="Yazı başlığı veya konu"
                  value={ex.searchInput}
                  onChange={(e) => ex.setSearch(e.target.value)}
                  className={filterControlClass}
                />
              </FilterCell>
              <FilterCell
                label="Kategori"
                htmlFor="article-category"
                active={category !== 'hepsi'}
                className="min-w-[12rem]"
              >
                <Select
                  id="article-category"
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
            </ModuleToolbar>
          }
          emptyMessage="Bu filtrelerle eşleşen yazı yok."
        />
      </Container>
    </>
  );
}

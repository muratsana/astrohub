import { useMemo } from 'react';
import { Container } from '@/components/ui/Container';
import { FilterBar, FilterCell, filterControlClass } from '@/components/ui/FilterBar';
import { Input, Select } from '@/components/ui/Input';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { ResultCount } from '@/components/ui/ToolBar';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { EditorialList, type EditorialItem } from '@/components/ui/EditorialList';
import { useViewMode } from '@/components/ui/useViewMode';
import { articleCategoryLabels, type ArticleCategory } from './data';
import { useArticles } from './useArticles';
import { useExplorer } from '@/features/explorer/useExplorer';
import { articlesSpec } from './articlesSpec';

/**
 * YAZILAR — rehberler, eğitim yazıları ve işleme dersleri.
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
        to: `/yazi/${article.slug}`,
        title: article.title,
        summary: article.summary,
        category: articleCategoryLabels[article.category],
        meta: article.duration,
        tint: article.tint,
        imageUrl: article.image?.url,
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
        description="Astronomi ve astrofotoğrafçılık rehberleri: setup kurulumu, kalibrasyon, narrowband işleme, guiding ve gökyüzü kalitesi ölçümü."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Yazılar', path: '/yazilar' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <header className="mb-5 border-b border-border pb-5">
          <h1 className="type-page text-foreground">Yazılar</h1>
          <p className="mt-2 max-w-[70ch] text-meta leading-relaxed text-muted-foreground">
            Rehberler, işleme dersleri, teknik incelemeler ve saha notları.
            Her yazı bir prosedür gibi kurulur: ne yapılır, neden yapılır,
            ne zaman işe yaramaz.
          </p>
        </header>

        {/*
          ARAMA KUTUSU BURAYA GEÇ GELDİ. Motor (`useExplorer`) tam metin
          aramayı en baştan destekliyordu; bu iki sayfada yalnızca ARAYÜZ
          yoktu. Kategori sekmesi az sayıda kategoriyi iyi gösteriyor ama
          "perseid" arayan kullanıcı sekmelerde gezinmek zorunda kalıyordu.
        */}
        <FilterBar activeCount={ex.chips.length}>
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
            active={category !== 'hepsi'}
            className="min-w-[26rem] flex-[3_1_26rem]"
          >
            <SegmentedControl
              ariaLabel="Kategori"
              value={category}
              onChange={setCategory}
              options={categoryOptions}
              size="xs"
            />
          </FilterCell>
          <FilterCell label="Sırala" htmlFor="article-sort" className="max-w-[14rem]">
            <Select
              id="article-sort"
              value={ex.query.sort}
              onChange={(e) => ex.setSort(e.target.value)}
              className={filterControlClass}
            >
              {articlesSpec.sorts.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </FilterCell>
          <div className="flex min-h-14 items-center rounded-card border border-border-strong bg-surface-1 px-3 shadow-overlay">
            <ViewToggle mode={view} onChange={setView} />
          </div>
          <div className="flex min-h-14 items-center rounded-card border border-border-strong bg-surface-1 px-4 shadow-overlay">
            <ResultCount
              current={ex.total}
              total={allArticles.length}
              noun="yazı"
            />
          </div>
        </FilterBar>

        <EditorialList
          view={view}
          items={items}
          leadLabel="Öne çıkan"
          emptyMessage="Bu filtrelerle eşleşen yazı yok."
        />
      </Container>
    </>
  );
}

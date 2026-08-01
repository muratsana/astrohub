import { useMemo } from 'react';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { EditorialList, type EditorialItem } from '@/components/ui/EditorialList';
import { useViewMode } from '@/components/ui/useViewMode';
import { cn } from '@/lib/cn';
import {
  articleCategoryLabels,
  type ArticleCategory,
  type ArticleLevel,
} from './data';
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
 * bir bakışta anlatıyor. Seviye ve kategori filtreleri bağımsız çalışır.
 */
const levels: (ArticleLevel | 'hepsi')[] = [
  'hepsi',
  'Başlangıç',
  'Orta',
  'İleri',
];

const categories: (ArticleCategory | 'hepsi')[] = [
  'hepsi',
  'rehber',
  'isleme',
  'teknik',
  'gozlem',
  'inceleme',
];

function levelTone(level: ArticleLevel) {
  return level === 'Başlangıç'
    ? 'success'
    : level === 'Orta'
      ? 'primary'
      : 'danger';
}

export function ArticlesPage() {
  const [view, setView] = useViewMode('yazilar');

  // Tohum + panelden yayımlananlar tek listede (useArticles.ts).
  const { items: allArticles } = useArticles();

  /*
   * ORTAK DATA EXPLORER (Faz 4). Sayfada arama HİÇ yoktu; seviye ve
   * kategori `useState`teydi, yani "başlangıç seviyesi işleme yazıları"
   * gibi bir seçim paylaşılamıyordu.
   */
  const ex = useExplorer(allArticles, articlesSpec);
  const result = ex.items;
  const level = ex.query.facets.seviye?.[0] ?? 'hepsi';
  const category = ex.query.facets.kategori?.[0] ?? 'hepsi';

  /** Sekme şeritleri tek seçim. */
  const tekSec = (param: string, mevcut: string, next: string) => {
    if (mevcut !== 'hepsi') ex.toggleFacet(param, mevcut);
    if (next !== 'hepsi' && next !== mevcut) ex.toggleFacet(param, next);
  };
  const setLevel = (next: string) => tekSec('seviye', level, next);
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
          <div className="flex items-center gap-2">
            <Badge tone={levelTone(article.level)}>{article.level}</Badge>
            <span className="tabular text-meta text-faint">
              {article.author}
            </span>
          </div>
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
            Başlangıçtan ileri seviyeye rehberler, işleme dersleri ve saha
            notları. Her yazı bir prosedür gibi kurulur: ne yapılır, neden
            yapılır, ne zaman işe yaramaz.
          </p>
        </header>

        <div className="mb-4 grid gap-px border border-border bg-border sm:grid-cols-2">
          <div className="bg-surface-1 px-3 py-2">
            <p className="label mb-2">Seviye</p>
            <div role="tablist" aria-label="Seviye" className="flex flex-wrap gap-1.5">
              {levels.map((l) => (
                <button
                  key={l}
                  role="tab"
                  aria-selected={level === l}
                  onClick={() => setLevel(l)}
                  className={cn(
                    'rounded-card border px-2.5 py-1 text-meta tracking-[0.03em] transition-colors',
                    level === l
                      ? 'border-primary text-primary'
                      : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
                  )}
                >
                  {l === 'hepsi' ? 'Tümü' : l}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface-1 px-3 py-2">
            <p className="label mb-2">Kategori</p>
            <div role="tablist" aria-label="Kategori" className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <button
                  key={c}
                  role="tab"
                  aria-selected={category === c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    'rounded-card border px-2.5 py-1 text-meta tracking-[0.03em] transition-colors',
                    category === c
                      ? 'border-primary text-primary'
                      : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
                  )}
                >
                  {c === 'hepsi' ? 'Tümü' : articleCategoryLabels[c]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="tabular label" role="status" aria-live="polite">
            {result.length} / {allArticles.length} yazı
          </p>
          <ViewToggle mode={view} onChange={setView} />
        </div>

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

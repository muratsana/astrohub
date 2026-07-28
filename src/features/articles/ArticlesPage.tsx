import { useMemo, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { EditorialList, type EditorialItem } from '@/components/ui/EditorialList';
import { useViewMode } from '@/components/ui/useViewMode';
import { cn } from '@/lib/cn';
import {
  articles,
  articleCategoryLabels,
  type ArticleCategory,
  type ArticleLevel,
} from './data';

/**
 * YAZILAR — rehberler, eğitim yazıları ve işleme dersleri.
 *
 * Görselsiz, tipografi odaklı liste: bir yazı "prosedür" gibi okunur,
 * dekoratif kapak görseline ihtiyaç duymaz. Seviye ve kategori filtreleri
 * bağımsız çalışır.
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
  const [level, setLevel] = useState<ArticleLevel | 'hepsi'>('hepsi');
  const [category, setCategory] = useState<ArticleCategory | 'hepsi'>('hepsi');
  const [view, setView] = useViewMode('yazilar');

  const result = useMemo(
    () =>
      articles.filter(
        (a) =>
          (level === 'hepsi' || a.level === level) &&
          (category === 'hepsi' || a.category === category)
      ),
    [level, category]
  );

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
        footer: (
          <div className="flex items-center gap-2">
            <Badge tone={levelTone(article.level)}>{article.level}</Badge>
            <span className="tabular text-[10px] text-faint">
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
          <h1 className="text-[26px] text-foreground sm:text-[30px]">Yazılar</h1>
          <p className="mt-2 max-w-[70ch] text-[12px] leading-relaxed text-muted-foreground">
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
                    'rounded-card border px-2.5 py-1 text-[10px] tracking-[0.03em] transition-colors',
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
                    'rounded-card border px-2.5 py-1 text-[10px] tracking-[0.03em] transition-colors',
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
            {result.length} / {articles.length} yazı
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

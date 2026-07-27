import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
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

  const result = useMemo(
    () =>
      articles.filter(
        (a) =>
          (level === 'hepsi' || a.level === level) &&
          (category === 'hepsi' || a.category === category)
      ),
    [level, category]
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

      <Container className="py-10 sm:py-12">
        <header className="mb-6 border-b border-border pb-6">
          <h1 className="text-[28px] text-foreground sm:text-[34px]">Yazılar</h1>
          <p className="mt-2.5 max-w-[70ch] text-[12.5px] leading-relaxed text-muted-foreground">
            Başlangıçtan ileri seviyeye rehberler, işleme dersleri ve saha
            notları. Her yazı bir prosedür gibi kurulur: ne yapılır, neden
            yapılır, ne zaman işe yaramaz.
          </p>
        </header>

        <div className="mb-6 grid gap-px border border-border bg-border sm:grid-cols-2">
          <div className="bg-surface-1 px-3 py-2.5">
            <p className="label mb-2">Seviye</p>
            <div role="tablist" aria-label="Seviye" className="flex flex-wrap gap-1.5">
              {levels.map((l) => (
                <button
                  key={l}
                  role="tab"
                  aria-selected={level === l}
                  onClick={() => setLevel(l)}
                  className={cn(
                    'rounded-card border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] transition-colors',
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

          <div className="bg-surface-1 px-3 py-2.5">
            <p className="label mb-2">Kategori</p>
            <div role="tablist" aria-label="Kategori" className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <button
                  key={c}
                  role="tab"
                  aria-selected={category === c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    'rounded-card border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] transition-colors',
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

        <p className="tabular label mb-4" role="status" aria-live="polite">
          {result.length} / {articles.length} yazı
        </p>

        {result.length === 0 ? (
          <p className="border border-border bg-surface-1 px-4 py-16 text-center text-[12px] text-muted-foreground">
            Bu filtrelerle eşleşen yazı yok.
          </p>
        ) : (
          <ul className="grid gap-px border border-border bg-border md:grid-cols-2 xl:grid-cols-3">
            {result.map((article, i) => (
              <li key={article.slug}>
                <Link
                  to={`/yazi/${article.slug}`}
                  className="group flex h-full flex-col bg-surface-1 p-4 transition-colors hover:bg-surface-2"
                >
                  <div className="mb-3 flex items-baseline justify-between gap-2">
                    <span className="tabular label text-primary">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="label">
                      {articleCategoryLabels[article.category]}
                    </span>
                  </div>

                  <h2 className="text-[15px] leading-snug text-foreground transition-colors group-hover:text-primary">
                    {article.title}
                  </h2>
                  <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
                    {article.summary}
                  </p>

                  <div className="mt-auto flex items-center gap-2 pt-4">
                    <Badge tone={levelTone(article.level)}>{article.level}</Badge>
                    <span className="tabular text-[10px] text-faint">
                      {article.duration}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
  );
}

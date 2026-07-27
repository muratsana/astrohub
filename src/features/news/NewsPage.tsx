import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { PlateFrame } from '@/components/media/PlateFrame';
import { StarField } from '@/components/media/StarField';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { useViewMode } from '@/components/ui/useViewMode';
import { cn } from '@/lib/cn';
import {
  sortedNews,
  newsCategoryLabels,
  type NewsCategory,
} from './data';

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

  const all = useMemo(() => sortedNews(), []);
  const result = useMemo(
    () => (category === 'hepsi' ? all : all.filter((n) => n.category === category)),
    [all, category]
  );

  const [lead, ...rest] = result;

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
                'rounded-card border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] transition-colors',
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

        {result.length === 0 ? (
          <p className="border border-border bg-surface-1 px-4 py-16 text-center text-[12px] text-muted-foreground">
            Bu kategoride haber yok.
          </p>
        ) : (
          <>
            {/* Manşet — yalnızca ızgara görünümünde */}
            {view === 'grid' && (
            <Link
              to={`/haber/${lead.slug}`}
              className="group mb-2.5 grid gap-3.5 rounded-card border border-border bg-surface-1 p-2.5 transition-colors hover:border-border-strong md:grid-cols-[minmax(0,300px)_minmax(0,1fr)]"
            >
              <PlateFrame ratio="aspect-[16/9]" badge={<span className="rounded-[2px] border border-primary/50 bg-primary/15 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] text-primary backdrop-blur-sm">Manşet</span>}>
                <StarField seed={lead.slug} tint={lead.tint} density={1.1} />
              </PlateFrame>

              <div className="flex flex-col py-1 pr-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge tone="primary">{newsCategoryLabels[lead.category]}</Badge>
                  <span className="tabular text-[10.5px] text-faint">
                    {formatDate(lead.publishedAt)}
                  </span>
                </div>
                <h2 className="text-[18px] text-foreground transition-colors group-hover:text-primary sm:text-[21px]">
                  {lead.title}
                </h2>
                <p className="mt-2.5 text-[12px] leading-relaxed text-muted-foreground">
                  {lead.summary}
                </p>
                <p className="label mt-auto pt-3">Kaynak · {lead.source.name}</p>
              </div>
            </Link>
            )}

            {/* Kalanlar */}
            <ul
              className={cn(
                view === 'grid'
                  ? 'grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  : 'grid gap-px border border-border bg-border'
              )}
            >
              {(view === 'grid' ? rest : result).map((item) => (
                <li key={item.slug}>
                  <Link
                    to={`/haber/${item.slug}`}
                    className="group flex h-full flex-col bg-surface-1 p-3 transition-colors hover:bg-surface-2"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge>{newsCategoryLabels[item.category]}</Badge>
                      <span className="tabular text-[10px] text-faint">
                        {formatDate(item.publishedAt)}
                      </span>
                    </div>
                    <h2 className="text-[13px] text-foreground transition-colors group-hover:text-primary">
                      {item.title}
                    </h2>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                      {item.summary}
                    </p>
                    <p className="label mt-auto pt-3">{item.source.name}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Container>
    </>
  );
}

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { PlateFrame } from '@/components/media/PlateFrame';
import { StarField } from '@/components/media/StarField';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
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

      <Container className="py-10 sm:py-12">
        <header className="mb-6 border-b border-border pb-6">
          <h1 className="text-[28px] text-foreground sm:text-[34px]">Haberler</h1>
          <p className="mt-2.5 max-w-[70ch] text-[12.5px] leading-relaxed text-muted-foreground">
            Astronomi ve uzay gündemi. Her haber, dayandığı kaynağın adıyla
            birlikte yayımlanır.
          </p>
        </header>

        <div
          role="tablist"
          aria-label="Haber kategorileri"
          className="mb-6 flex flex-wrap gap-1.5"
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

        {result.length === 0 ? (
          <p className="border border-border bg-surface-1 px-4 py-16 text-center text-[12px] text-muted-foreground">
            Bu kategoride haber yok.
          </p>
        ) : (
          <>
            {/* Manşet */}
            <Link
              to={`/haber/${lead.slug}`}
              className="group mb-3 grid gap-4 rounded-card border border-border bg-surface-1 p-3 transition-colors hover:border-border-strong md:grid-cols-[minmax(0,340px)_minmax(0,1fr)]"
            >
              <PlateFrame ratio="aspect-[16/10]" badge="Manşet">
                <StarField seed={lead.slug} tint={lead.tint} density={1.1} />
              </PlateFrame>

              <div className="flex flex-col py-1 pr-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge tone="primary">{newsCategoryLabels[lead.category]}</Badge>
                  <span className="tabular text-[10.5px] text-faint">
                    {formatDate(lead.publishedAt)}
                  </span>
                </div>
                <h2 className="text-[20px] leading-tight text-foreground transition-colors group-hover:text-primary sm:text-[24px]">
                  {lead.title}
                </h2>
                <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
                  {lead.summary}
                </p>
                <p className="label mt-auto pt-4">Kaynak · {lead.source.name}</p>
              </div>
            </Link>

            {/* Kalanlar */}
            <ul className="grid gap-px border border-border bg-border md:grid-cols-2 xl:grid-cols-3">
              {rest.map((item) => (
                <li key={item.slug}>
                  <Link
                    to={`/haber/${item.slug}`}
                    className="group flex h-full flex-col bg-surface-1 p-4 transition-colors hover:bg-surface-2"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge>{newsCategoryLabels[item.category]}</Badge>
                      <span className="tabular text-[10px] text-faint">
                        {formatDate(item.publishedAt)}
                      </span>
                    </div>
                    <h2 className="text-[14.5px] leading-snug text-foreground transition-colors group-hover:text-primary">
                      {item.title}
                    </h2>
                    <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
                      {item.summary}
                    </p>
                    <p className="label mt-auto pt-4">{item.source.name}</p>
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

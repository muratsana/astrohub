import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageMeta } from '@/components/seo/PageMeta';
import { categoryTool, glossaryCategoryLabels } from './glossary';
import { filterByQuery, groupByInitial, useGlossary } from './useKnowledge';

/**
 * TERİMLER SÖZLÜĞÜ (§14.9).
 *
 * ══════════════════════════════════════════════════════════════════════
 * TEK SAYFA, DETAY ROTASI YOK
 *
 * Her terim için ayrı adres açmadık. Bir sözlük maddesi bir paragraf;
 * kendi sayfasına gitmek, okumak için bir tık ve bir sayfa yüklemesi
 * eklerdi. Terimler burada açık hâlde duruyor ve tarayıcının kendi
 * araması (⌘F) da çalışıyor.
 *
 * Bunun bilinçli bedeli: tek bir terime derin bağlantı verilemiyor.
 * Buna karşılık `id` çapaları var — `/sozluk#seeing` çalışıyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ARAMA İSTEMCİDE
 *
 * Sözlük birkaç yüz kayıtla sınırlı ve tamamı zaten bellekte. Her tuşta
 * sunucuya sorgu atmak karşılıksız gecikme olurdu.
 */
export function GlossaryPage() {
  const { items, loading } = useGlossary();
  const [query, setQuery] = useState('');

  const gruplar = useMemo(
    () => groupByInitial(filterByQuery(items, query)),
    [items, query]
  );

  const toplam = items.length;
  const gorunen = gruplar.reduce((n, g) => n + g.items.length, 0);

  return (
    <>
      <PageMeta
        title="Terimler Sözlüğü"
        description="Amatör astronomi ve astrofotoğrafta geçen terimlerin kısa tanımları: Bortle, seeing, pixel scale, kalibrasyon kareleri ve daha fazlası."
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[{ label: 'Ana Sayfa', to: '/' }, { label: 'Sözlük' }]}
          title="Terimler Sözlüğü"
          description="Sitede ve sahada geçen terimlerin kısa karşılıkları. Daha uzun anlatım için Yazılar bölümüne bakın."
        />

        <div className="mb-5 max-w-md">
          <Input
            type="search"
            value={query}
            aria-label="Terim ara"
            placeholder="Terim ara — seeing, flat, pixel scale…"
            onChange={(e) => setQuery(e.target.value)}
          />
          <p className="mt-1.5 text-meta text-faint" role="status">
            {query
              ? `${gorunen} / ${toplam} terim`
              : `${toplam} terim`}
          </p>
        </div>

        {/* Harf dizini — uzun listede kaydırmadan atlamak için. Aramada
            gizleniyor: süzülmüş listede çoğu harf boş olurdu. */}
        {!query && gruplar.length > 1 && (
          <nav aria-label="Harf dizini" className="mb-5 flex flex-wrap gap-1.5">
            {gruplar.map((g) => (
              <a
                key={g.letter}
                href={`#harf-${g.letter}`}
                className="grid h-8 min-w-8 place-items-center rounded-card border border-border px-2 text-meta text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
              >
                {g.letter}
              </a>
            ))}
          </nav>
        )}

        {loading && items.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">Yükleniyor…</p>
        ) : gorunen === 0 ? (
          <EmptyState
            message={`"${query}" için terim bulunamadı.`}
            hint="Farklı bir yazım deneyin ya da aramayı temizleyin."
          />
        ) : (
          <div className="space-y-7">
            {gruplar.map((grup) => (
              <section key={grup.letter} id={`harf-${grup.letter}`}>
                <h2 className="mb-2 border-b border-border pb-1 text-h3 text-foreground">
                  {grup.letter}
                </h2>
                <dl className="space-y-4">
                  {grup.items.map((terim) => {
                    const arac = categoryTool[terim.category];
                    return (
                      <div key={terim.slug} id={terim.slug} className="scroll-mt-20">
                        <dt className="flex flex-wrap items-center gap-2">
                          <span className="text-body font-medium text-foreground">
                            {terim.title}
                          </span>
                          <Badge tone="muted">
                            {glossaryCategoryLabels[terim.category] ??
                              terim.category}
                          </Badge>
                        </dt>
                        <dd className="mt-1 text-body-sm leading-relaxed text-muted-foreground">
                          {terim.summary}
                          {terim.body.map((p, i) => (
                            <span key={i} className="mt-1.5 block">
                              {p}
                            </span>
                          ))}
                          {arac && (
                            <Link
                              to={arac.to}
                              className="mt-1.5 inline-block text-meta text-primary hover:underline"
                            >
                              İlgili araç: {arac.label}
                            </Link>
                          )}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </section>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}

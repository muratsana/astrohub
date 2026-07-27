import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PhotoPlaceholder } from '@/components/media/PhotoPlaceholder';
import { targets, targetKindLabels } from './data';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';

function trLower(s: string): string {
  return s.toLocaleLowerCase('tr-TR');
}

/** Astronomik hedefler listesi (§8.2): ad/katalog/alias araması + kartlar. */
export function TargetsPage() {
  const [search, setSearch] = useState('');

  const result = useMemo(() => {
    const q = trLower(search.trim());
    if (!q) return targets;
    return targets.filter((t) =>
      [t.name, t.catalog, t.constellation, ...t.aliases]
        .map(trLower)
        .some((f) => f.includes(q))
    );
  }, [search]);

  return (
    <>
      <PageMeta
        title="Astronomik Hedef Kataloğu"
        description="Messier, NGC ve IC kataloğu: takımyıldız, tür, görünür büyüklük ve en iyi gözlem ayları ile birlikte topluluktan çekilmiş fotoğraflar."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Hedefler', path: '/hedefler' },
        ])}
      />
      <Container className="py-10 sm:py-14">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Astronomik Hedefler
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Messier, NGC, IC ve diğer kataloglardan hedefler — görünürlük,
            önerilen odak ve filtre bilgileriyle.
          </p>
        </header>

        <div className="mb-8 max-w-xl">
          <label htmlFor="target-search" className="sr-only">
            Hedef ara
          </label>
          <Input
            id="target-search"
            type="search"
            placeholder="Hedef adı, katalog kodu (M 31, NGC 7000…) veya takımyıldız"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {result.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">
            Eşleşen hedef bulunamadı. Katalog kodu veya alias ile deneyin.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {result.map((t) => (
              <li key={t.slug}>
                <Link
                  to={`/hedef/${t.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface-1 transition-colors hover:border-white/20"
                >
                  <PhotoPlaceholder
                    gradient={t.gradient}
                    alt={`${t.name} (${t.catalog})`}
                    rounded="rounded-none"
                    className="aspect-[16/10] w-full"
                  />
                  <div className="flex flex-1 flex-col p-4">
                    <p className="text-xs font-medium text-primary">
                      {t.catalog}
                    </p>
                    <h2 className="mt-0.5 text-sm font-semibold text-foreground">
                      {t.name}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.constellation} · {targetKindLabels[t.kind]}
                    </p>
                    <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                      <Badge>{t.bestMonths}</Badge>
                      <Badge
                        tone={
                          t.difficulty === 'Kolay'
                            ? 'success'
                            : t.difficulty === 'Orta'
                              ? 'primary'
                              : 'danger'
                        }
                      >
                        {t.difficulty}
                      </Badge>
                    </div>
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

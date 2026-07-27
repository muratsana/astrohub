import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterBar, FilterCell, filterControlClass } from '@/components/ui/FilterBar';
import { CardGrid } from '@/components/ui/CardGrid';
import { ToolBar, ResultCount } from '@/components/ui/ToolBar';
import { useViewMode } from '@/components/ui/useViewMode';
import { PlateFrame } from '@/components/media/PlateFrame';
import { StarField } from '@/components/media/StarField';
import { tintFor } from '@/components/media/tints';
import { targets, targetKindLabels } from './data';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';

function trLower(s: string): string {
  return s.toLocaleLowerCase('tr-TR');
}

/** Zorluk derecesinin rozet tonu — kolay yeşil, zor kırmızı. */
function difficultyTone(difficulty: string) {
  if (difficulty === 'Kolay') return 'success' as const;
  if (difficulty === 'Orta') return 'primary' as const;
  return 'danger' as const;
}

/**
 * Astronomik hedefler kataloğu (§8.2).
 *
 * Kartlar galeri karosuyla aynı bileşeni kullanır: hedef sayfası da bir
 * "kayıt" sunar ve iki modülde farklı kart anatomisi olması, aynı gökcismini
 * iki yerde tanımayı zorlaştırırdı.
 */
export function TargetsPage() {
  const [search, setSearch] = useState('');
  const [view, setView] = useViewMode('hedefler');

  const result = useMemo(() => {
    const q = trLower(search.trim());
    if (!q) return targets;
    // Katalog kodları "M 31" biçiminde saklanır; boşluksuz yazım da eşleşmeli.
    const compact = q.replace(/\s+/g, '');
    return targets.filter((t) =>
      [t.name, t.catalog, t.constellation, ...t.aliases]
        .map(trLower)
        .some((f) => f.includes(q) || f.replace(/\s+/g, '').includes(compact))
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
      <Container className="py-8 sm:py-10">
        <PageHeader
          title="Astronomik Hedefler"
          description="Messier, NGC, IC ve diğer kataloglardan hedefler — görünürlük, önerilen odak ve filtre bilgileriyle."
        />

        <FilterBar columns={2}>
          <FilterCell label="Ara" htmlFor="target-search" className="sm:col-span-2">
            <Input
              id="target-search"
              type="search"
              placeholder="Hedef adı, katalog kodu (M 31, NGC 7000…) veya takımyıldız"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={filterControlClass}
            />
          </FilterCell>
        </FilterBar>

        <ToolBar
          left={
            <ResultCount
              current={result.length}
              total={targets.length}
              noun="hedef"
            />
          }
          view={{ mode: view, onChange: setView }}
        />

        {result.length === 0 ? (
          <EmptyState
            message="Eşleşen hedef yok"
            hint="Katalog kodu (M 31), alias (Andromeda) veya takımyıldız adıyla deneyin."
          />
        ) : (
          <CardGrid view={view} density="tight">
            {result.map((t) => (
              <li key={t.slug}>
                <TargetCard target={t} variant={view} />
              </li>
            ))}
          </CardGrid>
        )}
      </Container>
    </>
  );
}

/**
 * Hedef kartı. Galeri karosuyla aynı çerçeveyi (PlateFrame + StarField)
 * kullanır ama künyesi farklıdır: hedefte palet/entegrasyon yoktur, yerine
 * takımyıldız, tür ve en iyi gözlem ayları vardır. PhotoTile'ı zorlamak
 * yerine ayrı kart yazmanın nedeni bu — orada boş kalan satırlar "—" olarak
 * görünürdü.
 */
function TargetCard({
  target: t,
  variant,
}: {
  target: (typeof targets)[number];
  variant: 'grid' | 'list';
}) {
  const difficulty = (
    <Badge tone={difficultyTone(t.difficulty)} className="bg-background/85">
      {t.difficulty}
    </Badge>
  );

  if (variant === 'list') {
    return (
      <Link
        to={`/hedef/${t.slug}`}
        className="group flex items-center gap-3 rounded-card border border-border bg-surface-1 p-2 transition-colors hover:border-border-strong"
      >
        <PlateFrame className="w-24 shrink-0 sm:w-32">
          <StarField seed={t.slug} tint={tintFor(t.kind)} />
        </PlateFrame>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-display text-[14px] font-bold uppercase text-foreground transition-colors group-hover:text-primary">
              {t.catalog}
            </span>
            {difficulty}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {t.name}
          </p>
        </div>

        <div className="tabular hidden shrink-0 text-right text-[11px] sm:block">
          <span className="block text-cold">{targetKindLabels[t.kind]}</span>
          <span className="block text-muted-foreground">
            {t.constellation} · {t.bestMonths}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/hedef/${t.slug}`}
      className="group flex h-full flex-col rounded-card border border-border bg-surface-1 transition-colors hover:border-border-strong"
    >
      <PlateFrame
        className="shrink-0 border-0 border-b border-border"
        flag={difficulty}
        fieldOfView={t.bestMonths}
      >
        <StarField seed={t.slug} tint={tintFor(t.kind)} />
      </PlateFrame>

      <div className="flex flex-1 flex-col px-2.5 py-2">
        <p className="truncate font-display text-[13px] font-bold uppercase leading-tight text-foreground transition-colors group-hover:text-primary">
          {t.catalog}
        </p>
        <p className="truncate text-[10px] leading-snug text-muted-foreground">
          {t.name}
        </p>
        <p className="tabular mt-auto truncate pt-1 text-[10px] leading-snug text-cold">
          {targetKindLabels[t.kind]}
        </p>
        <p className="tabular truncate text-[10px] leading-snug text-muted-foreground">
          {t.constellation}
        </p>
      </div>
    </Link>
  );
}

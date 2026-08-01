import { useMemo, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterBar, FilterCell, filterControlClass } from '@/components/ui/FilterBar';
import { CardGrid } from '@/components/ui/CardGrid';
import { ToolBar, ResultCount } from '@/components/ui/ToolBar';
import { useViewMode } from '@/components/ui/useViewMode';
import {
  ContentCard,
  ContentCardBody,
  ContentCardMedia,
  ContentCardMeta,
  ContentCardTitle,
} from '@/components/ui/ContentCard';
import { StarField } from '@/components/media/StarField';
import { tintFor } from '@/components/media/tints';
import { targets, targetKindLabels, searchTargets } from './data';
import { isMovingKind, type TargetKind } from '@/domain/targets/derive';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';

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

  const [kind, setKind] = useState<TargetKind | 'hepsi'>('hepsi');
  const [difficulty, setDifficulty] = useState<'hepsi' | 'Kolay' | 'Orta' | 'Zor'>(
    'hepsi'
  );

  /*
   * Katalog 200 kaydı aştıktan sonra tek bir arama kutusu yetmiyor: "bu gece
   * ne çekebilirim" sorusu tür ve zorluk üzerinden sorulur, ad üzerinden
   * değil. Arama sırasında sonuç sayısını kırpmıyoruz — kırpılmış bir liste,
   * kullanıcının aradığı kaydın var olmadığı izlenimini verir.
   */
  const result = useMemo(() => {
    const base = search.trim()
      ? searchTargets(search, targets.length)
      : targets;
    return base.filter(
      (t) =>
        (kind === 'hepsi' || t.kind === kind) &&
        (difficulty === 'hepsi' || t.difficulty === difficulty)
    );
  }, [search, kind, difficulty]);

  /* Boş kalan tür seçeneklerini listelemek, tıklandığında hiçbir şey
     göstermeyen bir menü üretirdi. */
  const availableKinds = useMemo(() => {
    const present = new Set(targets.map((t) => t.kind));
    return (Object.keys(targetKindLabels) as TargetKind[]).filter((k) =>
      present.has(k)
    );
  }, []);

  return (
    <>
      <PageMeta
        title="Astronomik Hedef Kataloğu"
        description={`Messier kataloğunun 110 kaydı, popüler NGC/IC/Sharpless hedefleri ve güneş sistemi cisimleri — toplam ${targets.length} hedef; takımyıldız, tür, parlaklık ve en uygun gözlem ayları ile.`}
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Hedefler', path: '/hedefler' },
        ])}
      />
      <Container className="py-8 sm:py-10">
        <PageHeader
          title="Astronomik Hedefler"
          description={`Messier kataloğunun tamamı, popüler NGC/IC/Sharpless hedefleri ve güneş sistemi — ${targets.length} kayıt. Görünürlük penceresi, önerilen odak ve filtre önerisi ölçülen koordinat ve parlaklıktan hesaplanır.`}
        />

        <FilterBar columns={4}>
          <FilterCell label="Ara" htmlFor="target-search" className="sm:col-span-2">
            <Input
              id="target-search"
              type="search"
              placeholder="M 31, NGC 7000, Andromeda, Jüpiter…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={filterControlClass}
            />
          </FilterCell>
          <FilterCell label="Tür" htmlFor="target-kind">
            <select
              id="target-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as TargetKind | 'hepsi')}
              className={filterControlClass}
            >
              <option value="hepsi">Tüm türler</option>
              {availableKinds.map((k) => (
                <option key={k} value={k}>
                  {targetKindLabels[k]}
                  {isMovingKind(k) ? ' (güneş sistemi)' : ''}
                </option>
              ))}
            </select>
          </FilterCell>
          <FilterCell label="Zorluk" htmlFor="target-difficulty">
            <select
              id="target-difficulty"
              value={difficulty}
              onChange={(e) =>
                setDifficulty(e.target.value as typeof difficulty)
              }
              className={filterControlClass}
            >
              <option value="hepsi">Hepsi</option>
              <option value="Kolay">Kolay</option>
              <option value="Orta">Orta</option>
              <option value="Zor">Zor</option>
            </select>
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
            hint="Katalog kodu (M 31), alias (NGC 224), Türkçe ad (Rozet) veya takımyıldız adıyla deneyin. Tür ve zorluk filtrelerini gevşetmeyi de deneyebilirsiniz."
          />
        ) : (
          <CardGrid view={view}>
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
      <ContentCard to={`/hedef/${t.slug}`} variant="list">
        <ContentCardMedia variant="list">
          <StarField seed={t.slug} tint={tintFor(t.kind)} />
        </ContentCardMedia>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-display text-[14px] font-bold text-foreground transition-colors group-hover:text-primary">
              {t.catalog}
            </span>
            {difficulty}
          </div>
          <p className="mt-0.5 truncate text-meta text-muted-foreground">
            {t.name}
          </p>
        </div>

        <div className="tabular hidden shrink-0 text-right text-meta sm:block">
          <span className="block text-cold">{targetKindLabels[t.kind]}</span>
          <span className="block text-muted-foreground">
            {t.constellation} · {t.bestMonths}
          </span>
        </div>
      </ContentCard>
    );
  }

  return (
    <ContentCard to={`/hedef/${t.slug}`}>
      <ContentCardMedia flag={difficulty} fieldOfView={t.bestMonths}>
        <StarField seed={t.slug} tint={tintFor(t.kind)} />
      </ContentCardMedia>

      <ContentCardBody>
        <ContentCardTitle>{t.catalog}</ContentCardTitle>
        <p className="truncate text-meta leading-snug text-muted-foreground">
          {t.name}
        </p>
        <ContentCardMeta tone="cold" className="mt-auto pt-1">
          {targetKindLabels[t.kind]}
        </ContentCardMeta>
        <ContentCardMeta>{t.constellation}</ContentCardMeta>
      </ContentCardBody>
    </ContentCard>
  );
}

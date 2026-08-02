import { useMemo } from 'react';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterBar, FilterCell, filterControlClass } from '@/components/ui/FilterBar';
import { ActiveFilters } from '@/components/ui/ActiveFilters';
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
import { useExplorer } from '@/features/explorer/useExplorer';
import { targetsSpec } from './targetsSpec';
import { targets, targetKindLabels } from './data';
import { isMovingKind, type TargetKind } from '@/domain/targets/derive';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';

/**
 * Astronomik hedefler kataloğu (§8.2).
 *
 * Kartlar galeri karosuyla aynı bileşeni kullanır: hedef sayfası da bir
 * "kayıt" sunar ve iki modülde farklı kart anatomisi olması, aynı gökcismini
 * iki yerde tanımayı zorlaştırırdı.
 */
export function TargetsPage() {
  const [view, setView] = useViewMode('hedefler');

  /*
   * ORTAK DATA EXPLORER (Faz 4).
   *
   * Bu sayfa en son taşındı çünkü kendi araması (`searchTargets`) genel
   * motorun yapmadığı iki şey yapıyordu: boşlukları yok sayıyor ("m 31"
   * ≡ "m31") ve sonucu ALAKAYA göre sıralıyordu. Naif bir taşıma ikisini
   * de sessizce kaybettirirdi. İkisi de önce motora eklendi ve
   * testlendi.
   *
   * Arama sırasında sonuç KIRPILMIYOR — kırpılmış bir liste, aranan
   * kaydın var olmadığı izlenimini verir.
   */
  const ex = useExplorer(targets, targetsSpec);
  const result = ex.items;

  const tekSec = (param: string, next: string) => {
    const mevcut = ex.query.facets[param]?.[0];
    if (mevcut) ex.toggleFacet(param, mevcut);
    if (next !== 'hepsi' && next !== mevcut) ex.toggleFacet(param, next);
  };

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

        <FilterBar activeCount={ex.chips.length} columns={3}>
          <FilterCell label="Ara" htmlFor="target-search" className="sm:col-span-2">
            <Input
              id="target-search"
              type="search"
              placeholder="M 31, NGC 7000, Andromeda, Jüpiter…"
              value={ex.searchInput}
              onChange={(e) => ex.setSearch(e.target.value)}
              className={filterControlClass}
            />
          </FilterCell>
          <FilterCell label="Tür" htmlFor="target-kind">
            <select
              id="target-kind"
              value={ex.query.facets.tur?.[0] ?? 'hepsi'}
              onChange={(e) => tekSec('tur', e.target.value)}
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
        </FilterBar>

        <ActiveFilters
          chips={ex.chips}
          onRemove={ex.removeChip}
          onClearAll={ex.clearAll}
        />

        <ToolBar
          left={
            <ResultCount
              current={ex.total}
              total={targets.length}
              noun="hedef"
            />
          }
          view={{ mode: view, onChange: setView }}
        />

        {result.length === 0 ? (
          <EmptyState
            message="Eşleşen hedef yok"
            hint="Katalog kodu (M 31), alias (NGC 224), Türkçe ad (Rozet) veya takımyıldız adıyla deneyin. Tür filtresini gevşetmeyi de deneyebilirsiniz."
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
  if (variant === 'list') {
    return (
      <ContentCard to={`/hedef/${t.slug}`} variant="list">
        <ContentCardMedia variant="list">
          <StarField seed={t.slug} tint={tintFor(t.kind)} />
        </ContentCardMedia>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-display text-body-sm font-bold text-foreground transition-colors group-hover:text-primary">
              {t.catalog}
            </span>
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
      <ContentCardMedia fieldOfView={t.bestMonths}>
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

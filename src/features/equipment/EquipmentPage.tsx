import { useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  ContentCard,
  ContentCardActions,
  ContentCardMeta,
  ContentCardTitle,
} from '@/components/ui/ContentCard';
import { ButtonLink } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardGrid } from '@/components/ui/CardGrid';
import { ToolBar, ResultCount } from '@/components/ui/ToolBar';
import { useViewMode } from '@/components/ui/useViewMode';
import {
  FilterBar,
  FilterCell,
  filterControlClass,
} from '@/components/ui/FilterBar';
import {
  equipmentCategoryLabels,
  equipmentCategoryOrder,
  equipmentPath,
  type EquipmentCategory,
  type EquipmentModel,
} from './data';
import { EquipmentGlyph } from './EquipmentGlyph';
import { RemoteImage } from '@/components/media/RemoteImage';
import { useEquipmentCatalog } from '@/services/content/equipment';
import { useExplorer } from '@/features/explorer/useExplorer';
import { equipmentSpec } from './equipmentSpec';
import { CatalogSourceNote } from '@/components/ui/CatalogSourceNote';
import { cn } from '@/lib/cn';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';

/*
 * Sekmeler kategori tablosundan geliyor: liste iki yerde yazılıyken yeni
 * bir kategori eklendiğinde (reducer, barlow, oküler…) sekmelerde
 * görünmüyor ve o kayıtlara yalnızca arama ile ulaşılabiliyordu.
 */
const categories: (EquipmentCategory | 'hepsi')[] = [
  'hepsi',
  ...equipmentCategoryOrder,
];

/** URL'deki kategori parçası geçerli mi? */
function isCategory(value: string | undefined): value is EquipmentCategory {
  return value !== undefined && value in equipmentCategoryLabels;
}

/**
 * EKİPMAN VERİTABANI (§7.11).
 *
 * Kategori seçimi URL'de taşınır (`/ekipman/montur`): filtrelenmiş bir liste
 * paylaşılabilir ve tarayıcı geri tuşu çalışır. Arama URL'e yazılmaz —
 * her tuş vuruşunda geçmişe kayıt eklemek geri tuşunu kullanılamaz hâle
 * getiriyor.
 */
export function EquipmentPage() {
  const { category: categoryParam } = useParams<{ category?: string }>();
  const category: EquipmentCategory | 'hepsi' = isCategory(categoryParam)
    ? categoryParam
    : 'hepsi';

  const [view, setView] = useViewMode('ekipman');

  const catalog = useEquipmentCatalog();

  /*
   * Kategori süzmesi explorer'ın DIŞINDA: rota yolunda taşınıyor
   * (`/ekipman/montur`) ve o adresler prerender ediliyor. Sorgu
   * parametresine taşımak verilmiş bağlantıları kırardı — ayrıntı
   * `equipmentSpec.ts` başında.
   */
  const kategoriliste = useMemo(
    () =>
      category === 'hepsi'
        ? catalog.items
        : catalog.items.filter((e) => e.category === category),
    [catalog.items, category]
  );

  const ex = useExplorer(kategoriliste, equipmentSpec);
  const result = ex.items;

  const title =
    category === 'hepsi'
      ? 'Ekipman Veritabanı'
      : `${equipmentCategoryLabels[category]} Modelleri`;

  return (
    <>
      <PageMeta
        title={title}
        description="Teleskop, montür, astro kamera, filtre ve guide sistemleri — standart teknik alanlarla marka/model kataloğu; her model için o ekipmanla çekilmiş fotoğraflar ve ikinci el ilanları."
        jsonLd={breadcrumbJsonLd(
          category === 'hepsi'
            ? [
                { name: 'Ana Sayfa', path: '/' },
                { name: 'Ekipman', path: '/ekipman' },
              ]
            : [
                { name: 'Ana Sayfa', path: '/' },
                { name: 'Ekipman', path: '/ekipman' },
                {
                  name: equipmentCategoryLabels[category],
                  path: `/ekipman/${category}`,
                },
              ]
        )}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          title={title}
          description="Standartlaştırılmış teknik verilerle astronomi ekipmanları. Her model, o ekipmanla çekilmiş fotoğraflara ve hesaplayıcılara bağlıdır."
          actions={
            <>
              <ButtonLink to="/ekipman/karsilastir" size="sm">
                Karşılaştır
              </ButtonLink>
              <ButtonLink
                to="/araclar/setup-uyumluluk"
                size="sm"
                variant="secondary"
              >
                Setup Uyumluluğu
              </ButtonLink>
            </>
          }
        />

        {/* Kategori sekmeleri — seçim URL'de taşınır */}
        <div
          role="tablist"
          aria-label="Ekipman kategorileri"
          className="mb-4 flex flex-wrap items-center gap-1.5"
        >
          {categories.map((c) => {
            const active = category === c;
            return (
              <Link
                key={c}
                role="tab"
                aria-selected={active}
                to={c === 'hepsi' ? '/ekipman' : `/ekipman/${c}`}
                className={cn(
                  'rounded-card border px-2.5 py-1 text-meta tracking-[0.03em] transition-colors',
                  active
                    ? 'border-foreground/40 bg-surface-2 text-foreground'
                    : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
                )}
              >
                {c === 'hepsi' ? 'Tümü' : equipmentCategoryLabels[c]}
              </Link>
            );
          })}
        </div>

        <FilterBar columns={2}>
          <FilterCell label="Ara" htmlFor="eq-search">
            <Input
              id="eq-search"
              type="search"
              placeholder="Marka, model veya teknik değer (ör. EQ6, 3.76 µm)"
              value={ex.searchInput}
              onChange={(e) => ex.setSearch(e.target.value)}
              className={filterControlClass}
            />
          </FilterCell>
        </FilterBar>

        <CatalogSourceNote selection={catalog} />

        <ToolBar
          left={
            <ResultCount
              current={result.length}
              total={catalog.items.length}
              noun="model"
            />
          }
          view={{ mode: view, onChange: setView }}
        />

        {result.length === 0 ? (
          <EmptyState
            message="Eşleşen ekipman yok"
            hint="Aramayı kısaltmayı ya da başka bir kategori seçmeyi deneyin. Katalogda olmayan model talebi Faz 1.5'te açılacak."
          />
        ) : (
          <CardGrid view={view}>
            {result.map((model) => (
              <li key={model.slug}>
                <EquipmentCard model={model} variant={view} />
              </li>
            ))}
          </CardGrid>
        )}
      </Container>
    </>
  );
}

function EquipmentCard({
  model,
  variant,
}: {
  model: EquipmentModel;
  variant: 'grid' | 'list';
}) {
  if (variant === 'list') {
    return (
      <ContentCard to={equipmentPath(model)} variant="list">
        <EquipmentVisual model={model} className="h-9 w-9 shrink-0" />
        <div className="min-w-0 flex-1">
          <ContentCardTitle className="font-medium">
            <span className="text-muted-foreground">{model.brand}</span>{' '}
            {model.model}
          </ContentCardTitle>
          <ContentCardMeta className="mt-0.5">
            {Object.entries(model.specs)
              .map(([k, v]) => `${k}: ${v}`)
              .join(' · ')}
          </ContentCardMeta>
        </div>
        <Badge>{equipmentCategoryLabels[model.category]}</Badge>
      </ContentCard>
    );
  }

  return (
    <ContentCard to={equipmentPath(model)} className="p-3">
      <div className="mb-2 flex items-start gap-2.5">
        <EquipmentVisual model={model} className="h-11 w-11 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="label">{model.brand}</p>
          <ContentCardTitle lines={2} className="mt-0.5 font-medium leading-snug">
            {model.model}
          </ContentCardTitle>
        </div>
        <Badge>{equipmentCategoryLabels[model.category]}</Badge>
      </div>

      <dl className="mt-1">
        {Object.entries(model.specs).map(([k, v]) => (
          <div
            key={k}
            className="flex items-baseline justify-between gap-3 border-b border-border py-1 last:border-0"
          >
            <dt className="label shrink-0">{k}</dt>
            <dd className="tabular text-right text-body-sm text-cold">{v}</dd>
          </div>
        ))}
      </dl>

      <ContentCardActions className="justify-between pt-2.5">
        {model.priceHint && (
          <span className="text-meta tracking-[0.03em] text-faint">
            {model.priceHint}
          </span>
        )}
        <span className="ml-auto text-meta tracking-[0.04em] text-muted-foreground transition-colors group-hover:text-primary">
          künye →
        </span>
      </ContentCardActions>
    </ContentCard>
  );
}

/**
 * Modelin görseli — varsa fotoğraf, yoksa kategori simgesi.
 *
 * Üretici ürün fotoğrafları telifli olduğu için katalogda çoğu kaydın
 * görseli yok. Boş bir kutu bırakmak yerine parçanın siluetini çizen
 * simgeyi gösteriyoruz: liste taranırken bir kaydın reducer mı barlow mu
 * olduğu okumadan ayırt edilebiliyor.
 */
function EquipmentVisual({
  model,
  className,
}: {
  model: EquipmentModel;
  className?: string;
}) {
  if (model.image) {
    return (
      <span
        className={cn(
          'overflow-hidden rounded-card border border-border bg-surface-2',
          className
        )}
      >
        <RemoteImage
          src={model.image.url}
          alt={`${model.brand} ${model.model}`}
          sizes="(min-width: 640px) 33vw, 50vw"
          seed={model.slug}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        'flex items-center justify-center rounded-card border border-border bg-surface-2 p-1.5 text-muted-foreground transition-colors group-hover:text-primary',
        className
      )}
    >
      <EquipmentGlyph category={model.category} className="block h-full w-full" />
    </span>
  );
}

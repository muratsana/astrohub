import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
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
  equipmentPath,
  type EquipmentCategory,
  type EquipmentModel,
} from './data';
import { useEquipmentCatalog } from '@/services/content/equipment';
import { CatalogSourceNote } from '@/components/ui/CatalogSourceNote';
import { cn } from '@/lib/cn';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';

function trLower(s: string): string {
  return s.toLocaleLowerCase('tr-TR');
}

const categories: (EquipmentCategory | 'hepsi')[] = [
  'hepsi',
  'optik-tup',
  'lens',
  'montur',
  'astro-kamera',
  'filtre',
  'guide',
  'aksesuar',
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

  const [search, setSearch] = useState('');
  const [view, setView] = useViewMode('ekipman');

  const catalog = useEquipmentCatalog();

  const result = useMemo(() => {
    let items = catalog.items;
    if (category !== 'hepsi') items = items.filter((e) => e.category === category);
    const q = trLower(search.trim());
    if (q) {
      items = items.filter((e) =>
        trLower(`${e.brand} ${e.model} ${Object.values(e.specs).join(' ')}`).includes(q)
      );
    }
    return items;
  }, [catalog.items, category, search]);

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
            <ButtonLink to="/araclar/setup-uyumluluk" size="sm" variant="secondary">
              Setup Uyumluluğu
            </ButtonLink>
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
                  'rounded-card border px-2.5 py-1 text-[10px] tracking-[0.03em] transition-colors',
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
          <CardGrid view={view} density="tight">
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
      <Link
        to={equipmentPath(model)}
        className="group flex h-full items-center gap-3 rounded-card border border-border bg-surface-1 px-3 py-2.5 transition-colors hover:border-border-strong"
      >
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[13px] font-medium text-foreground group-hover:text-primary">
            <span className="text-muted-foreground">{model.brand}</span>{' '}
            {model.model}
          </h2>
          <p className="tabular mt-0.5 truncate text-[10px] text-muted-foreground">
            {Object.entries(model.specs)
              .map(([k, v]) => `${k}: ${v}`)
              .join(' · ')}
          </p>
        </div>
        <Badge>{equipmentCategoryLabels[model.category]}</Badge>
      </Link>
    );
  }

  return (
    <Link
      to={equipmentPath(model)}
      className="group flex h-full flex-col rounded-card border border-border bg-surface-1 p-3 transition-colors hover:border-border-strong"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="label">{model.brand}</p>
          <h2 className="mt-0.5 text-[14px] font-medium leading-snug text-foreground group-hover:text-primary">
            {model.model}
          </h2>
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
            <dd className="tabular text-right text-[11.5px] text-cold">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-auto flex items-center justify-between gap-2 pt-2.5">
        {model.priceHint && (
          <span className="text-[10px] tracking-[0.03em] text-faint">
            {model.priceHint}
          </span>
        )}
        <span className="ml-auto text-[10px] tracking-[0.04em] text-muted-foreground transition-colors group-hover:text-primary">
          künye →
        </span>
      </div>
    </Link>
  );
}

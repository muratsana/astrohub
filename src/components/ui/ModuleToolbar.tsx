import type { ReactNode } from 'react';
import type { Chip } from '@/features/explorer/query';
import { cn } from '@/lib/cn';
import { ActiveFilters } from './ActiveFilters';
import { FilterBar } from './FilterBar';
import {
  ResultCount,
  ToolBar,
  type ToolBarSort,
  type ToolBarView,
} from './ToolBar';
import type { ViewMode } from './useViewMode';

type ActiveFilterProps = {
  chips: Chip[];
  onRemove: (chip: Chip) => void;
  onClearAll: () => void;
};

/**
 * LİSTE KOMUTA ALANI — bütün keşif modüllerinin ortak görsel omurgası.
 *
 * Filtre motorunu veya sayfaya özgü kontrolleri yeniden tanımlamaz. Mevcut
 * parçaları sabit bir okuma sırasına yerleştirir: filtreler, sıralama,
 * görünüm, ek eylemler ve sonuç. Böylece modüller aynı
 * davranışı paylaşırken etkinlik takvimi veya forum yoğunluğu gibi özgün
 * kontrollerini korur.
 */
export function ModuleToolbar<M extends string = ViewMode>({
  children,
  activeFilters,
  result,
  sort,
  view,
  extra,
  columns,
  primaryFilters = 3,
  showResultCount = true,
  className,
  filterClassName,
  label = 'Liste araçları',
}: {
  children: ReactNode;
  activeFilters: ActiveFilterProps;
  result: { current: number; total: number; noun: string };
  sort?: ToolBarSort;
  view?: ToolBarView<M>;
  extra?: ReactNode;
  columns?: 2 | 3 | 4;
  primaryFilters?: number;
  showResultCount?: boolean;
  className?: string;
  filterClassName?: string;
  label?: string;
}) {
  const hasTools = Boolean(sort || view || extra);

  return (
    <section
      aria-label={label}
      className={cn(
        'mb-4 rounded-card border border-border-strong bg-surface-1/70 p-1.5 shadow-overlay sm:p-2',
        className
      )}
    >
      <div className="flex flex-col gap-1.5 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <FilterBar
            activeCount={activeFilters.chips.length}
            columns={columns}
            primaryCount={primaryFilters}
            collapseQuery="(max-width: 1099px)"
            className={cn(
              '!mb-0 [&>*]:!min-w-[8rem] [&>*]:!flex-none [&>*:first-child]:!min-w-[14rem] [&>*:first-child]:flex-1 [&_[role=tablist]]:!flex-nowrap [&_[role=tab]]:!whitespace-nowrap',
              filterClassName
            )}
          >
            {children}
          </FilterBar>
        </div>
        {hasTools && (
          <ToolBar
            sort={sort}
            view={view}
            extra={extra}
            className="!mb-0 min-w-0 w-full md:ml-auto md:w-auto md:shrink-0"
          />
        )}
        {showResultCount && (
          <div className="shrink-0 rounded-card border border-border bg-background/55 px-2.5 py-1.5">
            <ResultCount {...result} />
          </div>
        )}
      </div>

      <div className="hidden md:block md:[&>*]:mb-0 md:[&>*]:mt-2">
        <ActiveFilters {...activeFilters} />
      </div>
    </section>
  );
}

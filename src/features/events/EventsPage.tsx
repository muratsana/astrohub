import { useMemo, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  FilterBar,
  FilterCell,
  FilterToggle,
  filterControlClass,
} from '@/components/ui/FilterBar';
import { EditorialList, type EditorialItem } from '@/components/ui/EditorialList';
import { ToolBar, ResultCount } from '@/components/ui/ToolBar';
import { useViewMode } from '@/components/ui/useViewMode';
import { useEventCatalog } from '@/services/content/events';
import { CatalogSourceNote } from '@/components/ui/CatalogSourceNote';
import {
  filterEvents,
  defaultEventFilters,
  availableEventCities,
  capacityLabel,
  type EventFilters,
} from './filtering';
import { eventTypeLabels, type EventType } from './types';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { EventCalendar } from './EventCalendar';
import { cn } from '@/lib/cn';

/**
 * Etkinlikler sayfası (§7.5).
 *
 * Üç okuma biçimi: ızgara (görsel tarama), liste (tarihe göre hızlı tarama)
 * ve takvim (§19.3 — "şu hafta sonu ne var" sorusu). Harita ayrı bir sayfada
 * (/etkinlikler/harita) çünkü orada asıl sorulan soru "yakınımda ne var".
 * Filtreler üçünde de aynıdır; görünüm veriyi değil, okumayı değiştirir.
 */
export function EventsPage() {
  const [filters, setFilters] = useState<EventFilters>(defaultEventFilters);
  const [view, setView] = useViewMode('etkinlikler');
  /*
   * Kart / takvim ayrımı `useViewMode` ile birleştirilmedi: o kanca ızgara ve
   * liste arasında geçiş yapar ve tercihi modül bazında saklar. Takvim bunların
   * üçüncüsü değil, farklı bir okuma biçimi — kart görünümündeyken ızgara/liste
   * tercihi hâlâ anlamlı, takvimdeyken hiç değil.
   */
  const [layout, setLayout] = useState<'kart' | 'takvim'>('kart');
  const catalog = useEventCatalog();
  const cities = useMemo(
    () => availableEventCities(catalog.items),
    [catalog.items]
  );
  const result = useMemo(
    () => filterEvents(catalog.items, filters),
    [catalog.items, filters]
  );

  /*
    Etkinlikler de haber ve yazıyla aynı editöryel düzeni kullanıyor.
    Sayfanın işi veriyi o düzenin beklediği alanlara eşlemek; kart
    yapısı, manşet ve kolon sayısı `EditorialList` içinde bir kez tanımlı.
  */
  const editorialItems: EditorialItem[] = useMemo(
    () =>
      result.map((event) => {
        const date = splitDate(event.startsAt);
        const capacity = capacityLabel(event);
        return {
          slug: event.slug,
          to: `/etkinlik/${event.slug}`,
          title: event.title,
          summary: event.description,
          category: eventTypeLabels[event.type],
          meta: `${date.day} ${date.month} · ${event.city}`,
          imageUrl: event.image?.url,
          imageCredit: event.image?.credit,
          footer: (
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={event.free ? 'success' : 'primary'}>
                {event.free ? 'Ücretsiz' : 'Ücretli'}
              </Badge>
              {event.camping && <Badge tone="cold">Kamp</Badge>}
              {capacity && (
                <span className="tabular text-[10px] text-faint">{capacity}</span>
              )}
            </div>
          ),
        };
      }),
    [result]
  );

  function set<K extends keyof EventFilters>(key: K, value: EventFilters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  return (
    <>
      <PageMeta
        title="Türkiye Astronomi Etkinlikleri"
        description="Gözlem şenlikleri, astrofotoğraf kampları, halk gözlemleri, konferans ve atölyeler tek takvimde — her kayıt kaynak ve son doğrulama bilgisiyle."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Etkinlikler', path: '/etkinlikler' },
        ])}
      />
      <Container className="py-8 sm:py-10">
        <PageHeader
          title="Etkinlikler"
          description="Türkiye'deki astronomi etkinlikleri — gözlem şenlikleri, kamplar, atölyeler ve halk gözlemleri tek takvimde."
        />

        <FilterBar>
          <FilterCell label="Ara" htmlFor="event-search" className="lg:col-span-2">
            <Input
              id="event-search"
              type="search"
              placeholder="Etkinlik, şehir veya organizatör"
              value={filters.search}
              onChange={(e) => set('search', e.target.value)}
              className={filterControlClass}
            />
          </FilterCell>

          <FilterCell label="Şehir" htmlFor="e-city">
            <Select
              id="e-city"
              value={filters.city}
              onChange={(e) => set('city', e.target.value)}
              className={filterControlClass}
            >
              <option value="hepsi">Tüm şehirler</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </FilterCell>

          <FilterCell label="Tür" htmlFor="e-type">
            <Select
              id="e-type"
              value={filters.type}
              onChange={(e) => set('type', e.target.value as EventType | 'hepsi')}
              className={filterControlClass}
            >
              <option value="hepsi">Tüm türler</option>
              {Object.entries(eventTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FilterCell>

          <FilterToggle
            id="e-free"
            label="Ücretsiz"
            checked={filters.onlyFree}
            onChange={(v) => set('onlyFree', v)}
          />
          <FilterToggle
            id="e-camping"
            label="Kamp imkânı"
            checked={filters.onlyCamping}
            onChange={(v) => set('onlyCamping', v)}
          />
        </FilterBar>

        <CatalogSourceNote selection={catalog} />

        <ToolBar
          left={
            <ResultCount
              current={result.length}
              total={catalog.items.length}
              noun="etkinlik"
            />
          }
          view={layout === 'kart' ? { mode: view, onChange: setView } : undefined}
          extra={
            <div
              role="group"
              aria-label="Görünüm biçimi"
              className="inline-flex shrink-0 overflow-hidden rounded-card border border-border"
            >
              {(
                [
                  { value: 'kart', label: 'Kart' },
                  { value: 'takvim', label: 'Takvim' },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setLayout(option.value)}
                  aria-pressed={layout === option.value}
                  className={cn(
                    'h-8 border-l border-border px-2.5 text-[10px] tracking-[0.03em] transition-colors first:border-l-0',
                    layout === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          }
        />

        {layout === 'takvim' ? (
          result.length === 0 ? (
            <EmptyState
              message="Eşleşen etkinlik yok"
              hint="Takvim yalnızca filtreye uyan etkinlikleri gösterir; filtreyi gevşetmeyi deneyin."
            />
          ) : (
            <EventCalendar events={result} />
          )
        ) : result.length === 0 ? (
          <EmptyState
            message="Eşleşen etkinlik yok"
            hint="Şehir veya tür filtresini gevşetmeyi deneyin; takvim ileri tarihlere doğru dolmaya devam ediyor."
          />
        ) : (
          /*
            Etkinlikler de haber ve yazıyla aynı editöryel düzeni
            kullanıyor: manşet + görselli kartlar. Üç modül aynı şeyi
            yapıyor (tarihli, kategorili, özetli kayıt listelemek) ve üç
            ayrı kart yapısı, sayfadan sayfaya geçen kullanıcıya aynı
            sitenin üç ayrı bölümü gibi görünüyordu.
          */
          <EditorialList
            view={view}
            items={editorialItems}
            leadLabel="Öne çıkan"
            emptyMessage="Eşleşen etkinlik yok."
          />
        )}
      </Container>
    </>
  );
}

/** Tarihi iki parçaya böler: büyük gün sayısı + ay/yıl. */
function splitDate(iso: string) {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString('tr-TR', { day: '2-digit' }),
    month: d.toLocaleDateString('tr-TR', { month: 'short' }),
    year: d.getFullYear(),
    full: d.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  };
}

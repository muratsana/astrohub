import { useMemo, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  FilterCell,
  FilterToggle,
  filterControlClass,
} from '@/components/ui/FilterBar';
import { RangeFilter } from '@/components/ui/RangeFilter';
import {
  EditorialList,
  type EditorialItem,
} from '@/components/ui/EditorialList';
import { ModuleToolbar } from '@/components/ui/ModuleToolbar';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { useViewMode } from '@/components/ui/useViewMode';
import { useEventCatalog } from '@/services/content/events';
import { useExplorer } from '@/features/explorer/useExplorer';
import { eventsSpec } from './eventsSpec';
import { CatalogSourceNote } from '@/components/ui/CatalogSourceNote';
import { availableEventCities, capacityLabel } from './filtering';
import { eventTypeLabels } from './types';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { EventCalendar } from './EventCalendar';

/**
 * Etkinlikler sayfası (§7.5).
 *
 * Üç okuma biçimi: ızgara (görsel tarama), liste (tarihe göre hızlı tarama)
 * ve takvim (§19.3 — "şu hafta sonu ne var" sorusu). Harita ayrı bir sayfada
 * (/etkinlikler/harita) çünkü orada asıl sorulan soru "yakınımda ne var".
 * Filtreler üçünde de aynıdır; görünüm veriyi değil, okumayı değiştirir.
 */
export function EventsPage() {
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
  /*
   * ORTAK DATA EXPLORER (Faz 4). Ayrıca belgenin §7.1'de adıyla istediği
   * "gelecek/geçmiş etkinlikler" süzgeci geldi — sayfada hiç yoktu.
   */
  const ex = useExplorer(catalog.items, eventsSpec);
  const result = ex.items;

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
                <span className="tabular text-meta text-faint">{capacity}</span>
              )}
            </div>
          ),
        };
      }),
    [result]
  );

  /** Tek seçimli açılır listeler için: eskiyi kapat, yeniyi aç. */
  const tekSec = (param: string, next: string) => {
    const mevcut = ex.query.facets[param]?.[0];
    if (mevcut) ex.toggleFacet(param, mevcut);
    if (next !== 'hepsi' && next !== mevcut) ex.toggleFacet(param, next);
  };

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

        <ModuleToolbar
          activeFilters={{
            chips: ex.chips,
            onRemove: ex.removeChip,
            onClearAll: ex.clearAll,
          }}
          result={{
            current: ex.total,
            total: catalog.items.length,
            noun: 'etkinlik',
          }}
          sort={{
            id: 'event-sort',
            value: ex.query.sort,
            onChange: ex.setSort,
            options: eventsSpec.sorts.map((s) => ({
              value: s.value,
              label: s.label,
            })),
          }}
          extra={
            <div className="flex min-h-11 items-center gap-2 rounded-card border border-border-strong bg-surface-1 px-2 shadow-overlay">
              <SegmentedControl
                value={layout}
                options={[
                  { value: 'kart', label: 'Kart' },
                  { value: 'takvim', label: 'Takvim' },
                ]}
                onChange={setLayout}
                ariaLabel="Görünüm biçimi"
                role="group"
                size="xs"
                className="shrink-0"
              />
              {layout === 'kart' && <ViewToggle mode={view} onChange={setView} />}
            </div>
          }
        >
          <FilterCell
            label="Ara"
            htmlFor="event-search"
            active={ex.searchInput.trim().length > 0}
            className="min-w-[21rem] flex-[2_1_21rem]"
          >
            <Input
              id="event-search"
              type="search"
              placeholder="Etkinlik, şehir veya organizatör"
              value={ex.searchInput}
              onChange={(e) => ex.setSearch(e.target.value)}
              className={filterControlClass}
            />
          </FilterCell>

          <FilterCell
            label="Şehir"
            htmlFor="e-city"
            active={(ex.query.facets.sehir?.[0] ?? 'hepsi') !== 'hepsi'}
          >
            <Select
              id="e-city"
              value={ex.query.facets.sehir?.[0] ?? 'hepsi'}
              onChange={(e) => tekSec('sehir', e.target.value)}
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

          <FilterCell
            label="Tür"
            htmlFor="e-type"
            active={(ex.query.facets.tur?.[0] ?? 'hepsi') !== 'hepsi'}
          >
            <Select
              id="e-type"
              value={ex.query.facets.tur?.[0] ?? 'hepsi'}
              onChange={(e) => tekSec('tur', e.target.value)}
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
            checked={(ex.query.facets.ucretsiz?.length ?? 0) > 0}
            onChange={() => ex.toggleFacet('ucretsiz', 'evet')}
          />
          <FilterToggle
            id="e-paid"
            label="Ücretli"
            checked={(ex.query.facets.ucretli?.length ?? 0) > 0}
            onChange={() => ex.toggleFacet('ucretli', 'evet')}
          />
          <FilterToggle
            id="e-camping"
            label="Kamp imkânı"
            checked={(ex.query.facets.kamp?.length ?? 0) > 0}
            onChange={() => ex.toggleFacet('kamp', 'evet')}
          />
          {/* Tarih PENCERESİ — `zaman` facet'i (geçmiş/gelecek) bir YÖN
              soruyor, bu bir aralık. İkisi yan yana duruyor. */}
          <RangeFilter
            spec={eventsSpec.ranges![0]}
            value={ex.query.ranges.tarih}
            onChange={(next) => ex.setRange('tarih', next)}
          />
        </ModuleToolbar>

        <CatalogSourceNote selection={catalog} />

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

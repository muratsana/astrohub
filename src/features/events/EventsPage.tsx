import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { CardGrid } from '@/components/ui/CardGrid';
import { ToolBar, ResultCount } from '@/components/ui/ToolBar';
import { useViewMode } from '@/components/ui/useViewMode';
import { PlateFrame } from '@/components/media/PlateFrame';
import { StarField } from '@/components/media/StarField';
import { tintFromSeed } from '@/components/media/tints';
import { events } from './data';
import {
  filterEvents,
  defaultEventFilters,
  availableEventCities,
  capacityLabel,
  type EventFilters,
} from './filtering';
import { eventTypeLabels, type EventType } from './types';
import type { AstroEvent } from './types';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';

/**
 * Etkinlikler sayfası (§7.5).
 *
 * Takvim ve harita görünümleri Faz 1.6'da eklenecek (harita 3. parti tile
 * sağlayıcısı gerektirdiği için şimdilik kapsam dışı). Bu arada ızgara/liste
 * geçişi var: liste görünümü tarihe göre taramayı kolaylaştırır.
 */
export function EventsPage() {
  const [filters, setFilters] = useState<EventFilters>(defaultEventFilters);
  const [view, setView] = useViewMode('etkinlikler');
  const cities = useMemo(() => availableEventCities(events), []);
  const result = useMemo(() => filterEvents(events, filters), [filters]);

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

        <ToolBar
          left={
            <ResultCount
              current={result.length}
              total={events.length}
              noun="etkinlik"
            />
          }
          view={{ mode: view, onChange: setView }}
        />

        {result.length === 0 ? (
          <EmptyState
            message="Eşleşen etkinlik yok"
            hint="Şehir veya tür filtresini gevşetmeyi deneyin; takvim ileri tarihlere doğru dolmaya devam ediyor."
          />
        ) : (
          <CardGrid view={view}>
            {result.map((event) => (
              <li key={event.slug}>
                <EventCard event={event} variant={view} />
              </li>
            ))}
          </CardGrid>
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

function EventCard({
  event,
  variant,
}: {
  event: AstroEvent;
  variant: 'grid' | 'list';
}) {
  const date = splitDate(event.startsAt);
  const capacity = capacityLabel(event);

  const badges = (
    <div className="flex flex-wrap gap-1">
      <Badge>{eventTypeLabels[event.type]}</Badge>
      <Badge tone={event.free ? 'success' : 'primary'}>
        {event.free ? 'Ücretsiz' : 'Ücretli'}
      </Badge>
      {event.camping && <Badge tone="cold">Kamp</Badge>}
      {capacity && <Badge tone="muted">{capacity}</Badge>}
    </div>
  );

  if (variant === 'list') {
    return (
      <Link
        to={`/etkinlik/${event.slug}`}
        className="group flex items-center gap-3 rounded-card border border-border bg-surface-1 px-3 py-2.5 transition-colors hover:border-border-strong"
      >
        <DateBlock date={date} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[13px] font-medium leading-snug text-foreground group-hover:text-primary">
            {event.title}
          </h2>
          <p className="tabular mt-0.5 truncate text-[10px] text-muted-foreground">
            {event.city}
            {event.organizer.verified && ' · Doğrulanmış organizatör'}
          </p>
        </div>
        <div className="hidden shrink-0 sm:block">{badges}</div>
      </Link>
    );
  }

  return (
    <Link
      to={`/etkinlik/${event.slug}`}
      className="group flex h-full flex-col rounded-card border border-border bg-surface-1 transition-colors hover:border-border-strong"
    >
      <PlateFrame
        ratio="aspect-[16/9]"
        className="border-0 border-b border-border"
        badge={
          <span className="tabular rounded-[2px] bg-background/85 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-primary">
            {date.day} {date.month}
          </span>
        }
        flag={
          event.organizer.verified ? (
            <Badge tone="cold" className="bg-background/85">
              Doğrulanmış
            </Badge>
          ) : undefined
        }
      >
        <StarField seed={event.slug} tint={tintFromSeed(event.slug)} />
      </PlateFrame>
      <div className="flex flex-1 flex-col px-2.5 py-2">
        <p className="tabular text-[10px] text-muted-foreground">
          {date.full} · {event.city}
        </p>
        <h2 className="mt-1 text-[13px] font-medium leading-snug text-foreground group-hover:text-primary">
          {event.title}
        </h2>
        <div className="mt-auto pt-2">{badges}</div>
      </div>
    </Link>
  );
}

/** Takvim yaprağı — liste görünümünde tarihi ilk okunan öğe yapar. */
function DateBlock({ date }: { date: ReturnType<typeof splitDate> }) {
  return (
    <div className="flex w-11 shrink-0 flex-col items-center rounded-card border border-border bg-surface-2 py-1">
      <span className="tabular font-display text-[17px] font-bold leading-none text-primary">
        {date.day}
      </span>
      <span className="mt-0.5 text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
        {date.month}
      </span>
    </div>
  );
}

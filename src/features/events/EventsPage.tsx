import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PhotoPlaceholder } from '@/components/media/PhotoPlaceholder';
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

const selectClass =
  'h-10 rounded-xl border border-border bg-surface-1 px-3 text-sm text-foreground focus:border-primary/60';

/**
 * Etkinlikler sayfası (§7.5) — kart liste görünümü.
 * Takvim ve harita görünümleri Faz 1.6'da eklenecek (harita 3. parti tile
 * sağlayıcısı gerektirdiği için şimdilik kapsam dışı).
 */
export function EventsPage() {
  const [filters, setFilters] = useState<EventFilters>(defaultEventFilters);
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
      <Container className="py-10 sm:py-14">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Etkinlikler
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Türkiye'deki astronomi etkinlikleri — gözlem şenlikleri, kamplar,
            atölyeler ve halk gözlemleri tek takvimde.
          </p>
        </header>

        <div className="mb-8 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface-1 p-4">
          <div className="min-w-56 flex-1">
            <label htmlFor="event-search" className="sr-only">
              Etkinlik ara
            </label>
            <Input
              id="event-search"
              type="search"
              placeholder="Etkinlik, şehir veya organizatör ara"
              value={filters.search}
              onChange={(e) => set('search', e.target.value)}
              className="h-10"
            />
          </div>

          <label className="sr-only" htmlFor="e-city">
            Şehir
          </label>
          <select
            id="e-city"
            className={selectClass}
            value={filters.city}
            onChange={(e) => set('city', e.target.value)}
          >
            <option value="hepsi">Tüm şehirler</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="e-type">
            Etkinlik türü
          </label>
          <select
            id="e-type"
            className={selectClass}
            value={filters.type}
            onChange={(e) => set('type', e.target.value as EventType | 'hepsi')}
          >
            <option value="hepsi">Tüm türler</option>
            {Object.entries(eventTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border accent-primary"
              checked={filters.onlyFree}
              onChange={(e) => set('onlyFree', e.target.checked)}
            />
            Ücretsiz
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border accent-primary"
              checked={filters.onlyCamping}
              onChange={(e) => set('onlyCamping', e.target.checked)}
            />
            Kamp imkânı
          </label>
        </div>

        {result.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">
            Bu filtrelerle eşleşen etkinlik bulunamadı.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.map((event) => (
              <li key={event.slug}>
                <EventCard event={event} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
  );
}

function EventCard({ event }: { event: AstroEvent }) {
  const date = new Date(event.startsAt).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const capacity = capacityLabel(event);

  return (
    <Link
      to={`/etkinlik/${event.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface-1 transition-colors hover:border-white/20"
    >
      <PhotoPlaceholder
        gradient={event.gradient}
        alt={event.title}
        rounded="rounded-none"
        className="aspect-[16/9] w-full"
      />
      <div className="flex flex-1 flex-col p-4">
        <div className="tabular mb-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium text-primary">{date}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{event.city}</span>
          {event.organizer.verified && (
            <Badge tone="cold">Doğrulanmış organizatör</Badge>
          )}
        </div>
        <h2 className="text-sm font-semibold leading-snug text-foreground">
          {event.title}
        </h2>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
          <Badge>{eventTypeLabels[event.type]}</Badge>
          <Badge tone={event.free ? 'success' : 'primary'}>
            {event.free ? 'Ücretsiz' : 'Ücretli'}
          </Badge>
          {event.camping && <Badge tone="cold">Kamp</Badge>}
          {capacity && <Badge tone="muted">{capacity}</Badge>}
        </div>
      </div>
    </Link>
  );
}

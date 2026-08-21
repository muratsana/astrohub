import { useEffect, useMemo, useState } from 'react';
import { adminEditPath } from '@/components/admin/adminEditPath';
import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import { Button, ButtonLink, ExternalButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SortableHeader } from '@/components/ui/SortableHeader';
import { AdminEditLink } from '@/components/admin/AdminEditLink';
import { PageMeta } from '@/components/seo/PageMeta';
import { PhotoPlaceholder } from '@/components/media/PhotoPlaceholder';
import { RemoteImage } from '@/components/media/RemoteImage';
import { breadcrumbJsonLd } from '@/lib/seo';
import { useLocationContext } from '@/features/location/LocationContext';
import { LocationPicker } from '@/features/location/LocationPicker';
import { sortByProximity, formatDistance } from '@/domain/geography/distance';
import { useEventCatalog } from '@/services/content/events';
import { applyFeatured, useFeatured } from '@/services/content/featured';
import { eventTypeLabels } from './types';
import { EventViews } from './EventViews';
import type { AstroEvent } from './types';
import { cn } from '@/lib/cn';
import { TileMap } from '@/features/sky/TileMap';
import { formatEventDate, formatEventDateRange } from './eventDates';
import {
  BASEMAP_CREDIT,
  OPACITY_RANGE,
  OVERLAY_SOURCES,
  SATELLITE_CREDIT,
  ZOOM_RANGE,
  basemapSource,
  satelliteSource,
} from '@/features/sky/lightPollutionEmbed';
import type { LatLng } from '@/features/sky/tileMath';
import { useTheme } from '@/features/theme/ThemeContext';
import { hasNetworkAccess } from '@/lib/runtime';
import { ETHEM_EVENT_SLUG } from './enrichment';

/**
 * ETKİNLİKLER ANA MODÜLÜ.
 *
 * Harita ana görünüm; liste ise altta yakınlık sırasıyla çalışır. Varsayılan
 * olarak yalnız seçili/en yakın etkinliğin pini çizilir. Kullanıcı bilinçli
 * olarak "Tümünü göster" derse tüm konumlu etkinlikler haritaya basılır.
 */

const CONSENT_KEY = 'astrohub:map:tiles';
type BaseMode = 'harita' | 'uydu';
type LayerMode = 'yok' | 'isik';
type EventSortKey = 'distance' | 'city' | 'startsAt' | 'endsAt';
type SortDirection = 'asc' | 'desc';
type LocatedEvent = { item: AstroEvent; distanceKm: number };
const TURKEY_CENTER: LatLng = { lat: 39, lng: 35 };
const TURKEY_ZOOM = 5;

function sortLocatedEvents(
  items: LocatedEvent[],
  key: EventSortKey,
  direction: SortDirection
): LocatedEvent[] {
  const sign = direction === 'asc' ? 1 : -1;
  const time = (value: string | undefined) => new Date(value ?? '').getTime();

  return [...items].sort((a, b) => {
    if (key === 'distance') return (a.distanceKm - b.distanceKm) * sign;
    if (key === 'city') {
      return a.item.city.localeCompare(b.item.city, 'tr-TR') * sign;
    }

    const aTime = time(key === 'startsAt' ? a.item.startsAt : a.item.endsAt);
    const bTime = time(key === 'startsAt' ? b.item.startsAt : b.item.endsAt);
    return (
      ((Number.isFinite(aTime) ? aTime : 0) -
        (Number.isFinite(bTime) ? bTime : 0)) *
      sign
    );
  });
}

/**
 * YAKINLIK LİSTESİNİN PAYLAŞILAN PARÇALARI.
 *
 * Aynı etkinlik iki düzende gösteriliyor: masaüstünde geniş tablo,
 * mobilde yığılmış kart. Görsel, başlık/rozet ve aksiyon üçlüsünü tek
 * yerde tutmak, birinde düzeltilen bir davranışın diğerinde eski
 * kalmasını engelliyor — tıpkı avatar/kapak editöründe olduğu gibi.
 */
function EventThumbLink({ item }: { item: AstroEvent }) {
  return (
    <Link
      to={`/etkinlik/${item.slug}`}
      className="relative h-14 w-20 shrink-0 overflow-hidden rounded-card border border-border bg-surface-2"
      aria-label={`${item.title} detayını aç`}
    >
      {item.image ? (
        <RemoteImage
          src={item.image.url}
          alt={`${item.title} etkinlik görseli`}
          seed={item.slug}
          tint={item.gradient}
          className="h-full w-full object-cover transition duration-300 hover:scale-105"
          sizes="80px"
        />
      ) : (
        <PhotoPlaceholder
          gradient={item.gradient}
          alt={`${item.title} etkinlik görseli`}
          className="h-full w-full"
        />
      )}
    </Link>
  );
}

function EventTitleBadges({ item }: { item: AstroEvent }) {
  return (
    <div className="min-w-0">
      <Link
        to={`/etkinlik/${item.slug}`}
        className="flex min-h-8 items-center truncate text-caption text-foreground transition-colors hover:text-primary"
      >
        {item.title}
      </Link>
      <p className="mt-1 line-clamp-1 text-body-sm text-muted-foreground">
        {item.description}
      </p>
      <span className="mt-1.5 flex flex-wrap gap-1.5">
        <Badge tone="primary">{eventTypeLabels[item.type]}</Badge>
        <Badge tone={item.free ? 'success' : 'muted'}>
          {item.free ? 'Ücretsiz' : 'Ücretli'}
        </Badge>
      </span>
    </div>
  );
}

function EventActions({
  item,
  active,
  onFocus,
}: {
  item: AstroEvent;
  active: string | null;
  onFocus: (item: AstroEvent) => void;
}) {
  return (
    <>
      <Button
        size="sm"
        variant={active === item.slug ? 'primary' : 'secondary'}
        onClick={() => onFocus(item)}
      >
        Haritada göster
      </Button>
      <ButtonLink to={`/etkinlik/${item.slug}`} size="sm" variant="ghost">
        Görüntüle
      </ButtonLink>
      {item.contact && (
        <ExternalButtonLink
          href={item.contact.url}
          size="sm"
          variant="secondary"
        >
          İletişim
        </ExternalButtonLink>
      )}
      <AdminEditLink to={`/admin/events?slug=${item.slug}`} />
    </>
  );
}

export function EventMapPage() {
  const { location, permission, requestDeviceLocation } = useLocationContext();
  const { theme } = useTheme();
  const [active, setActive] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(true);
  const [followDevice, setFollowDevice] = useState(false);
  const catalog = useEventCatalog();
  const [allowed, setAllowed] = useState(() => {
    try {
      return localStorage.getItem(CONSENT_KEY) === 'izin';
    } catch {
      return false;
    }
  });
  const [opacity, setOpacity] = useState(55);
  const [baseMode, setBaseMode] = useState<BaseMode>('harita');
  const [layerMode, setLayerMode] = useState<LayerMode>('isik');
  const [sort, setSort] = useState<{
    key: EventSortKey;
    direction: SortDirection;
  }>({ key: 'distance', direction: 'asc' });
  const [center, setCenter] = useState<LatLng>(TURKEY_CENTER);
  const [zoom, setZoom] = useState(TURKEY_ZOOM);
  const [mapExpanded, setMapExpanded] = useState(false);
  const featuredEvents = useFeatured('etkinlik');

  useEffect(() => {
    if (!followDevice) return;
    setCenter({ lat: location.latitude, lng: location.longitude });
    setZoom((current) => Math.max(current, 7));
  }, [followDevice, location.latitude, location.longitude]);

  const { located, unlocated } = useMemo(
    () => sortByProximity(catalog.items, location, (e: AstroEvent) => e.coords),
    [catalog.items, location]
  );
  const sortedLocated = useMemo(
    () => sortLocatedEvents(located, sort.key, sort.direction),
    [located, sort]
  );

  const featuredItem =
    applyFeatured(
      catalog.items,
      [ETHEM_EVENT_SLUG, ...featuredEvents.slugs],
      (event) => event.slug,
      1
    )[0] ?? null;

  useEffect(() => {
    setActive((current) => {
      if (current && located.some(({ item }) => item.slug === current)) {
        return current;
      }
      if (
        featuredItem &&
        located.some(({ item }) => item.slug === featuredItem.slug)
      ) {
        return featuredItem.slug;
      }
      return located[0]?.item.slug ?? null;
    });
  }, [featuredItem, located]);

  const selected =
    located.find(({ item }) => item.slug === active) ?? located[0];
  const selectedIsFeatured =
    selected && featuredItem ? selected.item.slug === featuredItem.slug : false;
  const mapItems = showAll ? located : selected ? [selected] : [];
  const overlay = layerMode === 'isik' ? OVERLAY_SOURCES[0] : undefined;
  const base =
    baseMode === 'uydu'
      ? satelliteSource()
      : basemapSource(theme !== 'light' || Boolean(overlay?.needsDarkBasemap));
  const credit = [
    baseMode === 'uydu' ? SATELLITE_CREDIT : BASEMAP_CREDIT,
    overlay?.credit,
  ]
    .filter(Boolean)
    .join(' · ');
  const live = hasNetworkAccess && allowed;
  const distanceReference =
    location.source === 'device' || location.source === 'site'
      ? ''
      : ` (${location.label} merkez)`;

  function formatLocalDistance(km: number): string {
    const distance = formatDistance(km);
    return distance === '—' ? distance : `${distance}${distanceReference}`;
  }

  function focusEvent(item: AstroEvent) {
    if (!item.coords) return;
    setFollowDevice(false);
    setActive(item.slug);
    setShowAll(false);
    setCenter({ lat: item.coords.latitude, lng: item.coords.longitude });
    setZoom((current) => Math.max(current, 7));
  }

  function locateOnMap() {
    setFollowDevice(true);
    setShowAll(false);
    requestDeviceLocation();
  }

  function toggleMapScope() {
    setFollowDevice(false);
    if (showAll) {
      if (selected) focusEvent(selected.item);
      return;
    }
    setShowAll(true);
    setCenter(TURKEY_CENTER);
    setZoom(TURKEY_ZOOM);
  }

  function resetMapView() {
    setFollowDevice(false);
    if (showAll || !selected?.item.coords) {
      setCenter(TURKEY_CENTER);
      setZoom(TURKEY_ZOOM);
      return;
    }
    setCenter({
      lat: selected.item.coords.latitude,
      lng: selected.item.coords.longitude,
    });
    setZoom(7);
  }

  function changeMapZoom(delta: number) {
    setZoom((current) =>
      Math.min(ZOOM_RANGE.max, Math.max(ZOOM_RANGE.min, current + delta))
    );
  }

  function changeSort(key: EventSortKey) {
    setSort((current) =>
      current.key === key
        ? {
            key,
            direction: current.direction === 'asc' ? 'desc' : 'asc',
          }
        : { key, direction: 'asc' }
    );
  }

  function sortLabel(key: EventSortKey, label: string) {
    if (sort.key !== key) return label;
    return `${label} ${sort.direction === 'asc' ? '↑' : '↓'}`;
  }

  function allow() {
    setAllowed(true);
    try {
      localStorage.setItem(CONSENT_KEY, 'izin');
    } catch {
      // Seçim yalnız bu oturumda kalır.
    }
  }

  const mapHeaderStatus = (
    <span className="flex min-w-0 items-center justify-end gap-2 overflow-x-auto whitespace-nowrap">
      <span className="shrink-0 text-meta text-muted-foreground">
        {mapItems.length} etkinlik
      </span>
      {live && (
        <>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 shrink-0 px-2"
            onClick={locateOnMap}
            disabled={permission === 'pending'}
          >
            {permission === 'pending' ? 'Konum alınıyor' : 'Konumumu bul'}
          </Button>
          <label className="flex shrink-0 items-center gap-1">
            <span className="text-[0.68rem] text-faint">Altlık</span>
            <Select
              value={baseMode}
              onChange={(event) => setBaseMode(event.target.value as BaseMode)}
              width="5.75rem"
              className="h-8 text-meta"
            >
              <option value="harita">Harita</option>
              <option value="uydu">Uydu</option>
            </Select>
          </label>
          <label className="flex shrink-0 items-center gap-1">
            <span className="text-[0.68rem] text-faint">Katman</span>
            <Select
              value={layerMode}
              onChange={(event) =>
                setLayerMode(event.target.value as LayerMode)
              }
              width="5.75rem"
              className="h-8 text-meta"
            >
              <option value="isik">Işık</option>
              <option value="yok">Yok</option>
            </Select>
          </label>
          {overlay && (
            <label
              htmlFor="event-opacity"
              className="flex shrink-0 items-center gap-1"
            >
              <span className="text-[0.68rem] text-faint">Saydamlık</span>
              <input
                id="event-opacity"
                type="range"
                min={OPACITY_RANGE.min}
                max={OPACITY_RANGE.max}
                step={5}
                value={opacity}
                onChange={(event) => setOpacity(Number(event.target.value))}
                className="block w-16 accent-primary"
              />
            </label>
          )}
          <Button
            size="sm"
            variant="secondary"
            className="h-8 shrink-0 px-2"
            onClick={toggleMapScope}
          >
            {showAll ? 'Tek pin' : 'Tümü'}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 w-8 shrink-0 px-0 text-base"
            onClick={() => changeMapZoom(1)}
            aria-label="Haritayı yakınlaştır"
            title="Yakınlaştır"
          >
            +
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 w-8 shrink-0 px-0 text-base"
            onClick={() => changeMapZoom(-1)}
            aria-label="Haritayı uzaklaştır"
            title="Uzaklaştır"
          >
            -
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 shrink-0 px-2"
            onClick={resetMapView}
          >
            Sıfırla
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 shrink-0 px-2"
            onClick={() => setMapExpanded((current) => !current)}
          >
            {mapExpanded ? 'Daralt' : 'Genişlet'}
          </Button>
        </>
      )}
    </span>
  );

  return (
    <>
      <PageMeta
        title="Etkinlikler"
        description="Türkiye'deki astronomi etkinlikleri: harita, yakın etkinlik listesi ve çevrimiçi programlar."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Etkinlikler', path: '/etkinlikler' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Etkinlikler' },
          ]}
          title="Etkinlikler"
          meta={location.label}
        />

        <EventViews />

        <div className="space-y-4">
          <div
            className={cn(
              'grid gap-4 lg:items-stretch',
              mapExpanded
                ? 'lg:grid-cols-1'
                : 'lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]'
            )}
          >
            {/* ───────── Harita ───────── */}
            <Panel
              title="Etkinlik haritası"
              status={mapHeaderStatus}
              className="flex h-full min-h-0 flex-col"
              bodyClassName="min-h-0 flex-1 p-0"
            >
              <div
                className={cn(
                  'relative overflow-hidden rounded-b-card bg-surface-2',
                  mapExpanded
                    ? 'h-[78vh] min-h-[620px]'
                    : 'h-[54vh] min-h-[460px] lg:h-[560px]'
                )}
              >
                {!hasNetworkAccess ? (
                  <div className="grid h-full place-items-center p-6 text-center text-body-sm text-muted-foreground">
                    Bu önizleme dış harita isteği yapmıyor.
                  </div>
                ) : live ? (
                  <TileMap
                    label="Etkinlik haritası — sürükleyerek ve ok tuşlarıyla gezin"
                    className={cn(
                      'h-full w-full',
                      theme === 'field' &&
                        '[filter:sepia(1)_saturate(5)_hue-rotate(-38deg)_brightness(0.6)]'
                    )}
                    center={center}
                    zoom={zoom}
                    minZoom={ZOOM_RANGE.min}
                    maxZoom={ZOOM_RANGE.max}
                    onCenterChange={setCenter}
                    onZoomChange={setZoom}
                    base={base}
                    overlay={overlay}
                    overlayOpacity={opacity / 100}
                    marker={{ lat: location.latitude, lng: location.longitude }}
                    markers={mapItems.map(({ item, distanceKm }) => ({
                      id: item.slug,
                      point: {
                        lat: item.coords!.latitude,
                        lng: item.coords!.longitude,
                      },
                      label: `${item.title}, ${item.city}, ${formatLocalDistance(distanceKm)} uzaklıkta`,
                      popup: (
                        <>
                          <span className="block truncate text-body-sm font-medium text-foreground">
                            {item.title}
                          </span>
                          <span className="mt-1 block truncate text-meta text-muted-foreground">
                            {item.city} ·{' '}
                            {formatEventDateRange(item.startsAt, item.endsAt)}
                          </span>
                          <span className="mt-1 block text-meta text-cold">
                            {formatLocalDistance(distanceKm)}
                          </span>
                        </>
                      ),
                      active: active === item.slug,
                      onSelect: () => focusEvent(item),
                    }))}
                  />
                ) : (
                  <div className="grid h-full place-items-center p-6 text-center">
                    <div className="max-w-md">
                      <p className="text-body-sm leading-relaxed text-muted-foreground">
                        Harita CARTO döşemelerini yükler; IP adresiniz ve
                        baktığınız bölge sağlayıcıya iletilir.
                      </p>
                      <Button size="sm" className="mt-3" onClick={allow}>
                        Haritayı yükle
                      </Button>
                    </div>
                  </div>
                )}

                {live && active && (
                  <div className="pointer-events-none absolute inset-x-2 bottom-7 rounded-card border border-border bg-surface-1/95 px-2.5 py-1.5">
                    {(() => {
                      const hit = located.find((l) => l.item.slug === active);
                      if (!hit) return null;
                      return (
                        <p className="truncate text-body-sm text-foreground">
                          <span className="font-medium">{hit.item.title}</span>
                          <span className="ml-2 text-muted-foreground">
                            {hit.item.city} ·{' '}
                            {formatLocalDistance(hit.distanceKm)}
                          </span>
                        </p>
                      );
                    })()}
                  </div>
                )}
                {live && (
                  <>
                    <p className="absolute bottom-1 left-2 text-[0.62rem] text-muted-foreground">
                      {credit}
                    </p>
                  </>
                )}
              </div>
            </Panel>

            <Panel
              title={
                selectedIsFeatured ? 'Öne çıkan etkinlik' : 'Seçili etkinlik'
              }
              status={
                selected
                  ? formatEventDateRange(
                      selected.item.startsAt,
                      selected.item.endsAt
                    )
                  : undefined
              }
              className="flex h-full min-h-0 flex-col"
              bodyClassName="flex min-h-0 flex-1 flex-col p-0"
            >
              {selected ? (
                <div className="flex h-full min-h-0 flex-col">
                  <Link
                    to={`/etkinlik/${selected.item.slug}`}
                    className="relative block h-56 shrink-0 overflow-hidden bg-surface-2"
                    aria-label={`${selected.item.title} detayını aç`}
                  >
                    {selected.item.image ? (
                      <RemoteImage
                        src={selected.item.image.url}
                        alt={`${selected.item.title} etkinlik görseli`}
                        seed={selected.item.slug}
                        tint={selected.item.gradient}
                        className="h-full w-full object-cover transition duration-300 hover:scale-105"
                        sizes="(min-width: 1024px) 380px, 100vw"
                      />
                    ) : (
                      <PhotoPlaceholder
                        gradient={selected.item.gradient}
                        alt={`${selected.item.title} etkinlik görseli`}
                        className="h-full w-full"
                      />
                    )}
                    {selectedIsFeatured && (
                      <span className="absolute left-3 top-3">
                        <Badge tone="primary">Öne çıkan</Badge>
                      </span>
                    )}
                  </Link>
                  <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4">
                    <div>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone="primary">
                          {eventTypeLabels[selected.item.type]}
                        </Badge>
                        <Badge tone={selected.item.free ? 'success' : 'muted'}>
                          {selected.item.free ? 'Ücretsiz' : 'Ücretli'}
                        </Badge>
                        <Badge tone="cold">{selected.item.city}</Badge>
                      </div>
                      <h2 className="mt-3 type-section text-foreground">
                        {selected.item.title}
                      </h2>
                      <p className="mt-2 line-clamp-4 text-body-sm leading-relaxed text-muted-foreground">
                        {selected.item.description}
                      </p>
                    </div>

                    <dl className="grid gap-px overflow-hidden rounded-card border border-border bg-border text-body-sm">
                      <div className="grid grid-cols-[7rem_1fr] gap-3 bg-surface-1 px-3 py-2">
                        <dt className="label">Tarih</dt>
                        <dd className="tabular text-foreground">
                          {formatEventDateRange(
                            selected.item.startsAt,
                            selected.item.endsAt
                          )}
                        </dd>
                      </div>
                      <div className="grid grid-cols-[7rem_1fr] gap-3 bg-surface-1 px-3 py-2">
                        <dt className="label">Konum</dt>
                        <dd className="text-foreground">
                          {selected.item.venue}, {selected.item.city}
                        </dd>
                      </div>
                      <div className="grid grid-cols-[7rem_1fr] gap-3 bg-surface-1 px-3 py-2">
                        <dt className="label">Mesafe</dt>
                        <dd className="tabular text-cold">
                          {formatLocalDistance(selected.distanceKm)}
                        </dd>
                      </div>
                      <div className="grid grid-cols-[7rem_1fr] gap-3 bg-surface-1 px-3 py-2">
                        <dt className="label">Düzenleyen</dt>
                        <dd className="text-foreground">
                          {selected.item.organizer.name}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-auto flex flex-wrap gap-2">
                      <EventActions
                        item={selected.item}
                        active={active}
                        onFocus={focusEvent}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState
                  message="Seçili etkinlik yok"
                  hint="Konum bilgisi olan bir etkinlik seçildiğinde ayrıntısı burada görünür."
                  className="border-0 py-8"
                />
              )}
            </Panel>
          </div>

          {/* ───────── Yakınlık listesi ───────── */}
          <div className="space-y-4">
            <Panel
              title="Size en yakın"
              status={
                <span className="flex flex-wrap items-center justify-end gap-2">
                  <LocationPicker variant="panel" />
                  <ButtonLink to="/etkinlik/yeni" size="sm">
                    Etkinlik ekle
                  </ButtonLink>
                </span>
              }
            >
              {located.length === 0 ? (
                <EmptyState
                  message="Bu türde konumlu etkinlik yok"
                  hint="Konumlu etkinlik ekleyebilir ya da çevrimiçi etkinliklere bakabilirsiniz."
                  className="border-0 py-8"
                />
              ) : (
                <>
                  {/*
                   * MASAÜSTÜ: geniş tablo. `overflow-x-auto` sarmalayıcı
                   * kalıyor ama artık yalnızca md ve üstünde görünüyor;
                   * dar ekranda 980px'lik tablonun bir pencerede yatay
                   * kaydırılması gerekiyordu (A14) — mobil o pencereyi
                   * hiç görmüyor.
                   */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[980px] border-collapse text-left">
                      <thead className="border-b border-border text-meta text-muted-foreground">
                        <tr>
                          <th
                            scope="col"
                            className="px-0 py-2 pr-4 font-medium"
                          >
                            Etkinlik
                          </th>
                          <SortableHeader onClick={() => changeSort('city')}>
                            {sortLabel('city', 'İl')}
                          </SortableHeader>
                          <SortableHeader
                            onClick={() => changeSort('startsAt')}
                          >
                            {sortLabel('startsAt', 'Başlangıç')}
                          </SortableHeader>
                          <SortableHeader onClick={() => changeSort('endsAt')}>
                            {sortLabel('endsAt', 'Bitiş')}
                          </SortableHeader>
                          <SortableHeader
                            onClick={() => changeSort('distance')}
                          >
                            {sortLabel('distance', 'Mesafe')}
                          </SortableHeader>
                          <th
                            scope="col"
                            className="py-2 pl-4 text-right font-medium"
                          >
                            İşlem
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedLocated.map(({ item, distanceKm }) => (
                          <tr
                            key={item.slug}
                            className={cn(
                              'border-b border-border transition-colors last:border-0',
                              active === item.slug && 'text-primary'
                            )}
                          >
                            <td className="max-w-[390px] py-2.5 pr-4 align-top">
                              <div className="flex items-start gap-3">
                                <EventThumbLink item={item} />
                                <EventTitleBadges item={item} />
                              </div>
                            </td>
                            <td className="py-2.5 pr-4 align-top text-body-sm text-muted-foreground">
                              {item.city}
                            </td>
                            <td className="tabular py-2.5 pr-4 align-top text-body-sm text-muted-foreground">
                              {formatEventDate(item.startsAt)}
                            </td>
                            <td className="tabular py-2.5 pr-4 align-top text-body-sm text-muted-foreground">
                              {formatEventDate(item.endsAt ?? item.startsAt)}
                            </td>
                            <td className="tabular py-2.5 pr-4 align-top text-body-sm text-cold">
                              {formatLocalDistance(distanceKm)}
                            </td>
                            <td className="py-2.5 pl-4 align-top">
                              <div className="flex justify-end gap-2">
                                <EventActions
                                  item={item}
                                  active={active}
                                  onFocus={focusEvent}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/*
                   * MOBİL: yığılmış kart. Aynı veriler tek sütuna diziliyor;
                   * il/tarih/mesafe künye satırında, aksiyonlar altta sarıyor.
                   * Yatay kaydırma yok — A14'ün istediği bu.
                   */}
                  <ul className="space-y-3 md:hidden">
                    {sortedLocated.map(({ item, distanceKm }) => (
                      <li
                        key={item.slug}
                        className={cn(
                          'rounded-card border border-border p-3 transition-colors',
                          active === item.slug && 'border-primary'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <EventThumbLink item={item} />
                          <EventTitleBadges item={item} />
                        </div>
                        <dl className="tabular mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-muted-foreground">
                          <div className="flex gap-1">
                            <dt className="sr-only">İl</dt>
                            <dd>{item.city}</dd>
                          </div>
                          <div className="flex gap-1">
                            <dt className="sr-only">Başlangıç</dt>
                            <dd>{formatEventDate(item.startsAt)}</dd>
                          </div>
                          <div className="flex gap-1">
                            <dt className="sr-only">Mesafe</dt>
                            <dd className="text-cold">
                              {formatLocalDistance(distanceKm)}
                            </dd>
                          </div>
                        </dl>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          <EventActions
                            item={item}
                            active={active}
                            onFocus={focusEvent}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Panel>

            {unlocated.length > 0 && (
              <Panel title="Çevrimiçi" status={`${unlocated.length}`}>
                <ul>
                  {unlocated.map((item) => (
                    <li
                      key={item.slug}
                      className="flex items-center gap-3 border-b border-border last:border-0"
                    >
                      <Link
                        to={`/etkinlik/${item.slug}`}
                        className="flex min-w-0 flex-1 items-baseline justify-between gap-3 py-2 transition-colors hover:text-primary"
                      >
                        <span className="min-w-0 truncate text-caption text-foreground">
                          {item.title}
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="tabular text-meta text-muted-foreground">
                            {formatEventDateRange(item.startsAt, item.endsAt)}
                          </span>
                          <Badge tone="cold">Çevrimiçi</Badge>
                        </span>
                      </Link>
                      {item.contact && (
                        <ExternalButtonLink
                          href={item.contact.url}
                          size="sm"
                          variant="secondary"
                        >
                          İletişim
                        </ExternalButtonLink>
                      )}
                      <AdminEditLink to={adminEditPath('event', item.slug)} />
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>
        </div>
      </Container>
    </>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SortableHeader } from '@/components/ui/SortableHeader';
import { AdminEditLink } from '@/components/admin/AdminEditLink';
import { PageMeta } from '@/components/seo/PageMeta';
import { PhotoPlaceholder } from '@/components/media/PhotoPlaceholder';
import { breadcrumbJsonLd } from '@/lib/seo';
import { useLocationContext } from '@/features/location/LocationContext';
import { sortByProximity, formatDistance } from '@/domain/geography/distance';
import { useEventCatalog } from '@/services/content/events';
import { eventTypeLabels } from './types';
import type { AstroEvent } from './types';
import { cn } from '@/lib/cn';
import { TileMap } from '@/features/sky/TileMap';
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

const shortDateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function formatEventDate(value: string | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return shortDateFormatter.format(date);
}

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

export function EventMapPage() {
  const navigate = useNavigate();
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

  useEffect(() => {
    setActive((current) => {
      if (current && located.some(({ item }) => item.slug === current)) {
        return current;
      }
      return located[0]?.item.slug ?? null;
    });
  }, [located]);

  const featured = located[0];
  const selected =
    located.find(({ item }) => item.slug === active) ?? located[0];
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

  return (
    <>
      <PageMeta
        title="Etkinlikler"
        description="Türkiye'deki astronomi etkinliklerinin konum dağılımı ve size en yakın etkinlikler — mesafeye göre sıralı."
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
          description="Etkinlikler konumlarına göre dağıtıldı ve size olan kuş uçuşu mesafeye göre sıralandı. Referans noktası üst çubuktaki konumunuz."
          meta={location.label}
        />

        {featured && (
          <Link
            to={`/etkinlik/${featured.item.slug}`}
            className="group mb-4 grid overflow-hidden rounded-card border border-primary/50 bg-surface-1 transition-colors hover:border-primary md:h-[525px] md:grid-cols-[minmax(0,58%)_minmax(0,1fr)]"
          >
            <PhotoPlaceholder
              gradient={featured.item.gradient}
              alt={`${featured.item.title} etkinlik görseli`}
              className="min-h-[17.5rem] md:h-full md:min-h-0"
              rounded="rounded-none"
            />
            <div className="flex min-h-[17.5rem] flex-col justify-center p-4 md:min-h-0 md:p-5">
              <div className="min-w-0 flex-1">
                <Badge tone="primary">Otomatik öne çıkan</Badge>
                <h2 className="mt-3 type-section text-foreground transition-colors group-hover:text-white">
                  {featured.item.title}
                </h2>
                <p className="mt-2.5 line-clamp-5 text-body-sm leading-relaxed text-muted-foreground">
                  Konumunuza göre en yakın etkinlik. {featured.item.city} ·{' '}
                  {formatEventDate(featured.item.startsAt)}
                </p>
              </div>
              <span className="tabular mt-auto w-fit rounded-card border border-border bg-background px-2.5 py-1.5 text-body-sm text-cold">
                {formatDistance(featured.distanceKm)}
              </span>
            </div>
          </Link>
        )}

        <div className="space-y-4">
          {/* ───────── Harita ───────── */}
          <Panel
            title="Etkinlik haritası"
            status={`${mapItems.length} işaret`}
            bodyClassName="p-0"
          >
            <div className="relative h-[70vh] min-h-[520px] overflow-hidden rounded-b-card bg-surface-2">
              <Button
                size="sm"
                variant="secondary"
                className="absolute left-2 top-2 z-10 bg-background/90 backdrop-blur-sm"
                onClick={locateOnMap}
                disabled={permission === 'pending'}
              >
                {permission === 'pending' ? 'Konum alınıyor' : 'Konumumu bul'}
              </Button>
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
                    label: `${item.title}, ${item.city}, ${formatDistance(distanceKm)} uzaklıkta`,
                    popup: (
                      <>
                        <span className="block truncate text-body-sm font-medium text-foreground">
                          {item.title}
                        </span>
                        <span className="mt-1 block truncate text-meta text-muted-foreground">
                          {item.city} · {formatEventDate(item.startsAt)}
                        </span>
                        <span className="mt-1 block text-meta text-cold">
                          {formatDistance(distanceKm)}
                        </span>
                      </>
                    ),
                    active: active === item.slug,
                    onSelect: () => navigate(`/etkinlik/${item.slug}`),
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
                          {hit.item.city} · {formatDistance(hit.distanceKm)}
                        </span>
                      </p>
                    );
                  })()}
                </div>
              )}
              {live && (
                <>
                  <div className="absolute right-2 top-2 flex max-w-[calc(100%-1rem)] flex-wrap items-end gap-2 rounded-card border border-border-strong bg-background/90 px-2 py-1.5 shadow-card backdrop-blur-sm">
                    <label className="grid gap-1">
                      <span className="label">Altlık</span>
                      <Select
                        value={baseMode}
                        onChange={(event) =>
                          setBaseMode(event.target.value as BaseMode)
                        }
                        className="h-8 w-28 text-meta"
                      >
                        <option value="harita">Harita</option>
                        <option value="uydu">Uydu</option>
                      </Select>
                    </label>
                    <label className="grid gap-1">
                      <span className="label">Katman</span>
                      <Select
                        value={layerMode}
                        onChange={(event) =>
                          setLayerMode(event.target.value as LayerMode)
                        }
                        className="h-8 w-28 text-meta"
                      >
                        <option value="isik">Işık</option>
                        <option value="yok">Yok</option>
                      </Select>
                    </label>
                    {overlay && (
                      <label htmlFor="event-opacity" className="grid gap-1">
                        <span className="label">Saydamlık</span>
                        <input
                          id="event-opacity"
                          type="range"
                          min={OPACITY_RANGE.min}
                          max={OPACITY_RANGE.max}
                          step={5}
                          value={opacity}
                          onChange={(event) =>
                            setOpacity(Number(event.target.value))
                          }
                          className="block w-24 accent-primary"
                        />
                      </label>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={toggleMapScope}
                    >
                      {showAll ? 'Tek pini göster' : 'Tümünü göster'}
                    </Button>
                  </div>
                  <p className="absolute bottom-1 left-2 text-[0.62rem] text-muted-foreground">
                    {credit}
                  </p>
                </>
              )}
            </div>
          </Panel>

          {/* ───────── Yakınlık listesi ───────── */}
          <div className="space-y-4">
            <Panel
              title="Size en yakın"
              status={
                <span className="flex items-center gap-3">
                  <span>{location.label}</span>
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
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] border-collapse text-left">
                    <thead className="border-b border-border text-meta text-muted-foreground">
                      <tr>
                        <th scope="col" className="px-0 py-2 pr-4 font-medium">
                          Etkinlik
                        </th>
                        <SortableHeader onClick={() => changeSort('city')}>
                          {sortLabel('city', 'İl')}
                        </SortableHeader>
                        <SortableHeader onClick={() => changeSort('startsAt')}>
                          {sortLabel('startsAt', 'Başlangıç')}
                        </SortableHeader>
                        <SortableHeader onClick={() => changeSort('endsAt')}>
                          {sortLabel('endsAt', 'Bitiş')}
                        </SortableHeader>
                        <SortableHeader onClick={() => changeSort('distance')}>
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
                          <td className="max-w-[320px] py-2.5 pr-4 align-top">
                            <Link
                              to={`/etkinlik/${item.slug}`}
                              className="flex min-h-6 items-center truncate text-caption text-foreground transition-colors hover:text-primary"
                            >
                              {item.title}
                            </Link>
                            <span className="mt-1 flex flex-wrap gap-1.5">
                              <Badge tone="primary">
                                {eventTypeLabels[item.type]}
                              </Badge>
                              <Badge tone={item.free ? 'success' : 'muted'}>
                                {item.free ? 'Ücretsiz' : 'Ücretli'}
                              </Badge>
                            </span>
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
                            {formatDistance(distanceKm)}
                          </td>
                          <td className="py-2.5 pl-4 align-top">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant={
                                  active === item.slug ? 'primary' : 'secondary'
                                }
                                onClick={() => focusEvent(item)}
                              >
                                Haritada göster
                              </Button>
                              <ButtonLink
                                to={`/etkinlik/${item.slug}`}
                                size="sm"
                                variant="ghost"
                              >
                                Görüntüle
                              </ButtonLink>
                              <AdminEditLink
                                to={`/admin/events?slug=${item.slug}`}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                        <Badge tone="cold">Çevrimiçi</Badge>
                      </Link>
                      <AdminEditLink to={`/admin/events?slug=${item.slug}`} />
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

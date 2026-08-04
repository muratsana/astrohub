import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Select } from '@/components/ui/Input';
import { CatalogSourceNote } from '@/components/ui/CatalogSourceNote';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { sortByProximity, formatDistance } from '@/domain/geography/distance';
import { useLocationContext } from '@/features/location/LocationContext';
import { useTheme } from '@/features/theme/ThemeContext';
import { TileMap } from '@/features/sky/TileMap';
import type { LatLng } from '@/features/sky/tileMath';
import {
  BASEMAP_CREDIT,
  OPACITY_RANGE,
  OVERLAY_SOURCES,
  SATELLITE_CREDIT,
  ZOOM_RANGE,
  basemapSource,
  satelliteSource,
} from '@/features/sky/lightPollutionEmbed';
import { hasNetworkAccess } from '@/lib/runtime';
import { cn } from '@/lib/cn';
import { useSiteCatalog } from '@/services/content/sites';
import { siteTypeLabels, type ObservingSite, type SiteType } from './data';

const CONSENT_KEY = 'astrohub:map:tiles';

type SortMode = 'yakin' | 'karanlik' | 'puan';
type BaseMode = 'harita' | 'uydu';
type LayerMode = 'yok' | 'isik';

const BORTLE_COLORS = [
  '#38bdf8',
  '#22c55e',
  '#84cc16',
  '#eab308',
  '#f59e0b',
  '#f97316',
  '#ef4444',
  '#c026d3',
  '#f8fafc',
] as const;

function markerColor(bortle: number): string {
  return BORTLE_COLORS[Math.min(8, Math.max(0, Math.round(bortle) - 1))];
}

function storedConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'izin';
  } catch {
    return false;
  }
}

/** Kamp/gözlem noktaları artık ana harita modülü. */
export function SitesPage() {
  const { location, permission, requestDeviceLocation } = useLocationContext();
  const { theme } = useTheme();
  const catalog = useSiteCatalog();
  const [type, setType] = useState<SiteType | 'hepsi'>('hepsi');
  const [bortle, setBortle] = useState<number | 'hepsi'>('hepsi');
  const [sort, setSort] = useState<SortMode>('yakin');
  const [active, setActive] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [allowed, setAllowed] = useState(storedConsent);
  const [opacity, setOpacity] = useState(55);
  const [baseMode, setBaseMode] = useState<BaseMode>('harita');
  const [layerMode, setLayerMode] = useState<LayerMode>('isik');
  const [center, setCenter] = useState<LatLng>({
    lat: location.latitude,
    lng: location.longitude,
  });
  const [zoom, setZoom] = useState(6);

  useEffect(() => {
    setCenter({ lat: location.latitude, lng: location.longitude });
  }, [location.latitude, location.longitude]);

  const filtered = useMemo(
    () =>
      catalog.items.filter(
        (site) =>
          (type === 'hepsi' || site.siteType === type) &&
          (bortle === 'hepsi' || site.bortle === bortle)
      ),
    [bortle, catalog.items, type]
  );

  const nearest = useMemo(() => {
    const rows = sortByProximity(
      filtered,
      location,
      (site: ObservingSite) => site.coords
    );
    if (sort === 'karanlik') {
      return [...rows.located].sort(
        (a, b) => a.item.bortle - b.item.bortle || a.distanceKm - b.distanceKm
      );
    }
    if (sort === 'puan') {
      return [...rows.located].sort(
        (a, b) => b.item.rating - a.item.rating || a.distanceKm - b.distanceKm
      );
    }
    return rows.located;
  }, [filtered, location, sort]);

  useEffect(() => {
    setActive((current) => {
      if (current && nearest.some(({ item }) => item.slug === current)) {
        return current;
      }
      return nearest[0]?.item.slug ?? null;
    });
  }, [nearest]);

  const selected = nearest.find(({ item }) => item.slug === active) ?? nearest[0];
  const mapItems = showAll ? nearest : selected ? [selected] : [];
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

  function focusSite(item: ObservingSite) {
    setActive(item.slug);
    setShowAll(false);
    setCenter({ lat: item.coords.latitude, lng: item.coords.longitude });
    setZoom((current) => Math.max(current, 7));
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
        title="Saha Haritası"
        description="Türkiye'nin karanlık gökyüzü noktaları: Bortle katmanı, cihaz konumu ve mesafeye göre sıralı gözlem alanları."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Saha', path: '/saha' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          title="Saha"
          description="Kamp ve gözlem noktaları artık harita üstünde: Bortle/SQM kayıtları, ışık kirliliği katmanı ve size en yakın sahalar."
          meta={location.label}
          actions={
            <Button
              size="sm"
              variant="secondary"
              onClick={requestDeviceLocation}
              disabled={permission === 'pending'}
            >
              {permission === 'pending' ? 'Konum alınıyor' : 'Konumumu bul'}
            </Button>
          }
        />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-card border border-border bg-surface-1 px-3 py-2">
          <p className="label tabular" role="status">
            {nearest.length} saha · konum: {location.label}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="site-type" className="sr-only">
              Tür
            </label>
            <Select
              id="site-type"
              value={type}
              onChange={(event) => setType(event.target.value as SiteType | 'hepsi')}
              className="h-8 w-auto text-meta"
            >
              <option value="hepsi">Tüm türler</option>
              {Object.entries(siteTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>

            <label htmlFor="site-bortle" className="sr-only">
              Bortle
            </label>
            <Select
              id="site-bortle"
              value={bortle}
              onChange={(event) =>
                setBortle(
                  event.target.value === 'hepsi' ? 'hepsi' : Number(event.target.value)
                )
              }
              className="h-8 w-auto text-meta"
            >
              <option value="hepsi">Tüm Bortle</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
                <option key={value} value={value}>
                  Bortle {value}
                </option>
              ))}
            </Select>

            <label htmlFor="site-sort" className="sr-only">
              Sırala
            </label>
            <Select
              id="site-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortMode)}
              className="h-8 w-auto text-meta"
            >
              <option value="yakin">Yakınımdaki</option>
              <option value="karanlik">En karanlık</option>
              <option value="puan">En yüksek puan</option>
            </Select>
          </div>
        </div>

        <CatalogSourceNote selection={catalog} />

        <div className="mt-4 space-y-4">
          <Panel
            title="Bortle saha haritası"
            status={`${mapItems.length} işaret`}
            bodyClassName="p-0"
          >
            <div className="relative h-[70vh] min-h-[520px] overflow-hidden rounded-b-card bg-surface-2">
              {!hasNetworkAccess ? (
                <MapNotice
                  title="Bu önizleme dış harita isteği yapmıyor"
                  body="Yayındaki sitede altlık harita ve ışık kirliliği katmanı burada açılır."
                />
              ) : live ? (
                <TileMap
                  label="Saha haritası — sürükleyerek gezin"
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
                      lat: item.coords.latitude,
                      lng: item.coords.longitude,
                    },
                    label: `${item.name}, ${item.region}, Bortle ${item.bortle}, ${formatDistance(distanceKm)} uzaklıkta`,
                    active: active === item.slug,
                    color: markerColor(item.bortle),
                    onSelect: () => focusSite(item),
                  }))}
                />
              ) : (
                <MapNotice
                  title="Harita üçüncü taraf döşemeleri yükler"
                  body="Haritayı açtığınızda IP adresiniz ve baktığınız bölge CARTO ve NASA GIBS sağlayıcılarına gider."
                  action={
                    <Button size="sm" onClick={allow}>
                      Haritayı yükle
                    </Button>
                  }
                />
              )}

              {live && (
                <>
                  <div className="absolute right-2 top-2 flex max-w-[calc(100%-1rem)] flex-wrap items-end gap-2 rounded-card border border-border-strong bg-background/90 px-2 py-1.5 shadow-card backdrop-blur-sm">
                    <label className="grid gap-1">
                      <span className="label">Altlık</span>
                      <Select
                        value={baseMode}
                        onChange={(event) => setBaseMode(event.target.value as BaseMode)}
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
                        onChange={(event) => setLayerMode(event.target.value as LayerMode)}
                        className="h-8 w-28 text-meta"
                      >
                        <option value="isik">Işık</option>
                        <option value="yok">Yok</option>
                      </Select>
                    </label>
                    {overlay && (
                      <label htmlFor="site-opacity" className="grid gap-1">
                        <span className="label">Saydamlık</span>
                        <input
                          id="site-opacity"
                          type="range"
                          min={OPACITY_RANGE.min}
                          max={OPACITY_RANGE.max}
                          step={5}
                          value={opacity}
                          onChange={(event) => setOpacity(Number(event.target.value))}
                          className="block w-24 accent-primary"
                        />
                      </label>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setShowAll((current) => !current)}
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

          <Panel title="Size en yakın sahalar" status={location.label}>
            {nearest.length === 0 ? (
              <EmptyState
                message="Eşleşen saha yok"
                hint="Tür veya Bortle filtresini genişletin."
                className="border-0 py-8"
              />
            ) : (
              <ul>
                {nearest.map(({ item, distanceKm }) => (
                  <li key={item.slug} className="border-b border-border last:border-0">
                    <div
                      className={cn(
                        'flex flex-wrap items-start justify-between gap-3 py-3 transition-colors',
                        active === item.slug && 'text-primary'
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <span className="truncate text-caption text-foreground">
                            {item.name}
                          </span>
                          <span className="tabular text-body-sm text-cold">
                            {formatDistance(distanceKm)}
                          </span>
                        </span>
                        <p className="mt-0.5 text-meta text-muted-foreground">
                          {item.region} · {siteTypeLabels[item.siteType]} · {item.altitude}{' '}
                          m
                        </p>
                        <span className="mt-1 flex flex-wrap gap-1.5">
                          <Badge tone="primary">Bortle {item.bortle}</Badge>
                          {item.sqm !== undefined && <Badge>SQM {item.sqm}</Badge>}
                          <Badge tone="cold">★ {item.rating.toFixed(1)}</Badge>
                        </span>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={active === item.slug ? 'primary' : 'secondary'}
                          onClick={() => focusSite(item)}
                        >
                          Haritada göster
                        </Button>
                        <ButtonLink
                          to={`/saha/${item.slug}`}
                          size="sm"
                          variant="ghost"
                        >
                          Görüntüle
                        </ButtonLink>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </Container>
    </>
  );
}

function MapNotice({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid h-full place-items-center p-6 text-center">
      <div className="max-w-md">
        <p className="text-body-sm text-foreground">{title}</p>
        <p className="mt-1 text-body-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

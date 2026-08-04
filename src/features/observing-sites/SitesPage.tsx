import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
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
  ZOOM_RANGE,
  basemapSource,
} from '@/features/sky/lightPollutionEmbed';
import { hasNetworkAccess } from '@/lib/runtime';
import { cn } from '@/lib/cn';
import { useSiteCatalog } from '@/services/content/sites';
import { siteTypeLabels, type ObservingSite, type SiteType } from './data';

const CONSENT_KEY = 'astrohub:map:tiles';

type SortMode = 'yakin' | 'karanlik' | 'puan';

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
  const [allowed, setAllowed] = useState(storedConsent);
  const [opacity, setOpacity] = useState(55);
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

  const overlay = OVERLAY_SOURCES[0];
  const live = hasNetworkAccess && allowed;

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

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <Panel
            title="Bortle saha haritası"
            status={`${nearest.length} işaret`}
            bodyClassName="p-0"
          >
            <div className="relative h-[62vh] min-h-[440px] overflow-hidden rounded-b-card bg-surface-2">
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
                  base={basemapSource(theme !== 'light' || !!overlay.needsDarkBasemap)}
                  overlay={overlay}
                  overlayOpacity={opacity / 100}
                  marker={{ lat: location.latitude, lng: location.longitude }}
                  markers={nearest.map(({ item, distanceKm }) => ({
                    id: item.slug,
                    point: {
                      lat: item.coords.latitude,
                      lng: item.coords.longitude,
                    },
                    label: `${item.name}, ${item.region}, Bortle ${item.bortle}, ${formatDistance(distanceKm)} uzaklıkta`,
                    active: active === item.slug,
                    color: markerColor(item.bortle),
                    onSelect: () => setActive(item.slug),
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
                  <BortleLegend />
                  <div className="absolute right-2 top-2 rounded-card border border-border-strong bg-background/85 px-2 py-1.5 backdrop-blur-sm">
                    <label htmlFor="site-opacity" className="label">
                      Katman
                    </label>
                    <input
                      id="site-opacity"
                      type="range"
                      min={OPACITY_RANGE.min}
                      max={OPACITY_RANGE.max}
                      step={5}
                      value={opacity}
                      onChange={(event) => setOpacity(Number(event.target.value))}
                      className="mt-1 block w-28 accent-primary"
                    />
                  </div>
                  <p className="absolute bottom-1 left-2 text-[0.62rem] text-muted-foreground">
                    {BASEMAP_CREDIT} · {overlay.credit}
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
                    <Link
                      to={`/saha/${item.slug}`}
                      onMouseEnter={() => setActive(item.slug)}
                      onMouseLeave={() => setActive(null)}
                      className={cn(
                        'block py-2 transition-colors hover:text-primary',
                        active === item.slug && 'text-primary'
                      )}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate text-caption text-foreground">
                            {item.name}
                          </span>
                          <span className="mt-0.5 block text-meta text-muted-foreground">
                            {item.region} · {siteTypeLabels[item.siteType]} ·{' '}
                            {item.altitude} m
                          </span>
                        </span>
                        <span className="tabular shrink-0 text-body-sm text-cold">
                          {formatDistance(distanceKm)}
                        </span>
                      </span>
                      <span className="mt-1 flex flex-wrap gap-1.5">
                        <Badge tone="primary">Bortle {item.bortle}</Badge>
                        {item.sqm !== undefined && <Badge>SQM {item.sqm}</Badge>}
                        <Badge tone="cold">★ {item.rating.toFixed(1)}</Badge>
                      </span>
                    </Link>
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

function BortleLegend() {
  return (
    <div className="absolute bottom-5 left-2 rounded-card border border-border-strong bg-background/85 px-2 py-1.5 backdrop-blur-sm">
      <p className="label mb-1">Bortle ölçeği</p>
      <div className="flex h-2 w-44 overflow-hidden rounded-card">
        {BORTLE_COLORS.map((color, index) => (
          <span
            key={color}
            title={`Bortle ${index + 1}`}
            className="flex-1"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-meta text-faint">
        <span>B1 karanlık</span>
        <span>B9 şehir</span>
      </div>
    </div>
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

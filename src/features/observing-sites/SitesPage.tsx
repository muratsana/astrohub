import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Input, Select } from '@/components/ui/Input';
import { SortableHeader } from '@/components/ui/SortableHeader';
import { AdminEditLink } from '@/components/admin/AdminEditLink';
import { CatalogSourceNote } from '@/components/ui/CatalogSourceNote';
import { PageMeta } from '@/components/seo/PageMeta';
import { useAuth } from '@/features/auth/AuthContext';
import { sitesSpec } from './sitesSpec';
import { breadcrumbJsonLd } from '@/lib/seo';
import { sortByProximity, formatDistance } from '@/domain/geography/distance';
import { moonPhase } from '@/domain/astronomy/ephemeris';
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
import { commonsWidthUrl } from '@/lib/commons';
import {
  createLightPollutionMeasurement,
  useLightPollutionMeasurements,
  useSiteCatalog,
  type LightPollutionMeasurement,
} from '@/services/content/sites';
import { siteTypeLabels, type ObservingSite, type SiteType } from './data';

const CONSENT_KEY = 'astrohub:map:tiles';

type BaseMode = 'harita' | 'uydu';
type LayerMode = 'yok' | 'isik';
type MapProvider = 'astrohub' | 'lightpollutionmap';
type SiteSortKey =
  'distance' | 'region' | 'type' | 'altitude' | 'road' | 'bortle' | 'rating';
type SortDirection = 'asc' | 'desc';
type LocatedSite = { item: ObservingSite; distanceKm: number };

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

const MEASUREMENT_METHODS = [
  'SQM-L',
  'SQM-LU-DL',
  'TESS-W',
  'Görsel tahmin',
  'Kamera/plate solve türevi',
] as const;

const EQUIPMENT_TYPES = [
  'SQM cihazı',
  'All-sky kamera',
  'Astrofotoğraf kamerası',
  'DSLR / aynasız',
  'Görsel gözlem',
] as const;

const SKY_CONDITIONS = [
  'Açık',
  'İnce bulut',
  'Parçalı bulut',
  'Nemli / puslu',
  'Toz / duman',
] as const;

const TRANSPARENCY_OPTIONS = [
  'Çok iyi',
  'İyi',
  'Orta',
  'Zayıf',
  'Bilinmiyor',
] as const;

function markerColor(bortle: number): string {
  return BORTLE_COLORS[Math.min(8, Math.max(0, Math.round(bortle) - 1))];
}

function measurementColor(item: LightPollutionMeasurement): string {
  if (item.sqm !== undefined) {
    if (item.sqm >= 21.7) return '#22c55e';
    if (item.sqm >= 21.2) return '#84cc16';
    if (item.sqm >= 20.5) return '#eab308';
    if (item.sqm >= 19.5) return '#f97316';
    return '#ef4444';
  }
  return markerColor(item.bortle ?? 9);
}

function localDateTimeValue(date = new Date()): string {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function parseLocalDateTime(value: string): Date {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function measurementLabel(item: LightPollutionMeasurement): string {
  const values = [
    item.sqm !== undefined ? `SQM ${item.sqm.toFixed(2)}` : null,
    item.bortle !== undefined ? `Bortle ${item.bortle}` : null,
  ].filter(Boolean);
  return values.length > 0 ? values.join(' · ') : 'Ölçüm';
}

function coordinateLabel(point: LatLng): string {
  return `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
}

function storedConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'izin';
  } catch {
    return false;
  }
}

function defaultDirection(key: SiteSortKey): SortDirection {
  return key === 'rating' || key === 'altitude' ? 'desc' : 'asc';
}

function formatBortle(value: number): string {
  return value > 0 ? `Bortle ${value}` : '—';
}

function lightPollutionMapInfoUrl(view: LatLng & { zoom: number }) {
  const lat = Math.min(85, Math.max(-85, view.lat)).toFixed(6);
  const lon = Math.min(180, Math.max(-180, view.lng)).toFixed(6);
  const zoom = Math.min(18, Math.max(2, Math.round(view.zoom)));
  return `https://www.lightpollutionmap.info/#zoom=${zoom}&lat=${lat}&lon=${lon}`;
}

function sortLocatedSites(
  items: LocatedSite[],
  key: SiteSortKey,
  direction: SortDirection
): LocatedSite[] {
  const sign = direction === 'asc' ? 1 : -1;
  const knownBortle = (value: number) =>
    value > 0 ? value : Number.POSITIVE_INFINITY;

  return [...items].sort((a, b) => {
    if (key === 'distance') return (a.distanceKm - b.distanceKm) * sign;
    if (key === 'region') {
      return a.item.region.localeCompare(b.item.region, 'tr-TR') * sign;
    }
    if (key === 'type') {
      return (
        siteTypeLabels[a.item.siteType].localeCompare(
          siteTypeLabels[b.item.siteType],
          'tr-TR'
        ) * sign
      );
    }
    if (key === 'altitude') {
      return (a.item.altitude - b.item.altitude) * sign;
    }
    if (key === 'road') {
      return a.item.roadAccess.localeCompare(b.item.roadAccess, 'tr-TR') * sign;
    }
    if (key === 'bortle') {
      return (knownBortle(a.item.bortle) - knownBortle(b.item.bortle)) * sign;
    }
    return (a.item.rating - b.item.rating) * sign;
  });
}

/** Kamp/gözlem noktaları artık ana harita modülü. */
export function SitesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { location, permission, requestDeviceLocation } = useLocationContext();
  const { theme } = useTheme();
  const catalog = useSiteCatalog();
  const measurements = useLightPollutionMeasurements();
  /*
    SÜZGEÇ DURUMU ADRES ÇUBUĞUNDA, `useState`TE DEĞİL.

    Yerel durumda tutulduğunda "Bortle 2 kamp alanları" gibi bir liste
    paylaşılamıyordu: bağlantıyı açan kişi sıfırlanmış sayfayı görüyordu.
    Geri düğmesi de süzgeci geri almıyordu.

    Arama alanları `sitesSpec.searchFields`ten geliyor — hangi alanların
    aranacağı tek yerde tanımlı ve testi var. Sayfanın kendi sıralaması
    duruyor: `sitesSpec.sorts` mesafeyi ifade edemez (kullanıcının
    konumunu bilmez) ve bu sayfada asıl soru "bana en yakın karanlık yer".
  */
  const [params, setParams] = useSearchParams();
  const type = (params.get('tur') ?? 'hepsi') as SiteType | 'hepsi';
  const bortleParam = params.get('bortle');
  const bortle: number | 'hepsi' =
    bortleParam && /^[1-9]$/.test(bortleParam) ? Number(bortleParam) : 'hepsi';
  const arama = params.get('ara') ?? '';

  const paramYaz = (ad: string, deger: string | null) =>
    setParams(
      (mevcut) => {
        const sonraki = new URLSearchParams(mevcut);
        if (deger === null || deger === '' || deger === 'hepsi') {
          sonraki.delete(ad);
        } else {
          sonraki.set(ad, deger);
        }
        return sonraki;
      },
      { replace: true }
    );
  const [sort, setSort] = useState<{
    key: SiteSortKey;
    direction: SortDirection;
  }>({ key: 'distance', direction: 'asc' });
  const [active, setActive] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [allowed, setAllowed] = useState(storedConsent);
  const [opacity, setOpacity] = useState(55);
  const [baseMode, setBaseMode] = useState<BaseMode>('harita');
  const [layerMode, setLayerMode] = useState<LayerMode>('isik');
  const [mapProvider, setMapProvider] = useState<MapProvider>('astrohub');
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [center, setCenter] = useState<LatLng>({
    lat: location.latitude,
    lng: location.longitude,
  });
  const [zoom, setZoom] = useState(6);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [pickedPoint, setPickedPoint] = useState<LatLng | null>(null);
  const [measurementAt, setMeasurementAt] = useState(localDateTimeValue);
  const [measurementSqm, setMeasurementSqm] = useState('');
  const [measurementBortle, setMeasurementBortle] = useState('');
  const [measurementMethod, setMeasurementMethod] =
    useState<(typeof MEASUREMENT_METHODS)[number]>('SQM-L');
  const [measurementEquipmentType, setMeasurementEquipmentType] =
    useState<(typeof EQUIPMENT_TYPES)[number]>('SQM cihazı');
  const [measurementEquipmentName, setMeasurementEquipmentName] = useState('');
  const [measurementSkyCondition, setMeasurementSkyCondition] =
    useState<(typeof SKY_CONDITIONS)[number]>('Açık');
  const [measurementTransparency, setMeasurementTransparency] =
    useState<(typeof TRANSPARENCY_OPTIONS)[number]>('İyi');
  const [measurementNote, setMeasurementNote] = useState('');
  const [measurementBusy, setMeasurementBusy] = useState(false);
  const [measurementError, setMeasurementError] = useState<string | null>(null);
  const [measurementSuccess, setMeasurementSuccess] = useState<string | null>(
    null
  );

  useEffect(() => {
    setCenter({ lat: location.latitude, lng: location.longitude });
  }, [location.latitude, location.longitude]);

  const filtered = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase('tr-TR');
    return catalog.items.filter((site) => {
      if (type !== 'hepsi' && site.siteType !== type) return false;
      if (bortle !== 'hepsi' && site.bortle !== bortle) return false;
      if (!q) return true;
      return sitesSpec
        .searchFields(site)
        .some((alan) => (alan ?? '').toLocaleLowerCase('tr-TR').includes(q));
    });
  }, [arama, bortle, catalog.items, type]);

  const nearest = useMemo(
    () =>
      sortByProximity(filtered, location, (site: ObservingSite) => site.coords)
        .located,
    [filtered, location]
  );
  const sortedSites = useMemo(
    () => sortLocatedSites(nearest, sort.key, sort.direction),
    [nearest, sort]
  );

  useEffect(() => {
    setActive((current) => {
      if (current && sortedSites.some(({ item }) => item.slug === current)) {
        return current;
      }
      return sortedSites[0]?.item.slug ?? null;
    });
  }, [sortedSites]);

  const selected =
    sortedSites.find(({ item }) => item.slug === active) ?? sortedSites[0];
  const mapItems = showAll ? sortedSites : selected ? [selected] : [];
  const measurementDate = useMemo(
    () => parseLocalDateTime(measurementAt),
    [measurementAt]
  );
  const measurementMoon = useMemo(
    () => moonPhase(measurementDate),
    [measurementDate]
  );
  const nearestPickedSite = useMemo(() => {
    if (!pickedPoint) return null;
    const located = sortByProximity(
      catalog.items.filter((site) => Boolean(site.id)),
      { latitude: pickedPoint.lat, longitude: pickedPoint.lng },
      (site: ObservingSite) => site.coords
    ).located[0];
    return located && located.distanceKm <= 5 ? located : null;
  }, [catalog.items, pickedPoint]);
  const overlay =
    mapProvider === 'astrohub' && layerMode === 'isik'
      ? OVERLAY_SOURCES[0]
      : undefined;
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
  const lpmFrameUrl = lightPollutionMapInfoUrl({ ...center, zoom });
  const siteMarkers = mapItems.map(({ item, distanceKm }) => ({
    id: `site:${item.slug}`,
    point: {
      lat: item.coords.latitude,
      lng: item.coords.longitude,
    },
    label: `${item.name}, ${item.region}, Bortle ${item.bortle}, ${formatDistance(distanceKm)} uzaklıkta`,
    popup: (
      <>
        <span className="block truncate text-body-sm font-medium text-foreground">
          {item.name}
        </span>
        <span className="mt-1 block truncate text-meta text-muted-foreground">
          {item.region} · {siteTypeLabels[item.siteType]} ·{' '}
          {formatBortle(item.bortle)}
        </span>
        <span className="mt-1 block text-meta text-cold">
          {formatDistance(distanceKm)}
        </span>
      </>
    ),
    active: active === item.slug,
    color: markerColor(item.bortle),
    onSelect: () => focusSite(item),
  }));
  const measurementMarkers = showMeasurements
    ? measurements.items.map((item) => ({
        id: `measurement:${item.id}`,
        point: { lat: item.latitude, lng: item.longitude },
        label: `${measurementLabel(item)}, ${new Date(item.measuredAt).toLocaleDateString('tr-TR')}`,
        popup: (
          <>
            <span className="block truncate text-body-sm font-medium text-foreground">
              {measurementLabel(item)}
            </span>
            <span className="mt-1 block text-meta text-muted-foreground">
              {item.method || 'Yöntem belirtilmedi'} ·{' '}
              {new Date(item.measuredAt).toLocaleDateString('tr-TR')}
            </span>
            {item.moonPhase && (
              <span className="mt-1 block text-meta text-cold">
                {item.moonPhase}
                {item.moonIllumination !== undefined
                  ? ` · %${Math.round(item.moonIllumination * 100)}`
                  : ''}
              </span>
            )}
          </>
        ),
        color: measurementColor(item),
      }))
    : [];

  function focusSite(item: ObservingSite) {
    setActive(item.slug);
    setShowAll(false);
    setCenter({ lat: item.coords.latitude, lng: item.coords.longitude });
    setZoom((current) => Math.max(current, 7));
  }

  function locateOnMap() {
    setShowAll(false);
    requestDeviceLocation();
    setCenter({ lat: location.latitude, lng: location.longitude });
    setZoom((current) => Math.max(current, 7));
  }

  function toggleMapScope() {
    if (showAll) {
      if (selected) focusSite(selected.item);
      return;
    }
    setShowAll(true);
    setCenter({ lat: location.latitude, lng: location.longitude });
    setZoom(6);
  }

  function resetMapView() {
    if (!showAll && selected) {
      setCenter({
        lat: selected.item.coords.latitude,
        lng: selected.item.coords.longitude,
      });
      setZoom(7);
      return;
    }
    setCenter({ lat: location.latitude, lng: location.longitude });
    setZoom(6);
  }

  function changeMapZoom(delta: number) {
    setZoom((current) =>
      Math.min(ZOOM_RANGE.max, Math.max(ZOOM_RANGE.min, current + delta))
    );
  }

  function allow() {
    setAllowed(true);
    try {
      localStorage.setItem(CONSENT_KEY, 'izin');
    } catch {
      // Seçim yalnız bu oturumda kalır.
    }
  }

  function pickMeasurementPoint(point: LatLng) {
    setPickedPoint(point);
    setCenter(point);
    setMeasurementError(null);
    setMeasurementSuccess(null);
  }

  async function submitMeasurement() {
    if (!pickedPoint) {
      setMeasurementError('Önce haritada ölçüm noktasını seçin.');
      return;
    }
    if (!user) {
      navigate('/giris');
      return;
    }
    setMeasurementBusy(true);
    setMeasurementError(null);
    setMeasurementSuccess(null);
    try {
      await createLightPollutionMeasurement({
        userId: user.id,
        siteId: nearestPickedSite?.item.id,
        latitude: pickedPoint.lat,
        longitude: pickedPoint.lng,
        measuredAt: measurementDate,
        sqm: measurementSqm.trim() ? Number(measurementSqm) : undefined,
        bortle: measurementBortle ? Number(measurementBortle) : undefined,
        method: measurementMethod,
        equipmentType: measurementEquipmentType,
        equipmentName: measurementEquipmentName,
        skyCondition: measurementSkyCondition,
        transparency: measurementTransparency,
        moonPhase: measurementMoon.name,
        moonIllumination: measurementMoon.illumination,
        note: measurementNote,
      });
      setMeasurementSuccess('Ölçüm kaydedildi.');
      setMeasurementNote('');
      measurements.refresh();
    } catch (e) {
      setMeasurementError(
        e instanceof Error ? e.message : 'Ölçüm kaydedilemedi'
      );
    } finally {
      setMeasurementBusy(false);
    }
  }

  function changeSort(key: SiteSortKey) {
    setSort((current) =>
      current.key === key
        ? {
            key,
            direction: current.direction === 'asc' ? 'desc' : 'asc',
          }
        : { key, direction: defaultDirection(key) }
    );
  }

  function sortLabel(key: SiteSortKey, label: string) {
    if (sort.key !== key) return label;
    return `${label} ${sort.direction === 'asc' ? '↑' : '↓'}`;
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
          title="Gözlem Sahaları"
          description="Kamp ve gözlem noktaları artık harita üstünde: Bortle/SQM kayıtları, ışık kirliliği katmanı ve size en yakın sahalar."
          meta={location.label}
        />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-card border border-border bg-surface-1 px-3 py-2">
          <p className="label tabular" role="status">
            {nearest.length} saha · konum: {location.label}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="site-search" className="sr-only">
              Saha ara
            </label>
            <Input
              id="site-search"
              type="search"
              placeholder="Saha adı, bölge veya yol erişimi"
              value={arama}
              onChange={(event) => paramYaz('ara', event.target.value)}
              width="16rem"
              className="h-8 text-meta"
            />

            <label htmlFor="site-type" className="sr-only">
              Tür
            </label>
            <Select
              id="site-type"
              value={type}
              onChange={(event) => paramYaz('tur', event.target.value)}
              width="auto"
              className="h-8 text-meta"
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
              onChange={(event) => paramYaz('bortle', event.target.value)}
              width="auto"
              className="h-8 text-meta"
            >
              <option value="hepsi">Tüm Bortle</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
                <option key={value} value={value}>
                  Bortle {value}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <CatalogSourceNote selection={catalog} />

        <div className="mt-4 space-y-4">
          <div
            className={cn(
              'grid gap-4 lg:items-stretch',
              mapExpanded
                ? 'lg:grid-cols-1'
                : 'lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]'
            )}
          >
            <Panel
              title="Bortle saha haritası"
              status={`${mapItems.length} işaret`}
              className="flex h-full min-h-0 flex-col"
              bodyClassName="flex min-h-0 flex-1 flex-col p-0"
            >
              <div
                className={cn(
                  'relative overflow-hidden bg-surface-2',
                  mapExpanded
                    ? 'h-[78vh] min-h-[620px]'
                    : 'h-[54vh] min-h-[460px] lg:h-[560px]'
                )}
              >
                {mapProvider === 'astrohub' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute left-2 top-2 z-10 bg-background/90 backdrop-blur-sm"
                    onClick={locateOnMap}
                    disabled={permission === 'pending'}
                  >
                    {permission === 'pending'
                      ? 'Konum alınıyor'
                      : 'Konumumu bul'}
                  </Button>
                )}
                {!hasNetworkAccess ? (
                  <MapNotice
                    title="Bu önizleme dış harita isteği yapmıyor"
                    body="Yayındaki sitede altlık harita ve ışık kirliliği katmanı burada açılır."
                  />
                ) : live && mapProvider === 'lightpollutionmap' ? (
                  <iframe
                    title="Light Pollution Map"
                    src={lpmFrameUrl}
                    className="h-full w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    allowFullScreen
                    sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
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
                    onPick={pickMeasurementPoint}
                    base={base}
                    overlay={overlay}
                    overlayOpacity={opacity / 100}
                    marker={{ lat: location.latitude, lng: location.longitude }}
                    markers={[...siteMarkers, ...measurementMarkers]}
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

                {live && mapProvider === 'astrohub' && active && (
                  <div className="pointer-events-none absolute inset-x-2 bottom-2 rounded-card border border-border bg-surface-1/95 px-2.5 py-1.5">
                    {(() => {
                      const hit = sortedSites.find(
                        (site) => site.item.slug === active
                      );
                      if (!hit) return null;
                      return (
                        <p className="truncate text-body-sm text-foreground">
                          <span className="font-medium">{hit.item.name}</span>
                          <span className="ml-2 text-muted-foreground">
                            {hit.item.region} · {formatDistance(hit.distanceKm)}
                          </span>
                        </p>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="rounded-b-card border-t border-border bg-surface-1 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <label htmlFor="site-map-provider" className="sr-only">
                      Harita kaynağı
                    </label>
                    <Select
                      id="site-map-provider"
                      value={mapProvider}
                      onChange={(event) =>
                        setMapProvider(event.target.value as MapProvider)
                      }
                      width="auto"
                      className="h-8 text-meta"
                    >
                      <option value="astrohub">Kaynak: Astrohub</option>
                      <option value="lightpollutionmap">
                        Kaynak: LightPollutionMap
                      </option>
                    </Select>

                    {mapProvider === 'astrohub' ? (
                      <>
                        <label htmlFor="site-base-mode" className="sr-only">
                          Harita altlığı
                        </label>
                        <Select
                          id="site-base-mode"
                          value={baseMode}
                          onChange={(event) =>
                            setBaseMode(event.target.value as BaseMode)
                          }
                          width="auto"
                          className="h-8 text-meta"
                        >
                          <option value="harita">Altlık: Harita</option>
                          <option value="uydu">Altlık: Uydu</option>
                        </Select>

                        <label htmlFor="site-layer-mode" className="sr-only">
                          Harita katmanı
                        </label>
                        <Select
                          id="site-layer-mode"
                          value={layerMode}
                          onChange={(event) =>
                            setLayerMode(event.target.value as LayerMode)
                          }
                          width="auto"
                          className="h-8 text-meta"
                        >
                          <option value="isik">Katman: Işık</option>
                          <option value="yok">Katman: Yok</option>
                        </Select>

                        {overlay && (
                          <label
                            htmlFor="site-opacity"
                            className="flex h-8 items-center gap-2 rounded-card border border-border bg-background px-2"
                          >
                            <span className="text-meta text-muted-foreground">
                              Saydamlık
                            </span>
                            <input
                              id="site-opacity"
                              type="range"
                              min={OPACITY_RANGE.min}
                              max={OPACITY_RANGE.max}
                              step={5}
                              value={opacity}
                              onChange={(event) =>
                                setOpacity(Number(event.target.value))
                              }
                              className="block w-20 accent-primary"
                            />
                          </label>
                        )}

                        <label className="flex h-8 items-center gap-2 rounded-card border border-border bg-background px-2 text-meta text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={showMeasurements}
                            onChange={(event) =>
                              setShowMeasurements(event.target.checked)
                            }
                            className="accent-primary"
                          />
                          Topluluk SQM
                        </label>

                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={toggleMapScope}
                        >
                          {showAll ? 'Tek pini göster' : 'Tümünü göster'}
                        </Button>
                      </>
                    ) : (
                      <a
                        href={lpmFrameUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 shrink-0 items-center justify-center rounded-card border border-border bg-background px-3 text-meta font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                      >
                        Kaynakta aç
                      </a>
                    )}
                  </div>

                  {mapProvider === 'astrohub' && live ? (
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 w-8 bg-background/90 px-0 text-base backdrop-blur-sm"
                        onClick={() => changeMapZoom(1)}
                        aria-label="Haritayı yakınlaştır"
                        title="Yakınlaştır"
                      >
                        +
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 w-8 bg-background/90 px-0 text-base backdrop-blur-sm"
                        onClick={() => changeMapZoom(-1)}
                        aria-label="Haritayı uzaklaştır"
                        title="Uzaklaştır"
                      >
                        -
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-background/90 backdrop-blur-sm"
                        onClick={resetMapView}
                      >
                        Sıfırla
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-background/90 backdrop-blur-sm"
                        onClick={() => setMapExpanded((current) => !current)}
                      >
                        {mapExpanded ? 'Daralt' : 'Genişlet'}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-meta text-muted-foreground">
                      Katmanlar ve cadde/uydu seçenekleri gömülü haritanın kendi
                      panelinde.
                    </p>
                  )}
                </div>

                {live && (
                  <p className="mt-2 text-[0.62rem] leading-snug text-muted-foreground">
                    {mapProvider === 'astrohub'
                      ? credit
                      : 'Gömülü kaynak: lightpollutionmap.info · VIIRS, World Atlas, SQM/SQC ve kendi araç panelleri üçüncü taraf uygulama içinde çalışır.'}
                  </p>
                )}
              </div>
            </Panel>

            <div
              className={cn(
                'grid h-full min-h-0 gap-4',
                mapExpanded && 'lg:hidden'
              )}
            >
              <Panel
                title="Seçili saha"
                status={
                  selected ? formatDistance(selected.distanceKm) : undefined
                }
                className="flex min-h-0 flex-col"
                bodyClassName="flex min-h-0 flex-1 flex-col p-0"
              >
                {selected ? (
                  <div className="flex h-full min-h-0 flex-col">
                    <Link
                      to={`/saha/${selected.item.slug}`}
                      className="relative block h-56 shrink-0 overflow-hidden bg-surface-2"
                      aria-label={`${selected.item.name} detayını aç`}
                    >
                      {selected.item.image ? (
                        <img
                          src={
                            commonsWidthUrl(selected.item.image.url, 760) ??
                            selected.item.image.url
                          }
                          alt={`${selected.item.name} saha görseli`}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-300 hover:scale-105"
                        />
                      ) : (
                        <span
                          aria-hidden
                          className="block h-full w-full"
                          style={{ backgroundImage: selected.item.gradient }}
                        />
                      )}
                      <span className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                        <Badge tone="primary">
                          {siteTypeLabels[selected.item.siteType]}
                        </Badge>
                        <Badge tone="cold">
                          {formatBortle(selected.item.bortle)}
                        </Badge>
                      </span>
                    </Link>
                    <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4">
                      <div>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge tone="muted">{selected.item.region}</Badge>
                          <Badge tone="warning">
                            ★ {selected.item.rating.toFixed(1)}
                          </Badge>
                          {selected.item.sqm !== undefined && (
                            <Badge tone="cold">SQM {selected.item.sqm}</Badge>
                          )}
                        </div>
                        <h2 className="mt-3 type-section text-foreground">
                          {selected.item.name}
                        </h2>
                        <p className="mt-2 line-clamp-4 text-body-sm leading-relaxed text-muted-foreground">
                          {selected.item.description}
                        </p>
                      </div>

                      <dl className="grid gap-px overflow-hidden rounded-card border border-border bg-border text-body-sm">
                        <div className="grid grid-cols-[7rem_1fr] gap-3 bg-surface-1 px-3 py-2">
                          <dt className="label">Mesafe</dt>
                          <dd className="tabular text-cold">
                            {formatDistance(selected.distanceKm)}
                          </dd>
                        </div>
                        <div className="grid grid-cols-[7rem_1fr] gap-3 bg-surface-1 px-3 py-2">
                          <dt className="label">Rakım</dt>
                          <dd className="tabular text-foreground">
                            {selected.item.altitude} m
                          </dd>
                        </div>
                        <div className="grid grid-cols-[7rem_1fr] gap-3 bg-surface-1 px-3 py-2">
                          <dt className="label">Yol</dt>
                          <dd className="text-foreground">
                            {selected.item.roadAccess}
                          </dd>
                        </div>
                        <div className="grid grid-cols-[7rem_1fr] gap-3 bg-surface-1 px-3 py-2">
                          <dt className="label">En iyi dönem</dt>
                          <dd className="text-foreground">
                            {selected.item.bestMonths}
                          </dd>
                        </div>
                        <div className="grid grid-cols-[7rem_1fr] gap-3 bg-surface-1 px-3 py-2">
                          <dt className="label">Güney ufku</dt>
                          <dd className="text-foreground">
                            {selected.item.southHorizon}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-auto flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => focusSite(selected.item)}
                        >
                          Haritada göster
                        </Button>
                        <ButtonLink
                          to={`/saha/${selected.item.slug}`}
                          size="sm"
                          variant="ghost"
                        >
                          Görüntüle
                        </ButtonLink>
                        <AdminEditLink
                          to={`/admin/sites?slug=${selected.item.slug}`}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    message="Seçili saha yok"
                    hint="Haritada veya listede bir saha seçildiğinde ayrıntısı burada görünür."
                    className="border-0 py-8"
                  />
                )}
              </Panel>

              <Panel
                title="Işık kirliliği ölçümü"
                status={
                  pickedPoint ? coordinateLabel(pickedPoint) : 'Haritaya tıkla'
                }
              >
                <div className="space-y-3">
                  <p className="text-body-sm leading-relaxed text-muted-foreground">
                    Haritada ölçüm yaptığınız noktaya tıklayın; SQM, Bortle,
                    cihaz ve koşul bilgilerini aynı koordinata kaydedin.
                  </p>

                  {pickedPoint ? (
                    <div className="rounded-card border border-border bg-surface-1 px-3 py-2">
                      <p className="label">Seçilen nokta</p>
                      <p className="mt-1 tabular text-body-sm text-foreground">
                        {coordinateLabel(pickedPoint)}
                      </p>
                      {nearestPickedSite ? (
                        <p className="mt-1 text-meta text-muted-foreground">
                          Yakındaki saha: {nearestPickedSite.item.name} ·{' '}
                          {formatDistance(nearestPickedSite.distanceKm)}
                        </p>
                      ) : (
                        <p className="mt-1 text-meta text-muted-foreground">
                          Saha kaydına bağlı değil; bağımsız ölçüm noktası.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-card border border-dashed border-border bg-surface-1 px-3 py-3 text-body-sm text-muted-foreground">
                      Ölçüm için haritada konumu seçin.
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Ölçüm zamanı" htmlFor="lp-measured-at">
                      <Input
                        id="lp-measured-at"
                        type="datetime-local"
                        value={measurementAt}
                        onChange={(event) =>
                          setMeasurementAt(event.target.value)
                        }
                      />
                    </Field>
                    <Field label="Ay evresi" htmlFor="lp-moon">
                      <Input
                        id="lp-moon"
                        value={`${measurementMoon.name} · %${Math.round(
                          measurementMoon.illumination * 100
                        )}`}
                        readOnly
                      />
                    </Field>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="SQM" htmlFor="lp-sqm" hint="mag/arcsec²">
                      <Input
                        id="lp-sqm"
                        inputMode="decimal"
                        placeholder="21.35"
                        value={measurementSqm}
                        onChange={(event) =>
                          setMeasurementSqm(event.target.value)
                        }
                      />
                    </Field>
                    <Field label="Bortle" htmlFor="lp-bortle">
                      <Select
                        id="lp-bortle"
                        value={measurementBortle}
                        onChange={(event) =>
                          setMeasurementBortle(event.target.value)
                        }
                      >
                        <option value="">Seçilmedi</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
                          <option key={value} value={value}>
                            Bortle {value}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Yöntem" htmlFor="lp-method">
                      <Select
                        id="lp-method"
                        value={measurementMethod}
                        onChange={(event) =>
                          setMeasurementMethod(
                            event.target.value as typeof measurementMethod
                          )
                        }
                      >
                        {MEASUREMENT_METHODS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Ekipman türü" htmlFor="lp-equipment-type">
                      <Select
                        id="lp-equipment-type"
                        value={measurementEquipmentType}
                        onChange={(event) =>
                          setMeasurementEquipmentType(
                            event.target
                              .value as typeof measurementEquipmentType
                          )
                        }
                      >
                        {EQUIPMENT_TYPES.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>

                  <Field label="Ekipman / cihaz modeli" htmlFor="lp-equipment">
                    <Input
                      id="lp-equipment"
                      placeholder="Örn. Unihedron SQM-L, TESS-W, ASI585MC"
                      value={measurementEquipmentName}
                      onChange={(event) =>
                        setMeasurementEquipmentName(event.target.value)
                      }
                    />
                  </Field>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Gökyüzü" htmlFor="lp-sky">
                      <Select
                        id="lp-sky"
                        value={measurementSkyCondition}
                        onChange={(event) =>
                          setMeasurementSkyCondition(
                            event.target.value as typeof measurementSkyCondition
                          )
                        }
                      >
                        {SKY_CONDITIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Şeffaflık" htmlFor="lp-transparency">
                      <Select
                        id="lp-transparency"
                        value={measurementTransparency}
                        onChange={(event) =>
                          setMeasurementTransparency(
                            event.target.value as typeof measurementTransparency
                          )
                        }
                      >
                        {TRANSPARENCY_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>

                  <Field label="Not" htmlFor="lp-note" hint="Opsiyonel">
                    <textarea
                      id="lp-note"
                      value={measurementNote}
                      onChange={(event) =>
                        setMeasurementNote(event.target.value)
                      }
                      className="min-h-20 w-full rounded-card border border-border bg-surface-1 px-3 py-2 text-body-sm text-foreground placeholder:text-faint focus:border-primary focus:bg-surface-2"
                    />
                  </Field>

                  {measurementError && (
                    <p className="rounded-card border border-danger/40 bg-danger/10 px-3 py-2 text-body-sm text-danger">
                      {measurementError}
                    </p>
                  )}
                  {measurementSuccess && (
                    <p className="rounded-card border border-success/40 bg-success/10 px-3 py-2 text-body-sm text-success">
                      {measurementSuccess}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => void submitMeasurement()}
                      disabled={measurementBusy || !pickedPoint}
                    >
                      {measurementBusy ? 'Kaydediliyor' : 'Ölçümü kaydet'}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setPickedPoint(null);
                        setMeasurementError(null);
                        setMeasurementSuccess(null);
                      }}
                    >
                      Temizle
                    </Button>
                  </div>
                </div>
              </Panel>
            </div>
          </div>

          <Panel
            title="Saha listesi"
            status={
              <span className="flex flex-wrap items-center justify-end gap-2">
                <span className="tabular text-muted-foreground">
                  {location.label}
                </span>
                <ButtonLink to="/saha/yeni" size="sm">
                  Saha ekle
                </ButtonLink>
              </span>
            }
          >
            {nearest.length === 0 ? (
              <EmptyState
                message="Eşleşen saha yok"
                hint="Tür veya Bortle filtresini genişletin."
                className="border-0 py-8"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] border-collapse text-left">
                  <thead className="border-b border-border text-meta text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-0 py-2 pr-4 font-medium">
                        Saha
                      </th>
                      <SortableHeader onClick={() => changeSort('region')}>
                        {sortLabel('region', 'Konum')}
                      </SortableHeader>
                      <SortableHeader onClick={() => changeSort('type')}>
                        {sortLabel('type', 'Tür')}
                      </SortableHeader>
                      <SortableHeader onClick={() => changeSort('altitude')}>
                        {sortLabel('altitude', 'Rakım')}
                      </SortableHeader>
                      <SortableHeader onClick={() => changeSort('road')}>
                        {sortLabel('road', 'Yol')}
                      </SortableHeader>
                      <SortableHeader onClick={() => changeSort('bortle')}>
                        {sortLabel('bortle', 'Bortle')}
                      </SortableHeader>
                      <SortableHeader onClick={() => changeSort('rating')}>
                        {sortLabel('rating', 'Puan')}
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
                    {sortedSites.map(({ item, distanceKm }) => (
                      <tr
                        key={item.slug}
                        className={cn(
                          'border-b border-border transition-colors last:border-0',
                          active === item.slug && 'text-primary'
                        )}
                      >
                        <td className="max-w-[280px] py-2.5 pr-4 align-top">
                          <div className="flex min-w-0 items-center gap-2">
                            {item.image ? (
                              <img
                                src={
                                  commonsWidthUrl(item.image.url, 160) ??
                                  item.image.url
                                }
                                alt=""
                                loading="lazy"
                                className="h-10 w-14 shrink-0 rounded-card border border-border object-cover"
                              />
                            ) : (
                              <span
                                aria-hidden
                                className="h-10 w-14 shrink-0 rounded-card border border-border bg-surface-2"
                                style={{ backgroundImage: item.gradient }}
                              />
                            )}
                            <Link
                              to={`/saha/${item.slug}`}
                              className="block truncate text-body-sm font-medium text-foreground transition-colors hover:text-primary"
                            >
                              {item.name}
                            </Link>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 align-top text-body-sm text-muted-foreground">
                          {item.region}
                        </td>
                        <td className="py-2.5 pr-4 align-top text-body-sm text-muted-foreground">
                          {siteTypeLabels[item.siteType]}
                        </td>
                        <td className="tabular py-2.5 pr-4 align-top text-body-sm text-muted-foreground">
                          {item.altitude} m
                        </td>
                        <td className="py-2.5 pr-4 align-top text-body-sm text-muted-foreground">
                          {item.roadAccess}
                        </td>
                        <td className="tabular py-2.5 pr-4 align-top text-body-sm text-muted-foreground">
                          {formatBortle(item.bortle)}
                          {item.sqm !== undefined && (
                            <span className="ml-2 text-meta text-muted-foreground">
                              SQM {item.sqm}
                            </span>
                          )}
                        </td>
                        <td className="tabular py-2.5 pr-4 align-top text-body-sm text-cold">
                          ★ {item.rating.toFixed(1)}
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
                            <AdminEditLink
                              to={`/admin/sites?slug=${item.slug}`}
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

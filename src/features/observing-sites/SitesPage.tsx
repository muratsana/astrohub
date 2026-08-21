import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Input, Select } from '@/components/ui/Input';
import { SortableHeader } from '@/components/ui/SortableHeader';
import { AdminEditLink } from '@/components/admin/AdminEditLink';
import { CatalogSourceNote } from '@/components/ui/CatalogSourceNote';
import { PageMeta } from '@/components/seo/PageMeta';
import { sitesSpec } from './sitesSpec';
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
import { commonsWidthUrl } from '@/lib/commons';
import { useSiteCatalog } from '@/services/content/sites';
import { siteTypeLabels, type ObservingSite, type SiteType } from './data';

const CONSENT_KEY = 'astrohub:map:tiles';

type BaseMode = 'harita' | 'uydu';
type LayerMode = 'yok' | 'isik';
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

function defaultDirection(key: SiteSortKey): SortDirection {
  return key === 'rating' || key === 'altitude' ? 'desc' : 'asc';
}

function formatBortle(value: number): string {
  return value > 0 ? `Bortle ${value}` : '—';
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
  const { location, permission, requestDeviceLocation } = useLocationContext();
  const { theme } = useTheme();
  const catalog = useSiteCatalog();
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
  const [center, setCenter] = useState<LatLng>({
    lat: location.latitude,
    lng: location.longitude,
  });
  const [zoom, setZoom] = useState(6);
  const [mapExpanded, setMapExpanded] = useState(false);

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

            <span className="hidden h-8 w-px bg-border lg:block" aria-hidden />

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
                  onChange={(event) => setOpacity(Number(event.target.value))}
                  className="block w-20 accent-primary"
                />
              </label>
            )}

            <Button size="sm" variant="secondary" onClick={toggleMapScope}>
              {showAll ? 'Tek pini göster' : 'Tümünü göster'}
            </Button>
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

                {live && active && (
                  <div className="pointer-events-none absolute inset-x-2 bottom-7 rounded-card border border-border bg-surface-1/95 px-2.5 py-1.5">
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

                {live && (
                  <>
                    <div className="absolute bottom-7 right-2 flex flex-wrap justify-end gap-1.5">
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
                    <p className="absolute bottom-1 left-2 text-[0.62rem] text-muted-foreground">
                      {credit}
                    </p>
                  </>
                )}
              </div>
            </Panel>

            <Panel
              title="Seçili saha"
              status={selected ? formatDistance(selected.distanceKm) : undefined}
              className={cn(
                'flex h-full min-h-0 flex-col',
                mapExpanded && 'lg:hidden'
              )}
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
                      <AdminEditLink to={`/admin/sites?slug=${selected.item.slug}`} />
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

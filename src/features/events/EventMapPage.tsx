import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { useLocationContext } from '@/features/location/LocationContext';
import {
  sortByProximity,
  formatDistance,
} from '@/domain/geography/distance';
import { useEventCatalog } from '@/services/content/events';
import { eventTypeLabels, type EventType } from './types';
import type { AstroEvent } from './types';
import { cn } from '@/lib/cn';
import { TileMap } from '@/features/sky/TileMap';
import { basemapSource, BASEMAP_CREDIT } from '@/features/sky/lightPollutionEmbed';
import type { LatLng } from '@/features/sky/tileMath';
import { useTheme } from '@/features/theme/ThemeContext';
import { hasNetworkAccess } from '@/lib/runtime';

/**
 * ETKİNLİKLER ANA MODÜLÜ.
 *
 * NEDEN GERÇEK HARİTA DEĞİL
 * Tam ekran etkileşimli harita bir tile sağlayıcısı ister ve tile lisansı
 * (atıf, önbellek hakkı, istek limiti) kod yazmadan çözülmesi gereken bir
 * konudur (§14.4). Bu sayfa o gelene kadar boş bir "yakında" ekranı olarak
 * durmak yerine sorunun asıl cevabını veriyor: **yakınımda ne var.**
 *
 * Buradaki görsel bilinçli olarak *şematik*: coğrafi sınır çizilmez, ölçek
 * verilmez, "harita" denmez. Noktalar Türkiye'yi kapsayan bir kutuya
 * eşdikdörtgen izdüşümle yerleşir ve yalnızca dağılımı gösterir. Gerçek
 * mesafe her satırda km olarak yazılıdır — göz kararı ölçmeye gerek yok.
 *
 * Tile sağlayıcısı bağlandığında bu sayfa Leaflet'e geçer; yakınlık listesi
 * ve `sortByProximity` aynen kalır.
 */

const CONSENT_KEY = 'astrohub:map:tiles';

export function EventMapPage() {
  const { location, permission, requestDeviceLocation } = useLocationContext();
  const { theme } = useTheme();
  const [type, setType] = useState<EventType | 'hepsi'>('hepsi');
  const [active, setActive] = useState<string | null>(null);
  const catalog = useEventCatalog();
  const [allowed, setAllowed] = useState(() => {
    try {
      return localStorage.getItem(CONSENT_KEY) === 'izin';
    } catch {
      return false;
    }
  });
  const [center, setCenter] = useState<LatLng>({
    lat: location.latitude,
    lng: location.longitude,
  });
  const [zoom, setZoom] = useState(5);

  useEffect(() => {
    setCenter({ lat: location.latitude, lng: location.longitude });
  }, [location.latitude, location.longitude]);

  const filtered = useMemo(
    () =>
      type === 'hepsi'
        ? catalog.items
        : catalog.items.filter((e) => e.type === type),
    [catalog.items, type]
  );

  const { located, unlocated } = useMemo(
    () => sortByProximity(filtered, location, (e: AstroEvent) => e.coords),
    [filtered, location]
  );
  const featured = located[0];

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

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="tabular label" role="status">
            {located.length} konumlu · {unlocated.length} çevrimiçi
          </p>
          <div className="flex items-center gap-2">
            <label htmlFor="map-type" className="sr-only">
              Tür
            </label>
            <Select
              id="map-type"
              value={type}
              onChange={(e) => setType(e.target.value as EventType | 'hepsi')}
              className="h-8 w-auto text-meta"
            >
              <option value="hepsi">Tüm türler</option>
              {Object.entries(eventTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {featured && (
          <Link
            to={`/etkinlik/${featured.item.slug}`}
            className="mb-4 block rounded-card border border-primary/50 bg-surface-1 p-3 transition-colors hover:border-primary"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <Badge tone="primary">Otomatik öne çıkan</Badge>
                <h2 className="mt-2 text-title-sm font-medium text-foreground">
                  {featured.item.title}
                </h2>
                <p className="mt-1 text-body-sm leading-relaxed text-muted-foreground">
                  Konumunuza göre en yakın etkinlik. {featured.item.city} ·{' '}
                  {new Date(featured.item.startsAt).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                  })}
                </p>
              </div>
              <span className="tabular shrink-0 rounded-card border border-border bg-background px-2.5 py-1.5 text-body-sm text-cold">
                {formatDistance(featured.distanceKm)}
              </span>
            </div>
          </Link>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          {/* ───────── Şematik dağılım ───────── */}
          <Panel
            title="Etkinlik haritası"
            status={`${located.length} işaret`}
            bodyClassName="p-0"
          >
            <div className="relative h-[58vh] min-h-[420px] overflow-hidden rounded-b-card bg-surface-2">
              {!hasNetworkAccess ? (
                <div className="grid h-full place-items-center p-6 text-center text-body-sm text-muted-foreground">
                  Bu önizleme dış harita isteği yapmıyor.
                </div>
              ) : allowed ? (
                <TileMap
                  label="Etkinlik haritası — sürükleyerek ve ok tuşlarıyla gezin"
                  className={cn(
                    'h-full w-full',
                    theme === 'field' &&
                      '[filter:sepia(1)_saturate(5)_hue-rotate(-38deg)_brightness(0.6)]'
                  )}
                  center={center}
                  zoom={zoom}
                  minZoom={3}
                  maxZoom={12}
                  onCenterChange={setCenter}
                  onZoomChange={setZoom}
                  base={basemapSource(theme !== 'light')}
                  marker={{ lat: location.latitude, lng: location.longitude }}
                  markers={located.map(({ item, distanceKm }) => ({
                    id: item.slug,
                    point: {
                      lat: item.coords!.latitude,
                      lng: item.coords!.longitude,
                    },
                    label: `${item.title}, ${item.city}, ${formatDistance(distanceKm)} uzaklıkta`,
                    active: active === item.slug,
                    onSelect: () => setActive(item.slug),
                  }))}
                />
              ) : (
                <div className="grid h-full place-items-center p-6 text-center">
                  <div className="max-w-md">
                    <p className="text-body-sm leading-relaxed text-muted-foreground">
                      Harita CARTO döşemelerini yükler; IP adresiniz ve baktığınız
                      bölge sağlayıcıya iletilir.
                    </p>
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setAllowed(true);
                        try {
                          localStorage.setItem(CONSENT_KEY, 'izin');
                        } catch {
                          // Seçim yalnız bu oturumda kalır.
                        }
                      }}
                    >
                      Haritayı yükle
                    </Button>
                  </div>
                </div>
              )}

              {allowed && active && (
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
              {allowed && (
                <p className="absolute bottom-1 left-2 text-[0.62rem] text-muted-foreground">
                  {BASEMAP_CREDIT}
                </p>
              )}
            </div>
          </Panel>

          {/* ───────── Yakınlık listesi ───────── */}
          <div className="space-y-4">
            <Panel title="Size en yakın" status={location.label}>
              {located.length === 0 ? (
                <EmptyState
                  message="Bu türde konumlu etkinlik yok"
                  hint="Tür filtresini genişletin ya da çevrimiçi etkinliklere bakın."
                  className="border-0 py-8"
                />
              ) : (
                <ul>
                  {located.map(({ item, distanceKm }) => (
                    <li key={item.slug} className="border-b border-border last:border-0">
                      <Link
                        to={`/etkinlik/${item.slug}`}
                        onMouseEnter={() => setActive(item.slug)}
                        onMouseLeave={() => setActive(null)}
                        className={cn(
                          'flex items-baseline justify-between gap-3 py-2 transition-colors',
                          active === item.slug ? 'text-primary' : 'hover:text-primary'
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-caption text-foreground">
                            {item.title}
                          </span>
                          <span className="tabular mt-0.5 block text-meta text-muted-foreground">
                            {item.city} ·{' '}
                            {new Date(item.startsAt).toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'long',
                            })}
                          </span>
                        </span>
                        <span className="tabular shrink-0 text-body-sm text-cold">
                          {formatDistance(distanceKm)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {unlocated.length > 0 && (
              <Panel title="Çevrimiçi" status={`${unlocated.length}`}>
                <ul>
                  {unlocated.map((item) => (
                    <li key={item.slug} className="border-b border-border last:border-0">
                      <Link
                        to={`/etkinlik/${item.slug}`}
                        className="flex items-baseline justify-between gap-3 py-2 transition-colors hover:text-primary"
                      >
                        <span className="min-w-0 truncate text-caption text-foreground">
                          {item.title}
                        </span>
                        <Badge tone="cold">Çevrimiçi</Badge>
                      </Link>
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

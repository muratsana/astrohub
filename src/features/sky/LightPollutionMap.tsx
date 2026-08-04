import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { useLocationContext } from '@/features/location/LocationContext';
import { useTheme } from '@/features/theme/ThemeContext';
import { useSiteCatalog } from '@/services/content/sites';
import { haversineKm, formatDistance } from '@/domain/geography/distance';
import { hasNetworkAccess } from '@/lib/runtime';
import { cn } from '@/lib/cn';
import { TileMap } from './TileMap';
import { type LatLng } from './tileMath';
import {
  BASEMAP_CREDIT,
  OPACITY_RANGE,
  OVERLAY_SOURCES,
  ZOOM_RANGE,
  basemapSource,
  fullUrl,
} from './lightPollutionEmbed';

/**
 * IŞIK KİRLİLİĞİ HARİTASI — tam genişlik, kendi döşemelerimizle.
 *
 * Neden `<iframe>` değil: `lightPollutionEmbed.ts` başında. Kısası,
 * sağlayıcının yayımladığı gömme adresi köke yönleniyor ve kök
 * çerçevelenmeyi reddediyor; canlıda harita hiç açılmadı.
 *
 * ÜÇÜNCÜ TARAF İSTEĞİ HÂLÂ VAR, İZİN DE. Döşemeler CARTO ve katman
 * sağlayıcısından geliyor; harita açıldığı anda IP adresi ve bakılan
 * bölge o sunuculara gider. Sayfanın kendi metni "koordinat sunucumuza
 * gönderilmez" diyor — bunu sormadan yapmak o sözü bozmak olurdu.
 *
 * Katman tek ve doğrulanmış NASA GIBS kaynağıdır. Bozuk adaylar ile
 * gereksiz kaynak seçicisi kaldırıldı; arayüz yalnızca katmanın gerçek
 * yüklenme durumunu gösterir.
 */

const CONSENT_KEY = 'astrohub:map:tiles';

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Depolama kapalıysa seçim yalnızca bu oturum için geçerli olur.
  }
}

export function LightPollutionMap() {
  const { location } = useLocationContext();
  const { theme } = useTheme();
  const sites = useSiteCatalog();
  const frameRef = useRef<HTMLDivElement>(null);

  const [allowed, setAllowed] = useState(
    () => readStored(CONSENT_KEY) === 'izin'
  );
  const [center, setCenter] = useState<LatLng>(() => ({
    lat: location.latitude,
    lng: location.longitude,
  }));
  const [zoom, setZoom] = useState(6);
  const [opacity, setOpacity] = useState(50);
  const [pick, setPick] = useState<LatLng | null>(null);

  const overlay = OVERLAY_SOURCES[0];
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const onOverlayFailure = useCallback(() => {
    setFailed(true);
    setLoaded(false);
  }, []);

  const onOverlayLoad = useCallback(() => {
    setFailed(false);
    setLoaded(true);
  }, []);

  /* Üstteki şehir seçici değişince harita da oraya gitsin: iki ayrı
     konum kavramı taşımak, kullanıcıya "hangisi geçerli" diye
     sordurur. */
  useEffect(() => {
    setCenter({ lat: location.latitude, lng: location.longitude });
    setPick(null);
  }, [location.latitude, location.longitude]);

  const allow = useCallback(() => {
    setAllowed(true);
    store(CONSENT_KEY, 'izin');
  }, []);

  /* Gece ışıkları katmanı `screen` ile bindiriliyor; açık altlıkta bu
     her yeri beyaza boyar. O katman etkinse altlık koyuya zorlanıyor —
     temaya uymamak, katmanı okunmaz kılmaktan iyi. */
  const base = useMemo(
    () => basemapSource(theme !== 'light' || !!overlay.needsDarkBasemap),
    [theme, overlay.needsDarkBasemap]
  );

  const view = { lat: center.lat, lng: center.lng, zoom, opacity };

  /** Tıklanan noktaya en yakın kayıtlı gözlem noktası. */
  const nearest = useMemo(() => {
    if (!pick || sites.items.length === 0) return null;
    const here = { latitude: pick.lat, longitude: pick.lng };
    return sites.items
      .map((site) => ({ site, km: haversineKm(here, site.coords) }))
      .sort((a, b) => a.km - b.km)[0];
  }, [pick, sites.items]);

  function fullscreen() {
    const el = frameRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }

  function reset() {
    setCenter({ lat: location.latitude, lng: location.longitude });
    setZoom(6);
    setOpacity(50);
    setPick(null);
  }

  const live = hasNetworkAccess && allowed;

  return (
    <section aria-labelledby="lp-map-title">
      <div className="mx-auto w-full max-w-content border-y border-border px-4 py-4 sm:px-6 lg:px-8 xl:px-12">
        <header className="mb-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 id="lp-map-title" className="type-panel text-foreground">
            Işık Kirliliği Haritası
          </h2>
          <span className="label">{location.label}</span>
          <a
            href={fullUrl(view)}
            target="_blank"
            rel="noreferrer noopener"
            className="ml-auto text-meta text-cold transition-colors hover:text-primary"
          >
            Ayrıntılı analiz: lightpollutionmap.app ↗
          </a>
        </header>

        <div
          ref={frameRef}
          className="relative overflow-hidden rounded-card border border-border bg-background"
        >
          {/*
            Yükseklik oranla değil, görünüm alanı yüksekliğiyle veriliyor:
            harita bir görsel değil, gezilen bir yüzey.
          */}
          <div className="h-[68vh] max-h-[820px] min-h-[420px] w-full">
            {!hasNetworkAccess ? (
              <Notice
                title="Bu derlemede harita yüklenmiyor"
                body="Tek dosya önizleme dış istek yapamaz; döşemeler indirilemez. Yayındaki sitede harita bu alanda açılır."
                action={
                  <a
                    href={fullUrl(view)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-primary hover:underline"
                  >
                    Haritayı yeni sekmede aç ↗
                  </a>
                }
              />
            ) : allowed ? (
              <TileMap
                label="Işık kirliliği haritası — sürükleyerek gezin, tıklayarak nokta seçin"
                className={cn(
                  'h-full w-full',
                  /* Saha modunda harita da kırmızıya düşüyor: bu tema
                     bir görünüm tercihi değil, karanlık adaptasyonunu
                     koruma aracı. */
                  theme === 'field' &&
                    '[filter:sepia(1)_saturate(5)_hue-rotate(-38deg)_brightness(0.6)]'
                )}
                center={center}
                zoom={zoom}
                minZoom={ZOOM_RANGE.min}
                maxZoom={ZOOM_RANGE.max}
                onCenterChange={setCenter}
                onZoomChange={setZoom}
                onPick={setPick}
                base={base}
                overlay={overlay}
                overlayOpacity={opacity / 100}
                onOverlayFailure={onOverlayFailure}
                onOverlayLoad={onOverlayLoad}
                marker={pick ?? { lat: location.latitude, lng: location.longitude }}
              />
            ) : (
              <Notice
                title="Harita üçüncü taraf sunucularından yükleniyor"
                body="Haritayı açtığınızda IP adresiniz ve baktığınız bölge döşeme sağlayıcılarına (CARTO ve NASA GIBS) gider. Bir kez onaylarsanız tercihiniz saklanır; çerez sayfasından geri alabilirsiniz."
                action={
                  <Button size="sm" onClick={allow}>
                    Haritayı yükle
                  </Button>
                }
              />
            )}
          </div>

          {live && (
            <>
              <div className="absolute right-2 top-2 flex flex-col overflow-hidden rounded-card border border-border-strong bg-background/85 backdrop-blur-sm">
                <ZoomButton
                  label="Yakınlaştır"
                  sign="+"
                  disabled={zoom >= ZOOM_RANGE.max}
                  onClick={() => setZoom((z) => Math.min(ZOOM_RANGE.max, z + 1))}
                />
                <ZoomButton
                  label="Uzaklaştır"
                  sign="−"
                  disabled={zoom <= ZOOM_RANGE.min}
                  onClick={() => setZoom((z) => Math.max(ZOOM_RANGE.min, z - 1))}
                />
              </div>

              <div className="absolute bottom-2 right-2 w-[min(260px,calc(100%-1rem))] rounded-card border border-border-strong bg-background/88 px-2.5 py-2 shadow-overlay backdrop-blur-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <label htmlFor="lp-opacity" className="label">
                    Katman
                  </label>
                  <span className="tabular text-meta text-cold">%{opacity}</span>
                </div>
                <input
                  id="lp-opacity"
                  type="range"
                  min={OPACITY_RANGE.min}
                  max={OPACITY_RANGE.max}
                  step={5}
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className={cn(
                    'mt-1.5 h-4 w-full cursor-pointer appearance-none bg-transparent',
                    '[&::-webkit-slider-runnable-track]:h-[3px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-border',
                    '[&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-[13px] [&::-webkit-slider-thumb]:w-[13px]',
                    '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
                    '[&::-webkit-slider-thumb]:bg-primary',
                    '[&::-moz-range-track]:h-[3px] [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-border',
                    '[&::-moz-range-thumb]:h-[13px] [&::-moz-range-thumb]:w-[13px]',
                    '[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary'
                  )}
                />
              </div>

              {loaded && (
                <Legend kind={overlay.legend} />
              )}

              {/*
                NOKTA BİLGİSİ — haritaya tıklayınca çıkar.
                Uydu katmanı bir renk gösteriyor ama o rengin karşılığını
                biz üretmiyoruz; onun yerine elimizdeki tek gerçek ölçüme
                bağlıyoruz: en yakın kayıtlı gözlem noktası. Renkten
                Bortle okumak, sahip olmadığımız bir kalibrasyona güven
                vermek olurdu.
              */}
              {pick && (
                <PickPanel
                  point={pick}
                  nearest={nearest}
                  onClose={() => setPick(null)}
                />
              )}
            </>
          )}
        </div>

        <div className="mt-2 flex flex-wrap justify-end gap-1.5">
            <Button size="sm" variant="secondary" onClick={reset}>
              Sıfırla
            </Button>
            <Button size="sm" variant="ghost" onClick={fullscreen}>
              Tam ekran
            </Button>
        </div>

        {/*
          TANI SATIRI. Katman gelmiyorsa sebebini bu ortamdan
          göremiyorum; denenen adresi yazmak, sorunu bir tıkla
          görülebilir hâle getiriyor. "Yüklenemedi" tek başına kimseye
          bir şey söylemiyordu.
        */}
        {failed && (
          <p className="mt-1.5 rounded-card border border-warning/40 bg-surface-1 px-2.5 py-1.5 text-meta leading-snug text-warning">
            NASA gece ışıkları katmanına ulaşılamadı; altta yalnızca temel
            harita var. Aşağıdaki karşılaştırma kendi
            ölçümlerimizden geldiği için etkilenmiyor.{' '}
            <a
              href={overlay.url({ x: 37, y: 22, z: 6 })}
              target="_blank"
              rel="noreferrer noopener"
              className="underline underline-offset-2"
            >
              Denenen örnek adres ↗
            </a>
          </p>
        )}

        <p className="mt-1.5 text-meta leading-snug text-faint">
          {BASEMAP_CREDIT}
          {loaded ? ` · ${overlay.credit}` : ''}.
          Katman uydu kestirimidir. Aşağıdaki karşılaştırma ise kendi gözlem
          noktası ölçümlerimizden hesaplanır — ikisi ayrı kaynaklardır ve
          birbirini doğrulamaz.
        </p>
      </div>
    </section>
  );
}

/**
 * Lejant.
 *
 * Atlas katmanı karanlıktan şehre giden bir renk ölçeği taşıyor; ham
 * parlaklık görüntüsünde böyle bir ölçek yok, yalnızca ışık var. İkisine
 * aynı lejantı koymak, ham görüntüye sahip olmadığı bir kalibrasyon
 * atfetmek olurdu — bu yüzden lejant kaynağa göre değişiyor.
 */
const ATLAS_SCALE = [
  '#000000',
  '#1d2a55',
  '#1f6f4a',
  '#8fae21',
  '#e0c025',
  '#e0761f',
  '#cf2d1f',
  '#ffffff',
];

function Legend({ kind }: { kind: 'atlas' | 'radiance' }) {
  return (
    <div className="absolute bottom-2 left-2 rounded-card border border-border-strong bg-background/85 px-2 py-1.5 backdrop-blur-sm">
      <p className="label mb-1">
        {kind === 'atlas' ? 'Gökyüzü parlaklığı' : 'Gece ışığı'}
      </p>
      {kind === 'atlas' ? (
        <>
          <div className="flex h-2 w-40 overflow-hidden rounded-card">
            {ATLAS_SCALE.map((color) => (
              <span
                key={color}
                className="flex-1"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-meta text-faint">
            <span>karanlık</span>
            <span>şehir</span>
          </div>
        </>
      ) : (
        <>
          <div
            className="h-2 w-40 rounded-card"
            style={{
              backgroundImage: 'linear-gradient(90deg, #000000, #fff3c4)',
            }}
          />
          <p className="mt-1 text-meta leading-snug text-faint">
            ham parlaklık · Bortle ölçeği değil
          </p>
        </>
      )}
    </div>
  );
}

/** Tıklanan noktanın bilgisi. */
function PickPanel({
  point,
  nearest,
  onClose,
}: {
  point: LatLng;
  nearest: {
    site: { slug: string; name: string; region: string; bortle: number; sqm?: number };
    km: number;
  } | null;
  onClose: () => void;
}) {
  return (
    <div className="absolute left-2 top-2 w-[min(260px,calc(100%-1rem))] rounded-card border border-border-strong bg-background/90 p-2.5 backdrop-blur-sm">
      <div className="flex items-baseline justify-between gap-2">
        <p className="label">Seçilen nokta</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Nokta bilgisini kapat"
          className="text-body-sm leading-none text-muted-foreground hover:text-foreground"
        >
          ×
        </button>
      </div>
      <p className="tabular mt-1 text-meta text-foreground">
        {point.lat.toFixed(4)}° · {point.lng.toFixed(4)}°
      </p>

      {nearest ? (
        <div className="mt-2 border-t border-border pt-2">
          <p className="label">En yakın gözlem noktası</p>
          <Link
            to={`/saha/${nearest.site.slug}`}
            className="mt-0.5 block text-meta text-foreground hover:text-primary"
          >
            {nearest.site.name}
          </Link>
          <p className="mt-0.5 text-meta text-faint">
            {nearest.site.region} · {formatDistance(nearest.km)}
          </p>
          <p className="tabular mt-1 text-meta text-cold">
            Bortle {nearest.site.bortle}
            {nearest.site.sqm !== undefined
              ? ` · SQM ${nearest.site.sqm.toFixed(2)}`
              : ' · SQM ölçümü yok'}
          </p>
        </div>
      ) : (
        <p className="mt-2 border-t border-border pt-2 text-meta leading-snug text-faint">
          Yakında kayıtlı gözlem noktamız yok.
        </p>
      )}

      {/* Renkten sayı okumamak bilinçli — gerekçe çağrı yerinde. */}
      <p className="mt-2 text-meta leading-snug text-faint">
        Haritadaki renk uydu kestirimidir; buradaki Bortle/SQM ise o
        noktanın değil, en yakın kayıtlı sahanın ölçümüdür.
      </p>
    </div>
  );
}

function ZoomButton({
  label,
  sign,
  disabled,
  onClick,
}: {
  label: string;
  sign: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="h-7 w-7 text-body leading-none text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-35 disabled:hover:bg-transparent"
    >
      {sign}
    </button>
  );
}

function Notice({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <p className="text-body-sm text-foreground">{title}</p>
      <p className="max-w-[52ch] text-body-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
      <div className="mt-1 text-body-sm">{action}</div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useLocationContext } from '@/features/location/LocationContext';
import { useTheme } from '@/features/theme/ThemeContext';
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
 * ÜÇÜNCÜ TARAF İSTEĞİ HÂLÂ VAR, İZİN DE. Döşemeler CARTO ve
 * djlorenz.github.io'dan geliyor; harita açıldığı anda IP adresi ve
 * bakılan bölge o sunuculara gider. Sayfanın kendi metni "koordinat
 * sunucumuza gönderilmez" diyor — bunu sormadan yapmak o sözü bozmak
 * olurdu. Tek onay isteniyor, saklanıyor, çerez envanterinden geri
 * alınabiliyor.
 *
 * KONTROLLER BİZDE: yakınlaştırma, katman saydamlığı, sıfırlama ve tam
 * ekran haritanın kendi durumunu değiştiriyor — artık bir adres
 * parametresi değil. Sürükleyerek gezmek, çift tıkla ve ⌘/Ctrl+tekerlek
 * ile yakınlaşmak da mümkün.
 */

const CONSENT_KEY = 'astrohub:map:tiles';

function readConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'izin';
  } catch {
    return false;
  }
}

export function LightPollutionMap() {
  const { location } = useLocationContext();
  const { theme } = useTheme();
  const frameRef = useRef<HTMLDivElement>(null);

  const [allowed, setAllowed] = useState(readConsent);
  const [center, setCenter] = useState<LatLng>(() => ({
    lat: location.latitude,
    lng: location.longitude,
  }));
  const [zoom, setZoom] = useState(6);
  const [opacity, setOpacity] = useState(50);

  /* Katman kaynağı sırayla deneniyor; hangisinin yayımda olduğunu bu
     ortamdan doğrulayamadım (gerekçe kaynak listesinin başında). */
  const [sourceIndex, setSourceIndex] = useState(0);
  const overlay = OVERLAY_SOURCES[sourceIndex];
  const overlayFailed = sourceIndex >= OVERLAY_SOURCES.length;

  const onOverlayFailure = useCallback(() => {
    setSourceIndex((index) => index + 1);
  }, []);

  /* Üstteki şehir seçici değişince harita da oraya gitsin: iki ayrı
     konum kavramı taşımak, kullanıcıya "hangisi geçerli" diye
     sordurur. */
  useEffect(() => {
    setCenter({ lat: location.latitude, lng: location.longitude });
  }, [location.latitude, location.longitude]);

  const allow = useCallback(() => {
    setAllowed(true);
    try {
      localStorage.setItem(CONSENT_KEY, 'izin');
    } catch {
      // Depolama kapalıysa izin yalnızca bu oturum için geçerli olur.
    }
  }, []);

  /* Gece ışıkları katmanı `screen` ile bindiriliyor; açık altlıkta bu
     her yeri beyaza boyar. O katman etkinse altlık koyuya zorlanıyor —
     temaya uymamak, katmanı okunmaz kılmaktan iyi. */
  const base = useMemo(
    () => basemapSource(theme !== 'light' || !!overlay?.needsDarkBasemap),
    [theme, overlay]
  );

  const view = { lat: center.lat, lng: center.lng, zoom, opacity };

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
  }

  return (
    <section aria-labelledby="lp-map-title">
      <div className="mx-auto w-full max-w-content border-y border-border px-4 py-4 sm:px-6 lg:px-8 xl:px-12">
        <header className="mb-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 id="lp-map-title" className="text-[16px] text-foreground">
            Işık Kirliliği Haritası
          </h2>
          <span className="label">{location.label}</span>
          <a
            href={fullUrl(view)}
            target="_blank"
            rel="noreferrer noopener"
            className="ml-auto text-[11px] text-cold transition-colors hover:text-primary"
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
            harita bir görsel değil, gezilen bir yüzey. 4:3 bir kutuda
            telefonda 250px kalıyordu ve o yükseklikte harita gezilemiyor.
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
                label="Işık kirliliği haritası — sürükleyerek gezin, çift tıklayarak yakınlaşın"
                className={cn(
                  'h-full w-full',
                  /* Saha modunda harita da kırmızıya düşüyor: bu tema
                     bir görünüm tercihi değil, karanlık adaptasyonunu
                     koruma aracı. Tam renkli bir uydu haritası o
                     korumayı tek başına bozardı. */
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
                onOverlayFailure={onOverlayFailure}
                marker={{ lat: location.latitude, lng: location.longitude }}
              />
            ) : (
              <Notice
                title="Harita üçüncü taraf sunucularından yükleniyor"
                body="Haritayı açtığınızda IP adresiniz ve baktığınız bölge döşeme sağlayıcılarına (CARTO, djlorenz.github.io) gider. Bir kez onaylarsanız tercihiniz saklanır; çerez sayfasından geri alabilirsiniz."
                action={
                  <Button size="sm" onClick={allow}>
                    Haritayı yükle
                  </Button>
                }
              />
            )}
          </div>

          {/* Yakınlaştırma düğmeleri haritanın üstünde: sürgü aşağıda
              duruyor ama gezinirken el haritadan ayrılmamalı. */}
          {hasNetworkAccess && allowed ? (
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
          ) : null}
        </div>

        {/* ── Kontroller ── */}
        <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <Slider
            id="lp-zoom"
            label="Yakınlaştırma"
            value={zoom}
            min={ZOOM_RANGE.min}
            max={ZOOM_RANGE.max}
            step={1}
            display={`z${zoom}`}
            onChange={setZoom}
          />
          <Slider
            id="lp-opacity"
            label="Katman saydamlığı"
            value={opacity}
            min={OPACITY_RANGE.min}
            max={OPACITY_RANGE.max}
            step={5}
            display={`%${opacity}`}
            onChange={setOpacity}
          />
          <div className="flex items-end gap-1.5">
            <Button size="sm" variant="secondary" onClick={reset}>
              Sıfırla
            </Button>
            <Button size="sm" variant="ghost" onClick={fullscreen}>
              Tam ekran
            </Button>
          </div>
        </div>

        {/*
          Katman gelmediyse bu açıkça yazılıyor. Sessiz kalmak, boş bir
          altlık haritayı "bu bölgede ışık kirliliği yok" gibi
          okutuyordu.
        */}
        {overlayFailed ? (
          <p className="mt-1.5 rounded-card border border-warning/40 bg-surface-1 px-2.5 py-1.5 text-[11px] leading-snug text-warning">
            Hiçbir ışık kirliliği kaynağına ulaşılamadı; altta yalnızca temel
            harita var. Aşağıdaki karşılaştırma kendi ölçümlerimizden geldiği
            için etkilenmiyor.
          </p>
        ) : null}

        <p className="mt-1.5 text-[10px] leading-snug text-faint">
          {BASEMAP_CREDIT}
          {overlay ? ` · ${overlay.credit}` : ''}. Katman uydu kestirimidir.
          Aşağıdaki karşılaştırma ise kendi gözlem noktası ölçümlerimizden
          hesaplanır — ikisi ayrı kaynaklardır ve birbirini doğrulamaz.
        </p>
      </div>
    </section>
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
      className="h-7 w-7 text-[15px] leading-none text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-35 disabled:hover:bg-transparent"
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
      <p className="text-[13px] text-foreground">{title}</p>
      <p className="max-w-[52ch] text-[11.5px] leading-relaxed text-muted-foreground">
        {body}
      </p>
      <div className="mt-1 text-[11.5px]">{action}</div>
    </div>
  );
}

function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-card border border-border bg-surface-2 px-2.5 py-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="label">
          {label}
        </label>
        <span className="tabular text-[11px] text-cold">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          'mt-1 h-4 w-full cursor-pointer appearance-none bg-transparent',
          '[&::-webkit-slider-runnable-track]:h-[3px] [&::-webkit-slider-runnable-track]:bg-border',
          '[&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-[13px] [&::-webkit-slider-thumb]:w-[13px]',
          '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
          '[&::-webkit-slider-thumb]:bg-primary',
          '[&::-moz-range-track]:h-[3px] [&::-moz-range-track]:bg-border',
          '[&::-moz-range-thumb]:h-[13px] [&::-moz-range-thumb]:w-[13px]',
          '[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary'
        )}
      />
    </div>
  );
}

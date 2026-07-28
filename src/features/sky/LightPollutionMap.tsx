import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useLocationContext } from '@/features/location/LocationContext';
import { hasNetworkAccess } from '@/lib/runtime';
import { cn } from '@/lib/cn';
import {
  OPACITY_RANGE,
  ZOOM_RANGE,
  embedUrl,
  fullUrl,
  type MapView,
} from './lightPollutionEmbed';

/**
 * IŞIK KİRLİLİĞİ HARİTASI — gömülü tam genişlik görünüm.
 *
 * Harita lightpollutionmap.app'ten geliyor; kendi veri setimizi
 * lisanslamadan bir dünya haritası boyayamayız ve o sitenin yayımlanmış
 * bir gömme uç noktası var.
 *
 * ÜÇÜNCÜ TARAF ÇERÇEVESİ İZİNLE YÜKLENİYOR. Sayfanın kendi metni
 * "koordinat sunucumuza gönderilmez" diyor; bir `<iframe>` açtığımız anda
 * kullanıcının IP'si ve baktığı koordinat karşı tarafa gider. Bunu
 * sormadan yapmak, sayfanın kendi sözünü bozmak olurdu. Bu yüzden ilk
 * ziyarette tek bir onay isteniyor; seçim saklanıyor ve bir daha
 * sorulmuyor. Çerez envanterinde de görünüyor, oradan silinebiliyor.
 *
 * KONTROLLER BİZDE, HARİTA ONLARDA. Yakınlaştırma ve katman saydamlığı
 * çerçeve adresinin parametreleri; sürgüyü oynatınca adres değişiyor ve
 * çerçeve yeniden yükleniyor. Çerçevenin içine erişemeyiz (farklı köken),
 * dolayısıyla kontroller dışarıda duruyor — bu bir sınırlama değil,
 * kullanıcının konumuyla bizim şehir seçicimizi aynı yere bağlamanın tek
 * yolu.
 */

const CONSENT_KEY = 'astrohub:embed:lightpollutionmap';

function readConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'izin';
  } catch {
    return false;
  }
}

export function LightPollutionMap() {
  const { location } = useLocationContext();
  const frameRef = useRef<HTMLDivElement>(null);

  const [allowed, setAllowed] = useState(readConsent);
  const [view, setView] = useState<MapView>(() => ({
    lat: location.latitude,
    lng: location.longitude,
    zoom: 6,
    opacity: 50,
  }));

  /* Üstteki şehir seçici değişince harita da oraya gitsin: iki ayrı konum
     kavramı taşımak, kullanıcıya "hangisi geçerli" diye sordurur. */
  useEffect(() => {
    setView((v) => ({ ...v, lat: location.latitude, lng: location.longitude }));
  }, [location.latitude, location.longitude]);

  const allow = useCallback(() => {
    setAllowed(true);
    try {
      localStorage.setItem(CONSENT_KEY, 'izin');
    } catch {
      // Depolama kapalıysa izin yalnızca bu oturum için geçerli olur.
    }
  }, []);

  function fullscreen() {
    const el = frameRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
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
            lightpollutionmap.app ↗
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
            `min-h` telefonu, `max-h` geniş ekranda sayfanın tamamen
            haritaya dönüşmesini engelliyor.
          */}
          <div className="h-[68vh] max-h-[820px] min-h-[420px] w-full">
            {!hasNetworkAccess ? (
              <Notice
                title="Bu derlemede harita yüklenmiyor"
                body="Tek dosya önizleme dış istek yapamaz. Yayındaki sitede harita bu alanda açılır."
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
              <iframe
                /* Adres değişince React çerçeveyi yeniden kurmalı; aynı
                   `src` üzerine yazmak bazı tarayıcılarda geçmişe kayıt
                   düşürüyor ve geri tuşunu haritaya esir ediyor. */
                key={embedUrl(view)}
                src={embedUrl(view)}
                title="Light Pollution Map"
                allowFullScreen
                /*
                 * REFERRER GÖNDERİLİYOR — ve bu bilinçli.
                 *
                 * Önce `referrerPolicy="no-referrer"` konmuştu; canlıda
                 * çerçeve boş bir kutu olarak açıldı. Gömme servisleri
                 * hangi siteden çağrıldıklarını referrer başlığından
                 * doğruluyor; başlık yoksa isteği reddediyorlar.
                 * Sağlayıcının kendi yayımladığı gömme kodunda da böyle
                 * bir kısıtlama yok — ondan sapmanın bedeli buydu.
                 *
                 * `loading="lazy"` de kaldırıldı: çerçeve sayfanın
                 * görünen kısmında ve ertelemenin kazandırdığı bir şey
                 * yok, ama bazı tarayıcılarda ilk boyamada boş kalıyor.
                 */
                className="h-full w-full"
                style={{ border: 0 }}
              />
            ) : (
              <Notice
                title="Harita üçüncü taraftan geliyor"
                body="Haritayı açtığınızda IP adresiniz ve baktığınız koordinat lightpollutionmap.app'e gider. Bir kez onaylarsanız tercihiniz saklanır; çerez sayfasından geri alabilirsiniz."
                action={
                  <Button size="sm" onClick={allow}>
                    Haritayı yükle
                  </Button>
                }
              />
            )}
          </div>
        </div>

        {/* ── Kontroller ── */}
        <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <Slider
            id="lp-zoom"
            label="Yakınlaştırma"
            value={view.zoom}
            min={ZOOM_RANGE.min}
            max={ZOOM_RANGE.max}
            step={1}
            display={`z${view.zoom}`}
            onChange={(zoom) => setView((v) => ({ ...v, zoom }))}
          />
          <Slider
            id="lp-opacity"
            label="Katman saydamlığı"
            value={view.opacity}
            min={OPACITY_RANGE.min}
            max={OPACITY_RANGE.max}
            step={5}
            display={`%${view.opacity}`}
            onChange={(opacity) => setView((v) => ({ ...v, opacity }))}
          />
          <div className="flex items-end gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                setView({
                  lat: location.latitude,
                  lng: location.longitude,
                  zoom: 6,
                  opacity: 50,
                })
              }
            >
              Sıfırla
            </Button>
            <Button size="sm" variant="ghost" onClick={fullscreen}>
              Tam ekran
            </Button>
          </div>
        </div>

        <p className="mt-1.5 text-[10px] leading-snug text-faint">
          Harita ve veri lightpollutionmap.app'e aittir; Astrohub yalnızca
          yayımlanmış gömme adresini kullanır. Aşağıdaki karşılaştırma ise
          kendi gözlem noktası ölçümlerimizden hesaplanır — ikisi ayrı
          kaynaklardır ve birbirini doğrulamaz.
        </p>
      </div>
    </section>
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

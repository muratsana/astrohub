import { useEffect, useMemo, useRef, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { InlineReadout } from '@/components/ui/Readout';
import { ChevronDownIcon } from '@/components/ui/icons';
import { useLocationContext } from '@/features/location/LocationContext';
import { useSkyConditions } from '@/features/weather/useSkyConditions';
import { seeingLabel } from '@/features/weather/seeing';
import {
  astronomicalNight,
  moonPhase,
  formatClock,
  formatDuration,
} from '@/domain/astronomy/ephemeris';
import { cn } from '@/lib/cn';

/**
 * DURUM ÇUBUĞU — kabuğun en üst şeridi.
 *
 * Konum, ay fazı, astronomik karanlık penceresi ve hava koşulları her sayfada
 * görünür kalır; nav ile birlikte yapışkandır.
 *
 * YERLEŞİM NOTU: konum seçici, kaydırılabilir okuma şeridinin **dışında**
 * durur. Daha önce içindeydi ve açılır menü `overflow-x-auto` tarafından
 * kırpılıyordu — menü şeridin 32px yüksekliğine sıkışıp görünmez oluyordu.
 * z-index sorunu değildi; taşma kırpmasıydı. Seçiciyi kaydırma bağlamından
 * çıkarmak tek doğru çözüm: menü artık normal akışta açılır.
 */
export function StatusBar() {
  const { location } = useLocationContext();

  // Gece penceresi ve ay fazı yalnızca konum ya da gün değişince yeniden
  // hesaplanır; tarama tabanlı arama her render'da çalışmamalı.
  const today = new Date();
  const dayKey = today.toDateString();

  const sky = useMemo(() => {
    const date = new Date(dayKey);
    const night = astronomicalNight(date, location.latitude, location.longitude);
    const moon = moonPhase(date);
    return { night, moon };
  }, [dayKey, location.latitude, location.longitude]);

  const { night, moon } = sky;
  const conditions = useSkyConditions();

  return (
    <div className="border-b border-border bg-background">
      <Container>
        <div className="flex h-8 items-center gap-3">
          {/* Kaydırma bağlamının dışında — açılır menü kırpılmaz */}
          <LocationPicker />

          <span aria-hidden className="h-3 w-px shrink-0 bg-border" />

          <div className="flex flex-1 items-center gap-x-5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <InlineReadout
              label="Ay"
              value={`%${Math.round(moon.illumination * 100)} ${moon.name.toLocaleLowerCase('tr-TR')}`}
              tone="primary"
            />

            <InlineReadout
              label="Astr. karanlık"
              value={
                night.neverDark
                  ? 'oluşmuyor'
                  : `${formatClock(night.start, location.timeZone)} → ${formatClock(night.end, location.timeZone)}`
              }
              tone="cold"
            />

            <InlineReadout
              label="Süre"
              value={formatDuration(night.durationMinutes)}
            />

            <InlineReadout
              label="Bulut"
              value={
                conditions.data
                  ? `%${Math.round(conditions.data.cloudCover)}`
                  : conditions.status === 'loading'
                    ? '…'
                    : '—'
              }
              tone="cold"
            />

            <InlineReadout
              label="Seeing"
              value={
                conditions.data
                  ? seeingLabel(conditions.data.seeing.index)
                  : conditions.status === 'loading'
                    ? '…'
                    : '—'
              }
              tone="primary"
            />
          </div>
        </div>
      </Container>
    </div>
  );
}

/** Konum seçici: şehir listesi + cihaz konumu isteği. */
function LocationPicker() {
  const { location, cities, permission, setCity, requestDeviceLocation } =
    useLocationContext();

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.14em] text-foreground transition-colors hover:text-primary"
      >
        {location.label}
        {location.source === 'device' && (
          <span className="text-[9px] text-cold" title="Cihaz konumu">
            ◉
          </span>
        )}
        <ChevronDownIcon
          className={cn('h-3 w-3 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Gözlem konumu"
          className="absolute left-0 top-full z-[60] mt-1 max-h-[70vh] w-60 overflow-y-auto rounded-card border border-border-strong bg-surface-1 py-1 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.9)]"
        >
          {permission !== 'granted' && (
            <>
              <button
                type="button"
                onClick={() => {
                  requestDeviceLocation();
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-[11px] text-cold transition-colors hover:bg-surface-2"
              >
                ◉ Cihaz konumumu kullan
                <span className="mt-0.5 block text-[10px] leading-snug text-faint">
                  Koordinat sunucuya gönderilmez
                </span>
              </button>
              <span aria-hidden className="my-1 block h-px bg-border" />
            </>
          )}

          {cities.map((city) => (
            <button
              key={city.id}
              type="button"
              role="option"
              aria-selected={location.label === city.name}
              onClick={() => {
                setCity(city.id);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left text-[11px] transition-colors hover:bg-surface-2',
                location.label === city.name ? 'text-primary' : 'text-foreground'
              )}
            >
              {city.name}
              <span className="tabular text-[10px] text-faint">
                B{city.bortle}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

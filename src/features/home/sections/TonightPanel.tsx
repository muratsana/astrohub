import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Readout } from '@/components/ui/Readout';
import { Button, ButtonLink } from '@/components/ui/Button';
import { useLocationContext } from '@/features/location/LocationContext';
import { targets } from '@/features/targets/data';
import {
  astronomicalNight,
  moonPhase,
  moonRiseSet,
  targetNightPeak,
  parseRa,
  parseDec,
  formatClock,
  formatDuration,
  formatAltitude,
} from '@/domain/astronomy/ephemeris';

/**
 * BU GECE — ana sayfanın üst alanı (§7.9).
 *
 * Değerler gerçek efemeris hesabından gelir; API anahtarı ya da ağ isteği
 * yoktur (bkz. `domain/astronomy/ephemeris.ts`). Hava durumu ve seeing
 * gerçekten bir servis istediği için (§14.3) uydurulmaz — "—" olarak durur.
 *
 * Hedef önerileri katalogdan gelir: karanlık pencere boyunca en yükseğe
 * çıkan cisimler sıralanır. Ufkun altında kalanlar listelenmez.
 */
export function TonightPanel() {
  const {
    location,
    permission,
    shouldOfferGeolocation,
    requestDeviceLocation,
    dismissGeolocationOffer,
  } = useLocationContext();

  // Gün ve konum değişmedikçe yeniden hesaplanmaz — tarama tabanlı arama
  // her render'da çalışmamalı.
  const dayKey = new Date().toDateString();

  const sky = useMemo(() => {
    const date = new Date(dayKey);
    const night = astronomicalNight(date, location.latitude, location.longitude);
    const moon = moonPhase(date);
    const moonTimes = moonRiseSet(date, location.latitude, location.longitude);

    const visible =
      night.start && night.end
        ? targets
            .map((target) => {
              const coords = { ra: parseRa(target.ra), dec: parseDec(target.dec) };
              if (Number.isNaN(coords.ra) || Number.isNaN(coords.dec)) return null;
              const peak = targetNightPeak(
                coords,
                { start: night.start!, end: night.end! },
                location.latitude,
                location.longitude
              );
              return peak.neverRises ? null : { target, peak };
            })
            .filter((v): v is NonNullable<typeof v> => v !== null)
            .sort((a, b) => b.peak.peakAltitude - a.peak.peakAltitude)
            .slice(0, 5)
        : [];

    return { night, moon, moonTimes, visible };
  }, [dayKey, location.latitude, location.longitude]);

  const { night, moon, moonTimes, visible } = sky;
  const dateLabel = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  });

  return (
    <section className="border-b border-border bg-surface-1/40">
      <Container className="py-7 sm:py-8">
        <header className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-[24px] text-foreground sm:text-[28px]">
            Bu Gece
          </h1>
          <span className="label">{location.label}</span>
          <span aria-hidden className="h-3 w-px bg-border" />
          <span className="tabular text-[11px] text-muted-foreground">
            {dateLabel}
          </span>
        </header>

        {shouldOfferGeolocation && (
          <div className="mb-5 flex flex-wrap items-center gap-3 rounded-card border border-cold/40 bg-surface-1 px-4 py-3">
            <p className="flex-1 text-[11.5px] leading-relaxed text-muted-foreground">
              Hesaplar şu an{' '}
              <span className="text-foreground">{location.label}</span> için
              yapılıyor. Bulunduğun yere göre hesaplamak istersen konum izni
              verebilirsin — <span className="text-cold">koordinat sunucuya
              gönderilmez</span>, yalnızca tarayıcında kalır.
            </p>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" onClick={requestDeviceLocation}>
                Konum izni ver
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={dismissGeolocationOffer}
              >
                Şehir seçeyim
              </Button>
            </div>
          </div>
        )}

        {permission === 'denied' && (
          <p className="mb-5 rounded-card border border-border bg-surface-1 px-4 py-2.5 text-[11px] text-muted-foreground">
            Konum izni alınamadı — hesaplar seçili şehir üzerinden yapılıyor.
            Üstteki konum seçiciden değiştirebilirsin.
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          {/* Ölçüm okumaları */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Readout
              label="Astr. karanlık"
              value={
                night.neverDark
                  ? 'yok'
                  : formatClock(night.start, location.timeZone)
              }
              hint={
                night.neverDark
                  ? 'Bu enlemde bu tarihte astronomik karanlık oluşmuyor.'
                  : `Bitiş ${formatClock(night.end, location.timeZone)}`
              }
              tone="primary"
            />
            <Readout
              label="Karanlık süresi"
              value={formatDuration(night.durationMinutes)}
              tone="cold"
              hint="Güneş −18° altındayken"
            />
            <Readout
              label="Ay"
              value={`%${Math.round(moon.illumination * 100)}`}
              unit={moon.waxing ? '↑' : '↓'}
              hint={`${moon.name} · ${
                moonTimes.set
                  ? `batar ${formatClock(moonTimes.set, location.timeZone)}`
                  : moonTimes.rise
                    ? `doğar ${formatClock(moonTimes.rise, location.timeZone)}`
                    : 'ufuk üstünde'
              }`}
              tone={moon.illumination > 0.4 ? 'muted' : 'primary'}
            />
            <Readout
              label="Seeing / bulut"
              value="—"
              tone="muted"
              hint="Hava servisi henüz bağlanmadı (§14.3)"
            />
          </div>

          {/* Bu gece yükselen hedefler */}
          <div className="rounded-card border border-border bg-surface-1">
            <header className="flex items-baseline justify-between border-b border-border px-4 py-2.5">
              <h2 className="label text-foreground">Bu gece yüksek</h2>
              <span className="label">zirve · yükseklik</span>
            </header>

            {visible.length === 0 ? (
              <p className="px-4 py-8 text-center text-[11.5px] text-muted-foreground">
                Bu gece karanlık pencere oluşmuyor; hedef sıralaması
                hesaplanamadı.
              </p>
            ) : (
              <ul>
                {visible.map(({ target, peak }) => (
                  <li key={target.slug}>
                    <Link
                      to={`/hedef/${target.slug}`}
                      className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-2 transition-colors last:border-0 hover:bg-surface-2"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-medium text-foreground">
                          {target.catalog}
                          <span className="ml-2 font-normal text-muted-foreground">
                            {target.name}
                          </span>
                        </span>
                      </span>
                      <span className="tabular shrink-0 text-[11.5px] text-cold">
                        {formatClock(peak.peakAt, location.timeZone)}
                        <span className="ml-2 text-primary">
                          {formatAltitude(peak.peakAltitude)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2 border-t border-border px-4 py-3">
              <ButtonLink to="/planlayici" size="sm" variant="secondary">
                Gece planı
              </ButtonLink>
              <ButtonLink to="/hedefler" size="sm" variant="ghost">
                Tüm katalog
              </ButtonLink>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

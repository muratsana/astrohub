import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Button, ButtonLink } from '@/components/ui/Button';
import { useLocationContext } from '@/features/location/LocationContext';
import { useSkyConditions } from '@/features/weather/useSkyConditions';
import { seeingLabel, observingVerdict } from '@/features/weather/seeing';
import { dewRisk } from '@/features/weather/openMeteo';
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
import { cn } from '@/lib/cn';

/**
 * BU GECE — ana sayfanın üst alanı (§7.9).
 *
 * YENİDEN DÜZENLEME NOTU
 * Önceki sürüm dört büyük ölçüm kutusu + ayrı bir hedef paneli olarak iki
 * blok hâlindeydi ve ekranın yarısını yiyordu. Şimdi tek bir enstrüman
 * şeridi: solda gecenin özeti (verdict + saatler), sağda hedef listesi.
 * Ölçümler büyük kutular yerine bitişik hücrelere indi — aynı bilgi,
 * yaklaşık yarı yükseklik.
 *
 * Değerler gerçek efemeris hesabından gelir; API anahtarı ya da ağ isteği
 * yoktur (bkz. `domain/astronomy/ephemeris.ts`). Hava ve seeing artık
 * Open-Meteo'dan gelir; servis ulaşılamazsa hücreler "—" gösterir ve panel
 * çalışmaya devam eder.
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
            .slice(0, 6)
        : [];

    return { night, moon, moonTimes, visible };
  }, [dayKey, location.latitude, location.longitude]);

  const { night, moon, moonTimes, visible } = sky;
  const conditions = useSkyConditions();
  const weather = conditions.data;

  const verdict = weather
    ? observingVerdict(weather.cloudCover, weather.seeing.index)
    : null;
  const dew = weather ? dewRisk(weather.temperature, weather.dewPoint) : null;

  const dateLabel = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  });

  return (
    <section className="border-b border-border bg-surface-1/40">
      <Container className="py-5 sm:py-6">
        <header className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-[20px] text-foreground sm:text-[23px]">Bu Gece</h1>
          <span className="label">{location.label}</span>
          <span aria-hidden className="h-3 w-px bg-border" />
          <span className="tabular text-[11px] text-muted-foreground">
            {dateLabel}
          </span>

          {verdict && (
            <span
              className={cn(
                'ml-auto rounded-card border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em]',
                {
                  success: 'border-success/45 text-success',
                  primary: 'border-primary/45 text-primary',
                  warning: 'border-warning/45 text-warning',
                  danger: 'border-danger/45 text-danger',
                }[verdict.tone]
              )}
            >
              {verdict.label}
            </span>
          )}
        </header>

        {shouldOfferGeolocation && (
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-card border border-cold/40 bg-surface-1 px-3 py-2.5">
            <p className="flex-1 text-[11px] leading-relaxed text-muted-foreground">
              Hesaplar şu an{' '}
              <span className="text-foreground">{location.label}</span> için
              yapılıyor. Bulunduğun yere göre hesaplamak istersen konum izni
              verebilirsin —{' '}
              <span className="text-cold">koordinat sunucumuza gönderilmez</span>
              , yalnızca tarayıcında kalır ve hava servisine iletilir.
            </p>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" onClick={requestDeviceLocation}>
                Konum izni ver
              </Button>
              <Button size="sm" variant="ghost" onClick={dismissGeolocationOffer}>
                Şehir seçeyim
              </Button>
            </div>
          </div>
        )}

        {permission === 'denied' && (
          <p className="mb-3 rounded-card border border-border bg-surface-1 px-3 py-2 text-[11px] text-muted-foreground">
            Konum izni alınamadı — hesaplar seçili şehir üzerinden yapılıyor.
            Üstteki konum seçiciden değiştirebilirsin.
          </p>
        )}

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
          {/* Ölçüm hücreleri — bitişik ızgara, hairline ayrımlı */}
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border sm:grid-cols-3">
            <Cell
              label="Astr. karanlık"
              value={
                night.neverDark
                  ? 'yok'
                  : formatClock(night.start, location.timeZone)
              }
              hint={
                night.neverDark
                  ? 'bu enlemde oluşmuyor'
                  : `bitiş ${formatClock(night.end, location.timeZone)}`
              }
              tone="primary"
            />
            <Cell
              label="Süre"
              value={formatDuration(night.durationMinutes)}
              hint="güneş −18° altında"
              tone="cold"
            />
            <Cell
              label="Ay"
              value={`%${Math.round(moon.illumination * 100)}`}
              hint={
                moonTimes.set
                  ? `batar ${formatClock(moonTimes.set, location.timeZone)}`
                  : moonTimes.rise
                    ? `doğar ${formatClock(moonTimes.rise, location.timeZone)}`
                    : moon.name.toLocaleLowerCase('tr-TR')
              }
              tone={moon.illumination > 0.4 ? 'muted' : 'primary'}
            />
            <Cell
              label="Bulut"
              value={weather ? `%${Math.round(weather.cloudCover)}` : '—'}
              hint={
                weather
                  ? `${Math.round(weather.temperature)}°C · nem %${Math.round(weather.humidity)}`
                  : conditions.status === 'loading'
                    ? 'alınıyor…'
                    : 'servise ulaşılamadı'
              }
              tone="cold"
            />
            <Cell
              label="Seeing"
              value={weather ? seeingLabel(weather.seeing.index) : '—'}
              hint={
                weather
                  ? `tahmin · ${weather.seeing.driver}`
                  : 'yüksek irtifa rüzgârından'
              }
              tone="primary"
            />
            <Cell
              label="Çiylenme"
              value={dew ? dew.label : '—'}
              hint={
                weather
                  ? `çiy noktası ${Math.round(weather.dewPoint)}°C`
                  : 'ısıtıcı bandı kararı için'
              }
              tone={dew?.tone === 'danger' ? 'muted' : 'cold'}
            />
          </div>

          {/* Bu gece yükselen hedefler */}
          <div className="rounded-card border border-border bg-surface-1">
            <header className="flex items-baseline justify-between border-b border-border px-3 py-2">
              <h2 className="label text-foreground">Bu gece yüksek</h2>
              <span className="label">zirve · yükseklik</span>
            </header>

            {visible.length === 0 ? (
              <p className="px-3 py-6 text-center text-[11px] text-muted-foreground">
                Bu gece karanlık pencere oluşmuyor; hedef sıralaması
                hesaplanamadı.
              </p>
            ) : (
              <ul>
                {visible.map(({ target, peak }) => (
                  <li key={target.slug}>
                    <Link
                      to={`/hedef/${target.slug}`}
                      className="flex items-baseline justify-between gap-3 border-b border-border px-3 py-1.5 transition-colors last:border-0 hover:bg-surface-2"
                    >
                      <span className="min-w-0 truncate text-[11.5px] text-foreground">
                        <span className="font-medium">{target.catalog}</span>
                        <span className="ml-1.5 text-muted-foreground">
                          {target.name}
                        </span>
                      </span>
                      <span className="tabular shrink-0 text-[11px] text-cold">
                        {formatClock(peak.peakAt, location.timeZone)}
                        <span className="ml-1.5 text-primary">
                          {formatAltitude(peak.peakAltitude)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-border px-3 py-2">
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

/**
 * Ölçüm hücresi. Önceki `Readout` kutusundan farkı: kendi kenarlığı ve
 * yuvarlaması yok — çerçeveyi saran ızgara çiziyor. Böylece altı ölçüm
 * altı ayrı kutu değil, tek bir enstrüman paneli gibi duruyor.
 */
function Cell({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: 'primary' | 'cold' | 'muted';
}) {
  const toneClass = {
    primary: 'text-primary',
    cold: 'text-cold',
    muted: 'text-muted-foreground',
  }[tone];

  return (
    <div className="bg-surface-1 px-3 py-2">
      <p className="label">{label}</p>
      <p
        className={cn(
          'tabular mt-0.5 font-display text-[19px] font-bold leading-none',
          toneClass
        )}
      >
        {value}
      </p>
      <p className="mt-1 truncate text-[10px] leading-snug text-faint">{hint}</p>
    </div>
  );
}

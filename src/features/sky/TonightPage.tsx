import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Readout } from '@/components/ui/Readout';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Input';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { useLocationContext } from '@/features/location/LocationContext';
import { useSkyConditions } from '@/features/weather/useSkyConditions';
import { seeingLabel, observingVerdict } from '@/features/weather/seeing';
import { dewRisk } from '@/features/weather/openMeteo';
import { targets, targetKindLabels } from '@/features/targets/data';
import type { TargetKind } from '@/features/targets/data';
import {
  astronomicalNight,
  moonPhase,
  moonRiseSet,
  parseRa,
  parseDec,
  formatClock,
  formatDuration,
} from '@/domain/astronomy/ephemeris';
import { moonlessDarkMinutes } from '@/domain/astronomy/nightCalendar';
import { zonedMidnight } from '@/domain/time/zonedDay';
import { altitudeCurve, usableWindow } from '@/domain/astronomy/sessionPlan';
import { AltitudeChart } from './AltitudeChart';
import { cn } from '@/lib/cn';

/**
 * BU GECE GÖKYÜZÜNDE (§7.9).
 *
 * Ana sayfadaki şeridin genişletilmiş hâli: aynı efemeris hesabı, ama burada
 * her hedefin yükseklik eğrisi ve kullanılabilir penceresi de var.
 *
 * Ana sayfadaki panel özet, bu sayfa karar ekranıdır — bu yüzden buradaki
 * sıralama "en yüksek" değil, **en uzun kullanılabilir pencere**dir. 80°'ye
 * çıkıp yarım saat sonra batan hedef, 45°'de dört saat duran hedeften daha
 * kötü bir çekim adayıdır.
 */

type SortKey = 'pencere' | 'zirve' | 'ad';

const MIN_ALTITUDE = 30;

export function TonightPage() {
  const { location } = useLocationContext();
  const conditions = useSkyConditions();
  const [sort, setSort] = useState<SortKey>('pencere');
  const [kind, setKind] = useState<TargetKind | 'hepsi'>('hepsi');

  // Gün, gözlem konumunun takvimine göre anahtarlanır (ASTRO-01) —
  // tarayıcısı başka dilimde olan kullanıcı yanlış geceyi hesaplamasın.
  const dayStartMs = zonedMidnight(new Date(), location.timeZone).getTime();

  const sky = useMemo(() => {
    const date = new Date(dayStartMs);
    const night = astronomicalNight(
      date,
      location.latitude,
      location.longitude,
      location.timeZone
    );
    const moon = moonPhase(date);
    const moonTimes = moonRiseSet(
      date,
      location.latitude,
      location.longitude,
      location.timeZone
    );
    const moonless = moonlessDarkMinutes(night, location.latitude, location.longitude);

    const window =
      night.start && night.end ? { start: night.start, end: night.end } : null;

    const rows = window
      ? targets
          .map((target) => {
            const coords = { ra: parseRa(target.ra), dec: parseDec(target.dec) };
            if (Number.isNaN(coords.ra) || Number.isNaN(coords.dec)) return null;

            const usable = usableWindow(
              coords,
              window,
              location.latitude,
              location.longitude,
              MIN_ALTITUDE
            );
            if (!usable) return null;

            return {
              target,
              usable,
              curve: altitudeCurve(
                coords,
                window,
                location.latitude,
                location.longitude,
                15
              ),
            };
          })
          .filter((row): row is NonNullable<typeof row> => row !== null)
      : [];

    return { night, moon, moonTimes, moonless, window, rows };
  }, [dayStartMs, location.latitude, location.longitude, location.timeZone]);

  const visible = useMemo(() => {
    const filtered =
      kind === 'hepsi'
        ? sky.rows
        : sky.rows.filter((row) => row.target.kind === kind);

    return [...filtered].sort((a, b) => {
      if (sort === 'zirve') return b.usable.peakAltitude - a.usable.peakAltitude;
      if (sort === 'ad') return a.target.name.localeCompare(b.target.name, 'tr');
      return b.usable.minutes - a.usable.minutes;
    });
  }, [sky.rows, sort, kind]);

  const weather = conditions.data;
  const verdict = weather
    ? observingVerdict(weather.cloudCover, weather.seeing?.index ?? null)
    : null;
  const dew = weather ? dewRisk(weather.temperature, weather.dewPoint) : null;

  const dateLabel = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  });

  return (
    <>
      <PageMeta
        title="Bu Gece Gökyüzünde"
        description="Bu gece için astronomik karanlık penceresi, ay durumu, hava koşulları ve gözlenebilir hedeflerin yükseklik eğrileri."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Bu Gece', path: '/bu-gece' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[{ label: 'Ana Sayfa', to: '/' }, { label: 'Bu Gece' }]}
          title="Bu Gece Gökyüzünde"
          description={`${dateLabel} · ${location.label}. Hedefler ${MIN_ALTITUDE}° üstünde kaldıkları süreye göre sıralanır — zirve yüksekliği tek başına iyi bir ölçüt değildir.`}
          actions={
            <>
              {verdict && (
                <Badge
                  tone={
                    verdict.tone === 'success'
                      ? 'success'
                      : verdict.tone === 'warning'
                        ? 'warning'
                        : verdict.tone === 'danger'
                          ? 'danger'
                          : 'primary'
                  }
                >
                  {verdict.label}
                </Badge>
              )}
              <ButtonLink to="/planlayici" size="sm" variant="secondary">
                Gece Planı Kur
              </ButtonLink>
            </>
          }
        />

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Readout
            label="Astr. karanlık"
            value={
              sky.night.neverDark
                ? 'yok'
                : formatClock(sky.night.start, location.timeZone)
            }
            hint={
              sky.night.neverDark
                ? 'bu enlemde oluşmuyor'
                : `bitiş ${formatClock(sky.night.end, location.timeZone)}`
            }
          />
          <Readout
            label="Karanlık süre"
            value={formatDuration(sky.night.durationMinutes)}
            hint="güneş −18° altında"
            tone="cold"
          />
          <Readout
            label="Aysız karanlık"
            value={formatDuration(sky.moonless)}
            hint="ay ufkun altındayken"
          />
          <Readout
            label="Ay"
            value={`%${Math.round(sky.moon.illumination * 100)}`}
            hint={sky.moon.name.toLocaleLowerCase('tr-TR')}
            tone={sky.moon.illumination > 0.4 ? 'muted' : 'cold'}
          />
          <Readout
            label="Bulut"
            value={weather ? `%${Math.round(weather.cloudCover)}` : '—'}
            hint={
              weather
                ? `${Math.round(weather.temperature)}°C · nem %${Math.round(weather.humidity)}`
                : conditions.status === 'loading'
                  ? 'alınıyor…'
                  : conditions.status === 'offline'
                    ? 'önizlemede dış servis kapalı'
                    : 'servise ulaşılamadı'
            }
            tone="cold"
          />
          <Readout
            label="Seeing"
            value={weather?.seeing ? seeingLabel(weather.seeing.index) : '—'}
            hint={
              dew
                ? `çiylenme: ${dew.label.toLocaleLowerCase('tr-TR')}`
                : 'yüksek irtifa rüzgârından'
            }
          />
        </div>

        {!sky.window ? (
          <EmptyState
            message="Bu gece astronomik karanlık oluşmuyor"
            hint="Yılın bu döneminde bu enlemde güneş −18°'nin altına inmiyor. Karanlık takviminden uygun geceyi seçebilirsiniz."
            action={
              <ButtonLink to="/araclar/takvim" size="sm" variant="secondary">
                Karanlık Takvimi
              </ButtonLink>
            }
          />
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="tabular label" role="status">
                {visible.length} hedef · {MIN_ALTITUDE}° üstünde
              </p>

              <div className="flex items-center gap-2">
                <label htmlFor="tonight-kind" className="sr-only">
                  Tür
                </label>
                <Select
                  id="tonight-kind"
                  value={kind}
                  onChange={(e) => setKind(e.target.value as TargetKind | 'hepsi')}
                  className="h-8 w-auto text-meta"
                >
                  <option value="hepsi">Tüm türler</option>
                  {Object.entries(targetKindLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>

                <label htmlFor="tonight-sort" className="sr-only">
                  Sırala
                </label>
                <Select
                  id="tonight-sort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="h-8 w-auto text-meta"
                >
                  <option value="pencere">Pencere süresi</option>
                  <option value="zirve">Zirve yüksekliği</option>
                  <option value="ad">Ada göre</option>
                </Select>
              </div>
            </div>

            {visible.length === 0 ? (
              <EmptyState
                message="Bu türde gözlenebilir hedef yok"
                hint="Filtreyi genişletin ya da tüm katalogdan başka bir tür seçin."
              />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 [&>li]:h-full">
                {visible.map(({ target, usable, curve }) => (
                  <li key={target.slug}>
                    <Panel
                      className="h-full"
                      title={target.catalog}
                      status={targetKindLabels[target.kind]}
                    >
                      <Link
                        to={`/hedef/${target.slug}`}
                        className="text-[13px] font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {target.name}
                      </Link>

                      <div className="mt-2">
                        <AltitudeChart
                          points={curve}
                          timeZone={location.timeZone}
                          minAltitude={MIN_ALTITUDE}
                          highlight={{ start: usable.start, end: usable.end }}
                          label={target.name}
                        />
                      </div>

                      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-meta">
                        <div className="flex justify-between gap-2 border-b border-border pb-1">
                          <dt className="label">Pencere</dt>
                          <dd className="tabular text-primary">
                            {formatDuration(Math.round(usable.minutes))}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2 border-b border-border pb-1">
                          <dt className="label">Zirve</dt>
                          <dd className="tabular text-cold">
                            {Math.round(usable.peakAltitude)}°
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="label">Başlangıç</dt>
                          <dd className="tabular text-muted-foreground">
                            {formatClock(usable.start, location.timeZone)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="label">Bitiş</dt>
                          <dd className="tabular text-muted-foreground">
                            {formatClock(usable.end, location.timeZone)}
                          </dd>
                        </div>
                      </dl>

                      <p
                        className={cn(
                          'mt-2 text-meta leading-snug',
                          usable.minutes >= 180 ? 'text-success' : 'text-faint'
                        )}
                      >
                        {usable.minutes >= 180
                          ? 'Uzun pencere — tek gecede yeterli poz toplanabilir.'
                          : 'Kısa pencere — poz sayısını buna göre planlayın.'}
                      </p>
                    </Panel>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Container>
    </>
  );
}

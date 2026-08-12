import { useMemo, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { NightViews } from './NightViews';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Readout } from '@/components/ui/Readout';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import {
  radiantMaxAltitude,
  upcomingShowers,
} from '@/domain/astronomy/meteorShowers';
import { useLocationContext } from '@/features/location/LocationContext';
import {
  monthNights,
  calendarWeeks,
  bestNights,
  moonGlyph,
} from '@/domain/astronomy/nightCalendar';
import type { NightEntry } from '@/domain/astronomy/nightCalendar';
import { formatClock, formatDuration } from '@/domain/astronomy/ephemeris';
import { cn } from '@/lib/cn';

/**
 * AY VE ASTRONOMİK KARANLIK TAKVİMİ (§7.9).
 *
 * Takvimin gösterdiği asıl büyüklük **aysız karanlık süredir** — takvimlerin
 * çoğu ay fazını gösterir ve kullanıcıyı "dolunay kötüdür" genellemesiyle
 * baş başa bırakır. Oysa ay geç doğuyorsa dolunay gecesinde bile üç saat
 * temiz karanlık olabilir; hesap bunu görür, faz ikonu göremez.
 *
 * Tüm hesap istemcide, `domain/astronomy/nightCalendar` üzerinden yapılır.
 */

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

export function DarkCalendarPage() {
  const { location } = useLocationContext();
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selected, setSelected] = useState<NightEntry | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  /*
   * Aylık hesap 30 gecelik tarama demek (gece başına iki tarama: karanlık
   * penceresi + ay yüksekliği). Ankara için ~200 ms sürüyor; ay veya konum
   * değişmedikçe tekrarlanmaz.
   */
  const entries = useMemo(
    () =>
      monthNights(
        year,
        month,
        location.latitude,
        location.longitude,
        location.timeZone
      ),
    [year, month, location.latitude, location.longitude, location.timeZone]
  );

  const weeks = useMemo(() => calendarWeeks(entries), [entries]);
  const best = useMemo(() => bestNights(entries, 3), [entries]);

  /*
   * METEOR YAĞMURLARI (§14.3) — ay ızgarasından BAĞIMSIZ.
   *
   * Kullanıcının gördüğü ay değil BUGÜN çapa: takvimde mart ayına
   * bakarken de "sıradaki yağmur ne zaman" sorusunun cevabı değişmiyor.
   * Ayla birlikte kaydırsaydık liste bir gezinme aracına dönüşür, oysa
   * burada bir HATIRLATMA.
   */
  const showers = useMemo(() => upcomingShowers(today, 4), [today]);

  const monthlyMoonless = entries.reduce((s, e) => s + e.moonlessMinutes, 0);
  const detail = selected ?? best[0] ?? null;

  const shiftMonth = (delta: number) =>
    setCursor(new Date(year, month + delta, 1));

  return (
    <>
      <PageMeta
        title="Ay ve Astronomik Karanlık Takvimi"
        description="Aylık karanlık pencere takvimi: her gece için astronomik karanlık süresi, ay fazı ve aysız karanlık saatler. Çekim gecenizi veriyle seçin."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Bu Gece', path: '/bu-gece' },
          { name: 'Karanlık Takvimi', path: '/bu-gece/takvim' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Bu Gece', to: '/bu-gece' },
            { label: 'Karanlık Takvimi' },
          ]}
          title="Ay ve Karanlık Takvimi"
          description="Her gece için astronomik karanlık penceresi ve ayın o pencereyi ne kadar paylaştığı. Renk yoğunluğu aysız karanlık süreyi gösterir — koyu hücre iyi gecedir."
          meta={location.label}
        />

        <NightViews />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => shiftMonth(-1)}
              aria-label="Önceki ay"
            >
              ←
            </Button>
            <span className="tabular min-w-[9ch] text-center text-body-sm text-foreground">
              {MONTH_NAMES[month]} {year}
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => shiftMonth(1)}
              aria-label="Sonraki ay"
            >
              →
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setCursor(new Date(today.getFullYear(), today.getMonth(), 1))
              }
            >
              Bu ay
            </Button>
          </div>

          <div className="flex items-center gap-2 text-meta tracking-[0.03em] text-faint">
            <span>az</span>
            <span aria-hidden className="flex">
              {[0.15, 0.35, 0.55, 0.75, 1].map((o) => (
                <span
                  key={o}
                  className="h-3 w-4 border-l border-surface-1 first:border-0"
                  style={{ backgroundColor: `color-mix(in srgb, var(--color-primary) ${o * 100}%, transparent)` }}
                />
              ))}
            </span>
            <span>çok aysız karanlık</span>
          </div>
        </div>

        <section className="mb-4 grid gap-2 sm:grid-cols-3">
          <Readout
            label="Bu ay toplam"
            value={formatDuration(monthlyMoonless)}
            hint="aysız astronomik karanlık"
          />
          <Readout
            label="En iyi gece"
            value={
              best[0]
                ? `${best[0].date.getDate()} ${MONTH_NAMES[best[0].date.getMonth()]}`
                : '—'
            }
            hint={best[0] ? formatDuration(best[0].moonlessMinutes) : 'veri yok'}
            tone="cold"
          />
          <Readout
            label="Seçili gece"
            value={
              detail
                ? `${detail.date.getDate()} ${MONTH_NAMES[detail.date.getMonth()]}`
                : '—'
            }
            hint={detail ? `${detail.score}/100 puan` : 'takvimden gün seçin'}
          />
        </section>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
          {/* ───────── Takvim ───────── */}
          <Panel
            title={`${MONTH_NAMES[month]} ${year}`}
            status={`toplam ${formatDuration(monthlyMoonless)} aysız karanlık`}
            bodyClassName="px-2 py-2 sm:px-3 sm:py-3"
          >
            <div className="grid grid-cols-7 gap-px">
              {WEEKDAYS.map((day) => (
                <div key={day} className="label pb-1 text-center">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-px bg-border">
              {weeks.flat().map((entry, i) =>
                entry === null ? (
                  <div key={`empty-${i}`} className="aspect-square bg-surface-1" />
                ) : (
                  <DayCell
                    key={entry.date.toISOString()}
                    entry={entry}
                    isToday={isSameDay(entry.date, today)}
                    isSelected={detail !== null && isSameDay(entry.date, detail.date)}
                    onSelect={() => setSelected(entry)}
                  />
                )
              )}
            </div>

            <div className="mt-3 grid gap-2 px-1 text-meta leading-snug text-faint sm:grid-cols-2">
              <p>
                Aysız karanlık, güneşin −18° altında olduğu ve ayın ufkun
                altında kaldığı sürenin kesişimidir.
              </p>
              <p>
                Hücredeki çubuk gece kalitesini gösterir; turuncu ne kadar
                doluysa çekim penceresi o kadar uzundur.
              </p>
            </div>
          </Panel>

          {/* ───────── Yan sütun ───────── */}
          <div className="space-y-4">
            <Panel title="Ayın en iyi geceleri">
              <ul className="space-y-px">
                {best.map((entry) => (
                  <li
                    key={entry.date.toISOString()}
                    className="border-b border-border last:border-0"
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(entry)}
                      className="flex w-full items-baseline justify-between gap-3 py-2 text-left transition-colors hover:text-primary"
                    >
                      <span className="min-w-0">
                        <span className="tabular text-body-sm text-foreground">
                          {entry.date.getDate()} {MONTH_NAMES[month]}
                        </span>
                        <span className="ml-2 text-meta text-muted-foreground">
                          {entry.date.toLocaleDateString('tr-TR', {
                            weekday: 'long',
                          })}
                        </span>
                      </span>
                      <span className="tabular shrink-0 text-body-sm text-primary">
                        {formatDuration(entry.moonlessMinutes)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>

            {/*
              YAĞMUR SATIRI ÜÇ ŞEYİ BİRDEN SÖYLÜYOR: ne zaman, ay ne
              kadar dolu, radyant buradan yükseliyor mu. Yalnızca tarih
              yazmak yarım cevap olurdu — ZHR 100'lük bir yağmur
              dolunayda onda biri kadar meteor gösteriyor.
            */}
            <Panel title="Meteor yağmurları" status="yaklaşan">
              <ul className="space-y-px">
                {showers.map((s) => {
                  const yukseklik = radiantMaxAltitude(
                    s,
                    location.latitude,
                    location.longitude
                  );
                  return (
                    <li
                      key={`${s.shower.code}-${s.peak.toISOString()}`}
                      className="flex items-baseline justify-between gap-3 border-b border-border py-2 last:border-0"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-body-sm text-foreground">
                          {s.shower.name}
                        </span>
                        <span className="text-meta text-muted-foreground">
                          {s.peak.toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'long',
                            timeZone: location.timeZone,
                          })}
                          {s.shower.zhr !== null && ` · ZHR ${s.shower.zhr}`}
                          {/* Radyant ufkun altındaysa bu konumdan
                              İZLENEMEZ ve bunu söylemek zorundayız. */}
                          {yukseklik < 10 && ' · radyant alçak'}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 text-meta ${
                          s.moonVerdict === 'temiz'
                            ? 'text-primary'
                            : s.moonVerdict === 'kısmi'
                              ? 'text-cold'
                              : 'text-faint'
                        }`}
                        title={`Zirve gecesi ay %${Math.round(s.moonIllumination * 100)} dolu`}
                      >
                        ay %{Math.round(s.moonIllumination * 100)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-meta leading-snug text-faint">
                Zirve tarihi güneşin ekliptik boylamından hesaplanıyor;
                sabit takvim günü değil, o yüzden her yıl doğru.
              </p>
            </Panel>

            {detail && (
              <Panel
                title={`${detail.date.getDate()} ${MONTH_NAMES[detail.date.getMonth()]}`}
                status={detail.date.toLocaleDateString('tr-TR', { weekday: 'long' })}
              >
                <div className="grid grid-cols-2 gap-2">
                  <Readout
                    label="Aysız karanlık"
                    value={formatDuration(detail.moonlessMinutes)}
                    hint={`puan ${detail.score}/100`}
                  />
                  <Readout
                    label="Ay"
                    value={`%${Math.round(detail.moon.illumination * 100)}`}
                    hint={detail.moon.name.toLocaleLowerCase('tr-TR')}
                    tone="cold"
                  />
                </div>

                <dl className="mt-3 space-y-1.5 text-body-sm">
                  <Row
                    label="Astronomik karanlık"
                    value={
                      detail.night.neverDark
                        ? 'bu gece oluşmuyor'
                        : `${formatClock(detail.night.start, location.timeZone)} – ${formatClock(detail.night.end, location.timeZone)}`
                    }
                  />
                  <Row
                    label="Karanlık süresi"
                    value={formatDuration(detail.night.durationMinutes)}
                  />
                  <Row
                    label="Ay doğuşu"
                    value={
                      detail.moonTimes.alwaysUp
                        ? 'gece boyunca ufkun üstünde'
                        : formatClock(detail.moonTimes.rise, location.timeZone)
                    }
                  />
                  <Row
                    label="Ay batışı"
                    value={
                      detail.moonTimes.alwaysDown
                        ? 'gece boyunca ufkun altında'
                        : formatClock(detail.moonTimes.set, location.timeZone)
                    }
                  />
                </dl>
              </Panel>
            )}
          </div>
        </div>
      </Container>
    </>
  );
}

/**
 * Takvim hücresi.
 *
 * Renk yoğunluğu aysız karanlık süreyle orantılıdır (6 saat = tam yoğunluk).
 * Renk tek başına anlam taşımaz (§6.7): süre hücrenin içinde yazılı ve
 * `aria-label` tam cümleyi okur.
 */
function DayCell({
  entry,
  isToday,
  isSelected,
  onSelect,
}: {
  entry: NightEntry;
  isToday: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const intensity = Math.min(entry.moonlessMinutes / 360, 1);
  const hours = entry.moonlessMinutes / 60;
  const moonPercent = Math.round(entry.moon.illumination * 100);
  const isGood = entry.moonlessMinutes >= 300;
  const isUsable = entry.moonlessMinutes >= 180;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      aria-label={`${entry.date.getDate()} ${MONTH_NAMES[entry.date.getMonth()]}: ${formatDuration(entry.moonlessMinutes)} aysız karanlık, ay %${Math.round(entry.moon.illumination * 100)} aydınlık`}
      className={cn(
        'group relative flex aspect-square flex-col justify-between bg-surface-1 p-2 text-left transition-colors',
        'hover:bg-surface-2 hover:outline hover:outline-1 hover:-outline-offset-1 hover:outline-primary',
        isSelected && 'z-10 outline outline-1 -outline-offset-1 outline-primary'
      )}
      style={{
        backgroundColor: `color-mix(in srgb, var(--color-primary) ${intensity * 18}%, var(--color-surface-1))`,
      }}
    >
      <span className="flex items-start justify-between gap-2">
        <span
          className={cn(
            'tabular text-body-sm leading-none',
            isToday ? 'font-bold text-primary' : 'text-foreground'
          )}
        >
          {entry.date.getDate()}
        </span>
        <span
          aria-hidden
          className="rounded-card border border-border bg-background/55 px-1.5 py-0.5 text-meta leading-none text-muted-foreground"
          title={entry.moon.name}
        >
          {moonGlyph(entry.moon.illumination, entry.moon.waxing)} %{moonPercent}
        </span>
      </span>

      <span>
        <span
          className={cn(
            'block tabular text-readout-sm font-bold leading-tight',
            isGood
              ? 'text-primary'
              : isUsable
                ? 'text-foreground'
                : 'text-muted-foreground'
          )}
        >
          {hours >= 0.1 ? `${hours.toFixed(1)}sa` : '—'}
        </span>
        <span className="label mt-0.5 block text-faint">aysız</span>
      </span>

      <span
        aria-hidden
        className="block h-1.5 overflow-hidden rounded-full bg-background/60"
      >
        <span
          className={cn(
            'block h-full rounded-full',
            isGood ? 'bg-primary' : isUsable ? 'bg-cold' : 'bg-muted-foreground'
          )}
          style={{ width: `${Math.max(6, intensity * 100)}%` }}
        />
      </span>
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border pb-1.5 last:border-0">
      <dt className="label shrink-0">{label}</dt>
      <dd className="tabular text-right text-muted-foreground">{value}</dd>
    </div>
  );
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

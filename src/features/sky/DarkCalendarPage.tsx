import { useMemo, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Readout } from '@/components/ui/Readout';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
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
          { name: 'Araçlar', path: '/araclar' },
          { name: 'Karanlık Takvimi', path: '/araclar/takvim' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Araçlar', to: '/araclar' },
            { label: 'Karanlık Takvimi' },
          ]}
          title="Ay ve Karanlık Takvimi"
          description="Her gece için astronomik karanlık penceresi ve ayın o pencereyi ne kadar paylaştığı. Renk yoğunluğu aysız karanlık süreyi gösterir — koyu hücre iyi gecedir."
          meta={location.label}
        />

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

            <p className="mt-3 px-1 text-meta leading-snug text-faint">
              Aysız karanlık, güneşin −18° altında olduğu ve ayın ufkun altında
              kaldığı sürenin kesişimidir. Hesap {location.label} koordinatına
              göredir; konumu üst çubuktan değiştirebilirsiniz.
            </p>
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

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      aria-label={`${entry.date.getDate()} ${MONTH_NAMES[entry.date.getMonth()]}: ${formatDuration(entry.moonlessMinutes)} aysız karanlık, ay %${Math.round(entry.moon.illumination * 100)} aydınlık`}
      className={cn(
        'relative flex aspect-square flex-col items-center justify-center gap-0.5 bg-surface-1 transition-colors',
        'hover:outline hover:outline-1 hover:-outline-offset-1 hover:outline-primary',
        isSelected && 'outline outline-1 -outline-offset-1 outline-primary'
      )}
      style={{
        backgroundColor: `color-mix(in srgb, var(--color-primary) ${intensity * 22}%, var(--color-surface-1))`,
      }}
    >
      <span
        className={cn(
          'tabular text-meta leading-none',
          isToday ? 'font-bold text-primary' : 'text-foreground'
        )}
      >
        {entry.date.getDate()}
      </span>
      <span
        aria-hidden
        className="text-meta leading-none text-muted-foreground"
        title={entry.moon.name}
      >
        {moonGlyph(entry.moon.illumination, entry.moon.waxing)}
      </span>
      <span className="tabular text-meta leading-none text-faint">
        {hours >= 0.1 ? `${hours.toFixed(1)}sa` : '—'}
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

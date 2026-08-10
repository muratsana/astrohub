import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { eventTypeLabels } from './types';
import type { AstroEvent } from './types';
import {
  buildCalendarMonth,
  leadingBlanks,
  countStarting,
  initialMonth,
  startOfDay,
} from './calendar';
import { formatEventDateRange } from './eventDates';
import { cn } from '@/lib/cn';

/**
 * ETKİNLİK TAKVİM GÖRÜNÜMÜ (§19.3).
 *
 * Liste görünümü "sırada ne var" sorusuna, takvim "şu hafta sonu boş muyum"
 * sorusuna cevap verir. İkisi aynı veriyi gösterir; kart listesindeki
 * filtreler takvime de uygulanır — takvim ayrı bir sayfa değil, aynı
 * sonucun ikinci okuması.
 *
 * TASARIM: hücre yüksekliği sabit değil. Sabit yükseklik, üç etkinliğin
 * olduğu günü kırpar ya da tüm satırı boş yere uzatır. Hücre içeriğine
 * göre büyür, ızgara satırı en yüksek hücreye hizalanır.
 *
 * Çok günlü etkinlikler (kamplar) **her gününde** görünür: 12–14 Ağustos
 * kampını yalnızca 12'sinde göstermek, 13'ünde plan yapan kullanıcıyı
 * yanıltır. Devam eden günler soluk çizgiyle işaretlenir.
 */

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

export function EventCalendar({ events }: { events: AstroEvent[] }) {
  /*
   * Başlangıç ayı: bugünün ayı değil, **ilk etkinliğin ayı.** Filtre sonucu
   * yalnızca ekim ayına düşmüşse kullanıcıyı boş bir temmuz takvimine
   * bakarken bırakmak, filtrenin çalışmadığı izlenimi veriyor.
   */
  const initial = useMemo(() => initialMonth(events), [events]);

  const [cursor, setCursor] = useState(initial);
  const [monthKey, setMonthKey] = useState(initial.getTime());

  // Filtre değişip ilk etkinlik başka aya kaydıysa takvimi oraya taşı.
  if (initial.getTime() !== monthKey) {
    setMonthKey(initial.getTime());
    setCursor(initial);
  }

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const days = useMemo(
    () => buildCalendarMonth(year, month, events),
    [year, month, events]
  );
  const today = startOfDay(new Date());

  const monthCount = countStarting(days);

  return (
    <div className="rounded-card border border-border bg-surface-1">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            aria-label="Önceki ay"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
          >
            ←
          </Button>
          <span className="tabular min-w-[10ch] text-center text-caption text-foreground">
            {MONTH_NAMES[month]} {year}
          </span>
          <Button
            size="sm"
            variant="ghost"
            aria-label="Sonraki ay"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
          >
            →
          </Button>
        </div>
        <span className="tabular label" role="status">
          {monthCount} etkinlik başlıyor
        </span>
      </header>

      <div className="p-2 sm:p-3">
        <div className="grid grid-cols-7 gap-px">
          {WEEKDAYS.map((day) => (
            <div key={day} className="label pb-1 text-center">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-border">
          {Array.from({ length: leadingBlanks(new Date(year, month, 1)) }, (_, i) => (
            <div key={`blank-${i}`} className="min-h-[64px] bg-surface-1" />
          ))}

          {days.map((day) => {
            const isToday = day.date.getTime() === today.getTime();
            const isWeekend = [0, 6].includes(day.date.getDay());

            return (
              <div
                key={day.date.toISOString()}
                className={cn(
                  'min-h-[64px] p-1',
                  isWeekend ? 'bg-surface-2/60' : 'bg-surface-1'
                )}
              >
                <span
                  className={cn(
                    'tabular block px-0.5 text-meta leading-none',
                    isToday ? 'font-bold text-primary' : 'text-muted-foreground'
                  )}
                >
                  {day.date.getDate()}
                </span>

                <ul className="mt-1 space-y-0.5">
                  {day.items.map(({ event, continuing }) => (
                    <li key={event.slug}>
                      <Link
                        to={`/etkinlik/${event.slug}`}
                        title={`${event.title} — ${event.city}`}
                        className={cn(
                          'block truncate rounded-card px-1 py-0.5 text-meta leading-tight transition-colors',
                          continuing
                            ? 'border-l-2 border-cold/60 bg-surface-2 text-muted-foreground'
                            : 'bg-primary/12 text-primary hover:bg-primary/20'
                        )}
                      >
                        {continuing ? '↳ ' : ''}
                        {event.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {monthCount === 0 && (
          <p className="mt-3 text-center text-body-sm text-muted-foreground">
            Bu ayda etkinlik yok. Oklarla diğer aylara geçebilirsiniz.
          </p>
        )}
      </div>

      {/* Ayın etkinlik künyeleri — takvim hücresine sığmayan ayrıntı burada */}
      {monthCount > 0 && (
        <ul className="border-t border-border">
          {days
            .flatMap((day) => day.items.filter((i) => !i.continuing))
            .map(({ event }) => (
              <li key={event.slug} className="border-b border-border last:border-0">
                <Link
                  to={`/etkinlik/${event.slug}`}
                  className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-3 py-2 transition-colors hover:bg-surface-2"
                >
                  <span className="tabular shrink-0 text-meta text-primary">
                    {formatEventDateRange(event.startsAt, event.endsAt)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-caption text-foreground">
                    {event.title}
                  </span>
                  <span className="shrink-0 text-meta text-muted-foreground">
                    {event.city}
                  </span>
                  <Badge>{eventTypeLabels[event.type]}</Badge>
                </Link>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

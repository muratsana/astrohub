import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { useEventCatalog } from '@/services/content/events';
import { eventTypeLabels, type AstroEvent } from '@/features/events/types';

/**
 * YAKLAŞAN ETKİNLİKLER.
 *
 * Tablo görünümünden ajanda satırına geçildi. Tablo, etkinliğin adını
 * diğer hücrelerle aynı ağırlıkta gösteriyordu: beş sütunun ortasında,
 * gövde rengiyle. Oysa satırın taşıdığı asıl bilgi ad ve tarih; şehir,
 * tür ve nitelik onu **niteleyen** ikinci sıra veri. Yeni düzen bu
 * hiyerarşiyi ölçü ve renkle kuruyor — ad tam kontrastta ve daha büyük,
 * gerisi kısılmış.
 *
 * Tarih solda kendi bloğunda: gün büyük, ay küçük. Ajandada göz önce
 * "ne zaman"a bakar, sonra "ne"ye; okuma sırası düzenle aynı olmalı.
 */
export function UpcomingEvents() {
  const catalog = useEventCatalog();
  const upcoming = [...catalog.items]
    .sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    )
    .slice(0, 5);

  return (
    <Container className="py-9 sm:py-11">
      <SectionHeader
        title="Yaklaşan Etkinlikler"
        meta={`${catalog.items.length} kayıt`}
        description="Gözlem şenlikleri, kamplar, halk gözlemleri ve atölyeler — her kayıt kaynağı ve son doğrulama tarihiyle birlikte."
        linkTo="/etkinlikler"
        linkLabel="Takvim"
      />

      {upcoming.length === 0 ? (
        <p className="rounded-card border border-border bg-surface-1 px-3 py-6 text-center text-[12px] text-muted-foreground">
          Yaklaşan etkinlik yok.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-card border border-border bg-surface-1">
          {upcoming.map((event) => (
            <li key={event.slug} className="border-b border-border last:border-0">
              <EventRow event={event} />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

function EventRow({ event }: { event: AstroEvent }) {
  const date = new Date(event.startsAt);

  return (
    <Link
      to={`/etkinlik/${event.slug}`}
      className="group flex items-center gap-3 px-3 py-3 transition-colors hover:bg-surface-2 sm:gap-4 sm:px-4"
    >
      {/* Tarih bloğu — sabit genişlik, satırlar arası dikey hizayı tutar. */}
      <span className="tabular flex w-11 shrink-0 flex-col items-center leading-none">
        <span className="font-display text-[19px] font-bold text-foreground">
          {date.toLocaleDateString('tr-TR', { day: '2-digit' })}
        </span>
        <span className="mt-1 text-[10px] text-muted-foreground">
          {date.toLocaleDateString('tr-TR', { month: 'short' })}
        </span>
      </span>

      <span aria-hidden className="h-9 w-px shrink-0 bg-border" />

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-medium leading-snug text-foreground transition-colors group-hover:text-primary">
          {event.title}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
          {eventTypeLabels[event.type]}
          <span aria-hidden className="px-1.5 text-faint">
            ·
          </span>
          <span className="text-cold">{event.city}</span>
          {event.venue && (
            <>
              <span aria-hidden className="px-1.5 text-faint">
                ·
              </span>
              {event.venue}
            </>
          )}
        </span>
      </span>

      <span className="hidden shrink-0 items-center gap-1 sm:flex">
        <Badge tone={event.free ? 'success' : 'muted'}>
          {event.free ? 'Ücretsiz' : 'Ücretli'}
        </Badge>
        {event.camping && <Badge tone="cold">Kamp</Badge>}
      </span>
    </Link>
  );
}

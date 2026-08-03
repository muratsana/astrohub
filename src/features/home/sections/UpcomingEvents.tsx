import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { CalendarIcon } from '@/components/ui/icons';
import { useEventCatalog } from '@/services/content/events';
import { eventTypeLabels, type AstroEvent } from '@/features/events/types';
import { cn } from '@/lib/cn';

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
/** Sayı ve başlık `home_modules`tan gelir; verilmezse bugünkü davranış. */
type HomeSectionLayout = 'grid' | 'list';

export function UpcomingEvents({
  limit = 5,
  layout = 'list',
  subtitle = 'Gözlem şenlikleri, kamplar ve atölyeler.',
  title = 'Yaklaşan Etkinlikler',
}: {
  limit?: number;
  layout?: HomeSectionLayout;
  subtitle?: string;
  title?: string;
} = {}) {
  const catalog = useEventCatalog();
  const upcoming = [...catalog.items]
    .sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    )
    .slice(0, limit);

  return (
    <Container className="py-9 sm:py-11">
      <SectionHeader
        title={title}
        meta={`${catalog.items.length} kayıt`}
        description={subtitle}
        linkTo="/etkinlikler"
        linkLabel="Takvim"
      />

      {upcoming.length === 0 ? (
        <p className="rounded-card border border-border bg-surface-1 px-3 py-6 text-center text-meta text-muted-foreground">
          Yaklaşan etkinlik yok.
        </p>
      ) : (
        <ul
          className={cn(
            layout === 'grid'
              ? 'grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3'
              : 'overflow-hidden rounded-card border border-border bg-surface-1'
          )}
        >
          {upcoming.map((event) => (
            <li
              key={event.slug}
              className={layout === 'list' ? 'border-b border-border last:border-0' : undefined}
            >
              <EventRow event={event} layout={layout} />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

function EventRow({
  event,
  layout,
}: {
  event: AstroEvent;
  layout: HomeSectionLayout;
}) {
  const date = new Date(event.startsAt);
  const grid = layout === 'grid';

  return (
    <Link
      to={`/etkinlik/${event.slug}`}
      className={cn(
        'group flex gap-3 transition-colors hover:bg-surface-2',
        grid
          ? 'h-full flex-col rounded-card border border-border bg-surface-1 p-3'
          : 'items-center px-3 py-3 sm:gap-4 sm:px-4'
      )}
    >
      {/* Tarih bloğu — sabit genişlik, satırlar arası dikey hizayı tutar. */}
      <span className="relative flex h-12 w-12 shrink-0 flex-col items-center justify-center overflow-hidden rounded-card border border-border-strong bg-background leading-none ring-1 ring-white/10">
        <span aria-hidden className="absolute inset-0 bg-gradient-to-b from-surface-3 to-surface-1" />
        <span aria-hidden className="absolute inset-x-1 top-1 h-1 rounded-full bg-primary" />
        <CalendarIcon
          aria-hidden
          className="absolute inset-0 m-auto h-9 w-9 text-foreground/18"
        />
        <span className="relative font-display type-panel font-bold text-foreground">
          {date.toLocaleDateString('tr-TR', { day: '2-digit' })}
        </span>
        <span className="relative mt-1 text-meta font-medium text-muted-foreground">
          {date.toLocaleDateString('tr-TR', { month: 'short' })}
        </span>
      </span>

      {!grid && <span aria-hidden className="h-9 w-px shrink-0 bg-border" />}

      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-sm font-medium leading-snug text-foreground transition-colors group-hover:text-primary">
          {event.title}
        </span>
        <span className="mt-0.5 block truncate text-meta text-muted-foreground">
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

      <span className={cn('shrink-0 items-center gap-1', grid ? 'flex' : 'hidden sm:flex')}>
        <Badge tone={event.free ? 'success' : 'muted'}>
          {event.free ? 'Ücretsiz' : 'Ücretli'}
        </Badge>
        {event.camping && <Badge tone="cold">Kamp</Badge>}
      </span>
    </Link>
  );
}

import { useUpNavigation } from '@/app/useUpNavigation';
import { adminEditPath } from '@/components/admin/adminEditPath';
import { useParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { Button, ExternalButtonLink } from '@/components/ui/Button';
import { EventInterest } from './EventInterest';
import { EventChanges } from './EventChanges';
import { PhotoPlaceholder } from '@/components/media/PhotoPlaceholder';
import { RemoteImage } from '@/components/media/RemoteImage';
import { PlaceholderPage } from '@/components/PlaceholderPage';
import { useEventCatalog } from '@/services/content/events';
import { eventTypeLabels } from './types';
import { capacityLabel } from './filtering';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd, eventJsonLd } from '@/lib/seo';
import { AdminEditLink } from '@/components/admin/AdminEditLink';
import { ExternalLink } from '@/components/ExternalLink';
import { formatEventLongDateRange, formatEventTime } from './eventDates';

/**
 * Etkinlik detay sayfası (§7.6): kapak, temel bilgi, program zaman çizelgesi,
 * gözlemlenecek hedefler, kurallar ve kaynak/son doğrulama şeffaflığı (§8.4).
 * Katılım kaydı Supabase bağlanınca aktifleşir.
 */
export function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  /* Geri dönüş: geldiği yer varsa oraya, yoksa üst rotaya (FAZ 11). */
  const { geriDon } = useUpNavigation();
  const catalog = useEventCatalog();
  const event = slug
    ? catalog.items.find((item) => item.slug === slug)
    : undefined;

  if (!event) {
    return (
      <PlaceholderPage
        title="Etkinlik bulunamadı"
        description="Bu etkinlik yayından kaldırılmış ya da bağlantı hatalı olabilir."
      />
    );
  }

  const dateLabel = formatEventLongDateRange(event.startsAt, event.endsAt);
  const timeLabel = formatEventTime(event.startsAt);
  const capacity = capacityLabel(event);

  return (
    <>
      <PageMeta
        title={`${event.title} — ${event.city}`}
        description={`${dateLabel} · ${event.venue}, ${event.city}. ${event.description.slice(0, 140)}`}
        jsonLd={[
          eventJsonLd({
            title: event.title,
            path: `/etkinlik/${event.slug}`,
            description: event.description,
            startsAt: event.startsAt,
            endsAt: event.endsAt,
            venue: event.venue,
            city: event.city,
            free: event.free,
            organizer: event.organizer.name,
          }),
          breadcrumbJsonLd([
            { name: 'Ana Sayfa', path: '/' },
            { name: 'Etkinlikler', path: '/etkinlikler' },
            { name: event.title, path: `/etkinlik/${event.slug}` },
          ]),
        ]}
      />
      <Container className="py-8 sm:py-10">
        <div className="relative aspect-[3/1] w-full overflow-hidden rounded-card border border-border bg-surface-2">
          {event.image ? (
            <RemoteImage
              src={event.image.url}
              alt={event.title}
              seed={event.slug}
              tint={event.gradient}
              sizes="(min-width: 1024px) 1120px, 100vw"
              priority
            />
          ) : (
            <PhotoPlaceholder
              gradient={event.gradient}
              alt={event.title}
              className="h-full w-full"
              rounded="rounded-none"
            />
          )}
          {event.image && (
            <span className="absolute inset-x-0 bottom-0 bg-background/80 px-3 py-1.5 text-[0.68rem] text-muted-foreground backdrop-blur-sm">
              Görsel: {event.image.credit} · {event.image.licence}
            </span>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-8 lg:flex-row">
          {/* Sol: içerik */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex flex-wrap items-center gap-2">
                <Badge tone="primary">{eventTypeLabels[event.type]}</Badge>
                <Badge tone={event.free ? 'success' : 'muted'}>
                  {event.free ? 'Ücretsiz' : 'Ücretli'}
                </Badge>
                {event.camping && <Badge tone="cold">Kamp yapılabilir</Badge>}
                {event.kidsFriendly && <Badge>Çocuklara uygun</Badge>}
                {event.telescopesProvided && <Badge>Teleskop sağlanıyor</Badge>}
                {event.astrophotoFocused && (
                  <Badge tone="cold">Astrofoto odaklı</Badge>
                )}
              </span>
              <AdminEditLink to={adminEditPath('event', event.slug)} />
            </div>

            <h1 className="mt-3 type-page text-foreground">{event.title}</h1>
            <p className="tabular mt-2 text-sm text-muted-foreground">
              {dateLabel} · {timeLabel} · {event.venue}, {event.city}
            </p>

            <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
              {event.description}
            </p>

            {/* Program (§7.6 zaman çizelgesi) */}
            <section className="mt-8">
              <h2 className="type-section mb-3 font-semibold text-foreground">
                Program
              </h2>
              <ol className="space-y-0 border-l border-border">
                {event.program.map((s) => (
                  <li
                    key={`${s.time}-${s.title}`}
                    className="relative pb-4 pl-5 last:pb-0"
                  >
                    <span
                      aria-hidden
                      className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary"
                    />
                    <p className="tabular text-xs font-medium text-primary">
                      {s.time}
                    </p>
                    <p className="text-sm text-foreground">
                      {s.title}
                      {s.speaker && (
                        <span className="text-muted-foreground">
                          {' '}
                          — {s.speaker}
                        </span>
                      )}
                    </p>
                  </li>
                ))}
              </ol>
            </section>

            {event.observedTargets.length > 0 && (
              <section className="mt-8">
                <h2 className="type-section mb-3 font-semibold text-foreground">
                  Gözlemlenecek Hedefler
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {event.observedTargets.map((t) => (
                    <Badge key={t}>{t}</Badge>
                  ))}
                </div>
              </section>
            )}

            {event.rules && event.rules.length > 0 && (
              <section className="mt-8">
                <h2 className="type-section mb-3 font-semibold text-foreground">
                  Katılımcı Kuralları
                </h2>
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                  {event.rules.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </section>
            )}

            <EventChanges eventId={event.id} />
          </div>

          {/* Sağ: aksiyon paneli */}
          <aside className="w-full shrink-0 lg:w-80">
            <div className="rounded-card border border-border bg-surface-1 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  {event.organizer.name}
                </p>
                {event.organizer.verified && (
                  <Badge tone="cold">Doğrulanmış</Badge>
                )}
              </div>

              {capacity && (
                <p className="tabular mt-3 text-sm text-muted-foreground">
                  {capacity}
                </p>
              )}

              {event.contact && (
                <ExternalButtonLink
                  href={event.contact.url}
                  className="mt-4 w-full"
                >
                  {event.contact.label}
                </ExternalButtonLink>
              )}

              {/* Buradaki devre dışı "Katıl (üyelik gerektirir)" düğmesi
                  kaldırıldı: hesap sistemi çalışıyor ve gerçek katılım
                  kontrolü aşağıda. Basılamayan bir düğme, altındaki
                  çalışan kontrolü de şüpheli gösteriyordu. */}
              <hr className="my-4 border-border" />

              {/* Kaynak şeffaflığı (§8.4) */}
              <dl className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex justify-between gap-2">
                  <dt>Kaynak</dt>
                  <dd className="text-right text-foreground">
                    <ExternalLink href={event.source.url} showHost>
                      {event.source.name}
                    </ExternalLink>
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Son doğrulama</dt>
                  <dd className="tabular text-right text-foreground">
                    {new Date(event.source.lastVerifiedAt).toLocaleDateString(
                      'tr-TR'
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            <EventInterest event={event} />

            <Button
              variant="secondary"
              className="mt-4 w-full"
              onClick={geriDon}
            >
              ← Tüm etkinlikler
            </Button>
          </aside>
        </div>
      </Container>
    </>
  );
}

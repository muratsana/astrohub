import { useParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EventRegistration } from './EventRegistration';
import { PhotoPlaceholder } from '@/components/media/PhotoPlaceholder';
import { PlaceholderPage } from '@/components/PlaceholderPage';
import { useEventCatalog } from '@/services/content/events';
import { eventTypeLabels } from './types';
import { capacityLabel } from './filtering';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd, eventJsonLd } from '@/lib/seo';

/**
 * Etkinlik detay sayfası (§7.6): kapak, temel bilgi, program zaman çizelgesi,
 * gözlemlenecek hedefler, kurallar ve kaynak/son doğrulama şeffaflığı (§8.4).
 * Katılım kaydı Supabase bağlanınca aktifleşir.
 */
export function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>();
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

  const starts = new Date(event.startsAt);
  const dateLabel = starts.toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeLabel = starts.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
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
        <PhotoPlaceholder
          gradient={event.gradient}
          alt={event.title}
          className="aspect-[3/1] w-full border border-border"
        />

        <div className="mt-6 flex flex-col gap-8 lg:flex-row">
          {/* Sol: içerik */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
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
            </div>

            <h1 className="mt-3 text-[26px] text-foreground sm:text-[30px]">
              {event.title}
            </h1>
            <p className="tabular mt-2 text-sm text-muted-foreground">
              {dateLabel} · {timeLabel} · {event.venue}, {event.city}
            </p>

            <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
              {event.description}
            </p>

            {/* Program (§7.6 zaman çizelgesi) */}
            <section className="mt-8">
              <h2 className="mb-3 text-lg font-semibold text-foreground">
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
                <h2 className="mb-3 text-lg font-semibold text-foreground">
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
                <h2 className="mb-3 text-lg font-semibold text-foreground">
                  Katılımcı Kuralları
                </h2>
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                  {event.rules.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </section>
            )}
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

              <Button className="mt-4 w-full" size="lg" disabled>
                Katıl (üyelik gerektirir)
              </Button>
              <p className="mt-2 text-center text-xs text-muted-foreground/70">
                Katılım kaydı hesap sistemi devreye alınınca açılacak.
              </p>

              <hr className="my-4 border-border" />

              {/* Kaynak şeffaflığı (§8.4) */}
              <dl className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex justify-between gap-2">
                  <dt>Kaynak</dt>
                  <dd className="text-right text-foreground">
                    {event.source.name}
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

            <EventRegistration event={event} />

            <ButtonLink
              to="/etkinlikler"
              variant="secondary"
              className="mt-4 w-full"
            >
              ← Tüm etkinlikler
            </ButtonLink>
          </aside>
        </div>
      </Container>
    </>
  );
}

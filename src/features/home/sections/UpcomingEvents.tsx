import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PhotoPlaceholder } from '@/components/media/PhotoPlaceholder';
import { CalendarIcon } from '@/components/ui/icons';
import { upcomingEvents } from '../data';

/**
 * Yaklaşan astronomi etkinlikleri (§7.1). Etkinlikler ana sayfada öne alınır.
 * Kartta: tarih, ad, şehir, tür, ücretsiz/ücretli ve kamp etiketleri.
 */
export function UpcomingEvents() {
  return (
    <section className="pt-16 sm:pt-20">
      <Container>
        <SectionHeader
          title="Yaklaşan Etkinlikler"
          description="Türkiye'deki astronomi etkinlikleri"
          icon={<CalendarIcon className="h-5 w-5" />}
          linkTo="/etkinlikler"
          linkLabel="Tüm Etkinlikler"
        />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {upcomingEvents.map((event) => (
            <li key={event.id}>
              <Link
                to={`/etkinlik/${event.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface-1 transition-colors hover:border-white/20"
              >
                <PhotoPlaceholder
                  gradient={event.gradient}
                  alt={event.title}
                  rounded="rounded-none"
                  className="aspect-[16/9] w-full"
                />
                <div className="flex flex-1 flex-col p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="tabular font-medium text-primary">
                      {event.date}
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{event.city}</span>
                  </div>
                  <h3 className="text-sm font-semibold leading-snug text-foreground">
                    {event.title}
                  </h3>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                    <Badge>{event.type}</Badge>
                    <Badge tone={event.free ? 'success' : 'primary'}>
                      {event.free ? 'Ücretsiz' : 'Ücretli'}
                    </Badge>
                    {event.camping && <Badge tone="teal">Kamp</Badge>}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

function Badge({
  children,
  tone = 'muted',
}: {
  children: React.ReactNode;
  tone?: 'muted' | 'primary' | 'success' | 'teal';
}) {
  const tones = {
    muted: 'border-border text-muted-foreground',
    primary: 'border-primary/30 text-primary',
    success: 'border-success/30 text-success',
    teal: 'border-accent-teal/30 text-accent-teal',
  } as const;
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

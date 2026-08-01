import { useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel, SpecList, SpecRow } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { NotFoundPage } from '@/components/NotFoundPage';
import { ExternalLink } from '@/components/ExternalLink';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd, absoluteUrl } from '@/lib/seo';
import { events } from '@/features/events/data';
import { eventTypeLabels } from '@/features/events/types';
import { getClubBySlug, clubKindLabels } from './data';

/**
 * TOPLULUK PROFİLİ (§8.11).
 *
 * Profilin omurgası **etkinlik geçmişi ve takvimi**: bir topluluğu tanımak,
 * ne yaptığını görmekle olur. Etkinlikler organizatör adıyla eşleştirilir;
 * hesap sistemi gelince bu eşleşme kimliğe (FK) bağlanacak, arayüz aynı
 * kalacak.
 *
 * Organization yapılandırılmış verisi basılır — arama motorunda kurum
 * kartı çıkması, bir derneği aramanın en yaygın yolu olan "şehir + dernek"
 * sorgusunda görünürlük sağlar.
 */
export function ClubDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const club = slug ? getClubBySlug(slug) : undefined;

  const clubEvents = useMemo(() => {
    if (!club?.organizerName) return { upcoming: [], past: [] };
    const now = Date.now();
    const mine = events
      .filter((e) => e.organizer.name === club.organizerName)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

    return {
      upcoming: mine.filter((e) => new Date(e.startsAt).getTime() >= now),
      past: mine.filter((e) => new Date(e.startsAt).getTime() < now).reverse(),
    };
  }, [club]);

  if (!club) return <NotFoundPage />;

  const organizationJson = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: club.name,
    description: club.summary,
    url: absoluteUrl(`/topluluk/${club.slug}`),
    ...(club.foundedYear ? { foundingDate: String(club.foundedYear) } : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: club.city,
      addressCountry: 'TR',
    },
  };

  return (
    <>
      <PageMeta
        title={club.name}
        description={club.summary}
        jsonLd={[
          organizationJson,
          breadcrumbJsonLd([
            { name: 'Ana Sayfa', path: '/' },
            { name: 'Topluluklar', path: '/topluluklar' },
            { name: club.name, path: `/topluluk/${club.slug}` },
          ]),
        ]}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Topluluklar', to: '/topluluklar' },
            { label: club.name },
          ]}
          title={club.name}
          meta={club.city}
          description={club.summary}
          actions={
            <>
              <Badge tone="primary">{clubKindLabels[club.kind]}</Badge>
              {club.publicEvents && <Badge tone="success">Halka açık</Badge>}
              {club.sharedEquipment && <Badge tone="cold">Ortak ekipman</Badge>}
            </>
          }
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-4">
            <Panel
              title="Yaklaşan etkinlikler"
              status={`${clubEvents.upcoming.length} kayıt`}
            >
              {clubEvents.upcoming.length === 0 ? (
                <p className="py-3 text-meta leading-relaxed text-muted-foreground">
                  Bu topluluğun takvimde duyurulmuş yaklaşan etkinliği yok.
                  Geçmiş etkinlikleri aşağıda görebilirsiniz.
                </p>
              ) : (
                <ul>
                  {clubEvents.upcoming.map((event) => (
                    <li key={event.slug} className="border-b border-border last:border-0">
                      <Link
                        to={`/etkinlik/${event.slug}`}
                        className="group flex items-baseline justify-between gap-3 py-2.5"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-caption text-foreground group-hover:text-primary">
                            {event.title}
                          </span>
                          <span className="tabular mt-0.5 block text-meta text-muted-foreground">
                            {new Date(event.startsAt).toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}{' '}
                            · {event.venue}
                          </span>
                        </span>
                        <Badge>{eventTypeLabels[event.type]}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {clubEvents.past.length > 0 && (
              <Panel title="Geçmiş etkinlikler" status={`${clubEvents.past.length}`}>
                <ul>
                  {clubEvents.past.map((event) => (
                    <li key={event.slug} className="border-b border-border last:border-0">
                      <Link
                        to={`/etkinlik/${event.slug}`}
                        className="flex items-baseline justify-between gap-3 py-2 text-muted-foreground transition-colors hover:text-primary"
                      >
                        <span className="min-w-0 truncate text-meta">
                          {event.title}
                        </span>
                        <span className="tabular shrink-0 text-meta">
                          {new Date(event.startsAt).toLocaleDateString('tr-TR')}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>

          <div className="space-y-4">
            <Panel title="Künye">
              <SpecList>
                <SpecRow label="Tür" value={clubKindLabels[club.kind]} />
                <SpecRow label="Şehir" value={club.city} />
                <SpecRow
                  label="Kuruluş"
                  value={club.foundedYear ? String(club.foundedYear) : '—'}
                  tone="muted"
                />
                <SpecRow
                  label="Üye sayısı"
                  value={club.memberCount ? String(club.memberCount) : 'bildirilmemiş'}
                  tone="muted"
                />
                <SpecRow
                  label="Halka açık etkinlik"
                  value={club.publicEvents ? 'Evet' : 'Hayır'}
                  tone={club.publicEvents ? 'primary' : 'muted'}
                />
                <SpecRow
                  label="Ortak ekipman"
                  value={club.sharedEquipment ? 'Var' : 'Yok'}
                  tone="cold"
                />
                {club.website && (
                  <SpecRow
                    label="Web"
                    value={
                      <ExternalLink href={club.website} showHost>
                        Site
                      </ExternalLink>
                    }
                  />
                )}
              </SpecList>
            </Panel>

            <Panel title="Düzenli faaliyetler">
              <ul className="space-y-2">
                {club.activities.map((activity) => (
                  <li
                    key={activity}
                    className="flex gap-2 text-meta leading-relaxed text-muted-foreground"
                  >
                    <span aria-hidden className="text-primary">
                      ·
                    </span>
                    {activity}
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Kaynak" status={club.source.lastVerifiedAt}>
              <p className="text-body-sm leading-relaxed text-muted-foreground">
                Bu profil <span className="text-foreground">{club.source.name}</span>{' '}
                üzerinden derlendi; son doğrulama{' '}
                {new Date(club.source.lastVerifiedAt).toLocaleDateString('tr-TR')}.
                Bilgiler değişmiş olabilir — katılmadan önce topluluğun kendi
                duyurusunu kontrol edin.
              </p>
              <div className="mt-3">
                <ButtonLink to="/etkinlikler" size="sm" variant="secondary">
                  Tüm Etkinlikler
                </ButtonLink>
              </div>
            </Panel>
          </div>
        </div>
      </Container>
    </>
  );
}

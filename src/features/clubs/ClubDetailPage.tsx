import { useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel, SpecList, SpecRow } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { NotFoundPage } from '@/components/NotFoundPage';
import { ExternalLink } from '@/components/ExternalLink';
import { RemoteImage } from '@/components/media/RemoteImage';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd, absoluteUrl } from '@/lib/seo';
import { events } from '@/features/events/data';
import { eventTypeLabels } from '@/features/events/types';
import { clubKindLabels, clubTopicLabels } from './data';
import { useClub } from './clubsSource';
import { cityPathForName } from '@/features/city/routes';

/**
 * TOPLULUK PROFİLİ (§8.11, §14.7).
 *
 * Profilin omurgası **etkinlik geçmişi ve takvimi**: bir topluluğu tanımak,
 * ne yaptığını görmekle olur. Etkinlikler organizatör adıyla eşleştirilir;
 * hesap sistemi gelince bu eşleşme kimliğe (FK) bağlanacak, arayüz aynı
 * kalacak.
 *
 * Organization yapılandırılmış verisi basılır — arama motorunda kurum
 * kartı çıkması, bir derneği aramanın en yaygın yolu olan "şehir + dernek"
 * sorgusunda görünürlük sağlar.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SAYFADA İKİ AYRI "DOĞRULAMA" VAR VE AYRI ANLATILIYOR
 *
 *   Rozet (`verifiedAt`)  → KULÜBÜN KENDİSİ teyit edildi: yöneticiyle
 *                           iletişim kuruldu, kulübün gerçek ve aktif
 *                           olduğu doğrulandı.
 *   Künye (`source`)      → BİLGİNİN tazeliği: bu satırlar en son ne
 *                           zaman kontrol edildi.
 *
 * Tek satırda birleştirmek, "doğrulanmış ama bilgisi iki yıl eski" bir
 * kulübü "bilgisi taze ama kim olduğu belirsiz" bir kulüple aynı
 * gösterirdi.
 */
export function ClubDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { club, loading } = useClub(slug);

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

  /* Veri gelmeden 404 basmıyoruz: ilk kare koddaki yedekle çiziliyor ve
     orada olmayan bir kulüp veritabanında olabilir. */
  if (!club) return loading ? null : <NotFoundPage />;

  const sehirYolu = cityPathForName(club.city);

  const organizationJson = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: club.name,
    description: club.summary,
    url: absoluteUrl(`/topluluk/${club.slug}`),
    ...(club.foundedOn
      ? { foundingDate: club.foundedOn }
      : club.foundedYear
        ? { foundingDate: String(club.foundedYear) }
        : {}),
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
              {club.verifiedAt && <Badge tone="success">Doğrulanmış</Badge>}
              {club.topics?.map((topic) => (
                <Badge key={topic} tone="cold">
                  {clubTopicLabels[topic]}
                </Badge>
              ))}
              {club.publicEvents && <Badge>Halka açık</Badge>}
              {club.sharedEquipment && <Badge tone="cold">Ortak ekipman</Badge>}
            </>
          }
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-4">
            {club.photos && club.photos.length > 0 && (
              <Panel title="Fotoğraflar" status={`${club.photos.length}`}>
                <div className="grid gap-2 sm:grid-cols-3">
                  {club.photos.map((photo, index) => (
                    <div
                      key={photo.url}
                      className="aspect-[4/3] overflow-hidden rounded-card border border-border bg-surface-2"
                    >
                      <RemoteImage
                        src={photo.url}
                        alt={photo.alt}
                        seed={`${club.slug}-${index}`}
                        sizes="(min-width: 1024px) 260px, 100vw"
                      />
                    </div>
                  ))}
                </div>
              </Panel>
            )}

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
                    <li
                      key={event.slug}
                      className="border-b border-border last:border-0"
                    >
                      <Link
                        to={`/etkinlik/${event.slug}`}
                        className="group flex items-baseline justify-between gap-3 py-2.5"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-caption text-foreground group-hover:text-primary">
                            {event.title}
                          </span>
                          <span className="tabular mt-0.5 block text-meta text-muted-foreground">
                            {new Date(event.startsAt).toLocaleDateString(
                              'tr-TR',
                              {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              }
                            )}{' '}
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
              <Panel
                title="Geçmiş etkinlikler"
                status={`${clubEvents.past.length}`}
              >
                <ul>
                  {clubEvents.past.map((event) => (
                    <li
                      key={event.slug}
                      className="border-b border-border last:border-0"
                    >
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
                  value={
                    club.foundedOn
                      ? new Date(club.foundedOn).toLocaleDateString('tr-TR')
                      : club.foundedYear
                        ? String(club.foundedYear)
                        : '—'
                  }
                  tone="muted"
                />
                <SpecRow
                  label="Yer"
                  value={club.place ?? club.city}
                  tone="muted"
                />
                <SpecRow
                  label="Üye sayısı"
                  value={
                    club.memberCount
                      ? String(club.memberCount)
                      : 'bildirilmemiş'
                  }
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
                {club.socialUrl && (
                  <SpecRow
                    label="Sosyal"
                    value={
                      <ExternalLink href={club.socialUrl} showHost>
                        Sayfa
                      </ExternalLink>
                    }
                  />
                )}
                {/* İLETİŞİM VE KATILIM (§14.7). Satırlar ancak veri
                    varsa çiziliyor: boş bir "İletişim: —" satırı,
                    ziyaretçiye çalışmayan bir yol göstermek olurdu. */}
                {club.contactEmail && (
                  <SpecRow
                    label="İletişim"
                    value={
                      <a
                        href={`mailto:${club.contactEmail}`}
                        className="text-primary hover:underline"
                      >
                        {club.contactEmail}
                      </a>
                    }
                  />
                )}
                {club.joinUrl && (
                  <SpecRow
                    label="Üyelik"
                    value={
                      <ExternalLink href={club.joinUrl} showHost>
                        Katılım formu
                      </ExternalLink>
                    }
                  />
                )}
                {club.whatsappUrl && (
                  <SpecRow
                    label="WhatsApp"
                    value={
                      <ExternalLink href={club.whatsappUrl} showHost>
                        Grup bağlantısı
                      </ExternalLink>
                    }
                  />
                )}
              </SpecList>

              {sehirYolu && (
                <div className="mt-3">
                  <ButtonLink to={sehirYolu} size="sm" variant="ghost">
                    {club.city} sayfası
                  </ButtonLink>
                </div>
              )}
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

            <Panel
              title="Kaynak ve doğrulama"
              status={club.verifiedAt ? 'doğrulanmış' : 'doğrulanmamış'}
            >
              <p className="text-body-sm leading-relaxed text-muted-foreground">
                {club.verifiedAt ? (
                  <>
                    Bu kulüp{' '}
                    <span className="text-foreground">
                      {new Date(club.verifiedAt).toLocaleDateString('tr-TR')}
                    </span>{' '}
                    tarihinde{' '}
                    <span className="text-foreground">doğrulandı</span>: kulüp
                    yöneticisiyle iletişim kuruldu ve kaydın gerçek bir
                    topluluğa ait olduğu teyit edildi.
                  </>
                ) : (
                  <>
                    Bu kayıt{' '}
                    <span className="text-foreground">doğrulanmadı</span>: kulüp
                    yöneticisiyle henüz iletişim kurulmadı. Kaydın yanlış olduğu
                    anlamına gelmez, teyit edilmediği anlamına gelir.
                  </>
                )}
              </p>

              <p className="mt-2 text-body-sm leading-relaxed text-muted-foreground">
                Bilgiler{' '}
                <span className="text-foreground">{club.source.name}</span>{' '}
                üzerinden derlendi
                {club.source.lastVerifiedAt && (
                  <>
                    ; en son{' '}
                    <span className="tabular">
                      {new Date(club.source.lastVerifiedAt).toLocaleDateString(
                        'tr-TR'
                      )}
                    </span>{' '}
                    tarihinde kontrol edildi
                  </>
                )}
                . Değişmiş olabilir — yola çıkmadan önce topluluğun kendi
                duyurusuna bakın.
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

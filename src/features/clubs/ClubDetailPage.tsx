import { useMemo } from 'react';
import { ClubJoinButton } from './ClubJoinButton';
import { Link, useParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { Breadcrumb } from '@/components/ui/PageHeader';
import { Panel, SpecList, SpecRow } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { NotFoundPage } from '@/components/NotFoundPage';
import { ExternalLink } from '@/components/ExternalLink';
import { RemoteImage } from '@/components/media/RemoteImage';
import { PageMeta } from '@/components/seo/PageMeta';
import { BlockRenderer } from '@/components/content/BlockRenderer';
import { breadcrumbJsonLd, absoluteUrl } from '@/lib/seo';
import { events } from '@/features/events/data';
import { eventTypeLabels } from '@/features/events/types';
import { clubKindLabels, clubTopicLabels } from './data';
import { useClub } from './clubsSource';
import { cityPathForName } from '@/features/city/routes';
import { useAuth } from '@/features/auth/AuthContext';
import { useClubPublicSpace } from '@/services/content/clubManagement';

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
  const { user } = useAuth();
  const { club, loading } = useClub(slug);
  const clubSpace = useClubPublicSpace(club?.slug, Boolean(user));

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
  const approvedMembers = clubSpace.members;
  const memberPosts = clubSpace.posts.filter((post) => post.audience === 'members');
  const publicPosts = clubSpace.posts.filter((post) => post.audience === 'public');

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
        <header className="mb-5 border-b border-border pb-5">
          <Breadcrumb
            items={[
              { label: 'Ana Sayfa', to: '/' },
              { label: 'Topluluklar', to: '/topluluklar' },
              { label: club.name },
            ]}
          />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-meta text-muted-foreground">
                <span>{club.city}</span>
                <span aria-hidden>·</span>
                <span>{clubKindLabels[club.kind]}</span>
                {club.foundedYear && (
                  <>
                    <span aria-hidden>·</span>
                    <span>{club.foundedYear}</span>
                  </>
                )}
              </div>
              <h1 className="mt-2 max-w-5xl text-balance type-page text-foreground">
                {club.name}
              </h1>
              {club.summary && (
                <p className="mt-3 max-w-5xl text-body-sm leading-relaxed text-muted-foreground">
                  {club.summary}
                </p>
              )}
            </div>

            <div className="flex max-w-full flex-wrap items-center gap-2 lg:justify-end">
              <Badge tone="primary">{clubKindLabels[club.kind]}</Badge>
              {club.verifiedAt && <Badge tone="success">Doğrulanmış</Badge>}
              {club.topics?.map((topic) => (
                <Badge key={topic} tone="cold">
                  {clubTopicLabels[topic]}
                </Badge>
              ))}
              {club.publicEvents && <Badge>Halka açık</Badge>}
              {club.sharedEquipment && <Badge tone="cold">Ortak ekipman</Badge>}
            </div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-4">
            {club.bodyBlocks.length > 0 && (
              <Panel title="Topluluk Profili">
                <div className="prose prose-invert max-w-none text-body-sm leading-7 text-muted-foreground prose-p:my-3 prose-a:text-primary prose-strong:text-foreground">
                  <BlockRenderer blocks={club.bodyBlocks} />
                </div>
              </Panel>
            )}

            {club.photos && club.photos.length > 0 && (
              <Panel title="Fotoğraflar" status={`${club.photos.length}`}>
                <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-4">
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
              title="Üyeler"
              status={
                approvedMembers.length > 0
                  ? `${approvedMembers.length} üye`
                  : club.memberCount
                    ? `${club.memberCount} bildirilen`
                    : undefined
              }
            >
              {approvedMembers.length > 0 ? (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {approvedMembers.map((member) => (
                    <li
                      key={member.id}
                      className="rounded-card border border-border bg-surface-2 px-3 py-2"
                    >
                      {member.username ? (
                        <Link
                          to={`/profil/${member.username}`}
                          className="text-body-sm font-semibold text-foreground transition-colors hover:text-primary"
                        >
                          {member.displayName || member.username}
                        </Link>
                      ) : (
                        <span className="text-body-sm text-foreground">
                          {member.userId}
                        </span>
                      )}
                      {member.username && (
                        <p className="mt-0.5 text-meta text-muted-foreground">
                          @{member.username}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-3 text-meta leading-relaxed text-muted-foreground">
                  Üye listesi yalnızca oturum açmış ve yetkili kullanıcılar için
                  veritabanından okunur. Bildirilen üye sayısı künyede
                  görünür.
                </p>
              )}
            </Panel>

            <Panel
              title="Üyelere Özel Mesaj Panosu"
              status={memberPosts.length > 0 ? `${memberPosts.length}` : undefined}
            >
              {memberPosts.length > 0 ? (
                <ul className="divide-y divide-border">
                  {memberPosts.map((post) => (
                    <li key={post.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h2 className="text-body-sm font-semibold text-foreground">
                          {post.title}
                        </h2>
                        <span className="tabular text-meta text-muted-foreground">
                          {new Date(post.createdAt).toLocaleString('tr-TR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-line text-body-sm leading-relaxed text-muted-foreground">
                        {post.body}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-3 text-meta leading-relaxed text-muted-foreground">
                  Üyelere özel duyurular burada görünür. Kulüp yöneticisi bu
                  mesajları Hesabım içindeki Kulüp Yönetimi sekmesinden
                  gönderebilir.
                </p>
              )}
            </Panel>

            {publicPosts.length > 0 && (
              <Panel title="Topluluk Haberleri" status={`${publicPosts.length}`}>
                <ul className="divide-y divide-border">
                  {publicPosts.map((post) => (
                    <li key={post.id} className="py-3 first:pt-0 last:pb-0">
                      <h2 className="text-body-sm font-semibold text-foreground">
                        {post.title}
                      </h2>
                      <p className="mt-1 text-meta text-muted-foreground">
                        {new Date(post.createdAt).toLocaleDateString('tr-TR')}
                      </p>
                      <p className="mt-2 whitespace-pre-line text-body-sm leading-relaxed text-muted-foreground">
                        {post.body}
                      </p>
                    </li>
                  ))}
                </ul>
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
                {/*
                  KATILMA İSTEĞİ, dış bağlantıdan ÖNCE: site içinde
                  kalan yol her toplulukta çalışıyor, dış form yalnızca
                  onu tanımlamış topluluklarda var.
                */}
                <SpecRow
                  label="Katılım"
                  value={
                    <ClubJoinButton clubSlug={club.slug} clubName={club.name} />
                  }
                />
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
                {club.telegramUrl && (
                  <SpecRow
                    label="Telegram"
                    value={
                      <ExternalLink href={club.telegramUrl} showHost>
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

            <Panel title="Topluluk Araçları">
              <div className="flex flex-wrap gap-2">
                <ButtonLink to="/etkinlikler" size="sm" variant="secondary">
                  Tüm etkinlikler
                </ButtonLink>
                <ButtonLink
                  to={`/hesap?sekme=kulup-yonetimi`}
                  size="sm"
                  variant="ghost"
                >
                  Yönetim paneli
                </ButtonLink>
              </div>
            </Panel>
          </div>
        </div>
      </Container>
    </>
  );
}

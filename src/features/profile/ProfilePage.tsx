import { useMemo } from 'react';
import { useParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Readout } from '@/components/ui/Readout';
import { CardGrid } from '@/components/ui/CardGrid';
import { PhotoCard } from '@/features/photos/PhotoCard';
import { PlaceholderPage } from '@/components/PlaceholderPage';
import { ReportButton } from '@/features/admin/ReportButton';
import {
  totalIntegrationSeconds,
  formatIntegration,
} from '@/domain/photography/integration';
import { usePhotoCatalog } from '@/services/content/photos';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { UserActions } from '@/features/social/UserActions';
import {
  profileAvatarUrl,
  useProfileByUsername,
} from '@/services/content/profile';
import { ProfileBadges } from './ProfileBadges';

/**
 * Kullanıcı profili (§7.15). Kamuya açık kısım fotoğraf kayıtlarından
 * türetiliyor: fotoğraflar, toplam entegrasyon, şehirler.
 *
 * TAKİP, MESAJ VE ENGELLEME ARTIK ÇALIŞIYOR (Faz 5). Sayfanın altındaki
 * "hesap sistemiyle birlikte açılacak" cümlesi kalktı — o cümle yazıldığı
 * gün doğruydu, bugün olsa yalan olurdu.
 *
 * EYLEMLER KAYIT SAHİBİNİN KİMLİĞİNE BAĞLI. `ownerId` yalnızca veritabanı
 * kaydından geliyor; tohum fotoğraflarda yok. Bu yüzden örnek içerikle
 * çalışan bir kurulumda eylem şeridi hiç çizilmiyor — var olmayan bir
 * kullanıcıyı takip etmeyi teklif etmek yerine.
 */
export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const photos = usePhotoCatalog().items;
  const { profile, loading, error } = useProfileByUsername(username);

  const userPhotos = useMemo(
    () => photos.filter((p) => p.user.username === username),
    [photos, username]
  );

  if (!username) {
    return (
      <PlaceholderPage
        title="Profil bulunamadı"
        description="Bu kullanıcı mevcut değil ya da henüz fotoğraf yayımlamamış."
      />
    );
  }

  const seedUser = userPhotos[0]?.user;
  if (loading && !seedUser) {
    return (
      <Container className="py-10">
        <PageHeader title="Profil yükleniyor" />
      </Container>
    );
  }

  if (!profile && !seedUser) {
    return (
      <PlaceholderPage
        title="Profil bulunamadı"
        description={
          error
            ? 'Profil okunamadı; daha sonra tekrar deneyin.'
            : 'Bu kullanıcı mevcut değil ya da henüz profilini yayımlamamış.'
        }
      />
    );
  }

  const displayName = profile?.displayName ?? seedUser?.displayName ?? username;
  const avatarUrl = profileAvatarUrl(profile?.avatarPath);
  /* Tohum kayıtlarda `ownerId` yok; eylem şeridi o durumda kendini
     gizliyor (bkz. UserActions). */
  const ownerId = profile?.id ?? userPhotos.find((p) => p.ownerId)?.ownerId;
  const totalSeconds = userPhotos.reduce(
    (sum, p) => sum + totalIntegrationSeconds(p.exposures),
    0
  );
  /*
   * KULLANICININ KENDİ KONUMU İLÇESİYLE, FOTOĞRAF ŞEHİRLERİ İL DÜZEYİNDE.
   *
   * Profilde iki farklı şey yan yana duruyor: kişinin kendi belirttiği
   * yer ve fotoğraflarının çekildiği yerler. İlki bir beyan, ikincisi
   * bir özet — özeti ilçe ilçe dökmek onlarca rozet üretir ve "bu kişi
   * nereden çekiyor" sorusunu cevaplamak yerine gömerdi.
   *
   * Kendi konumu ilçesiyle yazılıyor çünkü kullanıcı onu bilerek girdi;
   * girmediyse yalnızca il, onu da girmediyse hiçbir şey.
   */
  const kendiKonumu = profile?.city
    ? profile.district
      ? `${profile.district}, ${profile.city}`
      : profile.city
    : null;

  const cities = [
    ...new Set(
      [kendiKonumu, ...userPhotos.map((p) => p.city)].filter(
        (city): city is string => Boolean(city)
      )
    ),
  ];
  // Bortle bilgisi olmayan kayıtlar hesaba girmemeli; `Math.min` boş dizide
  // Infinity döner ve ekranda anlamsız bir değer belirir.
  const bortleValues = userPhotos
    .map((p) => p.location.bortle)
    .filter((b): b is number => typeof b === 'number');

  return (
    <>
      <PageMeta
        title={`${displayName} (@${username})`}
        description={`${displayName} kullanıcısının Astrohub profili: ${userPhotos.length} astrofotoğraf, toplam ${formatIntegration(totalSeconds)} entegrasyon süresi.`}
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Astrofotoğrafçılar', path: '/kesfet' },
          { name: displayName, path: `/profil/${username}` },
        ])}
      />
      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Astrofotoğrafçılar', to: '/kesfet' },
            { label: displayName },
          ]}
          title={displayName}
          meta={`@${username}`}
          description={
            profile?.bio ??
            (cities.length > 0
              ? `${cities.join(', ')} çevresinden ${userPhotos.length} kayıt.`
              : 'Henüz yayınlanmış fotoğraf yok.')
          }
          actions={
            <div className="flex flex-col items-start gap-2 sm:items-end">
              {avatarUrl && (
                <img
                  src={avatarUrl}
                  alt={`${displayName} profil fotoğrafı`}
                  className="h-20 w-20 rounded-full border border-border object-cover"
                />
              )}
              <div className="flex flex-wrap gap-1.5">
                {cities.map((city) => (
                  <Badge key={city}>{city}</Badge>
                ))}
              </div>
              <ProfileBadges userId={ownerId} />
              <div className="flex flex-wrap gap-2">
                {profile?.websiteUrl && (
                  <a
                    href={profile.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 shrink-0 items-center justify-center rounded-card border border-border-strong px-3.5 text-meta font-medium leading-none text-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    Portfolyo
                  </a>
                )}
                <UserActions targetUserId={ownerId} displayName={displayName} />
                {/*
                  PROFİL ŞİKÂYETİ. Hedef kullanıcı KİMLİĞİ, kullanıcı adı
                  değil: ad değiştirilebiliyor (FAZ 2'de panelden, ileride
                  kullanıcının kendisi) ve değiştiği anda şikâyet kaydı
                  kime ait olduğunu kaybederdi.
                */}
                {/*
                  Kimlik yoksa düğme HİÇ çizilmiyor. Tohum profillerin
                  veritabanı satırı yok; kullanıcı adını kimlik yerine
                  koymak, moderatörün açamayacağı bir kayıt üretirdi.
                */}
                {ownerId && (
                  <ReportButton
                    compact
                    targetType="profile"
                    targetId={ownerId}
                    targetPath={`/profil/${username}`}
                  />
                )}
              </div>
            </div>
          }
        />

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Readout label="Fotoğraf" value={userPhotos.length} />
          <Readout
            label="Toplam entegrasyon"
            value={formatIntegration(totalSeconds)}
            tone="cold"
          />
          <Readout
            label="Beğeni"
            value={userPhotos.reduce((sum, p) => sum + p.likes, 0)}
            tone="plain"
          />
          <Readout
            label="En karanlık saha"
            value={
              bortleValues.length > 0 ? `Bortle ${Math.min(...bortleValues)}` : '—'
            }
            tone="muted"
            hint={bortleValues.length > 0 ? 'kayıtlardan' : 'kayıt yok'}
          />
        </div>

        <h2 className="label mb-2">Fotoğraflar</h2>
        {userPhotos.length > 0 ? (
          <CardGrid view="grid" className="mb-6">
            {userPhotos.map((photo) => (
              <li key={photo.slug}>
                <PhotoCard photo={photo} />
              </li>
            ))}
          </CardGrid>
        ) : (
          <p className="mb-6 rounded-card border border-border bg-surface-1 px-3 py-4 text-body-sm text-muted-foreground">
            Henüz yayınlanmış fotoğraf yok.
          </p>
        )}

        {/*
          "Takip etme, mesaj gönderme ve koleksiyonlar hesap sistemiyle
          birlikte açılacak" cümlesi kaldırıldı: ilk ikisi artık başlıktaki
          eylem şeridinde çalışıyor. Koleksiyonlar hâlâ yok ve tek başına
          bir sayfa dibi vaadi olmayı hak etmiyor — geldiğinde kendi
          bölümüyle gelecek.
        */}
      </Container>
    </>
  );
}

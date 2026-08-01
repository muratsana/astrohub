import { useMemo } from 'react';
import { useParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Readout } from '@/components/ui/Readout';
import { CardGrid } from '@/components/ui/CardGrid';
import { PhotoCard } from '@/features/photos/PhotoCard';
import { PlaceholderPage } from '@/components/PlaceholderPage';
import {
  totalIntegrationSeconds,
  formatIntegration,
} from '@/domain/photography/integration';
import { usePhotoCatalog } from '@/services/content/photos';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { UserActions } from '@/features/social/UserActions';

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

  const userPhotos = useMemo(
    () => photos.filter((p) => p.user.username === username),
    [photos, username]
  );

  if (!username || userPhotos.length === 0) {
    return (
      <PlaceholderPage
        title="Profil bulunamadı"
        description="Bu kullanıcı mevcut değil ya da henüz fotoğraf yayımlamamış."
      />
    );
  }

  const displayName = userPhotos[0].user.displayName;
  /* Tohum kayıtlarda `ownerId` yok; eylem şeridi o durumda kendini
     gizliyor (bkz. UserActions). */
  const ownerId = userPhotos.find((p) => p.ownerId)?.ownerId;
  const totalSeconds = userPhotos.reduce(
    (sum, p) => sum + totalIntegrationSeconds(p.exposures),
    0
  );
  const cities = [...new Set(userPhotos.map((p) => p.city))];
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
          description={`${cities.join(', ')} çevresinden ${userPhotos.length} kayıt.`}
          actions={
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <div className="flex flex-wrap gap-1.5">
                {cities.map((city) => (
                  <Badge key={city}>{city}</Badge>
                ))}
              </div>
              <UserActions targetUserId={ownerId} displayName={displayName} />
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
        <CardGrid view="grid" className="mb-6">
          {userPhotos.map((photo) => (
            <li key={photo.slug}>
              <PhotoCard photo={photo} />
            </li>
          ))}
        </CardGrid>

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

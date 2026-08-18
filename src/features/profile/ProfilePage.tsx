import { useEffect, useMemo } from 'react';
import { useLocation, useParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { Breadcrumb, PageHeader } from '@/components/ui/PageHeader';
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
import { EXTERNAL_LINK_REL, safeUrl } from '@/lib/url';
import {
  profileAvatarUrl,
  profileBannerUrl,
  useProfileByUsername,
  usePublicProfileContact,
} from '@/services/content/profile';
import { gradientFromSeed } from '@/components/media/tints';
import { useFollow } from '@/services/content/social';
import { ProfileBadges } from './ProfileBadges';
import { ProfileShowcase } from './ProfileShowcase';

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
  const publicContact = usePublicProfileContact(profile?.id);

  const userPhotos = useMemo(
    () => photos.filter((p) => p.user.username === username),
    [photos, username]
  );

  /*
   * SAHİP KİMLİĞİ VE TAKİP SAYAÇLARI ERKEN DÖNÜŞLERDEN ÖNCE.
   *
   * Kancalar her boyamada aynı sırada çağrılmak zorunda; aşağıdaki
   * "profil bulunamadı" dalları bir kancayı atlarsa React sırayı
   * kaybeder. Kimliği burada türetmek, sayacı da buraya çekmeyi
   * mümkün kılıyor.
   *
   * Sayaçlar BAŞLIKTA gösteriliyor, eylem şeridinde değil:
   * `UserActions` kendi profilinde hiç çizilmiyor (kendini takip etmek
   * anlamsız) ve sayaçlar onun içinde kalsaydı kullanıcı KENDİ takipçi
   * sayısını hiçbir yerde göremezdi. Aynı durum eylem şeridine de
   * veriliyor ki iki sorgu ikinci kez kurulmasın.
   */
  const ownerId = profile?.id ?? userPhotos.find((p) => p.ownerId)?.ownerId;
  const follow = useFollow(ownerId);

  /*
   * DEEP-LINK: /profil/ad#ekipmanlar bölüme kaydırır (E07).
   *
   * Bölümler veri geldikçe çiziliyor ve boşsa hiç çizilmiyor; bu yüzden
   * effect yalnızca mount'ta değil, içerik değiştikçe de deniyor. Hedef
   * bir `<details>` ise önce açılıyor — kapalı bir bölüme kaydırmak
   * kullanıcıyı boş bir başlığa bırakırdı. Küçük gecikme, aynı karede
   * henüz yerleşmemiş düğümü beklemek için. Hook'lar erken return'lerin
   * ÜSTÜNDE: sıra her render'da aynı kalmalı.
   */
  const { hash } = useLocation();
  useEffect(() => {
    const hedefId = hash.replace(/^#/, '');
    if (!hedefId) return;
    const zaman = setTimeout(() => {
      const el = document.getElementById(decodeURIComponent(hedefId));
      if (!el) return;
      if (el instanceof HTMLDetailsElement) el.open = true;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => clearTimeout(zaman);
  }, [hash, profile, userPhotos.length]);

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

  const displayName =
    profile && profile.displayNameVisible === false
      ? username
      : (profile?.displayName ?? seedUser?.displayName ?? username);
  const avatarUrl = profileAvatarUrl(profile?.avatarPath);
  const bannerUrl = profileBannerUrl(profile?.bannerPath);
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

  /*
   * ŞEHİR LİSTESİ KALDIRILDI.
   *
   * Rozet şeridi "aynı ili üç farklı yazımla gösteriyor" şikâyetinden
   * sonra il düzeyine indirilmiş, ardından tamamen kaldırılmıştı.
   * Geriye yalnızca biyografi yoksa basılan bir cümle kalmıştı ve o
   * cümle için 81 ilin tamamını içeren bir tabloyu paketlemek —
   * üstelik ilk rota bütçesi 200 kB'de dururken — orantısızdı.
   *
   * Kişinin kendi konumu duruyor: o bir beyan ve adının yanında
   * bir kez görünüyor.
   */
  /* OKUMA TARAFI KAPISI (§15.4).
     `AccountPage` kaydederken `safeUrl`den geçiriyor, ama bu bir güvenlik
     sınırı değil: `profiles` satırını sahibi doğrudan PostgREST üzerinden de
     güncelleyebilir, panel formunu hiç kullanmadan. Adres burada da
     doğrulanmazsa `javascript:` şeması bu sayfada çalışırdı. Geçmeyen adres
     bağlantı olarak hiç basılmıyor. */
  const websiteUrl = safeUrl(profile?.websiteUrl);
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
        <Breadcrumb
          items={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Astrofotoğrafçılar', to: '/kesfet' },
            { label: displayName },
          ]}
        />

        {/*
          ══════════════════════════════════════════════════════════════
          KİMLİK ALANI: KAPAK + ÜSTÜNE BİNEN AVATAR + SAYAÇLAR (E05)

          Profil başlığı sıradan bir sayfa başlığıydı: solda ad, sağda
          küçük bir yuvarlak fotoğraf. Astrofotoğraf sitesinde kimliği
          taşıyan şey metin değil KARE — kullanıcının kendi çektiği bir
          görüntü, adının arkasında.

          Kapak yoksa boş bir kutu değil, kullanıcı adından türeyen
          sabit bir gradyan çiziliyor: boş gri bir bant "bir şey
          eksik" der, gradyan "burası böyle" der.

          Avatar kapağın üstüne BİNİYOR ve halkası sayfa zeminiyle aynı
          renkte. Kapağın içine oturtmak fotoğrafın bir köşesini yer,
          altına almak ikisini birbirinden kopuk iki öğe yapardı.
        */}
        <header className="relative mb-6 overflow-hidden rounded-card border border-border bg-surface-1">
          {/*
            ══════════════════════════════════════════════════════════════
            KAPAK BÜTÜN BLOĞUN ARKA PLANI

            Önce kapak yalnızca üstte bir şerittı ve altındaki kimlik
            satırı ayrı bir kutuydu; ikisi tek bir alan gibi
            görünmüyordu. Şimdi görsel bloğun TAMAMINI kaplıyor ve
            avatar, ad, sayaçlar onun ÜSTÜNDE duruyor.

            KATMAN SIRASI BİR HATAYA MAL OLDU. Kapak `relative` bir
            kutudaydı; konumlandırılmış öğeler konumlandırılmamış
            kardeşlerinin ÜSTÜNE boyanıyor ve avatar kapağın arkasında
            kalıyordu — ekranda yarısı kesik görünüyordu. Arka plan
            katmanı artık `absolute`, içerik katmanı `relative`: sıra
            tesadüfe değil, açık bir karara bağlı.

            PERDE OKUNABİLİRLİK İÇİN. Sayaçlar ve biyografi doğrudan
            fotoğrafın üstünde okunmaz; aşağı indikçe koyulaşan bir
            geçiş, üstte fotoğrafı açık bırakırken altta metni zemine
            oturtuyor. Renk temanın kendi belirtecinden geliyor, yani
            üç temada da doğru.
          */}
          <div aria-hidden className="absolute inset-0">
            {bannerUrl ? (
              <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div
                className="h-full w-full"
                style={{ background: gradientFromSeed(username) }}
              />
            )}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to bottom, color-mix(in srgb, var(--color-surface-1) 8%, transparent) 0%, color-mix(in srgb, var(--color-surface-1) 62%, transparent) 46%, color-mix(in srgb, var(--color-surface-1) 94%, transparent) 100%)',
              }}
            />
          </div>

          <div className="relative">
            {/* Kapağın açıkta kalan bandı: buraya içerik gelmiyor,
                yalnızca yükseklik veriyor. */}
            <div className="h-32 w-full sm:h-44 lg:h-52" />

          <div className="px-4 pb-4 sm:px-6 sm:pb-5">
            <div className="-mt-10 flex flex-wrap items-end gap-x-4 gap-y-3 sm:-mt-12">
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-surface-1 bg-surface-2 sm:h-24 sm:w-24">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={`${displayName} profil fotoğrafı`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-h3 text-muted-foreground">
                    {displayName.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h1 className="type-page truncate text-foreground">
                  {displayName}
                </h1>
                <p className="tabular truncate text-meta text-muted-foreground">
                  @{username}
                  {kendiKonumu && (
                    <>
                      {' · '}
                      <span className="not-tabular">{kendiKonumu}</span>
                    </>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {websiteUrl && (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel={EXTERNAL_LINK_REL}
                    className="inline-flex h-8 shrink-0 items-center justify-center rounded-card border border-border-strong px-3.5 text-meta font-medium leading-none text-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    Portfolyo
                  </a>
                )}
                {publicContact.contact?.phoneNumber && (
                  <a
                    href={`tel:${publicContact.contact.phoneNumber.replace(/\s+/g, '')}`}
                    className="inline-flex h-8 shrink-0 items-center justify-center rounded-card border border-border-strong px-3.5 text-meta font-medium leading-none text-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    Telefon
                  </a>
                )}
                <UserActions
                  targetUserId={ownerId}
                  displayName={displayName}
                  follow={follow}
                />
                {/*
                  PROFİL ŞİKÂYETİ hedef KİMLİĞİYLE gidiyor, kullanıcı adıyla
                  değil: ad değiştirilebiliyor ve değiştiği anda şikâyet
                  kaydı kime ait olduğunu kaybederdi. Kimlik yoksa düğme hiç
                  çizilmiyor — tohum profillerin veritabanı satırı yok ve
                  kullanıcı adını kimlik yerine koymak, moderatörün
                  açamayacağı bir kayıt üretirdi.
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

            {/*
              SAYAÇ ŞERİDİ. Profilin "kim bu" sorusuna verdiği ilk cevap:
              kaç kare, ne kadar entegrasyon, kaç takipçi. Üçü de zaten
              hesaplanıyordu ama sayfanın altına dağılmıştı.
            */}
            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-3 text-meta">
              <ProfilSayaci etiket="fotoğraf" deger={userPhotos.length} />
              <ProfilSayaci
                etiket="entegrasyon"
                deger={formatIntegration(totalSeconds)}
              />
              <ProfilSayaci etiket="takipçi" deger={follow.followers} />
              <ProfilSayaci
                etiket="takip edilen"
                deger={follow.followingCount}
              />
            </dl>

            {(profile?.bio || userPhotos.length > 0) && (
              <p className="mt-3 max-w-[65ch] text-body-sm text-muted-foreground">
                {profile?.bio ?? `${userPhotos.length} yayımlanmış kayıt.`}
              </p>
            )}

            {/*
              "ÇEKTİĞİ İLLER" ROZET ŞERİDİ KALDIRILDI.

              Şerit, aynı ili üç farklı yazımla gösterme sorunundan
              sonra il düzeyine indirilmişti ve teknik olarak doğruydu.
              Ama düzeltilmiş hâliyle bile profilin en üstünde en az
              bilgi taşıyan satırdı: fotoğrafların çekildiği iller zaten
              her kaydın künyesinde yazıyor ve galeriden süzülebiliyor.

              Kişinin kendi konumu duruyor — o bir beyan ve adının
              yanında bir kez görünüyor.
            */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <ProfileBadges userId={ownerId} />
            </div>
          </div>
          </div>
        </header>

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

        <h2 id="fotograflar" className="label mb-2 scroll-mt-20">
          Fotoğraflar
        </h2>
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
          VİTRİN: ekipman, ilan, yazı ve forum konuları.

          Bu sayfa yalnızca fotoğraf ızgarasıydı; kullanıcının sitedeki
          geri kalan üretimi profilinden bulunamıyordu. Bölümler boşsa
          hiç çizilmiyor — gerekçe `ProfileShowcase` başlığında.
        */}
        <ProfileShowcase userId={ownerId} username={username} />
      </Container>
    </>
  );
}

/**
 * Tek bir sayaç: değer önde, etiket arkada.
 *
 * `<dl>` içinde `<dt>`/`<dd>` sırası anlamsal olarak etiket-değer;
 * görsel sıra ise değer-etiket. İkisini çakıştırmak yerine
 * `flex-row-reverse` kullanılıyor — ekran okuyucu doğru sırayı,
 * göz alışık olduğu sırayı görüyor.
 */
function ProfilSayaci({
  etiket,
  deger,
}: {
  etiket: string;
  deger: number | string;
}) {
  return (
    <div className="flex flex-row-reverse items-baseline gap-1.5">
      <dt className="text-muted-foreground">{etiket}</dt>
      <dd className="tabular font-medium text-foreground">{deger}</dd>
    </div>
  );
}

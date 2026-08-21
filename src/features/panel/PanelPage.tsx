import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { Button, ButtonLink } from '@/components/ui/Button';
import { deletePhoto } from '@/services/photos/remove';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Readout } from '@/components/ui/Readout';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/features/auth/AuthContext';
import { usePermissions } from '@/features/auth/usePermissions';
import {
  formatQuotaLabel,
  remainingPhotoQuota,
  PHOTO_LIMITS,
  MAX_DRAFT_PHOTOS,
  type MembershipTier,
} from '@/domain/membership/quota';
import { PageMeta } from '@/components/seo/PageMeta';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { useSavedPhotos } from '@/services/content/collections';
import {
  isListingPubliclyVisible,
  markListingSold,
  useMyListings,
} from '@/services/content/listings';
import { isPhotoPubliclyVisible, useMyPhotos } from '@/services/content/photos';
import {
  submitEntry,
  useMyEntries,
  withdrawEntry,
} from '@/services/content/entries';
import { contentStatusLabels } from '@/domain/content/status';
import {
  listingStatusLabels,
  formatListingPrice,
  type ListingStatus,
} from '@/features/marketplace/data';
import { photoStatusLabels, type PhotoStatus } from '@/features/photos/types';

/** Durum rengi: yayındaki yeşil, biten sönük, taslak uyarı sarısı. */
function listingStatusTone(status: ListingStatus): BadgeTone {
  if (status === 'yayinda') return 'success';
  if (status === 'taslak') return 'warning';
  return 'muted';
}

/** Gönderi durumu: incelemede mavi, reddedilen kırmızı. */
function gonderiTonu(durum: string): BadgeTone {
  if (durum === 'yayinda') return 'success';
  if (durum === 'incelemede') return 'primary';
  if (durum === 'taslak') return 'warning';
  if (durum === 'reddedildi') return 'danger';
  return 'muted';
}

/** Fotoğrafta da aynı dil: yayında yeşil, taslak sarı, arşiv sönük. */
function photoStatusTone(status: PhotoStatus): BadgeTone {
  if (status === 'yayinda') return 'success';
  if (status === 'taslak') return 'warning';
  return 'muted';
}

/**
 * Panel liste satırı — SAYFASI OLAN kayıt bağlantı, olmayan düz satır.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN HER SATIR BAĞLANTI DEĞİL
 *
 * Hem `/fotograf/:slug` hem `/ilan/:slug` kaydı KATALOĞUN İÇİNDEN
 * arıyor, katalog da yalnızca herkese açık durumları çekiyor
 * (`PUBLIC_PHOTO_STATUS`, `PUBLIC_LISTING_STATUSES`). Taslak fotoğrafı
 * ya da satılmış ilanı bağlantı yapmak, kullanıcıyı kendi kaydının
 * üstüne tıklattırıp "bulunamadı" sayfasına göndermek olurdu — hem de
 * bu bölüm tam olarak o kayıtları göstermek için var.
 *
 * Düzenleme ekranı gelene kadar (Faz 7) doğru davranış satırı sessizce
 * ölü bırakmak değil, NEDEN gidilemediğini yanına yazmak.
 */
function PanelRow({
  to,
  title,
  meta,
  badge,
  note,
  thumb,
  action,
  children,
}: {
  /** Kaydın herkese açık sayfası; yoksa satır bağlantı olmaz. */
  to?: string;
  title: string;
  meta: string;
  badge: ReactNode;
  /** Bağlantı yokken gösterilen gerekçe. */
  note?: string;
  /** Küçük önizleme; fotoğraf listesinde var, ilan listesinde yok. */
  thumb?: ReactNode;
  /**
   * Satır eylemi (sil…) — BAĞLANTININ DIŞINDA çiziliyor.
   *
   * İçine konsaydı `<a>` içinde `<button>` olurdu: geçersiz HTML, ve
   * tıklama iki işi birden tetikler — kullanıcı silmeye basar, aynı anda
   * fotoğraf sayfasına gider. Eylem kardeş öge; satırın tamamı hâlâ
   * bağlantı, düğme değil.
   */
  action?: ReactNode;
  /** Satırın altında açılan alan — onay kutusu gibi. */
  children?: ReactNode;
}) {
  const body = (
    <>
      <span className="flex min-w-0 items-center gap-3">
        {thumb}
        <span className="min-w-0">
          <span
            className={`block truncate text-caption text-foreground${to ? ' group-hover:text-primary' : ''}`}
          >
            {title}
          </span>
          <span className="mt-0.5 block truncate text-meta text-muted-foreground">
            {meta}
            {!to && note ? ` · ${note}` : ''}
          </span>
        </span>
      </span>
      <span className="shrink-0">{badge}</span>
    </>
  );

  /* Karo varken hizalama satır ortasına geçiyor: `items-baseline` küçük
     önizlemeyi metnin taban çizgisine oturtup satırı eğri gösteriyordu. */
  const shared = `flex justify-between gap-3 py-2.5 ${thumb ? 'items-center' : 'items-baseline'}`;

  return (
    <li className="border-b border-border last:border-0">
      <div className="flex items-center gap-2">
        {to ? (
          <Link to={to} className={`group min-w-0 flex-1 ${shared}`}>
            {body}
          </Link>
        ) : (
          <div className={`min-w-0 flex-1 ${shared}`}>{body}</div>
        )}
        {action && <span className="shrink-0">{action}</span>}
      </div>
      {children}
    </li>
  );
}

/**
 * Üye paneli (§7.16). Kamuya açık sayfalardan farklı olarak daha işlevsel
 * bir yerleşime izin verilir (§6.6).
 *
 * Sayılar ve listeler oturum açmış kullanıcının GERÇEK kayıtlarından
 * geliyor; kademe ve kota `izinlerim()` ile SUNUCUDAN. Bekleyen tek şey
 * ödeme sağlayıcısı (T-504): kademeyi yükseltmenin bir yolu yok, ama
 * kademenin kendisi artık uydurma değil — yönetici ve moderatör §3.2
 * gereği premium görünüyor.
 */
export function PanelPage() {
  const { user, configured } = useAuth();
  const { section } = useParams<{ section?: string }>();
  /*
   * Kimlik yalnızca ilgili bölüm açıkken veriliyor: kanca `undefined`
   * kullanıcıyla sorgu atmıyor. Panelin her ziyaretinde ilan çekmek,
   * kullanıcının bakmadığı bir liste için istek harcamak olurdu.
   */
  const myListings = useMyListings(
    section === 'ilanlar' ? user?.id : undefined
  );
  /*
   * Fotoğraflar İLANLARDAN FARKLI OLARAK bölümle sınırlanmıyor: kota
   * kutusu panelin her bölümünde duruyor ve sayısını bu sorgudan alıyor.
   * Yalnızca `fotograflar` bölümünde çekmek, diğer bölümlerde kotayı
   * uydurmak demekti.
   */
  const myPhotos = useMyPhotos(user?.id);
  /* Gönderdiği içerikler — FAZ 4 görev 4. Yalnızca kendi bölümünde
     çekiliyor; panelin her açılışında ek sorgu atmanın anlamı yok. */
  const myEntries = useMyEntries(
    section === 'gonderilerim' ? (user?.id ?? null) : null
  );
  const [gonderiHatasi, setGonderiHatasi] = useState<string | null>(null);

  async function gonderiIslemi(action: () => Promise<void>) {
    setGonderiHatasi(null);
    try {
      await action();
      myEntries.refresh();
    } catch (e) {
      setGonderiHatasi(e instanceof Error ? e.message : 'İşlem uygulanamadı');
    }
  }
  /*
   * Kayıtlar yalnızca kendi bölümünde okunuyor: kota kutusunun aksine
   * panelin geri kalanında kullanılmıyorlar ve her ziyarette çekmek,
   * kullanıcının bakmadığı bir liste için istek harcamak olurdu.
   */
  const saved = useSavedPhotos();

  /*
   * SİLME İKİ ADIM — açık olan satırın kimliği `silinecek`te.
   *
   * `confirm()` KULLANILMADI, yönetici listelerindeki gerekçenin aynısı:
   * tarayıcı diyaloğu odağı çalıyor, mobilde kırpılıyor ve neyin
   * silineceğini satırdan kopuk gösteriyor. Onay satırın kendi altında
   * açılıyor; hangi kaydın gideceği gözden kaybolmuyor.
   */
  const [silinecek, setSilinecek] = useState<string | null>(null);
  const [siliniyor, setSiliniyor] = useState(false);
  const [silmeHatasi, setSilmeHatasi] = useState<string | null>(null);
  const [satilacak, setSatilacak] = useState<string | null>(null);
  const [satiliyor, setSatiliyor] = useState(false);
  const [satisHatasi, setSatisHatasi] = useState<string | null>(null);

  async function sil(photoId: string) {
    if (!user) return;
    setSiliniyor(true);
    setSilmeHatasi(null);
    try {
      await deletePhoto({ userId: user.id, photoId });
      setSilinecek(null);
      /* Liste yeniden okunuyor: yerel diziden çıkarmak kotayı da elle
         güncellemek demekti ve iki sayaç ayrışabilirdi. */
      myPhotos.refresh();
    } catch (e: unknown) {
      /* Hata satırda kalıyor ve onay AÇIK kalıyor: kullanıcı ne olduğunu
         okuyup tekrar deneyebilsin. Sessizce kapanan bir onay, silme
         olmuş gibi görünürdü. */
      setSilmeHatasi(e instanceof Error ? e.message : 'Fotoğraf silinemedi');
    } finally {
      setSiliniyor(false);
    }
  }

  async function satildiIsaretle(slug: string) {
    setSatiliyor(true);
    setSatisHatasi(null);
    try {
      await markListingSold(slug);
      setSatilacak(null);
      myListings.refresh();
    } catch (error) {
      setSatisHatasi(
        error instanceof Error ? error.message : 'İlan güncellenemedi'
      );
    } finally {
      setSatiliyor(false);
    }
  }

  /*
   * Kademe STANDART varsayılıyor: üyelik sistemi yokken (T-504 kararı
   * açık) premium göstermek, kullanıcıya sahip olmadığı bir hakkı vaat
   * etmek olurdu. Sayaç, etiket ve ilerleme çubuğu aynı sınırdan
   * besleniyor — üçü ayrı sabitten okuduğunda "0 / 5" yazıp çubuğu 30'a
   * göre çizen bir panel çıkıyordu.
   *
   * SAYILAR ARTIK GERÇEK. Burada sabit `0` yazıyordu: fotoğrafı olan
   * kullanıcıya "0 / 5" ve "5 hak kaldı" diyordu, yani kotası dolu bir
   * üyeye boş kota gösteriyordu. Veri gelene kadar sayı yerine "…"
   * çiziliyor; yükleme sırasında `0` göstermek de aynı yanlış cümleyi
   * kurardı.
   */
  /*
   * KADEME ARTIK SUNUCUDAN.
   *
   * Burada sabit `'standart'` yazıyordu ve gerekçesi ("üyelik sistemi
   * yok") o gün doğruydu — ama arada `izinlerim()` yazıldı ve kademeyi,
   * izinleri, kotaları TEK yanıtta veriyor. Buna rağmen bu panel hâlâ
   * sabiti okuyordu: `tier_limits` tablosunda kotayı değiştiren bir
   * yönetici, panelin gösterdiği sayının değişmediğini görürdü.
   *
   * Yönetici ve moderatör §3.2 gereği premium sayılıyor; sabit kademe
   * onlara da "5 fotoğraf" diyordu — yanlış sayı.
   *
   * KOTA DA SUNUCUDAN, ama sabit yedekle: `izinlerim()` henüz dönmediyse
   * ya da düştüyse `PHOTO_LIMITS` devreye giriyor. Yedeksiz bıraksaydık
   * kota bilinmeyen bir anda sıfır görünür, panel de kullanıcıya "hiç
   * hakkın yok" derdi.
   */
  const permissions = usePermissions();
  const tier: MembershipTier = permissions.tier;
  const photoLimit = permissions.kota('galeri_foto') ?? PHOTO_LIMITS[tier];
  const activePhotos = myPhotos.published;
  const quotaKnown = !myPhotos.loading && !myPhotos.error;

  const menu: { label: string; to: string; note?: string }[] = [
    {
      label: 'Fotoğraflarım',
      to: '/panel/fotograflar',
      note: quotaKnown
        ? formatQuotaLabel(activePhotos, tier, photoLimit)
        : undefined,
    },
    { label: 'Fotoğraf Yükle', to: '/galeri/yukle' },
    /* Ekipman artık hesabın altında tek bir yerde (bkz.
       `MyEquipmentPanel`); panel oraya işaret ediyor. */
    { label: 'Ekipmanlarım', to: '/hesap?sekme=ekipmanlarim' },
    { label: 'Etkinliklerim', to: '/etkinlikler' },
    { label: 'Kaydedilenler', to: '/panel/kaydedilenler' },
    { label: 'Kayıtlı Noktalar', to: '/saha' },
    { label: 'İlanlarım', to: '/panel/ilanlar' },
    { label: 'Gönderilerim', to: '/panel/gonderilerim' },
    /*
     * "ÜYELİK VE ÖDEME" KALDIRILDI, GİZLENMEDİ.
     *
     * Bağlantı `/panel`e, yani kullanıcının ZATEN ÜZERİNDE OLDUĞU
     * sayfaya gidiyordu: tıklanınca hiçbir şey olmuyordu. Ödeme
     * sağlayıcısı seçilmeden arkasında koyacak bir sayfa da yok
     * (T-504). Üyelik durumu yukarıdaki ölçüm kutusunda "üyelik
     * sistemi yakında" olarak zaten dürüstçe duruyor; menüde ikinci
     * kez, üstelik ölü bir bağlantı olarak durmasına gerek yoktu.
     */
  ];

  return (
    <>
      <PageMeta
        title="Üye Paneli"
        description="Fotoğraflarınız, kotanız, setuplarınız ve üyelik durumunuz."
        noIndex
      />
      <Container className="py-8 sm:py-10">
        <PageHeader
          title="Üye Paneli"
          /*
           * OTURUMSUZ METİN "hesap sistemi devreye alındığında" DİYORDU —
           * artık alındı: giriş çalışıyor, panel gerçek kayıt okuyor.
           * Ziyaretçiye beklemesi gereken bir şey varmış gibi söylemek,
           * yapması gereken tek şeyi (giriş) gizliyordu.
           */
          description={
            user
              ? `Hoş geldin, ${user.email}`
              : "Fotoğraflarını, ilanlarını ve setup'larını burada yönetirsin — giriş yapman yeterli."
          }
          actions={
            !user && (
              <div className="flex gap-2">
                <ButtonLink to="/giris" size="sm">
                  Giriş yap
                </ButtonLink>
                <ButtonLink to="/kayit" size="sm" variant="ghost">
                  Üye Ol
                </ButtonLink>
              </div>
            )
          }
        />

        {!configured && (
          <p className="mb-4 rounded-card border border-warning/35 bg-surface-1 px-3 py-2.5 text-body-sm leading-relaxed text-warning">
            Hesap altyapısı (Supabase) henüz bağlanmadı — panel önizleme
            modunda. Buradaki sayılar gerçek değil, kural örnekleridir.
          </p>
        )}

        {/* Genel bakış — ölçüm kutuları sitenin geri kalanıyla aynı dilde */}
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Readout
            label="Fotoğraf kotası"
            value={
              quotaKnown
                ? formatQuotaLabel(activePhotos, tier, photoLimit)
                : '…'
            }
            hint={
              quotaKnown
                ? `${remainingPhotoQuota({ activePublished: activePhotos, drafts: myPhotos.drafts, tier, limit: photoLimit })} hak kaldı`
                : 'okunuyor'
            }
          />
          <Readout
            label="Taslak"
            value={
              quotaKnown ? `${myPhotos.drafts} / ${MAX_DRAFT_PHOTOS}` : '…'
            }
            hint="yayımlanmamış kayıt"
            tone="cold"
          />
          {/*
            Kademe GERÇEK, yükseltme yolu YOK — ikisi de yazıyor. Yalnızca
            "Standart" yazıp susmak, kullanıcıya arayıp bulamayacağı bir
            yükseltme düğmesi aratırdı.
          */}
          <Readout
            label="Üyelik"
            value={
              permissions.status === 'ready'
                ? tier === 'premium'
                  ? 'Premium'
                  : 'Standart'
                : '…'
            }
            hint={tier === 'premium' ? 'rol kaynaklı' : 'ödeme sistemi yakında'}
            tone="muted"
          />
          <Readout
            label="Toplam entegrasyon"
            value="0"
            unit="sa"
            hint="yayımlanan kayıtlardan"
            tone="plain"
          />
        </div>

        <Panel title="Kota kullanımı" className="mb-4">
          <div
            role="progressbar"
            aria-valuenow={activePhotos}
            aria-valuemin={0}
            aria-valuemax={photoLimit}
            aria-label="Fotoğraf kotası kullanımı"
            className="h-1.5 overflow-hidden rounded-full bg-surface-3"
          >
            {/* Doluluk %100'de kesiliyor: kademe düşen ya da veritabanı
                tarafında sınırı aşmış bir kayıtta çubuk kutusundan taşardı. */}
            <div
              className="h-full rounded-full bg-primary"
              style={{
                width: `${Math.min(100, (activePhotos / photoLimit) * 100)}%`,
              }}
            />
          </div>
          <p className="mt-2 text-meta leading-relaxed text-muted-foreground">
            Aynı fotoğrafın işleme sürümleri kotada ayrı kayıt sayılmaz; bir
            fotoğraf kaç sürüme sahip olursa olsun tek hak tüketir (§4.2).
          </p>
        </Panel>

        {section === 'fotograflar' && (
          <Panel
            title="Fotoğraflarım"
            status={
              myPhotos.loading
                ? 'yükleniyor…'
                : `${myPhotos.photos.length} kayıt`
            }
            className="mb-4"
          >
            {myPhotos.error ? (
              <p className="py-3 text-meta leading-relaxed text-danger">
                Fotoğraflar okunamadı: {myPhotos.error}
              </p>
            ) : myPhotos.loading ? (
              <p className="py-3 text-meta leading-relaxed text-muted-foreground">
                Fotoğraflarınız yükleniyor…
              </p>
            ) : myPhotos.photos.length === 0 ? (
              <p className="py-3 text-meta leading-relaxed text-muted-foreground">
                Henüz fotoğraf yüklemediniz. İlk karenizi yükleyip künyesini
                doldurduğunuzda burada listelenir.{' '}
                <Link to="/galeri/yukle" className="text-primary">
                  Fotoğraf yükle →
                </Link>
              </p>
            ) : (
              <ul>
                {myPhotos.photos.map((photo) => (
                  <PanelRow
                    key={photo.id}
                    to={
                      isPhotoPubliclyVisible(photo.status)
                        ? `/fotograf/${photo.slug}`
                        : undefined
                    }
                    title={photo.title}
                    meta={
                      photo.capturedAt
                        ? new Date(photo.capturedAt).toLocaleDateString('tr-TR')
                        : 'Tarih yok'
                    }
                    note="galeride görünmüyor"
                    /* Karo dekoratif: yanındaki başlık zaten kaydın adı,
                       `alt` doldurmak ekran okuyucuya aynı şeyi iki kez
                       okuturdu. Görsel yoksa boş kutu kalır — 44 pikselde
                       yıldız alanı çizmek satır başına bir tuval demekti. */
                    thumb={
                      <span className="h-11 w-11 shrink-0 overflow-hidden rounded border border-border bg-surface-3">
                        {photo.thumbUrl && (
                          <img
                            src={photo.thumbUrl}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                        )}
                      </span>
                    }
                    badge={
                      <Badge tone={photoStatusTone(photo.status)}>
                        {photoStatusLabels[photo.status]}
                      </Badge>
                    }
                    action={
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={siliniyor}
                        onClick={() => {
                          setSilmeHatasi(null);
                          setSilinecek(
                            silinecek === photo.id ? null : photo.id
                          );
                        }}
                      >
                        Sil
                      </Button>
                    }
                  >
                    {silinecek === photo.id && (
                      <div className="mb-2.5 flex flex-wrap items-center gap-2 rounded-card border border-warm/40 bg-warm/8 px-3 py-2">
                        <span className="flex-1 text-meta leading-relaxed text-warm">
                          <strong>{photo.title}</strong> kalıcı olarak
                          silinecek: görsel dosyaları, işleme sürümleri ve kayda
                          gelmiş beğeni, yorum, puan da gider. Geri alınamaz.
                        </span>
                        <Button
                          size="sm"
                          disabled={siliniyor}
                          onClick={() => void sil(photo.id)}
                        >
                          {siliniyor ? 'Siliniyor…' : 'Kalıcı sil'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={siliniyor}
                          onClick={() => setSilinecek(null)}
                        >
                          Vazgeç
                        </Button>
                        {silmeHatasi && (
                          <p className="w-full text-meta leading-relaxed text-danger">
                            Silinemedi: {silmeHatasi}
                          </p>
                        )}
                      </div>
                    )}
                  </PanelRow>
                ))}
              </ul>
            )}
            <p className="mt-2 text-meta leading-snug text-faint">
              Kotayı yalnızca YAYINDAKİ kayıtlar tüketir; arşivlediğiniz
              fotoğraf silinmez, galeriden çıkar ve hakkı serbest bırakır.
              Kalıcı silme geri alınamaz.
            </p>
          </Panel>
        )}

        {section === 'setuplar' && (
          <Panel title="Kayıtlı ekipmanlar" className="mb-4">
            {/*
              BÖLÜM TAŞINDI, SİLİNMEDİ.

              Ekipman kayıtları üç ayrı yerde duruyordu: burası, katalog
              sayfasının iki sekmesi ve envanter. Hepsi hesabın altındaki
              tek sayfada birleşti. Bu adres, paylaşılmış ya da yer imine
              alınmış bağlantılar için duruyor — kullanıcıyı 404'e
              düşürmek yerine yeni yerine gönderiyor.
            */}
            <p className="py-3 text-meta leading-relaxed text-muted-foreground">
              Kayıtlı ekipmanlarınız artık hesabınızda. Kadraj aracından
              kaydettiğiniz eski kayıtlar da orada listeleniyor.
            </p>
            <ButtonLink to="/hesap?sekme=ekipmanlarim" size="sm">
              Ekipmanlarım’a git
            </ButtonLink>
          </Panel>
        )}

        {section === 'kaydedilenler' && (
          <Panel
            title="Kaydedilenler"
            status={
              saved.loading ? 'yükleniyor…' : `${saved.items.length} kayıt`
            }
            className="mb-4"
          >
            {saved.error ? (
              <p className="py-3 text-meta leading-relaxed text-danger">
                Kayıtlar okunamadı: {saved.error}
              </p>
            ) : saved.loading ? (
              <p className="py-3 text-meta leading-relaxed text-muted-foreground">
                Kayıtlarınız yükleniyor…
              </p>
            ) : saved.items.length === 0 ? (
              <p className="py-3 text-meta leading-relaxed text-muted-foreground">
                Henüz fotoğraf kaydetmediniz. Galeride beğendiğiniz bir
                fotoğrafın sayfasındaki "Kaydet" düğmesi onu buraya ekler.
              </p>
            ) : (
              <ul>
                {saved.items.map((item) => (
                  <PanelRow
                    key={item.photoId}
                    to={`/fotograf/${item.slug}`}
                    title={item.title}
                    meta={`${new Date(item.addedAt).toLocaleDateString('tr-TR')} tarihinde kaydedildi`}
                    badge={<Badge tone="muted">Kayıtlı</Badge>}
                  />
                ))}
              </ul>
            )}

            {/* Koleksiyon gizli ve bunu SÖYLÜYOR: kullanıcı kaydettiği
                şeyin kimseye görünmediğini bilmeli. */}
            <p className="mt-2 text-meta leading-snug text-faint">
              Kaydedilenler listeniz size özeldir; koleksiyonları{' '}
              <ButtonLink
                to="/hesap?sekme=koleksiyonlarim"
                size="sm"
                variant="ghost"
              >
                Hesabım
              </ButtonLink>{' '}
              altında yönetebilirsiniz.
            </p>
          </Panel>
        )}

        {/*
          GÖNDERİLERİM (FAZ 4, plan görev 4).

          Kabul kriteri: "içerik sahibi kendi taslağını ve ret gerekçesini
          görüyor." Ret gerekçesi burada AÇIKÇA yazıyor — reddedildiğini
          görüp sebebini görememek, katkıyı sessizce çöpe atmakla aynı şey.

          Tür ayrımı yok: kullanıcı "haberlerim" ve "yazılarım" diye
          düşünmüyor, "gönderdiklerim" diye düşünüyor.
        */}
        {section === 'gonderilerim' && (
          <Panel
            title="Gönderilerim"
            status={
              myEntries.loading
                ? 'yükleniyor…'
                : `${myEntries.entries.length} içerik`
            }
            className="mb-4"
          >
            {gonderiHatasi && <Alert className="mb-3">{gonderiHatasi}</Alert>}

            {myEntries.error ? (
              <p className="py-3 text-meta leading-relaxed text-danger">
                Gönderilerin okunamadı: {myEntries.error}
              </p>
            ) : myEntries.loading ? (
              <p className="py-3 text-meta leading-relaxed text-muted-foreground">
                Gönderilerin yükleniyor…
              </p>
            ) : myEntries.entries.length === 0 ? (
              <p className="py-3 text-meta leading-relaxed text-muted-foreground">
                Henüz içerik göndermediniz. Gönderdiğiniz haber ve yazılar
                yönetim onayından sonra yayımlanır; durumları burada görünür.
              </p>
            ) : (
              <ul>
                {myEntries.entries.map((entry) => (
                  <PanelRow
                    key={entry.id}
                    to={
                      entry.status === 'yayinda'
                        ? `/${entry.kind === 'haber' ? 'haber' : 'yazi'}/${entry.slug}`
                        : undefined
                    }
                    title={entry.title}
                    meta={`${entry.kind} · ${entry.publishedAt}`}
                    note="henüz yayında değil"
                    badge={
                      <Badge tone={gonderiTonu(entry.status)}>
                        {contentStatusLabels[entry.status]}
                      </Badge>
                    }
                    action={
                      entry.status === 'taslak' ||
                      entry.status === 'reddedildi' ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            void gonderiIslemi(() => submitEntry(entry.id))
                          }
                        >
                          İncelemeye gönder
                        </Button>
                      ) : entry.status === 'incelemede' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            void gonderiIslemi(() => withdrawEntry(entry.id))
                          }
                        >
                          Geri çek
                        </Button>
                      ) : undefined
                    }
                  >
                    {entry.status === 'reddedildi' && entry.rejectionReason && (
                      <p className="mt-1 text-meta leading-relaxed text-danger">
                        Ret gerekçesi: {entry.rejectionReason}
                      </p>
                    )}
                  </PanelRow>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {section === 'ilanlar' && (
          <Panel
            title="İlanlarım"
            status={
              myListings.loading
                ? 'yükleniyor…'
                : `${myListings.listings.length} ilan`
            }
            className="mb-4"
          >
            {myListings.error ? (
              <p className="py-3 text-meta leading-relaxed text-danger">
                İlanlar okunamadı: {myListings.error}
              </p>
            ) : myListings.loading ? (
              <p className="py-3 text-meta leading-relaxed text-muted-foreground">
                İlanlarınız yükleniyor…
              </p>
            ) : myListings.listings.length === 0 ? (
              <p className="py-3 text-meta leading-relaxed text-muted-foreground">
                Henüz ilan vermediniz. Kullanmadığınız ekipmanı pazaryerinde
                satışa çıkarabilirsiniz.{' '}
                <Link to="/ilan/yeni" className="text-primary">
                  İlan ver →
                </Link>
              </p>
            ) : (
              <ul>
                {myListings.listings.map((listing) => (
                  <PanelRow
                    key={listing.slug}
                    to={
                      isListingPubliclyVisible(
                        listing.status,
                        listing.saleState
                      )
                        ? `/ilan/${listing.slug}`
                        : undefined
                    }
                    title={listing.title}
                    meta={`${formatListingPrice(listing.price, listing.currency)} · ${listing.city}`}
                    note="pazaryerinde görünmüyor"
                    badge={
                      listing.status && (
                        <Badge tone={listingStatusTone(listing.status)}>
                          {listingStatusLabels[listing.status]}
                        </Badge>
                      )
                    }
                    action={
                      listing.status === 'yayinda' &&
                      listing.saleState !== 'satildi' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={satiliyor}
                          onClick={() => {
                            setSatisHatasi(null);
                            setSatilacak(
                              satilacak === listing.slug ? null : listing.slug
                            );
                          }}
                        >
                          Satıldı
                        </Button>
                      )
                    }
                  >
                    {satilacak === listing.slug && (
                      <div className="mb-2.5 flex flex-wrap items-center gap-2 rounded-card border border-warm/40 bg-warm/8 px-3 py-2">
                        <span className="min-w-0 flex-1 text-meta leading-relaxed text-warm">
                          <strong>{listing.title}</strong> satıldı olarak
                          işaretlenecek ve pazaryerinden kaldırılacak. Kayıt,
                          fiyat geçmişi için panelinizde kalır.
                        </span>
                        <Button
                          size="sm"
                          disabled={satiliyor}
                          onClick={() => void satildiIsaretle(listing.slug)}
                        >
                          {satiliyor ? 'Kaydediliyor…' : 'Onayla'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={satiliyor}
                          onClick={() => setSatilacak(null)}
                        >
                          Vazgeç
                        </Button>
                        {satisHatasi && (
                          <p className="w-full text-meta leading-relaxed text-danger">
                            Güncellenemedi: {satisHatasi}
                          </p>
                        )}
                      </div>
                    )}
                  </PanelRow>
                ))}
              </ul>
            )}
            <p className="mt-2 text-meta leading-snug text-faint">
              Satılan ve arşivlenen ilanlarınız da burada kalır — pazaryeri
              listesinde yalnızca yayındakiler görünür.
            </p>
          </Panel>
        )}

        {/* Menü */}
        <ul
          aria-label="Panel bölümleri"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {menu.map((item) => (
            <li key={item.label}>
              <Link
                to={item.to}
                className="flex h-full items-center justify-between gap-2 rounded-card border border-border bg-surface-1 px-4 py-3.5 text-sm font-medium text-foreground transition-colors hover:border-border-strong hover:bg-surface-2"
              >
                {item.label}
                {item.note && (
                  <span className="tabular text-xs text-muted-foreground">
                    {item.note}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}

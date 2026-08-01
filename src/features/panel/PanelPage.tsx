import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { ButtonLink } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Readout } from '@/components/ui/Readout';
import { useAuth } from '@/features/auth/AuthContext';
import {
  formatQuotaLabel,
  remainingPhotoQuota,
  PHOTO_LIMITS,
  MAX_DRAFT_PHOTOS,
  type MembershipTier,
} from '@/domain/membership/quota';
import { PageMeta } from '@/components/seo/PageMeta';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { listSetups } from '@/features/setups/storage';
import {
  isListingPubliclyVisible,
  useMyListings,
} from '@/services/content/listings';
import { isPhotoPubliclyVisible, useMyPhotos } from '@/services/content/photos';
import {
  listingStatusLabels,
  type ListingStatus,
} from '@/features/marketplace/data';
import {
  photoStatusLabels,
  type PhotoStatus,
} from '@/features/photos/types';

/** Durum rengi: yayındaki yeşil, biten sönük, taslak uyarı sarısı. */
function listingStatusTone(status: ListingStatus): BadgeTone {
  if (status === 'active') return 'success';
  if (status === 'reserved') return 'primary';
  if (status === 'draft') return 'warning';
  return 'muted';
}

/** Fotoğrafta da aynı dil: yayında yeşil, taslak sarı, arşiv sönük. */
function photoStatusTone(status: PhotoStatus): BadgeTone {
  if (status === 'published') return 'success';
  if (status === 'draft') return 'warning';
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
      {to ? (
        <Link to={to} className={`group ${shared}`}>
          {body}
        </Link>
      ) : (
        <div className={shared}>{body}</div>
      )}
    </li>
  );
}

/**
 * Üye paneli (§7.16). Kamuya açık sayfalardan farklı olarak daha işlevsel
 * bir yerleşime izin verilir (§6.6). Gerçek veriler hesap sistemi
 * bağlandığında dolacak; kota göstergesi domain kurallarından beslenir.
 */
export function PanelPage() {
  const { user, configured } = useAuth();
  const { section } = useParams<{ section?: string }>();
  /*
   * Setup listesi her render'da değil, bölüm açıldığında okunuyor: liste
   * `localStorage`'dan gelir ve panelin diğer bölümlerinde gereksiz.
   */
  const setups = section === 'setuplar' ? listSetups() : [];
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
  const tier: MembershipTier = 'standart';
  const photoLimit = PHOTO_LIMITS[tier];
  const activePhotos = myPhotos.published;
  const quotaKnown = !myPhotos.loading && !myPhotos.error;

  const menu: { label: string; to: string; note?: string }[] = [
    {
      label: 'Fotoğraflarım',
      to: '/panel/fotograflar',
      note: quotaKnown ? formatQuotaLabel(activePhotos, tier) : undefined,
    },
    { label: 'Fotoğraf Yükle', to: '/galeri/yukle' },
    { label: "Setup'larım", to: '/panel/setuplar' },
    /*
     * "PLANLARIM" DEĞİL "PLANLAYICI".
     *
     * Planlayıcı çalışan bir araç ama planı KAYDETMİYOR (bkz.
     * `PlannerPage`: hesaplama tarayıcıda, çıktı yazdırılabilir bir
     * sayfa gibi). "Planlarım" demek, geri dönünce planını bulacağını
     * söylemekti; kullanıcı dönüp boş sayfa buluyordu. Kaydedilen plan
     * ayrı bir iş (gece oturumu günlüğü, Faz 7 MUST-03) — o gelene
     * kadar bağlantı ne olduğunu söylüyor.
     */
    { label: 'Planlayıcı', to: '/planlayici' },
    { label: 'Etkinliklerim', to: '/etkinlikler' },
    { label: 'Kayıtlı Noktalar', to: '/saha' },
    { label: 'İlanlarım', to: '/panel/ilanlar' },
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
          description={
            user
              ? `Hoş geldin, ${user.email}`
              : 'Hesap sistemi devreye alındığında burada içeriklerini yöneteceksin.'
          }
          actions={
            !user && (
              <ButtonLink to="/kayit" size="sm">
                Üye Ol
              </ButtonLink>
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
            value={quotaKnown ? formatQuotaLabel(activePhotos, tier) : '…'}
            hint={
              quotaKnown
                ? `${remainingPhotoQuota({ activePublished: activePhotos, drafts: myPhotos.drafts, tier })} hak kaldı`
                : 'okunuyor'
            }
          />
          <Readout
            label="Taslak"
            value={quotaKnown ? `${myPhotos.drafts} / ${MAX_DRAFT_PHOTOS}` : '…'}
            hint="yayımlanmamış kayıt"
            tone="cold"
          />
          <Readout
            label="Üyelik"
            value="—"
            hint="üyelik sistemi yakında"
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
                  />
                ))}
              </ul>
            )}
            <p className="mt-2 text-meta leading-snug text-faint">
              Kotayı yalnızca YAYINDAKİ kayıtlar tüketir; arşivlediğiniz
              fotoğraf silinmez, galeriden çıkar ve hakkı serbest bırakır.
            </p>
          </Panel>
        )}

        {section === 'setuplar' && (
          <Panel
            title="Kayıtlı setup'lar"
            status={`${setups.length} kayıt`}
            className="mb-4"
          >
            {setups.length === 0 ? (
              <p className="py-3 text-meta leading-relaxed text-muted-foreground">
                Henüz kayıtlı setup yok. Uyumluluk aracında bir zincir kurup
                kaydettiğinizde burada listelenir.{' '}
                <Link to="/araclar/setup-uyumluluk" className="text-primary">
                  Setup kur →
                </Link>
              </p>
            ) : (
              <ul>
                {setups.map((setup) => (
                  <li key={setup.id} className="border-b border-border last:border-0">
                    <Link
                      to={`/setup/${setup.id}`}
                      className="group flex items-baseline justify-between gap-3 py-2.5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-caption text-foreground group-hover:text-primary">
                          {setup.name}
                        </span>
                        <span className="mt-0.5 block truncate text-meta text-muted-foreground">
                          {setup.input.optic.name} · {setup.input.camera.name}
                        </span>
                      </span>
                      <span className="tabular shrink-0 text-meta text-faint">
                        {new Date(setup.savedAt).toLocaleDateString('tr-TR')}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-meta leading-snug text-faint">
              Setup'lar hesap sistemi gelene kadar bu tarayıcıda saklanır.
              Paylaşmak için setup sayfasındaki bağlantıyı kopyalayın — bağlantı
              değerleri kendi içinde taşır.
            </p>
          </Panel>
        )}

        {section === 'ilanlar' && (
          <Panel
            title="İlanlarım"
            status={myListings.loading ? 'yükleniyor…' : `${myListings.listings.length} ilan`}
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
                      isListingPubliclyVisible(listing.status)
                        ? `/ilan/${listing.slug}`
                        : undefined
                    }
                    title={listing.title}
                    meta={`${listing.price.toLocaleString('tr-TR')} ₺ · ${listing.city}`}
                    note="pazaryerinde görünmüyor"
                    badge={
                      listing.status && (
                        <Badge tone={listingStatusTone(listing.status)}>
                          {listingStatusLabels[listing.status]}
                        </Badge>
                      )
                    }
                  />
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

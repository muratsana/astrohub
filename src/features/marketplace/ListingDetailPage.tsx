import { useMemo, useState } from 'react';
import { adminEditPath } from '@/components/admin/adminEditPath';
import { Link, useParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel, SpecList, SpecRow } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Readout } from '@/components/ui/Readout';
import { ListingPhotos } from './ListingPhotos';
import { NotFoundPage } from '@/components/NotFoundPage';
import { PageMeta } from '@/components/seo/PageMeta';
import { absoluteUrl, breadcrumbJsonLd } from '@/lib/seo';
import {
  equipmentCategoryLabels,
  getEquipmentBySlug,
  equipmentPath,
} from '@/features/equipment/data';
import { ReportButton } from '@/features/admin/ReportButton';
import { MessageButton } from '@/features/social/MessageButton';
import { formatListingPrice, relatedListings, priceRange } from './data';
import { useListingBySlug } from '@/services/content/listings';
import { AdminEditLink } from '@/components/admin/AdminEditLink';

/**
 * İLAN DETAYI (§7.13).
 *
 * İki şey bilinçli olarak **yok**:
 *
 * 1. Satıcının telefonu / e-postası. İletişim platform içinden yürür
 *    (§7.13); ilan sayfasına doğrudan iletişim koymak, dolandırıcılığın
 *    en yaygın kanalını açar ve moderasyonu devre dışı bırakır. Mesaj
 *    altyapısı (Faz 2) gelene kadar düğme durumunu açıkça söylüyor.
 *
 * 2. "Güvenli ödeme" iddiası. Escrow yok; olmayan bir güvenceyi ima etmek,
 *    hiç uyarı vermemekten kötüdür. Uyarı kutusu bu yüzden ne yaptığımızı
 *    değil, kullanıcının neyi kendisinin yapması gerektiğini anlatıyor.
 *
 * Fiyat bağlamı (kategori medyanı) gösterilir: ikinci elde en çok sorulan
 * soru "bu fiyat normal mi" ve buna cevap verecek veri zaten elimizde.
 */

const conditionTone = {
  'Sıfır gibi': 'success',
  'Çok iyi': 'primary',
  İyi: 'muted',
  Yıpranmış: 'warning',
} as const;

export function ListingDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  /*
   * İLAN VERİTABANINDAN OKUNUYOR.
   *
   * Burada eskiden `getListingBySlug(slug)` vardı — yani sayfa yalnızca
   * `data.ts` içindeki örnek ilanları tanıyordu. Kullanıcının yayımladığı
   * her ilan, oluşturulduğu anda 404 veriyordu: kayıt veritabanına
   * yazılıyor, pazaryeri listesinde görünüyor, ama detayına
   * gidilemiyordu. Öteki detay sayfaları (etkinlik, fotoğraf) katalog
   * kancasını kullanıyordu; ilan tek başına statik dosyada kalmıştı.
   */
  const { listing: bulunan, loading } = useListingBySlug(slug);
  const listing = bulunan ?? undefined;

  const related = useMemo(
    () => (listing ? relatedListings(listing) : []),
    [listing]
  );
  const range = useMemo(
    () => (listing ? priceRange(listing.category) : null),
    [listing]
  );
  const model = listing?.equipmentSlug
    ? getEquipmentBySlug(listing.equipmentSlug)
    : undefined;

  /* YÜKLENİRKEN 404 ÇİZİLMİYOR. Sorgu bir tur sürüyor; o sırada
     "sayfa bulunamadı" göstermek, var olan bir ilanı yok gibi
     gösterirdi ve kullanıcı sayfayı kapatırdı. */
  if (loading) {
    return (
      <Container className="py-16">
        <p className="text-body-sm text-muted-foreground">İlan yükleniyor…</p>
      </Container>
    );
  }

  if (!listing) return <NotFoundPage />;

  const postedAt = new Date(listing.postedAt).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const priceLabel = formatListingPrice(listing.price, listing.currency);
  const listingPath = `/ilan/${listing.slug}`;
  const listingUrl = absoluteUrl(listingPath);
  const shareDescription =
    listing.description?.trim() ||
    `${listing.title} — ${listing.city}, ${priceLabel}. Astrohub ikinci el ilanı.`;

  return (
    <>
      <PageMeta
        title={listing.title}
        description={shareDescription}
        canonicalPath={listingPath}
        image={
          listing.imageUrl
            ? { url: listing.imageUrl, alt: `${listing.title} ilan fotoğrafı` }
            : undefined
        }
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'İlanlar', path: '/ilanlar' },
          { name: listing.title, path: listingPath },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'İlanlar', to: '/ilanlar' },
            { label: equipmentCategoryLabels[listing.category] },
          ]}
          title={listing.title}
          meta={`${listing.city} · ${postedAt}`}
          actions={
            <>
              <AdminEditLink to={adminEditPath('listing', listing.slug)} />
              <Badge tone={conditionTone[listing.condition]}>
                {listing.condition}
              </Badge>
              {listing.hasInvoice && <Badge tone="cold">Faturalı</Badge>}
              {listing.shippingOk && <Badge>Kargo</Badge>}
            </>
          }
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          {/* ───────── Sol: görsel + açıklama ───────── */}
          <div className="space-y-4">
            {/*
              İkinci el ekipman ilanında fotoğraf SÜS DEĞİL, İLANIN
              KENDİSİ: alıcı tüpteki çiziği, odaklayıcının boşluğunu,
              kutudaki eksik parçayı oradan görüyor. Burada yıllarca
              yıldız alanı çizilip "medya pipeline'ı bağlandığında
              açılacak" yazıyordu; boru hattı 0012'de bağlanmıştı,
              eksik olan ilan tarafıydı (0038).
            */}
            <ListingPhotos listing={listing} />

            {listing.description && (
              <Panel title="İlan metni">
                <p className="whitespace-pre-line text-caption leading-relaxed text-muted-foreground">
                  {listing.description}
                </p>
              </Panel>
            )}

            {listing.includes && listing.includes.length > 0 && (
              <Panel title="Pakete dâhil">
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {listing.includes.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2 text-meta leading-relaxed text-muted-foreground"
                    >
                      <span aria-hidden className="text-primary">
                        ·
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            <Panel title="Alım-satım güvenliği" className="border-warning/35">
              <ul className="space-y-2 text-meta leading-relaxed text-muted-foreground">
                <li>
                  Astrohub bir{' '}
                  <strong className="text-foreground">
                    emanet (escrow) hizmeti sunmaz
                  </strong>
                  . Ödeme ve teslimat tamamen taraflar arasındadır; platform
                  ödemeye aracılık etmez.
                </li>
                <li>
                  Mümkünse{' '}
                  <strong className="text-foreground">
                    elden teslim ve yerinde deneme
                  </strong>{' '}
                  yapın. Optik ve montürde asıl kusurlar fotoğrafta görünmez:
                  kolimasyon, dişli boşluğu, sensör tozu.
                </li>
                <li>
                  Kapora isteyen, iletişimi platform dışına taşımak için ısrar
                  eden ya da fiyatı piyasanın belirgin altında tutan ilanlara
                  karşı dikkatli olun.
                </li>
                <li>
                  Şüpheli bir durumda ilanı bildirin; moderasyon kuyruğu
                  incelemeye alır (§13).
                </li>
              </ul>
              <ReportButton
                className="mt-3"
                targetType="listing"
                targetId={listing.slug}
                targetPath={`/ilan/${listing.slug}`}
              />
            </Panel>
          </div>

          {/* ───────── Sağ: fiyat, satıcı, ilişkili ───────── */}
          <div className="space-y-4">
            <Panel title="Fiyat">
              <div className="grid grid-cols-2 gap-2">
                <Readout
                  label="İstenen"
                  value={priceLabel}
                />
                <Readout
                  label="Kategori medyanı"
                  value={range ? range.median.toLocaleString('tr-TR') : '—'}
                  hint={
                    range
                      ? `${formatListingPrice(range.min)}–${formatListingPrice(range.max)} aralığı`
                      : 'karşılaştırılacak ikinci ilan yok'
                  }
                  tone="cold"
                />
              </div>

              <p className="mt-3 text-meta leading-relaxed text-muted-foreground">
                {listing.negotiable
                  ? 'Satıcı pazarlık payı olduğunu belirtmiş.'
                  : 'Satıcı fiyatın sabit olduğunu belirtmiş.'}
              </p>

              {/*
                DÜĞME ARTIK ÇALIŞIYOR (Faz 5). Buraya kadar `disabled`
                duruyordu ve yanındaki metin "Faz 2'de açılacak" diyordu:
                alıcının satıcıya ulaşmasının HİÇBİR yolu yoktu ve
                kullanıcılar iletişimi yorum alanına taşıyordu — tam olarak
                engellemeye çalıştığımız şey.

                Satıcı kimliği yalnızca veritabanı kaydında var; tohum
                ilanlarda yok. `MessageButton` o durumda kendini gizliyor,
                yerine aşağıdaki açıklama kalıyor.
              */}
              <div className="mt-3 space-y-2">
                <MessageButton
                  targetUserId={listing.sellerId}
                  label="Satıcıya Mesaj Gönder"
                />
                <ListingSharePanel
                  title={listing.title}
                  description={shareDescription}
                  url={listingUrl}
                />
                <p className="text-meta leading-snug text-faint">
                  İletişimin platform içinde kalması, anlaşmazlıkta kaydın
                  moderasyona açık olmasını sağlar — bu yüzden ilanlarda telefon
                  ve e-posta yayımlanmaz.
                </p>
              </div>
            </Panel>

            <Panel title="Satıcı">
              <div className="flex items-center gap-2">
                <Link
                  to={`/profil/${listing.seller.username}`}
                  className="text-body-sm font-medium text-foreground transition-colors hover:text-primary"
                >
                  @{listing.seller.username}
                </Link>
                {listing.seller.verified && (
                  <Badge tone="cold">Doğrulanmış</Badge>
                )}
              </div>

              <SpecList className="mt-2">
                {/*
                  SIFIR PUAN "0.0 / 5" DİYE BASILMIYOR.

                  Veritabanından gelen her satıcının puanı 0: puanlama
                  henüz üretilmiyor (`mapListingRow`). "0.0 / 5" yazmak
                  yeni satıcıyı KÖTÜ PUANLI gösteriyordu — olmayan bir
                  güven işaretini var göstermek kadar zararlı, çünkü
                  alıcı bunu bir hüküm sanıyor. Veri yokken cümle de
                  yok.
                */}
                <SpecRow
                  label="Değerlendirme"
                  value={
                    listing.seller.rating > 0
                      ? `${listing.seller.rating.toFixed(1)} / 5`
                      : 'Henüz değerlendirme yok'
                  }
                  tone={listing.seller.rating > 0 ? 'primary' : undefined}
                />
                {listing.seller.sales !== undefined && (
                  <SpecRow
                    label="Tamamlanan satış"
                    value={String(listing.seller.sales)}
                  />
                )}
                {listing.seller.memberSince && (
                  <SpecRow
                    label="Üyelik"
                    value={listing.seller.memberSince}
                    tone="muted"
                  />
                )}
                <SpecRow label="Konum" value={listing.city} />
                <SpecRow
                  label="Kargo"
                  value={listing.shippingOk ? 'Gönderiyor' : 'Elden teslim'}
                  tone="muted"
                />
              </SpecList>
            </Panel>

            {model && (
              <Panel title="Ekipman künyesi">
                <SpecList>
                  {Object.entries(model.specs).map(([key, value]) => (
                    <SpecRow key={key} label={key} value={value} tone="cold" />
                  ))}
                </SpecList>
                <div className="mt-3">
                  <ButtonLink
                    to={equipmentPath(model)}
                    size="sm"
                    variant="secondary"
                  >
                    Model Sayfası
                  </ButtonLink>
                </div>
              </Panel>
            )}

            {related.length > 0 && (
              <Panel
                title="Benzer ilanlar"
                status={equipmentCategoryLabels[listing.category]}
              >
                <ul>
                  {related.map((item) => (
                    <li
                      key={item.slug}
                      className="border-b border-border last:border-0"
                    >
                      <Link
                        to={`/ilan/${item.slug}`}
                        className="flex items-baseline justify-between gap-3 py-2 transition-colors hover:text-primary"
                      >
                        <span className="min-w-0 truncate text-meta text-foreground">
                          {item.title}
                        </span>
                        <span className="tabular shrink-0 text-body-sm text-primary">
                          {formatListingPrice(item.price, item.currency)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>
        </div>
      </Container>
    </>
  );
}

function ListingSharePanel({
  title,
  description,
  url,
}: {
  title: string;
  description: string;
  url: string;
}) {
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`${title}\n${description}\n${url}`);

  async function share() {
    setCopied(false);
    if (navigator.share) {
      await navigator.share({ title, text: description, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <div className="rounded-card border border-border bg-surface-2 px-2.5 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => void share()}>
          {copied ? 'Link kopyalandı' : 'İlanı paylaş'}
        </Button>
        <a
          href={`https://wa.me/?text=${encodedText}`}
          target="_blank"
          rel="noreferrer"
          className="text-meta font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          WhatsApp
        </a>
        <a
          href={`https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(title)}`}
          target="_blank"
          rel="noreferrer"
          className="text-meta font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          Telegram
        </a>
        <a
          href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodedText}`}
          className="text-meta font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          E-posta
        </a>
      </div>
    </div>
  );
}

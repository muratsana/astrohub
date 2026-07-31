import { useMemo } from 'react';
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
import { breadcrumbJsonLd } from '@/lib/seo';
import {
  equipmentCategoryLabels,
  getEquipmentBySlug,
  equipmentPath,
} from '@/features/equipment/data';
import { ReportButton } from '@/features/admin/ReportButton';
import { getListingBySlug, relatedListings, priceRange } from './data';

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
  const listing = slug ? getListingBySlug(slug) : undefined;

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

  if (!listing) return <NotFoundPage />;

  const postedAt = new Date(listing.postedAt).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      <PageMeta
        title={listing.title}
        description={
          listing.description ??
          `${listing.title} — ${listing.city}, ${listing.price.toLocaleString('tr-TR')} ₺. Astrohub ikinci el ilanı.`
        }
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'İlanlar', path: '/ilanlar' },
          { name: listing.title, path: `/ilan/${listing.slug}` },
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
                <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-muted-foreground">
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
                      className="flex gap-2 text-[12px] leading-relaxed text-muted-foreground"
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
              <ul className="space-y-2 text-[12px] leading-relaxed text-muted-foreground">
                <li>
                  Astrohub bir <strong className="text-foreground">emanet
                  (escrow) hizmeti sunmaz</strong>. Ödeme ve teslimat tamamen
                  taraflar arasındadır; platform ödemeye aracılık etmez.
                </li>
                <li>
                  Mümkünse <strong className="text-foreground">elden teslim ve
                  yerinde deneme</strong> yapın. Optik ve montürde asıl kusurlar
                  fotoğrafta görünmez: kolimasyon, dişli boşluğu, sensör tozu.
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
                  value={listing.price.toLocaleString('tr-TR')}
                  unit="₺"
                />
                <Readout
                  label="Kategori medyanı"
                  value={
                    range ? range.median.toLocaleString('tr-TR') : '—'
                  }
                  unit={range ? '₺' : undefined}
                  hint={
                    range
                      ? `${range.min.toLocaleString('tr-TR')}–${range.max.toLocaleString('tr-TR')} ₺ aralığı`
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

              <div className="mt-3 space-y-2">
                <Button
                  className="w-full"
                  disabled
                  title="Platform içi mesajlaşma Faz 2'de açılacak"
                >
                  Satıcıya Mesaj Gönder
                </Button>
                <p className="text-meta leading-snug text-faint">
                  Platform içi mesajlaşma Faz 2'de açılacak. İletişimin
                  platform içinde kalması, anlaşmazlıkta kaydın moderasyona
                  açık olmasını sağlar — bu yüzden ilanlarda telefon ve
                  e-posta yayımlanmaz.
                </p>
              </div>
            </Panel>

            <Panel title="Satıcı">
              <div className="flex items-center gap-2">
                <Link
                  to={`/profil/${listing.seller.username}`}
                  className="text-[13px] font-medium text-foreground transition-colors hover:text-primary"
                >
                  @{listing.seller.username}
                </Link>
                {listing.seller.verified && <Badge tone="cold">Doğrulanmış</Badge>}
              </div>

              <SpecList className="mt-2">
                <SpecRow
                  label="Değerlendirme"
                  value={`${listing.seller.rating.toFixed(1)} / 5`}
                  tone="primary"
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
                    <li key={item.slug} className="border-b border-border last:border-0">
                      <Link
                        to={`/ilan/${item.slug}`}
                        className="flex items-baseline justify-between gap-3 py-2 transition-colors hover:text-primary"
                      >
                        <span className="min-w-0 truncate text-[12px] text-foreground">
                          {item.title}
                        </span>
                        <span className="tabular shrink-0 text-body-sm text-primary">
                          {item.price.toLocaleString('tr-TR')} ₺
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

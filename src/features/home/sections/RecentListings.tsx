import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import {
  ContentCard,
  ContentCardBody,
  ContentCardMedia,
  ContentCardMeta,
  ContentCardTitle,
} from '@/components/ui/ContentCard';
import { RemoteImage } from '@/components/media/RemoteImage';
import { tintFromSeed } from '@/components/media/tints';
import { equipmentCategoryLabels } from '@/features/equipment/taxonomy';
import { useRecentListings } from '@/services/content/recentListings';

/**
 * SON İLANLAR — ana sayfanın son bölümü.
 *
 * Sayfanın en altında pazaryeri duruyor çünkü ziyaretçinin ilk işi
 * alışveriş değil: önce gökyüzü (bu gece), sonra topluluk (galeri,
 * haber, etkinlik), en sonda ikinci el. Sıra bir öncelik beyanı.
 *
 * IZGARA GALERİ SATIRIYLA AYNI. Önce dört ilan, 16:9 görselle dört
 * kolonda duruyordu; hemen üstündeki galeri satırı beş kolon ve 4:3'tü.
 * İki şerit yan yana geldiğinde kart boyları tutmuyor, sayfa
 * hizalanmamış görünüyordu. Artık kolon sayısı, oran ve iç ölçüler
 * galeriyle birebir aynı — beş ilan, beş karo.
 *
 * Fiyat karttaki en güçlü öğe — ikinci el ekipmanda ilk bakılan şey o.
 *
 * Kart görseli ilanın kendi fotoğrafından gelir. Fotoğraf yoksa ya da
 * adres bozulduysa ortak `RemoteImage` fallback'i yıldız alanına iner;
 * kırık görsel ikonu gösterilmez.
 */
/** Sayı ve başlık `home_modules`tan gelir; verilmezse bugünkü davranış. */
export function RecentListings({
  limit = 5,
  title = 'Son İlanlar',
}: { limit?: number; title?: string } = {}) {
  const catalog = useRecentListings();
  const listings = catalog.items;
  const recent = [...listings]
    .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
    .slice(0, limit);

  return (
    <Container className="py-9 sm:py-11">
      <SectionHeader
        title={title}
        meta={`${listings.length} ilan`}
        /* Kısaltıldı: satıcı puanı kartın künyesinde görünüyor. */
        description="Topluluğun ikinci el ekipman ilanları."
        linkTo="/ilanlar"
        linkLabel="Tüm ilanlar"
      />

      {recent.length === 0 ? (
        <p className="rounded-card border border-border bg-surface-1 px-3 py-6 text-center text-meta text-muted-foreground">
          Yayında ilan yok.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {recent.map((listing) => (
            <li key={listing.slug}>
              <ContentCard to={`/ilan/${listing.slug}`}>
                <ContentCardMedia
                  badge={
                    <Badge tone="muted" className="bg-background/85">
                      {equipmentCategoryLabels[listing.category]}
                    </Badge>
                  }
                >
                  <RemoteImage
                    src={listing.imageUrl}
                    alt={`${listing.title} fotoğrafı`}
                    seed={listing.slug}
                    tint={tintFromSeed(listing.slug)}
                    sizes="(min-width: 1024px) 180px, (min-width: 640px) 33vw, 50vw"
                  />
                </ContentCardMedia>

                <ContentCardBody>
                  <ContentCardTitle lines={2} className="font-medium leading-snug">
                    {listing.title}
                  </ContentCardTitle>
                  <p className="tabular mt-1.5 font-display text-readout-sm font-bold leading-none text-primary">
                    {listing.price.toLocaleString('tr-TR')} ₺
                  </p>
                  <ContentCardMeta className="mt-auto pt-1">
                    {listing.city} · @{listing.seller.username} · ★{' '}
                    {listing.seller.rating.toFixed(1)}
                  </ContentCardMeta>
                </ContentCardBody>
              </ContentCard>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

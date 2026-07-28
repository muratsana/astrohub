import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { PlateFrame } from '@/components/media/PlateFrame';
import { StarField } from '@/components/media/StarField';
import { tintFromSeed } from '@/components/media/tints';
import { listings } from '@/features/marketplace/data';
import { equipmentCategoryLabels } from '@/features/equipment/data';

/**
 * SON İLANLAR — ana sayfanın son bölümü.
 *
 * Sayfanın en altında pazaryeri duruyor çünkü ziyaretçinin ilk işi
 * alışveriş değil: önce gökyüzü (bu gece), sonra topluluk (galeri,
 * haber, etkinlik), en sonda ikinci el. Sıra bir öncelik beyanı.
 *
 * Dört ilan gösteriliyor, tarihe göre en yeniler. Fiyat karttaki en
 * güçlü öğe — ikinci el ekipmanda ilk bakılan şey o.
 *
 * Görsel yok: ilan fotoğrafları satıcıya ait ve medya hattı (Faz 2)
 * devreye girene kadar yükleme yok. Yıldız alanı yer tutuyor;
 * internetten bulunmuş bir ürün fotoğrafı koymak telif sorunu olurdu.
 */
export function RecentListings() {
  const recent = [...listings]
    .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
    .slice(0, 4);

  return (
    <Container className="py-9 sm:py-11">
      <SectionHeader
        title="Son İlanlar"
        meta={`${listings.length} ilan`}
        description="Topluluğun ikinci el ekipman ilanları — künyesi ekipman veritabanına bağlı, satıcı puanıyla birlikte."
        linkTo="/ilanlar"
        linkLabel="Tüm ilanlar"
      />

      {recent.length === 0 ? (
        <p className="rounded-card border border-border bg-surface-1 px-3 py-6 text-center text-[12px] text-muted-foreground">
          Yayında ilan yok.
        </p>
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {recent.map((listing) => (
            <li key={listing.slug}>
              <Link
                to={`/ilan/${listing.slug}`}
                className="group flex h-full flex-col rounded-card border border-border bg-surface-1 transition-colors hover:border-border-strong"
              >
                <PlateFrame
                  ratio="aspect-[16/9]"
                  className="border-0 border-b border-border"
                  badge={
                    <Badge tone="muted" className="bg-background/85">
                      {equipmentCategoryLabels[listing.category]}
                    </Badge>
                  }
                  flag={
                    listing.seller.verified ? (
                      <Badge tone="cold" className="bg-background/85">
                        Doğrulanmış
                      </Badge>
                    ) : undefined
                  }
                >
                  <StarField
                    seed={listing.slug}
                    tint={tintFromSeed(listing.slug)}
                  />
                </PlateFrame>

                <div className="flex flex-1 flex-col px-2.5 py-2">
                  <h3 className="line-clamp-2 text-[12.5px] font-medium leading-snug text-foreground transition-colors group-hover:text-primary">
                    {listing.title}
                  </h3>
                  <p className="tabular mt-1.5 font-display text-[17px] font-bold leading-none text-primary">
                    {listing.price.toLocaleString('tr-TR')} ₺
                  </p>
                  <p className="tabular mt-1 truncate text-[10px] text-muted-foreground">
                    {listing.city} · @{listing.seller.username} · ★{' '}
                    {listing.seller.rating.toFixed(1)}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-1 pt-2">
                    <Badge>{listing.condition}</Badge>
                    {listing.hasInvoice && <Badge tone="success">Faturalı</Badge>}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

import { Badge } from '@/components/ui/Badge';
import { SolveOverlay } from './SolveOverlay';
import { PhotoTile } from '@/components/media/PhotoTile';
import { formatIntegration } from '@/domain/photography/integration';
import { photoIntegrationSeconds } from './filtering';
import { tintForPhoto } from './tint';
import { familyOf, photoFamilies } from './families';
import { RatingBadge } from './RatingBadge';
import type { AstroPhoto } from './types';
import { formatPhotoWeekLabel } from './weeklyPick';

/**
 * FOTOĞRAF KARTI — `AstroPhoto` kaydını `PhotoTile`a bağlayan tek yer.
 *
 * `PhotoTile` bilinçli olarak "aptal" bir bileşen: yalnızca hazır alanlar
 * alır, veri modelini tanımaz (medya bileşenleri feature katmanına bağlı
 * olmamalı). Bunun bedeli, kartı kullanan her sayfanın aynı on satırlık
 * eşlemeyi tekrar yazması. Galeri bu eşlemeyi yerinde tutuyordu; ekipman
 * detayı ve hedef detayı da aynı kartı gösterince eşleme üç yere düşecekti
 * — ton hesabı ya da entegrasyon biçimi birinde değişip diğerinde kalırdı.
 */
export function PhotoCard({
  photo,
  variant = 'grid',
}: {
  photo: AstroPhoto;
  variant?: 'grid' | 'list';
}) {
  const info = photoFamilies[familyOf(photo.type)];
  /* Kart her zaman ızgara boyunda: küçük kopya varsa onu indir, yoksa tam
     boya düş. Eskiden koşulsuz `url` kullanılıyordu ve 160–320 px'lik kutuya
     2048 px'lik dosya iniyordu. */
  const imageUrl = photo.image?.thumbUrl ?? photo.image?.url;

  return (
    <PhotoTile
      variant={variant}
      to={`/fotograf/${photo.slug}`}
      seed={photo.slug}
      imageUrl={imageUrl}
      tint={tintForPhoto(photo.target.catalog)}
      target={photo.target.catalog}
      title={photo.title}
      palette={photo.palette}
      integration={formatIntegration(photoIntegrationSeconds(photo))}
      bortle={photo.location.bortle}
      username={photo.user.username}
      family={{ label: info.label, className: info.className }}
      bodyBadges={
        (photo.photoOfWeekWins?.length ?? 0) > 0 ? (
          <Badge tone="success" className="bg-background/85">
            {formatPhotoWeekLabel(photo.photoOfWeekWins!.at(-1)!).weekLabel}
          </Badge>
        ) : undefined
      }
      /*
        ÖLÇÜMLER İMLEÇ GELİNCE KARONUN ÜSTÜNDE.

        Rozet "çözüldü" diyor ama değeri söylemiyordu; koordinat, kadraj
        ve ölçek için her karta tek tek girmek gerekiyordu. Katman
        yalnızca çözülmüş kayıtta çiziliyor ve kartın bağlantısını
        yutmuyor (gerekçe `SolveOverlay` başlığında).
      */
      overlay={<SolveOverlay solve={photo.solve} />}
      flag={
        photo.rating.sayi > 0 ? (
          <RatingBadge rating={photo.rating} className="bg-background/85" />
        ) : undefined
      }
    />
  );
}

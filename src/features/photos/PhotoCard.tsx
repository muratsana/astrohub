import { Badge } from '@/components/ui/Badge';
import { PhotoTile } from '@/components/media/PhotoTile';
import { formatIntegration } from '@/domain/photography/integration';
import { photoIntegrationSeconds } from './filtering';
import { tintForPhoto } from './tint';
import { familyOf, photoFamilies } from './families';
import { RatingBadge } from './RatingBadge';
import type { AstroPhoto } from './types';

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

  return (
    <PhotoTile
      variant={variant}
      to={`/fotograf/${photo.slug}`}
      seed={photo.slug}
      imageUrl={photo.image?.url}
      tint={tintForPhoto(photo.target.catalog)}
      target={photo.target.catalog}
      title={photo.title}
      palette={photo.palette}
      integration={formatIntegration(photoIntegrationSeconds(photo))}
      bortle={photo.location.bortle}
      username={photo.user.username}
      family={{ label: info.label, className: info.className }}
      /*
       * Rozet alanı iki işareti birden taşıyor: editör seçkisi ve puan
       * ortalaması. `RatingBadge` oy yokken kendini hiç çizmiyor, o
       * yüzden yeni yüklenmiş bir kart boş bir rozetle kalabalıklaşmıyor.
       */
      flag={
        photo.editorsPick || photo.rating.sayi > 0 || (photo.photoOfWeekWins?.length ?? 0) > 0 ? (
          <>
            {(photo.photoOfWeekWins?.length ?? 0) > 0 && (
              <Badge tone="success" className="bg-background/85">
                Haftanın Fotoğrafı · {photo.photoOfWeekWins?.at(-1)}
              </Badge>
            )}
            {photo.editorsPick && (
              <Badge tone="primary" className="bg-background/85">
                Editör
              </Badge>
            )}
            <RatingBadge rating={photo.rating} className="bg-background/85" />
          </>
        ) : undefined
      }
    />
  );
}

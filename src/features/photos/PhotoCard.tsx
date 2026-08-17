import { Badge } from '@/components/ui/Badge';
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
      /*
       * Rozet alanı üç işareti birden taşıyor: editör seçkisi, puan
       * ortalaması ve alan çözümü. `RatingBadge` oy yokken kendini hiç
       * çizmiyor, o yüzden yeni yüklenmiş bir kart boş bir rozetle
       * kalabalıklaşmıyor.
       *
       * ALAN ÇÖZÜMÜ ROZETİ galeride bir şey söylüyor: bu karenin
       * gökyüzündeki yeri ÖLÇÜLMÜŞ. Künyedeki hedef adı bir iddia,
       * çözüm bir ölçüm; rozet ikisi arasındaki farkı liste düzeyinde
       * görünür kılıyor. Yalnızca çözülmüş kayıtlarda var — "sırada"
       * ya da "başarısız" bir liste kartında anlatılacak şey değil.
       */
      flag={
        photo.solve.durum === 'cozuldu' ||
        photo.editorsPick ||
        photo.rating.sayi > 0 ||
        (photo.photoOfWeekWins?.length ?? 0) > 0 ? (
          <>
            {(photo.photoOfWeekWins?.length ?? 0) > 0 && (
              <Badge tone="success" className="bg-background/85">
                {formatPhotoWeekLabel(photo.photoOfWeekWins!.at(-1)!).weekLabel}
              </Badge>
            )}
            {photo.editorsPick && (
              <Badge tone="primary" className="bg-background/85">
                Editör
              </Badge>
            )}
            {photo.solve.durum === 'cozuldu' && (
              <Badge tone="cold" className="bg-background/85">
                ⌖ Çözüldü
              </Badge>
            )}
            <RatingBadge rating={photo.rating} className="bg-background/85" />
          </>
        ) : undefined
      }
    />
  );
}

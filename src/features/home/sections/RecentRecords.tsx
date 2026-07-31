import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PhotoTile } from '@/components/media/PhotoTile';
import { usePhotoCatalog } from '@/services/content/photos';
import {
  formatIntegration,
  totalIntegrationSeconds,
} from '@/domain/photography/integration';
import { tintFor } from '@/components/media/tints';
import { Badge } from '@/components/ui/Badge';
import { familyOf, photoFamilies } from '@/features/photos/families';
import { targets } from '@/features/targets/data';

/**
 * GALERİDEN SON YÜKLENENLER.
 *
 * Topluluğun ürettiği kayıtlar öne alınır: site kendini anlatmadan önce
 * çalışırken gösterir. Künye her karoda görünür (yön kararı).
 */

/** Fotoğrafın hedef türünü katalogdan bulup yıldız alanı tonunu seçer. */
function tintForPhoto(catalog: string): string {
  const target = targets.find(
    (t) => t.catalog === catalog || t.aliases.includes(catalog)
  );
  return tintFor(target?.kind);
}

export function RecentRecords() {
  const photos = usePhotoCatalog().items;
  const recent = photos.slice(0, 10);

  return (
    <Container className="py-9 sm:py-11">
      <SectionHeader
        title="Galeriden Son Yüklenenler"
        meta={`${photos.length} fotoğraf`}
        linkTo="/galeri"
        linkLabel="Galeri"
      />

      {recent.length === 0 ? (
        /*
         * BOŞ GALERİ SESSİZ KALMAMALI.
         *
         * Bölüm boş listede yalnızca başlığı ve `Container`ın dolgusunu
         * çiziyordu: canlıda "0 fotoğraf" yazısının altında yüz piksellik
         * bir boşluk kalıyor ve sayfa bozuk görünüyordu. Kardeş bölümler
         * (Son İlanlar, Yaklaşan Etkinlikler) bu durumu zaten karşılıyordu;
         * eksik olan tek bölüm buydu.
         *
         * Boşluk yayın öncesi geçici bir durum değil, T-203'ün doğrudan
         * sonucu: boş bir veritabanı tablosu artık üretimde tohum veriye
         * DÜŞMÜYOR. Doğru karar — sahte fotoğrafla dolu bir galeri
         * kullanıcıyı yanıltırdı — ama arayüzün buna bir cevabı olması
         * gerekiyordu.
         *
         * Cevap ölü bir cümle değil çağrı: burası sitenin çekirdek içeriği
         * ve boş olması ilk yükleyecek kişi için bir fırsat.
         */
        <p className="rounded-card border border-border bg-surface-1 px-3 py-6 text-center text-[12px] text-muted-foreground">
          Galeride henüz yayımlanmış fotoğraf yok.{' '}
          <Link to="/galeri/yukle" className="text-primary hover:underline">
            İlk kareyi sen yükle →
          </Link>
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {recent.map((photo) => (
            <li key={photo.slug}>
              <PhotoTile
                to={`/fotograf/${photo.slug}`}
                seed={photo.slug}
                tint={tintForPhoto(photo.target.catalog)}
                target={photo.target.catalog}
                title={photo.title}
                palette={photo.palette}
                integration={formatIntegration(
                  totalIntegrationSeconds(photo.exposures)
                )}
                bortle={photo.location.bortle}
                username={photo.user.username}
                family={{
                  label: photoFamilies[familyOf(photo.type)].label,
                  className: photoFamilies[familyOf(photo.type)].className,
                }}
                flag={
                  photo.editorsPick ? (
                    <Badge tone="primary" className="bg-background/85">
                      Editör
                    </Badge>
                  ) : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

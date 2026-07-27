import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PhotoTile } from '@/components/media/PhotoTile';
import { photos } from '@/features/photos/data';
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
  const recent = photos.slice(0, 10);

  return (
    <Container className="py-9 sm:py-11">
      <SectionHeader
        title="Galeriden Son Yüklenenler"
        meta={`${photos.length} fotoğraf`}
        linkTo="/galeri"
        linkLabel="Galeri"
      />

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
    </Container>
  );
}

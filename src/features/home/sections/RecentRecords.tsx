import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PhotoTile } from '@/components/media/PhotoTile';
import { photos } from '@/features/photos/data';
import {
  formatIntegration,
  totalIntegrationSeconds,
} from '@/domain/photography/integration';
import { tintFor } from '@/components/media/tints';
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
  const recent = photos.slice(0, 8);

  return (
    <Container className="py-12 sm:py-14">
      <SectionHeader
        title="Galeriden Son Yüklenenler"
        meta={`${photos.length} fotoğraf`}
        linkTo="/galeri"
        linkLabel="Galeri"
      />

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
              badge={photo.editorsPick ? 'Editör' : undefined}
            />
          </li>
        ))}
      </ul>
    </Container>
  );
}

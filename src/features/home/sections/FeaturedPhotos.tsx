import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PhotoPlaceholder } from '@/components/media/PhotoPlaceholder';
import { SparkleIcon } from '@/components/ui/icons';
import { featuredPhotos } from '../data';

/**
 * Öne çıkan astrofotoğraflar (§7.1 / §7.2). Geniş görsel kartlar.
 * §6.6: yan yana en fazla 5 büyük içerik kartı. Kartta çok ekipman bilgisi yok.
 */
export function FeaturedPhotos() {
  return (
    <section className="pt-16 sm:pt-20">
      <Container>
        <SectionHeader
          title="Öne Çıkan Fotoğraflar"
          description="Topluluğun en beğenilen kareleri"
          icon={<SparkleIcon className="h-5 w-5" />}
          linkTo="/fotograflar"
        />
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {featuredPhotos.map((photo) => (
            <li key={photo.id}>
              <Link
                to={`/fotograf/${photo.id}`}
                className="group block"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-card">
                  <PhotoPlaceholder
                    gradient={photo.gradient}
                    alt={`${photo.title} — @${photo.user}`}
                    className="h-full w-full border border-border transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  {photo.integration && (
                    <span className="tabular absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-foreground backdrop-blur-sm">
                      {photo.integration}
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <p className="truncate text-sm font-medium text-foreground">
                    {photo.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    @{photo.user}
                    {typeof photo.likes === 'number' && (
                      <span className="tabular"> · ♥ {photo.likes}</span>
                    )}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

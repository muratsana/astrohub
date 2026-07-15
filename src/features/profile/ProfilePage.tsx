import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { PhotoPlaceholder } from '@/components/media/PhotoPlaceholder';
import { PlaceholderPage } from '@/components/PlaceholderPage';
import {
  totalIntegrationSeconds,
  formatIntegration,
} from '@/domain/photography/integration';
import { photos } from '@/features/photos/data';

/**
 * Kullanıcı profili (§7.15). MVP: fotoğraf verisinden türetilen kamuya açık
 * profil — fotoğraflar, toplam entegrasyon, şehirler. Takip/mesaj hesap
 * sistemiyle gelecek.
 */
export function ProfilePage() {
  const { username } = useParams<{ username: string }>();

  const userPhotos = useMemo(
    () => photos.filter((p) => p.user.username === username),
    [username]
  );

  if (!username || userPhotos.length === 0) {
    return (
      <PlaceholderPage
        title="Profil bulunamadı"
        description="Bu kullanıcı mevcut değil ya da henüz fotoğraf yayımlamamış."
      />
    );
  }

  const displayName = userPhotos[0].user.displayName;
  const totalSeconds = userPhotos.reduce(
    (sum, p) => sum + totalIntegrationSeconds(p.exposures),
    0
  );
  const cities = [...new Set(userPhotos.map((p) => p.city))];

  return (
    <Container className="py-10 sm:py-14">
      <header className="mb-10 flex flex-wrap items-center gap-5">
        {/* Avatar placeholder: baş harf */}
        <div
          aria-hidden
          className="flex h-20 w-20 items-center justify-center rounded-full border border-border bg-surface-2 text-2xl font-bold text-primary"
        >
          {displayName.charAt(0).toLocaleUpperCase('tr-TR')}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground">{displayName}</h1>
          <p className="text-sm text-muted-foreground">@{username}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone="primary">
              {userPhotos.length} fotoğraf
            </Badge>
            <Badge tone="blue">
              Toplam {formatIntegration(totalSeconds)} entegrasyon
            </Badge>
            {cities.map((c) => (
              <Badge key={c}>{c}</Badge>
            ))}
          </div>
        </div>
      </header>

      <h2 className="mb-4 text-lg font-semibold text-foreground">Fotoğraflar</h2>
      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {userPhotos.map((p) => (
          <li key={p.slug}>
            <Link to={`/fotograf/${p.slug}`} className="group block">
              <PhotoPlaceholder
                gradient={p.gradient}
                alt={p.title}
                className="aspect-[4/3] w-full border border-border transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <p className="mt-2 truncate text-sm font-medium text-foreground">
                {p.target.catalog} · {p.title}
              </p>
              <p className="tabular truncate text-xs text-muted-foreground">
                ♥ {p.likes} · 💬 {p.comments}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-center text-xs text-muted-foreground/70">
        Takip etme, mesaj gönderme ve koleksiyonlar hesap sistemiyle birlikte
        açılacak.
      </p>
    </Container>
  );
}

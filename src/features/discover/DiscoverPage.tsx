import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { PhotoPlaceholder } from '@/components/media/PhotoPlaceholder';
import { photos } from '@/features/photos/data';
import { targets } from '@/features/targets/data';
import {
  totalIntegrationSeconds,
  formatIntegration,
} from '@/domain/photography/integration';

/**
 * Keşfet sayfası (§5.2): astrofotoğrafçılar, popüler hedefler ve yeni
 * içerikler için giriş noktası. Kulüp/rasathane rehberi Faz 2'de.
 */
export function DiscoverPage() {
  // Fotoğraf verisinden fotoğrafçı özetleri türet
  const photographers = useMemo(() => {
    const byUser = new Map<
      string,
      { username: string; displayName: string; count: number; seconds: number; likes: number }
    >();
    for (const p of photos) {
      const cur = byUser.get(p.user.username) ?? {
        username: p.user.username,
        displayName: p.user.displayName,
        count: 0,
        seconds: 0,
        likes: 0,
      };
      cur.count += 1;
      cur.seconds += totalIntegrationSeconds(p.exposures);
      cur.likes += p.likes;
      byUser.set(p.user.username, cur);
    }
    return [...byUser.values()].sort((a, b) => b.likes - a.likes);
  }, []);

  const popularTargets = targets.slice(0, 4);

  return (
    <Container className="py-10 sm:py-14">
      <header className="mb-10">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Keşfet
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Türkiye'nin astrofotoğrafçıları, popüler hedefler ve topluluğun yeni
          içerikleri.
        </p>
      </header>

      {/* Astrofotoğrafçılar */}
      <section className="mb-14">
        <SectionHeader
          title="Astrofotoğrafçılar"
          description="Topluluğun aktif üreticileri"
        />
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {photographers.map((u) => (
            <li key={u.username}>
              <Link
                to={`/profil/${u.username}`}
                className="flex h-full items-center gap-3 rounded-card border border-border bg-surface-1 p-4 transition-colors hover:border-white/20 hover:bg-surface-2"
              >
                <span
                  aria-hidden
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-3 text-base font-bold text-primary"
                >
                  {u.displayName.charAt(0).toLocaleUpperCase('tr-TR')}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {u.displayName}
                  </span>
                  <span className="tabular block truncate text-xs text-muted-foreground">
                    {u.count} foto · {formatIntegration(u.seconds)} · ♥ {u.likes}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Popüler hedefler */}
      <section className="mb-14">
        <SectionHeader
          title="Popüler Hedefler"
          description="Bu sezon en çok çalışılan gökcisimleri"
          linkTo="/hedefler"
        />
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {popularTargets.map((t) => (
            <li key={t.slug}>
              <Link to={`/hedef/${t.slug}`} className="group block">
                <PhotoPlaceholder
                  gradient={t.gradient}
                  alt={`${t.name} (${t.catalog})`}
                  className="aspect-[16/10] w-full border border-border transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <p className="mt-2 text-sm font-medium text-foreground">
                  {t.catalog} · {t.name}
                </p>
                <p className="text-xs text-muted-foreground">{t.bestMonths}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Topluluklar çağrısı */}
      <section className="rounded-2xl border border-border bg-surface-1 p-6 text-center sm:p-10">
        <h2 className="text-xl font-semibold text-foreground">
          Kulüpler ve Topluluklar
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          Dernekler, üniversite kulüpleri ve gözlem grupları için kurumsal
          profiller Faz 2'de açılıyor.
        </p>
        <div className="mt-4 flex justify-center gap-1.5">
          <Badge>Astronomi dernekleri</Badge>
          <Badge>Üniversite kulüpleri</Badge>
          <Badge>Gözlem grupları</Badge>
        </div>
      </section>
    </Container>
  );
}

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { PlateFrame } from '@/components/media/PlateFrame';
import { StarField } from '@/components/media/StarField';
import { tintFor } from '@/components/media/tints';
import { photos } from '@/features/photos/data';
import { targets } from '@/features/targets/data';
import {
  totalIntegrationSeconds,
  formatIntegration,
} from '@/domain/photography/integration';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';

/**
 * Keşfet sayfası (§5.2): astrofotoğrafçılar, popüler hedefler ve yeni
 * içerikler için giriş noktası. Kulüp/rasathane rehberi Faz 2'de.
 */
export function DiscoverPage() {
  // Fotoğraf verisinden fotoğrafçı özetleri türet
  const photographers = useMemo(() => {
    const byUser = new Map<
      string,
      {
        username: string;
        displayName: string;
        count: number;
        seconds: number;
        likes: number;
      }
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
    <>
      <PageMeta
        title="Keşfet"
        description="Türkiye'nin astrofotoğrafçıları, bu sezon en çok çalışılan gökcisimleri ve topluluğun yeni içerikleri."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Keşfet', path: '/kesfet' },
        ])}
      />
      <Container className="py-8 sm:py-10">
        <PageHeader
          title="Keşfet"
          description="Türkiye'nin astrofotoğrafçıları, bu sezon en çok çalışılan hedefler ve topluluğun yeni içerikleri."
          meta={`${photographers.length} üretici`}
        />

        {/* Astrofotoğrafçılar */}
        <section className="mb-8">
          <SectionHeader
            title="Astrofotoğrafçılar"
            description="Topluluğun aktif üreticileri"
          />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {photographers.map((u) => (
              <li key={u.username}>
                <Link
                  to={`/profil/${u.username}`}
                  className="flex h-full items-center gap-3 rounded-card border border-border bg-surface-1 p-4 transition-colors hover:border-border-strong hover:bg-surface-2"
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
                      {u.count} foto · {formatIntegration(u.seconds)} · ♥{' '}
                      {u.likes}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Popüler hedefler */}
        <section className="mb-8">
          <SectionHeader
            title="Popüler Hedefler"
            description="Bu sezon en çok çalışılan gökcisimleri"
            linkTo="/hedefler"
          />
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {popularTargets.map((t) => (
              <li key={t.slug}>
                <Link
                  to={`/hedef/${t.slug}`}
                  className="group flex h-full flex-col rounded-card border border-border bg-surface-1 transition-colors hover:border-border-strong"
                >
                  <PlateFrame
                    ratio="aspect-[16/10]"
                    className="border-0 border-b border-border"
                    badge={
                      <span className="tabular rounded-[2px] bg-background/85 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-primary">
                        {t.catalog}
                      </span>
                    }
                  >
                    <StarField seed={t.slug} tint={tintFor(t.kind)} />
                  </PlateFrame>
                  <div className="px-2.5 py-2">
                    <p className="text-[12.5px] font-medium leading-snug text-foreground group-hover:text-primary">
                      {t.name}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {t.bestMonths}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Topluluklar çağrısı */}
        <Panel title="Kulüpler ve Topluluklar" status="Faz 2">
          <p className="max-w-[70ch] text-[12px] leading-relaxed text-muted-foreground">
            Dernekler, üniversite kulüpleri ve gözlem grupları için kurumsal
            profiller (§8.11) yol haritasında. O zamana kadar etkinlik
            kayıtlarında organizatör adı ve doğrulama durumu görünüyor.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Badge>Astronomi dernekleri</Badge>
            <Badge>Üniversite kulüpleri</Badge>
            <Badge>Gözlem grupları</Badge>
            <ButtonLink
              to="/etkinlikler"
              size="sm"
              variant="ghost"
              className="ml-auto"
            >
              Etkinliklere bak
            </ButtonLink>
          </div>
        </Panel>
      </Container>
    </>
  );
}

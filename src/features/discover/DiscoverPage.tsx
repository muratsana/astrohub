import { useMemo } from 'react';
import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import {
  ContentCard,
  ContentCardBody,
  ContentCardMedia,
  ContentCardMeta,
  ContentCardTitle,
} from '@/components/ui/ContentCard';
import { StarField } from '@/components/media/StarField';
import { tintFor } from '@/components/media/tints';
import { usePhotoCatalog } from '@/services/content/photos';
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
  const photos = usePhotoCatalog().items;

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
  }, [photos]);

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
            /* Açıklama kaldırıldı (§5.4): "Topluluğun aktif üreticileri"
               başlığın eş anlamlısıydı; altındaki kartlar zaten her
               üreticinin foto sayısını ve entegrasyonunu gösteriyor. */
            title="Astrofotoğrafçılar"
          />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {photographers.map((u) => (
              <li key={u.username}>
                <ContentCard
                  to={`/profil/${u.username}`}
                  variant="list"
                  className="p-4 hover:bg-surface-2"
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
                </ContentCard>
              </li>
            ))}
          </ul>
        </section>

        {/* Popüler hedefler */}
        <section className="mb-8">
          <SectionHeader
            /* "Bu sezon en çok çalışılan gökcisimleri" = "Popüler
               Hedefler". Aynı cümleyi iki kez yazmak vurgu değil gürültü. */
            title="Popüler Hedefler"
            linkTo="/hedefler"
          />
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {popularTargets.map((t) => (
              <li key={t.slug}>
                <ContentCard to={`/hedef/${t.slug}`}>
                  {/* Standart oran; burada 16:10 kullanılıyordu ve aynı
                      sayfadaki diğer kartlarla hizalanmıyordu. */}
                  <ContentCardMedia
                    badge={
                      <span className="tabular rounded-card bg-background/85 px-1.5 py-0.5 text-meta tracking-[0.02em] text-primary">
                        {t.catalog}
                      </span>
                    }
                  >
                    <StarField seed={t.slug} tint={tintFor(t.kind)} />
                  </ContentCardMedia>
                  <ContentCardBody>
                    <ContentCardTitle lines={2} className="font-medium leading-snug">
                      {t.name}
                    </ContentCardTitle>
                    <ContentCardMeta className="mt-0.5">
                      {t.bestMonths}
                    </ContentCardMeta>
                  </ContentCardBody>
                </ContentCard>
              </li>
            ))}
          </ul>
        </section>

        {/* Topluluklar çağrısı */}
        <Panel title="Kulüpler ve Topluluklar" status="Faz 2">
          <p className="max-w-[70ch] text-meta leading-relaxed text-muted-foreground">
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

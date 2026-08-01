import { useMemo } from 'react';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { ExternalLink } from '@/components/ExternalLink';
import { CatalogSourceNote } from '@/components/ui/CatalogSourceNote';
import { useBroadcastCatalog } from '@/services/content/broadcasts';
import { hasNetworkAccess } from '@/lib/runtime';
import {
  broadcastKindLabels,
  liveBroadcast,
  sortBroadcasts,
  youtubeEmbedUrl,
  youtubeWatchUrl,
  type Broadcast,
} from './types';

/**
 * ASTROHUB.TV — canlı yayın ve program arşivi.
 *
 * NEDEN YOUTUBE. Canlı video dağıtmak transcoding, CDN ve öngörülemez bant
 * genişliği demek; tek bir tutulma gecesi aylık bütçeyi yakabilir. Yayın
 * YouTube üzerinden gider, biz yalnızca programı tutarız. Karşılığında
 * oynatıcı bizim değildir ve izleyici verisi bize gelmez — takas budur ve
 * sayfada saklanmıyor.
 *
 * OYNATICI TIKLAMADAN KURULMAZ. `<iframe>` sayfa açılır açılmaz gömülseydi
 * YouTube'un istekleri (ve çerez politikamızda anlattığımız üçüncü taraf
 * çerezleri) kullanıcı hiçbir şey yapmadan başlardı. Onay kapağı bu yüzden:
 * izleyici oynatmaya bastığında ne olacağını önce okur.
 */
export function TvPage() {
  const catalog = useBroadcastCatalog();
  const program = useMemo(
    () => sortBroadcasts(catalog.items),
    [catalog.items]
  );
  const live = liveBroadcast(program);
  const rest = program.filter((item) => item !== live);

  return (
    <>
      <PageMeta
        title="Astrohub.tv"
        description="Astrohub'ın canlı yayın kanalı: gözlem geceleri, tutulma yayınları, atölye kayıtları ve söyleşiler."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Astrohub.tv', path: '/tv' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          title="Astrohub.tv"
          description="Gözlem geceleri, tutulma yayınları ve atölye kayıtları. Yayın YouTube üzerinden dağıtılır; program Astrohub editör ekibi tarafından hazırlanır."
          meta={live ? 'Şu an yayında' : undefined}
        />

        <CatalogSourceNote selection={catalog} />

        {!hasNetworkAccess && (
          <p className="mb-4 rounded-card border border-cold/40 bg-surface-1 px-3 py-2.5 text-body-sm leading-relaxed text-muted-foreground">
            Bu tek dosya önizlemede dış istek yapılamıyor, bu yüzden oynatıcı
            kurulmuyor. Yayın adresleri aşağıda listelenir ve YouTube'da
            açılabilir.
          </p>
        )}

        {program.length === 0 ? (
          <EmptyState
            message="Program henüz boş"
            hint="Yayın takvimi hazırlandığında canlı yayın ve kayıtlar burada listelenir."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
            <div className="space-y-4">
              {live ? (
                <Player broadcast={live} />
              ) : (
                <Panel title="Şu an yayın yok">
                  <p className="text-meta leading-relaxed text-muted-foreground">
                    Canlı yayın açıldığında bu alan otomatik olarak
                    oynatıcıya döner. Yaklaşan programlar yanda listeli.
                  </p>
                </Panel>
              )}
            </div>

            <Panel title="Program" status={`${program.length} kayıt`}>
              <ul>
                {rest.map((item) => (
                  <li
                    key={item.slug}
                    className="border-b border-border py-2.5 last:border-0"
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge
                        tone={item.kind === 'scheduled' ? 'cold' : 'muted'}
                      >
                        {broadcastKindLabels[item.kind]}
                      </Badge>
                      {item.startsAt && (
                        <span className="tabular text-meta text-faint">
                          {formatWhen(item.startsAt)}
                        </span>
                      )}
                    </div>

                    <p className="text-caption leading-snug text-foreground">
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="mt-1 text-meta leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    )}

                    <WatchLink broadcast={item} />
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        )}
      </Container>
    </>
  );
}

function Player({ broadcast }: { broadcast: Broadcast }) {
  const src = youtubeEmbedUrl(broadcast.refKind, broadcast.youtubeId);

  return (
    <Panel
      title={broadcast.title}
      status={
        <span className="flex items-center gap-1.5 text-primary">
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 rounded-full bg-primary"
          />
          Canlı
        </span>
      }
    >
      {src && hasNetworkAccess ? (
        <div className="aspect-video w-full overflow-hidden rounded-card border border-border bg-black">
          <iframe
            src={src}
            title={broadcast.title}
            className="h-full w-full"
            allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-card border border-border bg-surface-2 px-6 text-center text-body-sm leading-relaxed text-muted-foreground">
          Oynatıcı bu ortamda kurulamıyor. Yayını YouTube'da açabilirsiniz.
        </div>
      )}

      {broadcast.description && (
        <p className="mt-3 text-meta leading-relaxed text-muted-foreground">
          {broadcast.description}
        </p>
      )}

      <WatchLink broadcast={broadcast} />
    </Panel>
  );
}

function WatchLink({ broadcast }: { broadcast: Broadcast }) {
  const href = youtubeWatchUrl(broadcast.refKind, broadcast.youtubeId);
  if (!href) return null;

  return (
    <p className="mt-2">
      <ExternalLink
        href={href}
        className="text-meta text-cold hover:text-primary"
      >
        YouTube'da aç
      </ExternalLink>
    </p>
  );
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

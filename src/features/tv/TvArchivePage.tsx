import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageMeta } from '@/components/seo/PageMeta';
import { NotFoundPage } from '@/components/NotFoundPage';
import { breadcrumbJsonLd } from '@/lib/seo';
import {
  useTvPlaylist,
  useTvPlaylists,
  useTvVideos,
  type TvVideo,
} from '@/services/content/tv';
import { CARD_RATIO } from '@/components/ui/cardRatios';
import { formatTrackTime } from '@/features/radio/types';
import { youtubeEmbedUrl, youtubeWatchUrl } from './types';

/**
 * TV VİDEO ARŞİVİ (§11.1 "video arşivi", "seri/playlist").
 *
 * ═══════════════════════════════════════════════════════════════════════
 * BOŞ ARŞİV BOŞ GÖRÜNÜYOR — VE SEBEBİNİ YAZIYOR
 *
 * §11.2'nin son maddesi "kanal bağlantısı yokken sahte içerik
 * göstermeme" diyor. Kanal bağlanmadan bu sayfa boş; örnek video, yer
 * tutucu kart ya da "yakında" satırı yok.
 *
 * Ama boşluk AÇIKLANIYOR. Sebepsiz boş bir sayfa kullanıcıya "site
 * bozuk" dedirtir; "kanal henüz bağlanmadı" ise doğru ve tamamlanabilir
 * bir cümle.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * OYNATICI TIKLAMADAN KURULMUYOR
 *
 * `TvPage`deki onay kapağıyla aynı kural: `<iframe>` sayfa açılır
 * açılmaz gömülseydi YouTube'un istekleri ve üçüncü taraf çerezleri
 * kullanıcı hiçbir şey yapmadan başlardı. Kart tıklanana kadar yalnızca
 * kapak görseli duruyor.
 */
export function TvArchivePage() {
  const { slug } = useParams<{ slug?: string }>();
  return slug ? <SeriSayfasi slug={slug} /> : <ArsivSayfasi />;
}

function ArsivSayfasi() {
  const { videos, loading } = useTvVideos();
  const { playlists } = useTvPlaylists();
  const [kategori, setKategori] = useState<string | null>(null);

  /* Kategoriler veriden geliyor, sabit listeden değil: olmayan bir
     kategoriyi filtre olarak sunmak, basınca boş sonuç veren bir
     düğme bırakmak olurdu. */
  const kategoriler = useMemo(
    () =>
      [...new Set(videos.map((v) => v.category).filter(Boolean))] as string[],
    [videos]
  );

  const gorunen = kategori
    ? videos.filter((v) => v.category === kategori)
    : videos;

  return (
    <>
      <PageMeta
        title="Video Arşivi — Astrohub TV"
        description="Astrohub TV'nin kayıtlı yayınları: gözlem geceleri, söyleşiler ve teknik anlatımlar."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'TV', path: '/tv' },
          { name: 'Arşiv', path: '/tv/arsiv' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'TV', to: '/tv' },
            { label: 'Arşiv' },
          ]}
          title="Video Arşivi"
          description="Kayıtlı yayınlar. Canlı yayından bağımsız izlenir."
          meta={videos.length > 0 ? `${videos.length} video` : undefined}
        />

        {loading ? (
          <p className="py-10 text-center text-meta text-muted-foreground" role="status">
            Yükleniyor…
          </p>
        ) : videos.length === 0 ? (
          <EmptyState
            message="Arşivde henüz video yok"
            hint="YouTube kanalı bağlandığında yayınlar buraya senkronlanacak. Bağlantı kurulana kadar örnek içerik gösterilmiyor."
          />
        ) : (
          <>
            {kategoriler.length > 1 && (
              <div className="mb-4 flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant={kategori === null ? 'primary' : 'secondary'}
                  onClick={() => setKategori(null)}
                >
                  Tümü
                </Button>
                {kategoriler.map((k) => (
                  <Button
                    key={k}
                    type="button"
                    size="sm"
                    variant={kategori === k ? 'primary' : 'secondary'}
                    onClick={() => setKategori(k)}
                  >
                    {k}
                  </Button>
                ))}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {gorunen.map((v) => (
                <VideoKarti key={v.id} video={v} />
              ))}
            </div>
          </>
        )}

        {playlists.length > 0 && (
          <section className="mt-8">
            <h2 className="type-section mb-3 font-semibold text-foreground">
              Seriler
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {playlists.map((p) => (
                <Link
                  key={p.id}
                  to={`/tv/arsiv/${p.slug}`}
                  className="rounded-card border border-border bg-surface-1 p-3 transition-colors hover:border-primary"
                >
                  {p.coverUrl && (
                    <img
                      src={p.coverUrl}
                      alt=""
                      loading="lazy"
                      className={`mb-2 w-full rounded-card object-cover ${CARD_RATIO.wide}`}
                    />
                  )}
                  <h3 className="text-body font-medium text-foreground">
                    {p.title}
                  </h3>
                  {p.description && (
                    <p className="mt-1 text-body-sm leading-snug text-muted-foreground">
                      {p.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </Container>
    </>
  );
}

function SeriSayfasi({ slug }: { slug: string }) {
  const { playlist, videos, loading, notFound } = useTvPlaylist(slug);

  if (notFound) return <NotFoundPage />;

  if (loading || !playlist) {
    return (
      <Container className="py-8 sm:py-10">
        <p className="py-10 text-center text-meta text-muted-foreground" role="status">
          Yükleniyor…
        </p>
      </Container>
    );
  }

  return (
    <>
      <PageMeta
        title={`${playlist.title} — Astrohub TV`}
        description={playlist.description.slice(0, 160) || playlist.title}
        image={playlist.coverUrl ? { url: playlist.coverUrl } : undefined}
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'TV', path: '/tv' },
          { name: 'Arşiv', path: '/tv/arsiv' },
          { name: playlist.title, path: `/tv/arsiv/${playlist.slug}` },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'TV', to: '/tv' },
            { label: 'Arşiv', to: '/tv/arsiv' },
            { label: playlist.title },
          ]}
          title={playlist.title}
          description={playlist.description || undefined}
          meta={videos.length > 0 ? `${videos.length} video` : undefined}
        />

        {videos.length === 0 ? (
          <EmptyState message="Bu seride henüz video yok" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((v, i) => (
              /* Sıra numarası `position`dan geliyor: bir seri kronolojik
                 olmayabilir ve editörün koyduğu sıra korunuyor. */
              <VideoKarti key={v.id} video={v} sira={i + 1} />
            ))}
          </div>
        )}
      </Container>
    </>
  );
}

function VideoKarti({ video, sira }: { video: TvVideo; sira?: number }) {
  const [acik, setAcik] = useState(false);
  const embed = youtubeEmbedUrl('video', video.youtubeId, { autoplay: true });
  const watch = youtubeWatchUrl('video', video.youtubeId);

  return (
    <Panel bodyClassName="p-0">
      {acik && embed ? (
        <div className={`w-full overflow-hidden rounded-t-card ${CARD_RATIO.wide}`}>
          <iframe
            src={embed}
            title={video.title}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAcik(true)}
          disabled={!embed}
          className={`group relative block w-full overflow-hidden rounded-t-card bg-surface-2 ${CARD_RATIO.wide}`}
          aria-label={`${video.title} — oynat`}
        >
          {video.thumbnailUrl ? (
            <img
              src={video.thumbnailUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-meta text-faint">
              Önizleme yok
            </span>
          )}
          {/* Oynatıcı tıklamadan kurulmuyor — üçüncü taraf istekleri
              kullanıcı istemeden başlamamalı. */}
          <span className="absolute inset-0 flex items-center justify-center bg-background/40 text-body-sm font-medium text-foreground opacity-0 transition-opacity group-hover:opacity-100">
            Oynat
          </span>
        </button>
      )}

      <div className="p-3">
        <div className="flex flex-wrap items-baseline gap-2">
          {sira !== undefined && (
            <span className="tabular text-meta text-faint">{sira}.</span>
          )}
          <h3 className="text-body-sm font-medium text-foreground">
            {video.title}
          </h3>
        </div>
        <p className="tabular mt-1 text-meta text-faint">
          {video.publishedAt &&
            new Date(video.publishedAt).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          {video.durationSec ? ` · ${formatTrackTime(video.durationSec)}` : ''}
        </p>
        {video.category && <Badge className="mt-2">{video.category}</Badge>}
        {watch && (
          <p className="mt-2">
            <a
              href={watch}
              target="_blank"
              rel="noopener noreferrer"
              className="text-meta text-muted-foreground hover:text-primary"
            >
              YouTube'da aç
            </a>
          </p>
        )}
      </div>
    </Panel>
  );
}

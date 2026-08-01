import { Link, useParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageMeta } from '@/components/seo/PageMeta';
import { NotFoundPage } from '@/components/NotFoundPage';
import { breadcrumbJsonLd } from '@/lib/seo';
import { usePodcast, usePodcasts, type EpisodeSummary } from '@/services/content/podcast';
import { formatTrackTime } from './types';

/**
 * PODCAST ARŞİVİ (§10.4).
 *
 * Tek bileşen iki iş yapıyor: slug yoksa seri listesi, varsa o serinin
 * bölümleri. Ayrı iki bileşen olsaydı ikisinin de aynı boş-durum,
 * aynı künye ve aynı kart düzeni kodunu taşıması gerekirdi.
 *
 * ZAMANLANMIŞ BÖLÜM LİSTEDE YOK ve bunun filtresi burada YAZILI DEĞİL:
 * kural RLS'te (0053). İstemciye de filtre yazmak, kuralı iki yere
 * koymak ve birini unutulabilir kılmak olurdu.
 */
export function PodcastPage() {
  const { slug } = useParams<{ slug?: string }>();
  return slug ? <SeriSayfasi slug={slug} /> : <SeriListesi />;
}

function SeriListesi() {
  const { podcasts, loading } = usePodcasts();

  return (
    <>
      <PageMeta
        title="Podcast Arşivi — Astrohub Radyo"
        description="Astrohub Radyo'nun podcast serileri: gözlem sohbetleri, konuk programları ve kayıtlı yayınlar."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Radyo', path: '/radyo' },
          { name: 'Podcast', path: '/radyo/podcast' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Radyo', to: '/radyo' },
            { label: 'Podcast' },
          ]}
          title="Podcast Arşivi"
          description="Kayıtlı yayınlar ve seriler. Canlı yayından bağımsız dinlenir."
        />

        {loading ? (
          <p className="py-10 text-center text-meta text-muted-foreground" role="status">
            Yükleniyor…
          </p>
        ) : podcasts.length === 0 ? (
          <EmptyState
            message="Henüz yayımlanmış podcast yok"
            hint="Seriler yayına alındığında burada listelenecek."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {podcasts.map((p) => (
              <Link
                key={p.id}
                to={`/radyo/podcast/${p.slug}`}
                className="rounded-card border border-border bg-surface-1 p-3 transition-colors hover:border-primary"
              >
                {p.coverUrl && (
                  <img
                    src={p.coverUrl}
                    alt=""
                    loading="lazy"
                    className="mb-2 aspect-square w-full rounded-card object-cover"
                  />
                )}
                <h2 className="text-body font-medium text-foreground">{p.title}</h2>
                {p.summary && (
                  <p className="mt-1 text-body-sm leading-snug text-muted-foreground">
                    {p.summary}
                  </p>
                )}
                {p.category && (
                  <Badge className="mt-2">{p.category}</Badge>
                )}
              </Link>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}

function SeriSayfasi({ slug }: { slug: string }) {
  const { podcast, episodes, loading, notFound } = usePodcast(slug);

  if (notFound) return <NotFoundPage />;

  if (loading || !podcast) {
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
        title={`${podcast.title} — Astrohub Podcast`}
        description={podcast.summary || podcast.description.slice(0, 160)}
        image={podcast.coverUrl ? { url: podcast.coverUrl } : undefined}
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Radyo', path: '/radyo' },
          { name: 'Podcast', path: '/radyo/podcast' },
          { name: podcast.title, path: `/radyo/podcast/${podcast.slug}` },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Radyo', to: '/radyo' },
            { label: 'Podcast', to: '/radyo/podcast' },
            { label: podcast.title },
          ]}
          title={podcast.title}
          description={podcast.summary || undefined}
          meta={
            episodes.length > 0
              ? `${episodes.length} bölüm`
              : undefined
          }
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
          <div>
            {episodes.length === 0 ? (
              <EmptyState
                message="Bu seride henüz yayımlanmış bölüm yok"
                hint="Zamanlanmış bölümler yayın saatleri geldiğinde görünür."
              />
            ) : (
              <ul className="space-y-2">
                {episodes.map((bolum) => (
                  <BolumSatiri
                    key={bolum.id}
                    bolum={bolum}
                    podcastSlug={podcast.slug}
                  />
                ))}
              </ul>
            )}
          </div>

          <aside className="space-y-3">
            {podcast.coverUrl && (
              <img
                src={podcast.coverUrl}
                alt=""
                className="w-full rounded-card object-cover"
              />
            )}
            {podcast.description && (
              <Panel title="Seri hakkında" bodyClassName="p-3">
                <p className="whitespace-pre-line text-body-sm leading-relaxed text-foreground">
                  {podcast.description}
                </p>
              </Panel>
            )}
            {podcast.author && (
              <Panel title="Hazırlayan" bodyClassName="p-3">
                <p className="text-body-sm text-foreground">{podcast.author}</p>
              </Panel>
            )}
          </aside>
        </div>
      </Container>
    </>
  );
}

function BolumSatiri({
  bolum,
  podcastSlug,
}: {
  bolum: EpisodeSummary;
  podcastSlug: string;
}) {
  /* Sezon/bölüm numarası ZORUNLU DEĞİL (0053): numara vermeyen seriler
     var ve zorlamak uydurma numara ürettirirdi. Yoksa hiç yazılmıyor. */
  const numara =
    bolum.season && bolum.episodeNo
      ? `S${bolum.season}B${bolum.episodeNo}`
      : bolum.episodeNo
        ? `Bölüm ${bolum.episodeNo}`
        : null;

  return (
    <li>
      <Link
        to={`/radyo/podcast/${podcastSlug}/${bolum.slug}`}
        className="block rounded-card border border-border bg-surface-1 p-3 transition-colors hover:border-primary"
      >
        <div className="flex flex-wrap items-baseline gap-2">
          {numara && <span className="tabular text-meta text-faint">{numara}</span>}
          <h3 className="text-body font-medium text-foreground">{bolum.title}</h3>
        </div>
        {bolum.summary && (
          <p className="mt-1 text-body-sm leading-snug text-muted-foreground">
            {bolum.summary}
          </p>
        )}
        <p className="tabular mt-1 text-meta text-faint">
          {bolum.publishAt &&
            new Date(bolum.publishAt).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          {bolum.durationSec ? ` · ${formatTrackTime(bolum.durationSec)}` : ''}
        </p>
      </Link>
    </li>
  );
}

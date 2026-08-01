import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { PageMeta } from '@/components/seo/PageMeta';
import { NotFoundPage } from '@/components/NotFoundPage';
import { breadcrumbJsonLd } from '@/lib/seo';
import {
  countPlay,
  useEpisode,
  useEpisodeProgress,
  type EpisodeDetail,
} from '@/services/content/podcast';
import { formatTrackTime } from './types';

/**
 * PODCAST BÖLÜMÜ (§10.4 "bölüm detayları").
 *
 * ═══════════════════════════════════════════════════════════════════════
 * KALDIĞI YERDEN DEVAM — SESSİZCE DEĞİL, SÖYLEYEREK
 *
 * Kayıtlı ilerleme varsa oynatıcı oraya atlamıyor; "23:14'ten devam et"
 * düğmesi gösteriyor. Otomatik atlamak, bölümü baştan dinlemek isteyen
 * kullanıcıyı sürprizle karşılardı ve geri sarması gerekirdi. Bir
 * tıklık fark, tersini düzeltmenin maliyetinden ucuz.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * İNDİRME BİR TERCİH, BİR KİLİT DEĞİL
 *
 * `allow_download` kapalıysa indirme bağlantısı gösterilmiyor. Bu bir
 * DRM değil — ses dosyasının adresi zaten sayfada. İfade edilmiş bir
 * tercihi arayüzde karşılamak ile teknik olarak imkânsız kılmak farklı
 * şeyler; ikincisi bu ölçekte ne mümkün ne de dürüst.
 */
export function EpisodePage() {
  const { slug, bolum } = useParams<{ slug: string; bolum: string }>();
  const { episode, loading, notFound } = useEpisode(slug, bolum);

  if (notFound) return <NotFoundPage />;

  if (loading || !episode) {
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
        title={`${episode.title} — ${episode.podcast.title}`}
        description={episode.summary || episode.description.slice(0, 160)}
        image={episode.coverUrl ? { url: episode.coverUrl } : undefined}
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Radyo', path: '/radyo' },
          { name: 'Podcast', path: '/radyo/podcast' },
          {
            name: episode.podcast.title,
            path: `/radyo/podcast/${episode.podcast.slug}`,
          },
          {
            name: episode.title,
            path: `/radyo/podcast/${episode.podcast.slug}/${episode.slug}`,
          },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Radyo', to: '/radyo' },
            { label: 'Podcast', to: '/radyo/podcast' },
            {
              label: episode.podcast.title,
              to: `/radyo/podcast/${episode.podcast.slug}`,
            },
            { label: episode.title },
          ]}
          title={episode.title}
          description={episode.summary || undefined}
          meta={
            episode.publishAt
              ? new Date(episode.publishAt).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : undefined
          }
        />

        <Oynatici episode={episode} />

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_18rem]">
          <div>
            {episode.description && (
              <p className="whitespace-pre-line text-body leading-relaxed text-foreground">
                {episode.description}
              </p>
            )}

            {episode.transcript && (
              <section className="mt-8">
                <h2 className="type-section mb-3 font-semibold text-foreground">
                  Metin dökümü
                </h2>
                {/* Döküm KATLANMIŞ değil, açık: erişilebilirlik için
                    hazırlanan bir metni tıklama arkasına saklamak,
                    onu okumaya en çok ihtiyacı olan kişiye bir engel
                    daha koymak olurdu. */}
                <p className="whitespace-pre-line text-body-sm leading-relaxed text-muted-foreground">
                  {episode.transcript}
                </p>
              </section>
            )}
          </div>

          <aside className="space-y-3">
            {episode.markers.length > 0 && (
              <Panel title="Bölüm başlıkları" bodyClassName="p-3">
                <ul className="space-y-1">
                  {episode.markers.map((m) => (
                    <li key={`${m.saniye}-${m.baslik}`} className="text-body-sm">
                      <span className="tabular text-meta text-faint">
                        {formatTrackTime(m.saniye)}
                      </span>{' '}
                      <span className="text-foreground">{m.baslik}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {episode.guests.length > 0 && (
              <Panel title="Konuklar" bodyClassName="p-3">
                <ul className="space-y-1.5">
                  {episode.guests.map((g) => (
                    <li key={g.id} className="text-body-sm">
                      {/* Site hesabı olan konuk profiline bağlanıyor;
                          olmayan yalnızca adıyla duruyor. Ad her iki
                          durumda da satırda donmuş (0053). */}
                      {g.hostSlug ? (
                        <Link
                          to={`/radyo/yayinci/${g.hostSlug}`}
                          className="text-primary hover:underline"
                        >
                          {g.name}
                        </Link>
                      ) : g.url ? (
                        <a
                          href={g.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="text-primary hover:underline"
                        >
                          {g.name}
                        </a>
                      ) : (
                        <span className="text-foreground">{g.name}</span>
                      )}
                      {g.role && (
                        <span className="text-meta text-faint"> · {g.role}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </aside>
        </div>
      </Container>
    </>
  );
}

function Oynatici({ episode }: { episode: EpisodeDetail }) {
  const audio = useRef<HTMLAudioElement>(null);
  const { position, save } = useEpisodeProgress(episode.id);
  const [sayildi, setSayildi] = useState(false);
  const [devamGosterilsin, setDevamGosterilsin] = useState(false);

  /* Kayıtlı ilerleme varsa "devam et" TEKLİF EDİLİYOR, uygulanmıyor.
     Beş saniyenin altı "başlamış sayılmaz" — sekmeyi açıp kapatmak
     kaldığın yeri değiştirmemeli. */
  useEffect(() => {
    setDevamGosterilsin(position > 5);
  }, [position]);

  const devamEt = useCallback(() => {
    if (audio.current) {
      audio.current.currentTime = position;
      void audio.current.play();
    }
    setDevamGosterilsin(false);
  }, [position]);

  const onPlay = useCallback(() => {
    /* Sayaç bölüm başına BİR KEZ artıyor: duraklat-oynat döngüsü
       oynatma sayısını şişirirdi. */
    if (!sayildi) {
      setSayildi(true);
      void countPlay(episode.id);
    }
  }, [sayildi, episode.id]);

  const onTimeUpdate = useCallback(() => {
    if (audio.current) save(audio.current.currentTime);
  }, [save]);

  const onEnded = useCallback(() => {
    if (audio.current) save(audio.current.duration, true);
  }, [save]);

  if (!episode.audioUrl) {
    return (
      <Panel title="Ses" bodyClassName="p-3">
        <p className="text-body-sm text-muted-foreground">
          Bu bölümün ses dosyası henüz yüklenmedi.
        </p>
      </Panel>
    );
  }

  return (
    <div className="rounded-card border border-border bg-surface-1 p-3">
      <audio
        ref={audio}
        src={episode.audioUrl}
        controls
        preload="metadata"
        className="w-full"
        onPlay={onPlay}
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
      >
        Tarayıcınız ses oynatmayı desteklemiyor.
      </audio>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {devamGosterilsin && (
          <Button type="button" size="sm" variant="secondary" onClick={devamEt}>
            {formatTrackTime(position)} konumundan devam et
          </Button>
        )}

        {/* İndirme kapalıysa bağlantı yok — ifade edilmiş bir tercih,
            teknik bir kilit değil. */}
        {episode.allowDownload && (
          <a
            href={episode.audioUrl}
            download
            className="text-body-sm text-primary hover:underline"
          >
            Ses dosyasını indir
          </a>
        )}
      </div>
    </div>
  );
}

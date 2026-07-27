import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Panel } from '@/components/ui/Panel';
import { ButtonLink } from '@/components/ui/Button';
import { PlayIcon, PauseIcon } from '@/components/ui/icons';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { useRadio } from './RadioContext';
import { radioGuidelines } from './data';
import { formatTrackTime, spotifyEmbedUrl } from './types';
import { cn } from '@/lib/cn';

/**
 * ASTROHUB RADYO — kanal sayfası.
 *
 * Sayfanın işi çalma listesini göstermek ve parça seçtirmek; çalmanın
 * kendisi kabuk seviyesindeki `RadioProvider`'da olur, böylece kullanıcı
 * bu sayfadan ayrılınca müzik durmaz.
 */
export function RadioPage() {
  const { tracks, current, playing, play, pause, openSpotify, spotifyTrack } =
    useRadio();

  const mp3Count = tracks.filter((t) => t.source === 'mp3').length;
  const spotifyCount = tracks.length - mp3Count;

  return (
    <>
      <PageMeta
        title="Astrohub Radyo"
        description="Gece çekimi için kesintisiz çalma listesi. Topluluğun yüklediği kayıtlar ve Spotify parçaları."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Radyo', path: '/radyo' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          title="Astrohub Radyo"
          description="Gece boyunca arka planda çalar. Sayfalar arasında gezinmek yayını kesmez — galeriye geçip geri dönebilirsin."
          meta={
            tracks.length > 0
              ? `${mp3Count} kayıt · ${spotifyCount} Spotify`
              : undefined
          }
        />

        {tracks.length === 0 ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
            <EmptyState
              message="Çalma listesi henüz boş"
              hint="Radyoya parça eklendiğinde burada listelenir ve alttaki oynatıcıdan kesintisiz çalar."
              action={
                <ButtonLink to="/panel" size="sm" variant="secondary">
                  Panele Git
                </ButtonLink>
              }
            />

            <Panel title="Parça nasıl eklenir">
              <ol className="space-y-3 text-[12px] leading-relaxed text-muted-foreground">
                <li>
                  <span className="label mb-0.5 block text-cold">01 · MP3</span>
                  Ses dosyasını Supabase <code className="text-foreground">radio</code>{' '}
                  bucket'ına yükleyin. Yüklenen kayıtlar sırayla, kesintisiz
                  çalar; biri bitince sonraki başlar.
                </li>
                <li>
                  <span className="label mb-0.5 block text-cold">
                    02 · Spotify
                  </span>
                  Parçanın paylaşım bağlantısını ekleyin. Spotify parçaları
                  gömülü oynatıcıda çalar — lisans gereği ham ses akışı üçüncü
                  taraf oynatıcılara açılmadığı için MP3 sırasına karışamaz ve
                  bitince otomatik geçiş yapılamaz.
                </li>
              </ol>
            </Panel>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
            <ul className="rounded-card border border-border bg-surface-1">
              {tracks.map((track) => {
                const isCurrent =
                  current?.id === track.id || spotifyTrack?.id === track.id;
                const isPlaying = isCurrent && playing;

                return (
                  <li
                    key={track.id}
                    className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-0"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (track.source === 'spotify') {
                          openSpotify(track);
                        } else if (isPlaying) {
                          pause();
                        } else {
                          play(track.id);
                        }
                      }}
                      aria-label={`${track.title} — ${isPlaying ? 'duraklat' : 'çal'}`}
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-card border transition-colors',
                        isCurrent
                          ? 'border-primary text-primary'
                          : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
                      )}
                    >
                      {isPlaying ? (
                        <PauseIcon className="h-3 w-3" />
                      ) : (
                        <PlayIcon className="h-3 w-3" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'truncate text-[12.5px] font-medium',
                          isCurrent ? 'text-primary' : 'text-foreground'
                        )}
                      >
                        {track.title}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {track.artist}
                        {track.note && ` · ${track.note}`}
                      </p>
                    </div>

                    {track.source === 'spotify' ? (
                      <Badge tone="success">Spotify</Badge>
                    ) : (
                      <span className="tabular shrink-0 text-[10px] text-faint">
                        {track.durationSec
                          ? formatTrackTime(track.durationSec)
                          : '—'}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="space-y-4">
              {spotifyTrack && spotifyEmbedUrl(spotifyTrack.url) && (
                <Panel title="Spotify" status={spotifyTrack.title}>
                  <iframe
                    title={`${spotifyTrack.title} — Spotify`}
                    src={spotifyEmbedUrl(spotifyTrack.url)!}
                    height="152"
                    className="w-full rounded-card"
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                  />
                </Panel>
              )}

              <Panel title="Yayın ölçütleri">
                <ul className="space-y-2 text-[11.5px] leading-relaxed text-muted-foreground">
                  {radioGuidelines.map((rule) => (
                    <li key={rule} className="flex gap-2">
                      <span aria-hidden className="text-primary">
                        ·
                      </span>
                      {rule}
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          </div>
        )}
      </Container>
    </>
  );
}

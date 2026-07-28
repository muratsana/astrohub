import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Panel } from '@/components/ui/Panel';
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
        description="Astrohub'ın gece yayını: çekim boyunca arka planda çalan, editör tarafından programlanmış kesintisiz liste."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Radyo', path: '/radyo' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          title="Astrohub Radyo"
          description="Astrohub'ın kendi yayını. Gece boyunca arka planda çalar; sayfalar arasında gezinmek yayını kesmez — galeriye geçip geri dönebilirsin."
          meta={
            tracks.length > 0
              ? `${mp3Count} kayıt · ${spotifyCount} Spotify`
              : undefined
          }
        />

        {tracks.length === 0 ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
            <EmptyState
              message="Yayın henüz başlamadı"
              hint="Liste yayına alındığında burada görünür ve alttaki oynatıcıdan kesintisiz çalar."
            />

            <Panel title="Yayın nasıl işler">
              <ul className="space-y-3 text-[12px] leading-relaxed text-muted-foreground">
                <li>
                  <span className="label mb-0.5 block text-cold">
                    Programı Astrohub yapar
                  </span>
                  Radyo bir topluluk kuyruğu değil, sitenin kendi yayını.
                  Listeyi editör ekibi hazırlar; dinleyiciden parça
                  yüklenmez. Bunun sebebi lisans: çalınan her kaydın
                  hakkının kimde olduğunu tek bir yerin izlemesi gerekir,
                  aksi hâlde sorumluluk kimsede olmayan bir yayın çıkar.
                </li>
                <li>
                  <span className="label mb-0.5 block text-cold">
                    Kesintisiz akış
                  </span>
                  Kayıtlar sırayla çalar, biri bitince sonraki başlar.
                  Oynatıcı kabuk seviyesinde durduğu için rota değişimi
                  yayını kesmez.
                </li>
                <li>
                  <span className="label mb-0.5 block text-cold">
                    Spotify parçaları ayrı çalar
                  </span>
                  Lisans gereği ham ses akışı üçüncü taraf oynatıcılara
                  açılmıyor; Spotify kayıtları gömülü oynatıcıda çalar ve
                  bitince otomatik geçiş yapılamaz.
                </li>
              </ul>
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

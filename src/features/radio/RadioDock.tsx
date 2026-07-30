import { Link } from 'react-router';
import { useRadio } from './RadioContext';
import { spotifyEmbedUrl } from './types';
import {
  PlayIcon,
  PauseIcon,
  SkipIcon,
  VolumeIcon,
  CloseIcon,
  RadioIcon,
} from '@/components/ui/icons';
import { cn } from '@/lib/cn';

/**
 * RADYO RIHTIMI — ekranın altında sabit duran ince oynatıcı şeridi.
 *
 * Kabuk seviyesinde render edilir, rota değişiminden etkilenmez: gece
 * çekimi sırasında galeriye geçip geri dönmek müziği kesmez.
 *
 * Mobil alt navigasyonun üstünde durur (`bottom-[57px]`), masaüstünde
 * ekranın en altında. Yükseklik bilinçli olarak düşük — çalma kontrolü
 * içeriğin önüne geçmemeli.
 */
export function RadioDock() {
  const {
    current,
    playing,
    volume,
    dockVisible,
    spotifyTrack,
    toggle,
    next,
    setVolume,
    hideDock,
    closeSpotify,
  } = useRadio();

  // Ne bir MP3 sırası ne de açık bir Spotify parçası varsa rıhtım hiç
  // görünmez: boş bir oynatıcı şeridi ekranın altını yer, hiçbir şey vermez.
  if (!dockVisible || (!current && !spotifyTrack)) return null;

  const embed = spotifyTrack ? spotifyEmbedUrl(spotifyTrack.url) : null;

  return (
    <div className="fixed inset-x-0 bottom-[57px] z-30 border-t border-border-strong bg-surface-1/95 backdrop-blur-md lg:bottom-0">
      {embed && (
        <div className="border-b border-border px-3 py-2">
          <div className="mx-auto flex max-w-content items-center gap-3">
            <iframe
              title={`${spotifyTrack?.title} — Spotify`}
              src={embed}
              height="80"
              className="w-full max-w-[640px] rounded-card"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
            <button
              type="button"
              onClick={closeSpotify}
              aria-label="Spotify oynatıcısını kapat"
              className="shrink-0 rounded-card border border-border p-1 text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {current && (
        <div className="mx-auto flex h-11 max-w-content items-center gap-3 px-4">
          <RadioIcon
            className={cn(
              'h-4 w-4 shrink-0',
              playing ? 'text-primary' : 'text-muted-foreground'
            )}
          />

          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? 'Duraklat' : 'Çal'}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-card border border-border text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            {playing ? (
              <PauseIcon className="h-3 w-3" />
            ) : (
              <PlayIcon className="h-3 w-3" />
            )}
          </button>

          <button
            type="button"
            onClick={next}
            aria-label="Sonraki parça"
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-card border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary sm:flex"
          >
            <SkipIcon className="h-3 w-3" />
          </button>

          <Link
            to="/radyo"
            className="min-w-0 flex-1 truncate text-[11px] text-foreground transition-colors hover:text-primary"
          >
            <span className="font-medium">{current.title}</span>
            <span className="ml-2 text-muted-foreground">{current.artist}</span>
          </Link>

          <label className="hidden items-center gap-1.5 sm:flex">
            <VolumeIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="sr-only">Ses seviyesi</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="h-1 w-20 accent-primary"
            />
          </label>

          <button
            type="button"
            onClick={hideDock}
            aria-label="Oynatıcıyı gizle"
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

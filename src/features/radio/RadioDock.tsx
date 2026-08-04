import { Link } from 'react-router';
import { useRoles } from '@/features/admin/useRoles';
import { useRadio } from './RadioContext';
import {
  CloseIcon,
  PlayIcon,
  PauseIcon,
  RadioIcon,
  SkipIcon,
  VolumeIcon,
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
  const { isAdmin } = useRoles();
  const {
    playing,
    hasBroadcast,
    dockVisible,
    currentTrack,
    canSkip,
    shuffle,
    source,
    volume,
    toggle,
    next,
    previous,
    toggleShuffle,
    setVolume,
    hideDock,
  } = useRadio();

  // Yayın yoksa rıhtım hiç
  // görünmez: boş bir oynatıcı şeridi ekranın altını yer, hiçbir şey vermez.
  if (!dockVisible || !hasBroadcast) return null;

  return (
    <div className="fixed inset-x-0 bottom-[57px] z-30 border-t border-border-strong bg-surface-1/95 backdrop-blur-md lg:bottom-0">
      <div className="mx-auto flex h-12 max-w-content items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <RadioIcon
          className={cn(
            'h-4 w-4 shrink-0',
            playing ? 'text-primary' : 'text-muted-foreground'
          )}
        />

        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'Canlı yayını duraklat' : 'Canlı yayını başlat'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card border border-border text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          {playing ? (
            <PauseIcon className="h-3 w-3" />
          ) : (
            <PlayIcon className="h-3 w-3" />
          )}
        </button>

        {isAdmin ? (
          <Link
            to="/radyo"
            className="min-w-0 flex-1 transition-colors hover:text-primary"
          >
            <TrackLabel source={source} currentTrack={currentTrack} />
          </Link>
        ) : (
          <div className="min-w-0 flex-1">
            <TrackLabel source={source} currentTrack={currentTrack} />
          </div>
        )}

        {isAdmin && canSkip && (
          <div className="hidden items-center gap-1 sm:flex">
            <button
              type="button"
              onClick={previous}
              aria-label="Önceki parça"
              className="grid h-9 w-9 place-items-center rounded-card text-muted-foreground transition-colors hover:bg-surface-2 hover:text-primary"
            >
              <SkipIcon className="h-3.5 w-3.5 rotate-180" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Sonraki parça"
              className="grid h-9 w-9 place-items-center rounded-card text-muted-foreground transition-colors hover:bg-surface-2 hover:text-primary"
            >
              <SkipIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {isAdmin && source === 'kasa' && (
          <button
            type="button"
            onClick={toggleShuffle}
            aria-pressed={shuffle}
            aria-label={
              shuffle
                ? 'Günlük karışık sırayı kapat'
                : 'Günlük karışık sırayı aç'
            }
            title="Günlük karışık sıra"
            className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-card border transition-colors',
              shuffle
                ? 'border-primary text-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            ⇄
          </button>
        )}

        {isAdmin && (
          <label className="hidden items-center gap-2 lg:flex">
            <VolumeIcon className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Radyo ses seviyesi</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              aria-label="Radyo ses seviyesi"
              className="w-24 accent-primary"
            />
          </label>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={hideDock}
            aria-label="Radyo oynatıcısını gizle"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-card text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function TrackLabel({
  source,
  currentTrack,
}: {
  source: 'canli' | 'kasa';
  currentTrack: { title: string; artist?: string } | null;
}) {
  return (
    <>
      <span className="block truncate text-meta font-medium text-success">
        {source === 'canli'
          ? 'Canlı yayın'
          : currentTrack?.title ?? 'Astrohub Radyo'}
      </span>
      {source === 'kasa' && currentTrack?.artist && (
        <span className="hidden truncate text-[0.66rem] text-muted-foreground sm:block">
          {currentTrack.artist}
        </span>
      )}
    </>
  );
}

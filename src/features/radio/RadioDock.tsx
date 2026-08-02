import { Link } from 'react-router';
import { useRadio } from './RadioContext';
import {
  PlayIcon,
  PauseIcon,
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
    playing,
    hasBroadcast,
    dockVisible,
    toggle,
  } = useRadio();

  // Yayın yoksa rıhtım hiç
  // görünmez: boş bir oynatıcı şeridi ekranın altını yer, hiçbir şey vermez.
  if (!dockVisible || !hasBroadcast) return null;

  return (
    <div className="fixed inset-x-0 bottom-[57px] z-30 border-t border-border-strong bg-surface-1/95 backdrop-blur-md lg:bottom-0">
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
          aria-label={playing ? 'Canlı yayını duraklat' : 'Canlı yayını başlat'}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-card border border-border text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          {playing ? (
            <PauseIcon className="h-3 w-3" />
          ) : (
            <PlayIcon className="h-3 w-3" />
          )}
        </button>

        <Link
          to="/radyo"
          className="min-w-0 flex-1 truncate text-meta font-medium text-success transition-colors hover:text-primary"
        >
          Canlı yayın
        </Link>
      </div>
    </div>
  );
}

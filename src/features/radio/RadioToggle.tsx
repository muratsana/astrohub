import { Link } from 'react-router-dom';
import { useRadio } from './RadioContext';
import { PlayIcon, PauseIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

/**
 * ÜST ÇUBUKTAKİ YAYIN DÜĞMESİ.
 *
 * Radyo sitenin kendi yayını (bkz. `data.ts`) ve dinleyicinin ona
 * ulaşmak için radyo sayfasına gitmesi gerekmiyordu — yayını açıp
 * kapatmak tek dokunuş olmalı. Düğme aynı zamanda **durum göstergesi**:
 * çalarken kehribar yanar, yani hangi sekmede olursan ol yayının açık
 * olduğunu görürsün.
 *
 * YAYIN YOKKEN DÜĞME BİR BAĞLANTIYA DÖNÜŞÜR. Devre dışı bir düğme
 * göstermek "bozuk" okunur; boş listeyle oynatmaya çalışmak ise hiçbir
 * şey yapmaz ve kullanıcı tıklamanın işe yarayıp yaramadığını bilemez.
 * Bunun yerine radyo sayfasına götürüyoruz: orada yayının neden
 * başlamadığı yazılı.
 */
export function RadioToggle({ className }: { className?: string }) {
  const { current, spotifyTrack, playing, toggle, showDock } = useRadio();
  const hasBroadcast = Boolean(current || spotifyTrack);

  const shared =
    'inline-flex h-8 items-center gap-1.5 rounded-card border px-2.5 text-[10px] tracking-[0.03em] transition-colors';

  if (!hasBroadcast) {
    return (
      <Link
        to="/radyo"
        aria-label="Radyo — yayın henüz başlamadı"
        title="Yayın henüz başlamadı"
        className={cn(
          shared,
          'border-border text-muted-foreground hover:border-border-strong hover:text-foreground',
          className
        )}
      >
        <PlayIcon className="h-3.5 w-3.5" />
        <span className="hidden 2xl:inline">Radyo</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        // Yayını açan kullanıcı oynatıcıyı da görmeli: daha önce rıhtımı
        // gizlemişse sessizce çalan bir yayın bırakmak, sesi nereden
        // kısacağını bulamamak demek.
        showDock();
        toggle();
      }}
      aria-pressed={playing}
      aria-label={playing ? 'Radyo yayınını duraklat' : 'Radyo yayınını başlat'}
      title={playing ? 'Yayını duraklat' : 'Yayını başlat'}
      className={cn(
        shared,
        playing
          ? 'border-primary text-primary'
          : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground',
        className
      )}
    >
      {playing ? (
        <PauseIcon className="h-3.5 w-3.5" />
      ) : (
        <PlayIcon className="h-3.5 w-3.5" />
      )}
      <span className="hidden 2xl:inline">Radyo</span>
    </button>
  );
}

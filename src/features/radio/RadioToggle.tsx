import { Link } from 'react-router-dom';
import { useRadio } from './RadioContext';
import { PlayIcon, PauseIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

/**
 * ÜST ÇUBUKTAKİ RADYO DÜĞMESİ — metinli, oynat/duraklat gömülü.
 *
 * İkon-only hâlinden vazgeçildi: "Radyo" kelimesi olmadan düğmenin ne
 * yaptığı yalnızca ikonla anlaşılıyordu ve radyo simgesi (anten + hoparlör)
 * evrensel değil. Metin, düğmeyi tarayarak bulunabilir kılıyor.
 *
 * Oynat/duraklat ayrı bir düğme DEĞİL, aynı düğmenin içinde: iki ayrı
 * kontrol üst çubukta iki dokunma hedefi demekti ve ikisi de aynı şeyi
 * yapıyordu (yayını aç / kapat). Simge solda durum gösterir, metin ne
 * olduğunu söyler.
 *
 * YAYIN YOKKEN DÜĞME BİR BAĞLANTIYA DÖNÜŞÜR. Devre dışı bir düğme "bozuk"
 * okunur; boş listeyle oynatmaya çalışmak ise hiçbir şey yapmaz ve
 * kullanıcı tıklamanın işe yarayıp yaramadığını bilemez. Bunun yerine
 * radyo sayfasına götürüyoruz — orada yayının neden başlamadığı yazılı.
 */
export function RadioToggle({ className }: { className?: string }) {
  const { current, spotifyTrack, playing, toggle, showDock } = useRadio();
  const hasBroadcast = Boolean(current || spotifyTrack);

  const shared =
    'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-card border px-2 text-[11px] font-medium tracking-[0.02em] transition-colors sm:px-2.5';

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
        <PlayIcon className="h-3.5 w-3.5 shrink-0" />
        {/* Etiket `sm` altında gizli — gerekçe `TvToggle` içinde. */}
        <span className="hidden sm:inline">Radyo</span>
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
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground',
        className
      )}
    >
      {playing ? (
        <PauseIcon className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <PlayIcon className="h-3.5 w-3.5 shrink-0" />
      )}
      <span className="hidden sm:inline">Radyo</span>
    </button>
  );
}

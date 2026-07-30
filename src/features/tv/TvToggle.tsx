import { Link } from 'react-router-dom';
import { TvIcon } from '@/components/ui/icons';
import { useBroadcastCatalog } from '@/services/content/broadcasts';
import { liveBroadcast } from './types';
import { cn } from '@/lib/cn';

/**
 * ÜST ÇUBUKTAKİ TV DÜĞMESİ — metinli.
 *
 * Radyo düğmesiyle aynı biçimde ama farklı davranır: radyo yayını yerinde
 * açılır (ses arka planda çalar), TV yayını sayfaya gider — video ekranın
 * ortasında olmalı, üst çubuğa sıkıştırılamaz.
 *
 * Canlı yayın varken düğme kehribar yanar ve yanında bir nokta taşır:
 * kullanıcı yayının başladığını anlamak için TV sayfasını açmak zorunda
 * kalmasın.
 */
export function TvToggle({ className }: { className?: string }) {
  const catalog = useBroadcastCatalog();
  const live = liveBroadcast(catalog.items);

  return (
    <Link
      to="/tv"
      aria-label={live ? `Astrohub.tv — canlı: ${live.title}` : 'Astrohub.tv'}
      title={live ? `Canlı yayında: ${live.title}` : 'Astrohub.tv'}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-card border px-2 text-[11px] font-medium tracking-[0.02em] transition-colors sm:px-2.5',
        live
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground',
        className
      )}
    >
      <TvIcon className="h-3.5 w-3.5 shrink-0" />
      {/*
        Etiket `sm` altında gizli. 360px'te üst çubuk 31px taşıyordu ve
        ölçüm en pahalı iki kalemin metinli TV (53px) ve Radyo (72px)
        düğmeleri olduğunu gösterdi — Modüller ve hesap düğmesi telefonda
        zaten yalnızca ikon, tutarsızlık buradaydı.

        Metni gizlemek bilgi kaybetmiyor: erişilebilir ad `aria-label`'da
        duruyor, canlı yayın durumunu da kehribar kenar ve nokta taşıyor —
        "TV" kelimesi zaten durumu anlatmıyordu.
      */}
      <span className="hidden sm:inline">TV</span>
      {live && (
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
        />
      )}
    </Link>
  );
}

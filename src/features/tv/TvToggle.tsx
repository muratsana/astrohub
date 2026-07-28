import { Link } from 'react-router-dom';
import { TvIcon } from '@/components/ui/icons';
import { useBroadcastCatalog } from '@/services/content/broadcasts';
import { liveBroadcast } from './types';
import { cn } from '@/lib/cn';

/**
 * ÜST ÇUBUKTAKİ TV DÜĞMESİ.
 *
 * Radyo düğmesiyle aynı işi görür ama farklı bir şey yapar: radyo yayını
 * yerinde açılır (ses arka planda çalar), TV yayını ise sayfaya gider —
 * video ekranın ortasında olmalı, üst çubuğa sıkıştırılamaz.
 *
 * Düğme aynı zamanda **durum göstergesi**: canlı yayın varken kehribar
 * yanar ve yanında bir nokta taşır. Kullanıcının yayının başladığını
 * anlamak için TV sayfasını açması gerekmez.
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
        'inline-flex h-8 items-center gap-1.5 rounded-card border px-2 text-[10px] tracking-[0.03em] transition-colors sm:px-2.5',
        live
          ? 'border-primary text-primary'
          : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground',
        className
      )}
    >
      <TvIcon className="h-3.5 w-3.5" />
      {live && (
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
        />
      )}
      <span className="hidden 2xl:inline">TV</span>
    </Link>
  );
}

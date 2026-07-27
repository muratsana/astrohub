import { Link } from 'react-router-dom';
import { LogoMark } from './LogoMark';

/**
 * Astrohub künyesi: levha çerçevesi işareti + kelime markası.
 *
 * Kelime markası geniş harf aralıklı büyük harftir — bir cihaz etiketi gibi
 * okunur. "hub" kehribar; işaretin merkezindeki yıldızla aynı renk.
 */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/"
      aria-label="Astrohub ana sayfa"
      className="group flex shrink-0 items-center gap-2.5 text-foreground transition-colors hover:text-primary"
    >
      <LogoMark
        className="h-7 w-7 text-border-strong transition-colors group-hover:text-primary"
        accent="var(--color-primary)"
      />
      <span className="font-display text-[17px] font-bold uppercase leading-none tracking-[0.2em]">
        Astro<span className="text-primary">hub</span>
      </span>
      {!compact && (
        <span className="hidden text-[9px] font-normal tracking-[0.24em] text-faint xl:inline">
          GÖZLEM AĞI
        </span>
      )}
    </Link>
  );
}

import { Link } from 'react-router-dom';

/**
 * Astrohub künyesi. Terminal dilinde logo bir simge değil, bir
 * **cihaz etiketi**: geniş harf aralıklı büyük harf, "hub" kehribar.
 */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/"
      aria-label="Astrohub ana sayfa"
      className="shrink-0 font-display text-[17px] font-bold uppercase leading-none tracking-[0.2em] text-foreground transition-colors hover:text-primary"
    >
      Astro<span className="text-primary">hub</span>
      {!compact && (
        <span className="ml-2 hidden align-middle text-[9px] font-normal tracking-[0.24em] text-faint xl:inline">
          GÖZLEM AĞI
        </span>
      )}
    </Link>
  );
}

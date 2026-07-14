import { Link } from 'react-router-dom';
import { SparkleIcon } from '@/components/ui/icons';

/** Astrohub logosu: sarı yıldız + "Astro" (beyaz) "hub" (vurgulu) */
export function Logo() {
  return (
    <Link
      to="/"
      className="flex items-center gap-2 text-xl font-bold tracking-tight"
      aria-label="Astrohub ana sayfa"
    >
      <SparkleIcon className="h-6 w-6 text-primary" />
      <span className="text-foreground">
        Astro<span className="text-primary">hub</span>
      </span>
    </Link>
  );
}

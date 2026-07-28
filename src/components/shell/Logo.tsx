import { Link } from 'react-router-dom';
import { LogoMark } from './LogoMark';

/**
 * Astrohub künyesi: levha çerçevesi işareti + kelime markası.
 *
 * Kelime markası, sitede büyük harfin korunduğu iki yerden biri: marka bir
 * cümle değil, bir işaret. "hub" kehribar; işaretin merkezindeki yıldızla
 * aynı renk.
 *
 * Yanındaki "GÖZLEM AĞI" alt yazısı kaldırıldı — marka adının yanında ikinci
 * bir etiket taşımak künyeyi kalabalıklaştırıyor ve ne olduğumuzu anlatma
 * işini zaten hero üstleniyor.
 */
export function Logo() {
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
      {/*
        Harf aralığı çok dar ekranlarda kırılıyor: 0.2em'lik tracking 390px'te
        üst çubuğun sağ kümesini taşırıyordu. Küçük ekranda daha sıkı.
      */}
      <span className="font-display text-[17px] font-bold uppercase leading-none tracking-[0.12em] sm:tracking-[0.2em]">
        Astro<span className="text-primary">hub</span>
      </span>
    </Link>
  );
}

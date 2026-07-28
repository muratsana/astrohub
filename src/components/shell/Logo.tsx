import { Link } from 'react-router-dom';
import { LogoMark } from './LogoMark';

/**
 * ASTROHUB KÜNYESİ — açıklık işareti + kelime markası.
 *
 * Kelime markası, sitede büyük harfin korunduğu tek yer: marka bir cümle
 * değil, bir işaret.
 *
 * "hub" kehribar ve **daha ince**: iki kelime aynı ağırlıkta olunca göz
 * bileşik adı tek blok olarak okuyup ayrımı kaçırıyordu. Ağırlık farkı,
 * renk farkının yapamadığını yapıyor — "astro" bir alan adı, "hub" o alanın
 * toplandığı yer.
 *
 * İşaret hover'da kehribara döner; kelime markası dönmez. İkisinin birden
 * renk değiştirmesi, üst çubukta bir bağlantı değil bir uyarı gibi
 * okunuyordu.
 */
export function Logo() {
  return (
    <Link
      to="/"
      aria-label="Astrohub ana sayfa"
      className="group flex shrink-0 items-center gap-2 text-foreground sm:gap-2.5"
    >
      <LogoMark
        className="h-[26px] w-[26px] shrink-0 text-border-strong transition-colors group-hover:text-primary sm:h-7 sm:w-7"
        accent="var(--color-primary)"
      />
      {/*
        Harf aralığı çok dar ekranlarda kırılıyor: 0.2em'lik tracking
        390px'te üst çubuğun sağ kümesini taşırıyordu. Küçük ekranda daha
        sıkı.
      */}
      <span className="font-display text-[17px] uppercase leading-none tracking-[0.1em] sm:tracking-[0.16em]">
        <span className="font-bold">Astro</span>
        <span className="font-normal text-primary">hub</span>
      </span>
    </Link>
  );
}

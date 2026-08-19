import { Link } from 'react-router';
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

        360px ALTINDA KELİME MARKASI DÜŞÜYOR.

        Ölçüm (Faz 2.3, 320×568): üst çubuğun kapsayıcısı 288px, künye
        143px, sağ aksiyon kümesi 158px — toplam 301px. Sayfa 9px yana
        kayıyordu ve yatay kaydırma çubuğu çıkıyordu.

        Harf aralığını iyice kısmak farkı ancak son pikselde kapatıyordu;
        yani bir kelime uzasa ya da bir düğme eklense taşma geri gelirdi.
        Kelime markasını düşürmek bu sınırı tamamen kaldırıyor ve açıklık
        işareti markayı taşımaya devam ediyor. `aria-label` bağlantıda
        durduğu için ekran okuyucuda hiçbir şey kaybolmuyor.

        Sınır 360px: piyasadaki en dar yaygın telefon 360 (Android) ve
        320 (iPhone SE 1. nesil); ikisi de işaretle açılıyor, 375'ten
        itibaren kelime markası geri geliyor.
      */}
      <span className="hidden font-display text-readout-sm uppercase leading-none tracking-[0.1em] min-[360px]:inline sm:tracking-[0.16em]">
        <span className="font-bold">Astro</span>
        <span className="font-normal text-primary">hub</span>
      </span>
    </Link>
  );
}

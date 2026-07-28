import type { SVGProps } from 'react';

/**
 * ASTROHUB LOGO İŞARETİ — açıklıktan geçen ışık.
 *
 * TASARIM FİKRİ TEK CÜMLE: bir teleskop açıklığı ve içinden geçen yıldız.
 * Yıldızın dikey kolları halkanın üstündeki ve altındaki boşluklardan
 * dışarı taşar; iki öğe böylece yan yana duran iki şekil değil, tek bir
 * siluet olur. "Işık halkadan geçiyor" fikri işaretin kendisi tarafından
 * anlatılır, açıklama gerekmez.
 *
 *   halka          açıklık / optik — gözlemin başladığı yer
 *   iki boşluk     kapalı bir daire "dur" işareti gibi okunuyordu;
 *                  boşluk onu bir girişe çeviriyor (hub)
 *   dört kollu     astrofotoğrafın görsel imzası: kırınım dikmeleri.
 *   yıldız         Bu kitle o şekli anında tanıyor.
 *
 * ÖNCEKİ İŞARETLE FARKI: eskisinde halka tek boşlukluydu ve yıldız
 * halkanın içinde kalıyordu; iki öğe birbirine değmediği için işaret
 * "daire içinde yıldız" diye okunuyor, akılda kalmıyordu. Ayrıca favicon
 * bambaşka bir çizimdi (levha çerçevesi) — sekme çubuğundaki işaretle
 * sitedeki işaret aynı marka değildi. Artık `public/favicon.svg` bu
 * geometrinin birebir aynısı.
 *
 * ÖLÇEK SINAMASI: 16 pikselde iç halka düşer, kalan siluet (halka +
 * taşan dikey kollar) bozulmadan okunur. Asıl sınama budur; bir marka
 * işareti en küçük hâlinde çalışmıyorsa çalışmıyordur.
 */

/** Halka yarıçapı — favicon ile aynı olmak zorunda. */
const R = 11;

/**
 * Çevre 2πR ≈ 69.1. Üstte ve altta 9 birimlik iki boşluk bırakılıyor,
 * kalan iki yay 25.55'er birim. Başlangıç açısı, ilk yayın üst boşluğun
 * hemen ardından başlaması için 4.5 birim kaydırılıyor:
 * -90 + (4.5 / 69.1) × 360 ≈ -66.6.
 */
const DASH = '25.55 9';
const ROTATE = -66.6;

/**
 * Dört kollu yıldız — kolları içbükey, uçları sivri.
 *
 * Dikey kollar 2 ↔ 30, yatay kollar 6 ↔ 26. Halka 5 ↔ 27 arasını
 * kapladığı için yalnızca dikey kollar dışarı taşar; yatay kollar içeride
 * kalır. Asimetri bilinçli: dört kolun dördü de taşsaydı halka bir çerçeve
 * değil, bir artı işaretinin arka planı olurdu.
 */
const STAR =
  'M16 2 C16.7 11.2 17.6 15.3 26 16 C17.6 16.7 16.7 20.8 16 30 ' +
  'C15.3 20.8 14.4 16.7 6 16 C14.4 15.3 15.3 11.2 16 2 Z';

export function LogoMark({
  detailed = true,
  accent = 'currentColor',
  ...props
}: SVGProps<SVGSVGElement> & {
  /** Küçük boyutlarda iç detayları gizle. */
  detailed?: boolean;
  /** Yıldızın rengi. */
  accent?: string;
}) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden {...props}>
      <circle
        cx="16"
        cy="16"
        r={R}
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray={DASH}
        transform={`rotate(${ROTATE} 16 16)`}
      />

      {/* Alan diyaframı — küçük boyutta düşer, siluet korunur. */}
      {detailed && (
        <circle
          cx="16"
          cy="16"
          r="6.4"
          stroke="currentColor"
          strokeWidth="0.9"
          opacity="0.3"
        />
      )}

      <path d={STAR} fill={accent} />
    </svg>
  );
}

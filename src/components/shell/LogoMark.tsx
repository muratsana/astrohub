import type { SVGProps } from 'react';

/**
 * ASTROHUB LOGO İŞARETİ — açıklık halkası.
 *
 * Önceki işaret bir levha çerçevesi (ölçü çentikli kare) idi. Sorun ölçekte
 * ortaya çıkıyordu: kare + çentikler + yıldız + yörünge noktası, 28 pikselde
 * dört ayrı detay demek ve hiçbiri okunmuyordu. Bir marka işareti tek bir
 * silueti taşımalı.
 *
 * Yeni işaret **açıklık**: bir teleskopun objektif halkası ve içinden geçen
 * ışık. Anlamı ürünün kendisinden geliyor:
 *
 *   dış halka        → açıklık / optik — gözlemin başladığı yer
 *   halkadaki boşluk → odak kaçığı değil, bir "giriş"; hub kelimesinin
 *                      görsel karşılığı, kapalı bir daire değil
 *   merkez yıldız    → gökyüzü, kayıt edilen şey
 *   ince iç halka    → alan diyaframı; yalnızca `detailed` modda çizilir
 *
 * Tek renkte (`currentColor`) çalışır; kehribar vurgu isteğe bağlıdır.
 * 16 pikselde iç halka düşer, siluet bozulmaz — asıl sınama budur.
 */
export function LogoMark({
  detailed = true,
  accent = 'currentColor',
  ...props
}: SVGProps<SVGSVGElement> & {
  /** Küçük boyutlarda iç detayları gizle. */
  detailed?: boolean;
  /** Merkez yıldızın rengi. */
  accent?: string;
}) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden {...props}>
      {/*
        Açıklık halkası. `strokeDasharray` ile üstte tek bir boşluk
        bırakılıyor: kapalı bir daire "durdurma" işareti gibi okunuyordu,
        boşluk onu bir girişe çeviriyor. Dizi uzunlukları çevre
        (2πr ≈ 75.4) üzerinden hesaplandı — boşluk 12 birim.
      */}
      <circle
        cx="16"
        cy="16"
        r="12"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeDasharray="63.4 12"
        transform="rotate(-101 16 16)"
      />

      {/* Alan diyaframı — küçük boyutta düşer, siluet korunur. */}
      {detailed && (
        <circle
          cx="16"
          cy="16"
          r="8"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.35"
        />
      )}

      {/*
        Dört köşeli yıldız. Kolları önceki işarete göre daha ince ve daha
        uzun: halkanın içinde kaldığında yıldız gibi okunuyor, kalın kollar
        artı işaretine benziyordu.
      */}
      <path
        d="M16 7.6c.55 4.3 1.5 7.2 3.4 8.4-1.9 1.2-2.85 4.1-3.4 8.4-.55-4.3-1.5-7.2-3.4-8.4 1.9-1.2 2.85-4.1 3.4-8.4z"
        fill={accent}
      />
      <path
        d="M7.6 16c4.3.55 7.2 1.5 8.4 3.4 1.2-1.9 4.1-2.85 8.4-3.4-4.3-.55-7.2-1.5-8.4-3.4-1.2 1.9-4.1 2.85-8.4 3.4z"
        fill={accent}
        opacity="0.85"
      />
    </svg>
  );
}

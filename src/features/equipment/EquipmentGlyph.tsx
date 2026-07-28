import type { EquipmentCategory } from './data';

/**
 * EKİPMAN SİMGE SETİ — kategoriye göre çizilmiş şematik görseller.
 *
 * NEDEN ÜRETİCİ FOTOĞRAFI DEĞİL: teleskop, kamera ve filtre üreticilerinin
 * ürün görselleri telifli. Çoğu katalog "yalnızca yetkili bayi kullanımı"
 * kaydı taşıyor ve siteye kopyalamak izinsiz kullanım olurdu. Serbest
 * lisanslı bir görsel varsa modelin `image` alanı doldurulur ve o gösterilir;
 * yoksa bu simgeler devreye girer.
 *
 * Simgeler süs değil, bilgi: kullanıcı listeye baktığında bir kaydın
 * reducer mı barlow mu, filtre mi filtre çarkı mı olduğunu okumadan
 * ayırabiliyor. Bu yüzden her biri o parçanın **siluetini** çiziyor —
 * soyut bir daire hepsinde aynı görünürdü.
 *
 * Tek renk (currentColor) ve vuruş tabanlı: kart arka planı hangi temada
 * olursa olsun okunur kalıyor ve 24 px'te de 160 px'te de aynı çizim
 * kullanılabiliyor.
 */

const S = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function Glyph({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-full w-full">
      <g {...S}>{children}</g>
    </svg>
  );
}

const GLYPHS: Record<EquipmentCategory, React.ReactNode> = {
  /* Mercekli tüp: uzun gövde, ön açıklık halkası, arka odaklayıcı. */
  'optik-tup': (
    <>
      <rect x="6" y="17" width="27" height="14" rx="2.5" />
      <path d="M6 19.5v9" />
      <rect x="33" y="20" width="7" height="8" rx="1" />
      <path d="M40 24h3" />
      <path d="M17 31v5M23 31v5" />
      <path d="M14 38h12" />
    </>
  ),
  /* Fotoğraf lensi: silindirik gövde, odak halkası, bayonet. */
  lens: (
    <>
      <rect x="10" y="14" width="24" height="20" rx="2" />
      <path d="M17 14v20M25 14v20" />
      <rect x="34" y="17" width="5" height="14" rx="1" />
      <circle cx="13.5" cy="24" r="3" />
    </>
  ),
  /* Reducer: ışığı daraltan koni. */
  reducer: (
    <>
      <path d="M8 14v20" />
      <path d="M8 14l14 6v8L8 34" />
      <rect x="22" y="19" width="10" height="10" rx="1" />
      <path d="M32 24h8" />
      <path d="M38 21l3 3-3 3" />
    </>
  ),
  /* Barlow: ışığı genişleten ters koni. */
  barlow: (
    <>
      <path d="M40 14v20" />
      <path d="M40 14L26 20v8l14 6" />
      <rect x="16" y="19" width="10" height="10" rx="1" />
      <path d="M8 24h8" />
      <path d="M10 21l-3 3 3 3" />
    </>
  ),
  /* Filtre: dişli çerçeve içinde cam. */
  filtre: (
    <>
      <circle cx="24" cy="24" r="13" />
      <circle cx="24" cy="24" r="9" />
      <path d="M24 11v3M24 34v3M11 24h3M34 24h3" />
      <path d="M18 24a6 6 0 0 0 12 0" />
    </>
  ),
  /* Filtre çarkı: dairede beş yuva. */
  'filtre-carki': (
    <>
      <circle cx="24" cy="24" r="14" />
      <circle cx="24" cy="24" r="2.5" />
      <circle cx="24" cy="14" r="3.5" />
      <circle cx="33" cy="21" r="3.5" />
      <circle cx="30" cy="32" r="3.5" />
      <circle cx="18" cy="32" r="3.5" />
      <circle cx="15" cy="21" r="3.5" />
    </>
  ),
  /* Astro kamera: soğutmalı silindir gövde + kanatlar. */
  'astro-kamera': (
    <>
      <rect x="14" y="13" width="20" height="22" rx="3" />
      <path d="M18 13v22M24 13v22M30 13v22" />
      <rect x="20" y="35" width="8" height="5" rx="1" />
      <path d="M22 8h4v5h-4z" />
      <path d="M11 24h3M34 24h3" />
    </>
  ),
  /* Fotoğraf makinesi: gövde, objektif, vizör kabartısı. */
  'fotograf-makinesi': (
    <>
      <rect x="7" y="17" width="34" height="20" rx="3" />
      <path d="M17 17l3-4h8l3 4" />
      <circle cx="24" cy="27" r="7" />
      <circle cx="24" cy="27" r="3" />
      <circle cx="35" cy="22" r="1.2" />
    </>
  ),
  /* Oküler: konik gövde, göz kapağı halkası. */
  okuler: (
    <>
      <path d="M17 12h14l-2 8h-10z" />
      <rect x="18" y="20" width="12" height="12" rx="1.5" />
      <path d="M20 32h8v5h-8z" />
      <path d="M15 12h18" />
    </>
  ),
  /* Montür: tripod bacakları + eğik ekvatoryal kafa. */
  montur: (
    <>
      <path d="M24 30L14 42M24 30l10 12M24 30v10" />
      <rect
        x="15"
        y="12"
        width="18"
        height="9"
        rx="2"
        transform="rotate(-25 24 16.5)"
      />
      <circle cx="24" cy="26" r="3.5" />
      <path d="M31 9l3 5" />
    </>
  ),
  /* Odaklayıcı: dişli gövde + tahrik çarkı. */
  odaklayici: (
    <>
      <rect x="9" y="18" width="22" height="12" rx="2" />
      <path d="M31 21h8v6h-8z" />
      <circle cx="16" cy="34" r="4" />
      <path d="M16 30v-2" />
      <path d="M13 24h14" />
    </>
  ),
  /* Guide: küçük tüp + üzerinde takip yıldızı. */
  guide: (
    <>
      <rect x="8" y="21" width="21" height="10" rx="2" />
      <rect x="29" y="23" width="6" height="6" rx="1" />
      <path d="M35 26h4" />
      <path d="M14 31v4h9v-4" />
      <path d="M36 12l1.4 3 3 1.4-3 1.4-1.4 3-1.4-3-3-1.4 3-1.4z" />
    </>
  ),
  /* Kontrol: kutu + Wi-Fi yayılımı + güç çıkışları. */
  kontrol: (
    <>
      <rect x="10" y="20" width="28" height="18" rx="3" />
      <circle cx="17" cy="29" r="1.6" />
      <circle cx="23" cy="29" r="1.6" />
      <circle cx="29" cy="29" r="1.6" />
      <path d="M17 15a10 10 0 0 1 14 0" />
      <path d="M20.5 11a15 15 0 0 1 7 0" />
    </>
  ),
  /* Aksesuar: kırlangıç kuyruğu rayı + vida. */
  aksesuar: (
    <>
      <path d="M9 20h30l-4 8H13z" />
      <path d="M13 28v6h22v-6" />
      <circle cx="18" cy="24" r="1.4" />
      <circle cx="30" cy="24" r="1.4" />
    </>
  ),
};

export function EquipmentGlyph({
  category,
  className,
}: {
  category: EquipmentCategory;
  className?: string;
}) {
  return (
    <span className={className} aria-hidden="true">
      <Glyph>{GLYPHS[category]}</Glyph>
    </span>
  );
}

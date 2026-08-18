import type { PlateSolve } from './types';

/**
 * ALAN ÇÖZÜMÜ KATMANI — karonun üstünde, imleç geldiğinde.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN GALERİDE
 *
 * Çözüm verisi yalnızca fotoğraf DETAY sayfasında görünüyordu; galeride
 * tek işaret "⌖ Çözüldü" rozetiydi. Rozet ölçümün varlığını söylüyor
 * ama değerini söylemiyor — "bu kare gökyüzünde tam olarak nerede,
 * hangi ölçekte" sorusunun cevabı için her karta tek tek girmek
 * gerekiyordu.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN ÜSTÜNE BİNİYOR, YANINA DEĞİL
 *
 * Değerler fotoğrafın KENDİSİNE ait: merkez koordinatı, kadraj boyutu ve
 * ölçek, o karenin geometrisi. Kartın altına yazılsaydı ızgaradaki her
 * karo uzar ve galeri, fotoğrafların değil sayıların listesi hâline
 * gelirdi. Katman yalnızca imleç oradayken var.
 *
 * ══════════════════════════════════════════════════════════════════════
 * KLAVYE VE DOKUNMATİK
 *
 * `group-focus-within` ile klavyeyle gezen kullanıcıda da açılıyor:
 * yalnızca `hover`a bağlamak, fareyi olmayan herkesten gizlemek olurdu.
 * Dokunmatikte hover yok ve bu bilinçli — orada karta dokunmak zaten
 * detay sayfasını açıyor ve tüm künye orada.
 *
 * `pointer-events-none`: katman kartın bağlantısını yutmamalı. Üstüne
 * gelip tıklayan kullanıcı yine fotoğrafa gitmeli.
 */
export function SolveOverlay({ solve }: { solve: PlateSolve }) {
  /* Yalnızca ÇÖZÜLMÜŞ kayıtta çiziliyor: "sırada" ya da "başarısız"
     durumunda gösterilecek bir ölçüm yok ve boş bir kutu açmak,
     kullanıcıya veri varmış gibi gösterirdi. */
  if (solve.durum !== 'cozuldu') return null;
  if (solve.raDeg === null || solve.decDeg === null) return null;

  const satirlar: [string, string][] = [
    ['RA', formatRa(solve.raDeg)],
    ['Dec', formatDec(solve.decDeg)],
  ];

  if (solve.fieldWidthDeg !== null && solve.fieldHeightDeg !== null) {
    satirlar.push([
      'Alan',
      `${solve.fieldWidthDeg.toFixed(2)}° × ${solve.fieldHeightDeg.toFixed(2)}°`,
    ]);
  }
  if (solve.scaleArcsecPx !== null) {
    satirlar.push(['Ölçek', `${solve.scaleArcsecPx.toFixed(2)} ″/px`]);
  }
  if (solve.rotationDeg !== null) {
    satirlar.push(['Dönüklük', `${solve.rotationDeg.toFixed(1)}°`]);
  }

  return (
    <div
      /*
       * `aria-hidden` DEĞİL: ekran okuyucu kullanan okur da bu ölçümleri
       * duyabilmeli. Görsel olarak gizliyken de DOM'da duruyor; katmanı
       * `display:none` ile saklamak onu erişilebilirlik ağacından da
       * silerdi.
       */
      className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-1 bg-gradient-to-t from-background/95 via-background/85 to-transparent p-2.5 pt-6 opacity-0 transition-[opacity,transform] duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 motion-reduce:transition-none"
    >
      <p className="mb-1 text-meta font-medium text-cold">⌖ Alan çözümü</p>
      <dl className="tabular grid grid-cols-2 gap-x-2.5 gap-y-0.5 text-meta">
        {satirlar.map(([etiket, deger]) => (
          <div key={etiket} className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{etiket}</dt>
            <dd className="text-foreground">{deger}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Derece → saat/dakika/saniye.
 *
 * Sağ açıklık gökyüzünde SAAT olarak okunur; dereceyi olduğu gibi
 * göstermek astrofotoğrafçı için okunmayan bir sayı olurdu. Detay
 * sayfası da aynı ayrımı yapıyor.
 */
function formatRa(deg: number): string {
  const saatOndalik = ((deg % 360) + 360) % 360 / 15;
  const saat = Math.floor(saatOndalik);
  const dakikaOndalik = (saatOndalik - saat) * 60;
  const dakika = Math.floor(dakikaOndalik);
  const saniye = Math.round((dakikaOndalik - dakika) * 60);
  /* 60'a yuvarlanan saniye taşırılıyor: "12sa 30dk 60sn" geçersiz. */
  const s = saniye === 60 ? 0 : saniye;
  const d = saniye === 60 ? dakika + 1 : dakika;
  return `${saat}sa ${String(d).padStart(2, '0')}dk ${String(s).padStart(2, '0')}sn`;
}

/** Derece → derece/arcdakika, işaretli. */
function formatDec(deg: number): string {
  const isaret = deg < 0 ? '−' : '+';
  const mutlak = Math.abs(deg);
  const tam = Math.floor(mutlak);
  const dakika = Math.round((mutlak - tam) * 60);
  const d = dakika === 60 ? 0 : dakika;
  const t = dakika === 60 ? tam + 1 : tam;
  return `${isaret}${t}° ${String(d).padStart(2, '0')}′`;
}

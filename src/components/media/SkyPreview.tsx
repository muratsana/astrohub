import { useState } from 'react';
import { StarField } from './StarField';
import { tintFor } from './tints';
import { taramaOnizlemesi } from '@/services/sky/survey';
import { cn } from '@/lib/cn';

/**
 * GÖK CİSMİ ÖNİZLEMESİ — gerçek tarama görüntüsü, olmazsa yıldız alanı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN İKİ KATMAN
 *
 * `StarField` her zaman çiziliyor ve ALTTA duruyor. Tarama görüntüsü
 * üstüne biniyor. Bunun üç faydası var ve üçü de gerçek durumlar:
 *
 *   · Koordinatı olmayan hedeflerde (Ay, Jüpiter, meteor yağmuru)
 *     gösterilecek kesit yok; alttaki katman zaten yerinde.
 *   · Görüntü yüklenene kadar kart boş bir kutu değil.
 *   · CDS erişilemezse (`onError`) kart yine bir şey gösteriyor.
 *
 * Kırık görsel ikonu göstermek bunların hiçbirinden iyi değil.
 *
 * ══════════════════════════════════════════════════════════════════════
 * GEÇİŞ NEDEN VAR
 *
 * DSS kesitleri ~20 kB ve tembel yükleniyor; ekrana giren kart bir anda
 * yıldız alanından fotoğrafa atlıyor. Kısa bir opaklık geçişi bu
 * sıçramayı yumuşatıyor. Geçişi kaldırmak isteyen kullanıcı için
 * `motion-reduce` var — sıçramanın kendisi zaten hareket değil, ama
 * geçiş öyle.
 */
export function SkyPreview({
  seed,
  kind,
  raDeg,
  decDeg,
  arcmin,
  width = 640,
  height = 400,
  alt,
  className,
}: {
  /** Yıldız alanı deseni için sabit tohum — genelde slug. */
  seed: string;
  kind: string;
  raDeg?: number | null;
  decDeg?: number | null;
  arcmin?: number | null;
  width?: number;
  height?: number;
  alt: string;
  className?: string;
}) {
  const [yuklendi, setYuklendi] = useState(false);
  const [basarisiz, setBasarisiz] = useState(false);

  const src =
    raDeg === null || raDeg === undefined || decDeg === null || decDeg === undefined
      ? null
      : taramaOnizlemesi({ raDeg, decDeg, arcmin, width, height });

  return (
    <div className={cn('relative overflow-hidden', className ?? 'absolute inset-0')}>
      <StarField seed={seed} tint={tintFor(kind)} />
      {src && !basarisiz && (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          onLoad={() => setYuklendi(true)}
          onError={() => setBasarisiz(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 motion-reduce:transition-none ${
            yuklendi ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
}

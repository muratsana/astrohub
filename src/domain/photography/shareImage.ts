/**
 * PAYLAŞIM KİTİ GÖRSELLERİ — feed ve story çıktısı (D03, D04, D05, D13).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN KIRPMA DEĞİL, SIĞDIRMA (D05)
 *
 * Sosyal kareler sabit oranlı (feed 4:5, story 9:16); astrofotoğraf ise
 * her orandan olabiliyor. Kadraja zorlamak (cover) bir nebulanın kenarını
 * ya da kuyruklu yıldızın kuyruğunu keser — hangi kısmın önemli olduğunu
 * makine bilemez. Bu yüzden görsel BOZULMADAN, en-boy oranı korunarak
 * koyu bir zemine ORTALANIYOR (contain). Kenarlarda kalan boşluk astro
 * paylaşımında zaten doğal: gökyüzü koyu.
 *
 * Layout matematiği (`contain`) saf ve test edilebilir; tuvale dokunan
 * `renderShareImage` ondan yararlanıyor.
 */

export type ShareFormat = 'feed' | 'story';

export interface Size {
  width: number;
  height: number;
}

/** Sosyal format ölçüleri. Feed 4:5 (en uzun feed oranı), story 9:16. */
export const SHARE_SIZES: Record<ShareFormat, Size> = {
  feed: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
};

export interface PlacedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Kaynağı hedefe en-boy oranını KORUYARAK sığdırır ve ortalar (D05).
 * Dönen dikdörtgen hiçbir zaman kaynağın oranını bozmuyor: width/height
 * her zaman source.width/source.height'e eşit.
 */
export function contain(source: Size, target: Size): PlacedRect {
  if (source.width <= 0 || source.height <= 0) {
    return { x: 0, y: 0, width: target.width, height: target.height };
  }
  const olcek = Math.min(
    target.width / source.width,
    target.height / source.height
  );
  const width = source.width * olcek;
  const height = source.height * olcek;
  return {
    x: (target.width - width) / 2,
    y: (target.height - height) / 2,
    width,
    height,
  };
}

export interface RenderShareOptions {
  format: ShareFormat;
  /** Sağ alta yazılacak filigran (ör. "@murat"); boşsa yazılmıyor (D13). */
  watermark?: string;
  /** Zemin rengi; varsayılan gökyüzü koyusu. */
  background?: string;
}

/**
 * Kaynak dosyayı sosyal karede koyu zemine ortalayarak bir JPEG üretir.
 * Tarayıcı görseli işleyemezse `null` (çağıran taraf durumu gösteriyor).
 */
export async function renderShareImage(
  source: Blob,
  options: RenderShareOptions
): Promise<Blob | null> {
  if (typeof createImageBitmap !== 'function') return null;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source);
  } catch {
    return null;
  }

  const hedef = SHARE_SIZES[options.format];
  const canvas = document.createElement('canvas');
  canvas.width = hedef.width;
  canvas.height = hedef.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return null;
  }

  ctx.fillStyle = options.background ?? '#05070d';
  ctx.fillRect(0, 0, hedef.width, hedef.height);

  const yer = contain(
    { width: bitmap.width, height: bitmap.height },
    hedef
  );
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, yer.x, yer.y, yer.width, yer.height);
  bitmap.close();

  if (options.watermark) {
    const dolgu = Math.round(hedef.width * 0.03);
    ctx.font = `${Math.round(hedef.width * 0.028)}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.fillText(options.watermark, hedef.width - dolgu, hedef.height - dolgu);
  }

  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.9)
  );
}

import {
  kadrajiTemizle,
  kaynakDikdortgen,
  type Kadraj,
} from './kadraj';

export type { Kadraj } from './kadraj';
export {
  EN_AZ_ZOOM,
  kadrajBoslugu,
  EN_COK_ZOOM,
  VARSAYILAN_KADRAJ,
  kadrajiTemizle,
  kaynakDikdortgen,
  sahneOturmasi,
  suruklediktenSonra,
  yakinlastiktanSonra,
  type KaynakDikdortgen,
  type SahneOturmasi,
} from './kadraj';

/**
 * PROFİL GÖRSELLERİ — AVATAR VE KAPAK.
 *
 * ══════════════════════════════════════════════════════════════════════
 * İKİ GÖRSEL, TEK BORU HATTI
 *
 * Avatar kare, kapak geniş bant. Farkları yalnızca hedef ölçüde;
 * kırpma, yeniden kodlama ve boyut küçültme mantığı aynı. Ayrı iki
 * fonksiyon yazmak, birinde düzeltilen bir hatanın diğerinde kalmasına
 * davetiye olurdu — kalite basamakları tam olarak böyle ayrışır.
 *
 * ══════════════════════════════════════════════════════════════════════
 * KAPAK NEDEN 1500×500
 *
 * Profil kapağı ekranın tam genişliğinde duruyor ve içinde okunacak bir
 * şey yok; 1500 piksel geniş ekranda da yeterli, mobilde zaten
 * küçültülüyor. 3:1 oran, dikey bir fotoğraftan bant çıkarırken bile
 * kullanılabilir bir alan bırakıyor — 4:1 çoğu kadrajı yok ediyordu.
 */

export const AVATAR_SIZE = 1024;
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export const BANNER_WIDTH = 1500;
export const BANNER_HEIGHT = 500;
export const BANNER_ASPECT = BANNER_WIDTH / BANNER_HEIGHT;
export const BANNER_MAX_BYTES = 5 * 1024 * 1024;

/** Geriye dönük ad — kadraj tipi artık `Kadraj`. */
export type AvatarCrop = Kadraj;
export const DEFAULT_AVATAR_CROP: Kadraj = { zoom: 1, panX: 0, panY: 0 };

export interface HedefOlcu {
  width: number;
  height: number;
  maxBytes: number;
}

export const AVATAR_HEDEF: HedefOlcu = {
  width: AVATAR_SIZE,
  height: AVATAR_SIZE,
  maxBytes: AVATAR_MAX_BYTES,
};

export const BANNER_HEDEF: HedefOlcu = {
  width: BANNER_WIDTH,
  height: BANNER_HEIGHT,
  maxBytes: BANNER_MAX_BYTES,
};

function canvasBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

/**
 * Seçili kadrajı hedef ölçüde JPEG'e çevirir.
 *
 * KALİTE BASAMAKLI DENENİYOR. Tek bir kalite değeri seçmek iki yönde de
 * yanlış: yüksek tutulursa gürültülü bir astrofotoğraf 5 MB sınırını
 * aşıyor, düşük tutulursa temiz bir kare gereksiz yere bozuluyor.
 * Basamaklar önce kaliteyi, sonra çözünürlüğü düşürüyor — çünkü hafif
 * bir sıkıştırma kaybı, küçülmüş bir görselden daha az fark ediliyor.
 */
export async function renderKadrajBlob(
  file: File,
  kadraj: Kadraj,
  hedef: HedefOlcu
): Promise<Blob> {
  if (typeof createImageBitmap !== 'function') {
    throw new Error('Bu tarayıcı görseli işleyemiyor.');
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Fotoğraf okunamadı. JPEG, PNG veya WebP seçin.');
  }

  const enBoy = hedef.width / hedef.height;
  const dik = kaynakDikdortgen(
    { width: bitmap.width, height: bitmap.height },
    kadrajiTemizle(kadraj),
    enBoy
  );

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Görsel işleme başlatılamadı.');
  }

  const basamaklar = [
    { olcek: 1, quality: 0.9 },
    { olcek: 1, quality: 0.82 },
    { olcek: 1, quality: 0.72 },
    { olcek: 0.75, quality: 0.76 },
    { olcek: 0.5, quality: 0.78 },
  ];

  let enKucuk: Blob | null = null;
  try {
    for (const basamak of basamaklar) {
      canvas.width = Math.round(hedef.width * basamak.olcek);
      canvas.height = Math.round(hedef.height * basamak.olcek);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(
        bitmap,
        dik.x,
        dik.y,
        dik.width,
        dik.height,
        0,
        0,
        canvas.width,
        canvas.height
      );

      const blob = await canvasBlob(canvas, basamak.quality);
      if (!blob) continue;
      if (!enKucuk || blob.size < enKucuk.size) enKucuk = blob;
      if (blob.size <= hedef.maxBytes) return blob;
    }
  } finally {
    bitmap.close();
  }

  if (enKucuk && enKucuk.size <= hedef.maxBytes) return enKucuk;
  throw new Error('Görsel 5 MB sınırına indirilemedi.');
}

/** Avatar için kısayol — çağıranların çoğu bunu kullanıyor. */
export function renderAvatarBlob(file: File, kadraj: Kadraj): Promise<Blob> {
  return renderKadrajBlob(file, kadraj, AVATAR_HEDEF);
}

export function renderBannerBlob(file: File, kadraj: Kadraj): Promise<Blob> {
  return renderKadrajBlob(file, kadraj, BANNER_HEDEF);
}

/*
 * Yol ZAMAN DAMGALI: aynı ada üstüne yazmak, tarayıcı ve CDN
 * önbelleğinde eski görselin kalmasına yol açıyor — kullanıcı
 * "değiştirdim ama eskisi duruyor" diyor. Yeni ad, eski dosya
 * silinene kadar ikisinin bir arada yaşamasına da izin veriyor.
 */
export function avatarStoragePath(userId: string, now = Date.now()): string {
  return `${userId}/avatar-${now}.jpg`;
}

export function bannerStoragePath(userId: string, now = Date.now()): string {
  return `${userId}/banner-${now}.jpg`;
}

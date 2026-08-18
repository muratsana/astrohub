export const AVATAR_SIZE = 1024;
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

/**
 * FOV SINIRLARI TEK YERDE.
 *
 * Aynı iki sayı hem `cleanAvatarCrop`ta hem kaydırıcıda hem de tekerlek
 * ile yakınlaştırmada geçiyordu. Üçü ayrı yazıldığında biri değişip
 * diğerleri kaldığında ortaya "kaydırıcı 5'e çıkıyor ama görüntü 4'te
 * duruyor" gibi sessiz bir uyuşmazlık çıkardı.
 */
export const AVATAR_MIN_ZOOM = 1;
export const AVATAR_MAX_ZOOM = 4;

export interface AvatarCrop {
  /** 1 = en geniş kare FOV, 4 = yakın kırpma. */
  zoom: number;
  /** -1 sol, 1 sağ. Kullanılamayan eksende etkisizdir. */
  panX: number;
  /** -1 üst, 1 alt. Kullanılamayan eksende etkisizdir. */
  panY: number;
}

export const DEFAULT_AVATAR_CROP: AvatarCrop = {
  zoom: 1,
  panX: 0,
  panY: 0,
};

export interface SourceRect {
  x: number;
  y: number;
  size: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function cleanAvatarCrop(crop: AvatarCrop): AvatarCrop {
  return {
    zoom: clamp(
      Number.isFinite(crop.zoom) ? crop.zoom : AVATAR_MIN_ZOOM,
      AVATAR_MIN_ZOOM,
      AVATAR_MAX_ZOOM
    ),
    panX: clamp(Number.isFinite(crop.panX) ? crop.panX : 0, -1, 1),
    panY: clamp(Number.isFinite(crop.panY) ? crop.panY : 0, -1, 1),
  };
}

export function avatarSourceRect(
  source: { width: number; height: number },
  crop: AvatarCrop
): SourceRect {
  const safe = cleanAvatarCrop(crop);
  const base = Math.max(1, Math.min(source.width, source.height));
  const size = Math.max(1, base / safe.zoom);

  const maxX = Math.max(0, source.width - size);
  const maxY = Math.max(0, source.height - size);
  const centerX = source.width / 2 + safe.panX * (maxX / 2);
  const centerY = source.height / 2 + safe.panY * (maxY / 2);

  return {
    x: clamp(centerX - size / 2, 0, maxX),
    y: clamp(centerY - size / 2, 0, maxY),
    size,
  };
}

/**
 * ══════════════════════════════════════════════════════════════════════
 * SAHNE GEOMETRİSİ — DOĞRUDAN ELLE KADRAJ İÇİN
 *
 * Kadraj yalnızca kaydırıcılarla yapılıyordu ve kaydırıcı, sonucu
 * gösteriyordu; SEÇİMİ göstermiyordu. Kullanıcı 144 pikselik yuvarlak
 * önizlemede yalnızca içeride kalanı görüyor, dışarıda ne bıraktığını
 * göremiyordu — "biraz sola" demek için kaydırıcıyı deneme yanılmayla
 * itmek gerekiyordu.
 *
 * Buradaki iki fonksiyon fotoğrafın TAMAMINI bir kare sahneye sığdırıp
 * seçim çerçevesini onun üstünde göstermeyi mümkün kılıyor: sahne
 * pikseli ile kaynak pikseli arasındaki dönüşüm tek yerde duruyor ve
 * saf olduğu için testi de tarayıcısız yazılabiliyor.
 */
export interface StageFit {
  /** Kaynak pikselden sahne pikseline çarpan. */
  scale: number;
  /** Sahnede fotoğrafın sol üst köşesi (kısa kenarda boşluk kalır). */
  offsetX: number;
  offsetY: number;
}

export function avatarStageFit(
  source: { width: number; height: number },
  stage: number
): StageFit {
  const width = Math.max(1, source.width);
  const height = Math.max(1, source.height);
  const scale = Math.min(stage / width, stage / height);
  return {
    scale,
    offsetX: (stage - width * scale) / 2,
    offsetY: (stage - height * scale) / 2,
  };
}

/**
 * Seçim çerçevesinin KAYNAK PİKSEL cinsinden kaydırılması.
 *
 * `panX`/`panY` -1..1 aralığında bir ORAN; sürükleme ise piksel. Dönüşüm
 * `avatarSourceRect`in tersi: orada `x`, `panX * (maxX / 2)` kadar
 * kayıyordu, burada aynı bölen kullanılıyor.
 *
 * `maxX` sıfırken (kare fotoğrafta zoom 1) o eksende gidilecek yer yok;
 * bölme yapılmıyor, değer olduğu gibi kalıyor. Aksi hâlde sonsuz çıkar
 * ve `cleanAvatarCrop` onu sessizce 0'a çekip kadrajı sıfırlardı.
 */
export function avatarCropAfterDrag(
  source: { width: number; height: number },
  crop: AvatarCrop,
  dx: number,
  dy: number
): AvatarCrop {
  const safe = cleanAvatarCrop(crop);
  const base = Math.max(1, Math.min(source.width, source.height));
  const size = Math.max(1, base / safe.zoom);
  const halfX = Math.max(0, source.width - size) / 2;
  const halfY = Math.max(0, source.height - size) / 2;

  return cleanAvatarCrop({
    zoom: safe.zoom,
    panX: halfX > 0 ? safe.panX + dx / halfX : safe.panX,
    panY: halfY > 0 ? safe.panY + dy / halfY : safe.panY,
  });
}

/** Tekerlek ya da kıstırma oranını FOV değerine çeviriyor. */
export function avatarCropAfterZoom(
  crop: AvatarCrop,
  factor: number
): AvatarCrop {
  const safe = cleanAvatarCrop(crop);
  const oran = Number.isFinite(factor) && factor > 0 ? factor : 1;
  return cleanAvatarCrop({ ...safe, zoom: safe.zoom * oran });
}

function canvasBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

export async function renderAvatarBlob(
  file: File,
  crop: AvatarCrop
): Promise<Blob> {
  if (typeof createImageBitmap !== 'function') {
    throw new Error('Bu tarayıcı profil fotoğrafını işleyemiyor.');
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Fotoğraf okunamadı. JPEG, PNG veya WebP seçin.');
  }

  const source = { width: bitmap.width, height: bitmap.height };
  const rect = avatarSourceRect(source, crop);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Fotoğraf işleme başlatılamadı.');
  }

  const attempts = [
    { size: AVATAR_SIZE, quality: 0.9 },
    { size: AVATAR_SIZE, quality: 0.82 },
    { size: AVATAR_SIZE, quality: 0.72 },
    { size: 768, quality: 0.76 },
    { size: 512, quality: 0.78 },
  ];

  let smallest: Blob | null = null;
  try {
    for (const attempt of attempts) {
      canvas.width = attempt.size;
      canvas.height = attempt.size;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(
        bitmap,
        rect.x,
        rect.y,
        rect.size,
        rect.size,
        0,
        0,
        attempt.size,
        attempt.size
      );

      const blob = await canvasBlob(canvas, attempt.quality);
      if (!blob) continue;
      if (!smallest || blob.size < smallest.size) smallest = blob;
      if (blob.size <= AVATAR_MAX_BYTES) return blob;
    }
  } finally {
    bitmap.close();
  }

  if (smallest && smallest.size <= AVATAR_MAX_BYTES) return smallest;
  throw new Error('Fotoğraf 5 MB sınırına indirilemedi.');
}

export function avatarStoragePath(userId: string, now = Date.now()): string {
  return `${userId}/avatar-${now}.jpg`;
}

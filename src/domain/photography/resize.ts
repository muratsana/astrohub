/**
 * GÖRÜNTÜ KÜÇÜLTME — hedef ölçü hesabı ve tarayıcı tarafı yeniden boyutlama.
 *
 * Sunucu tarafı görüntü işleme (edge function + sharp) kurulmadı; küçültme
 * tarayıcıda canvas ile yapılıyor. Bedeli kullanıcının cihazının işi
 * yapması; kazancı kuyruk, "işleniyor" durumu ve orijinali sunucuda
 * yeniden işleme ihtiyacının hiç doğmaması.
 *
 * Ölçü hesabı bu dosyada ve **saftır** — DOM'a dokunmaz, test edilebilir.
 * Canvas'a dokunan tek fonksiyon `renderResized`; onu ayrı tutmak, asıl
 * hata çıkacak yerin (oran hesabı) testlerini tarayıcı olmadan yazmayı
 * mümkün kılıyor.
 */

/** Galeri ve detay sayfasında gösterilen kopya. */
export const DISPLAY_MAX_EDGE = 2048;
/** Kart ve liste küçük resmi. */
export const THUMB_MAX_EDGE = 640;

/**
 * JPEG kalitesi. 0.82 gözle ayırt edilemeyen ile belirgin bozulma
 * arasındaki pratik sınır; astrofotoğrafta düz gradyanlar bant yaptığı
 * için daha aşağı inmiyoruz.
 */
export const JPEG_QUALITY = 0.82;

export interface Size {
  width: number;
  height: number;
}

/**
 * Uzun kenarı `maxEdge`'e indirir, oranı korur.
 *
 * BÜYÜTME YAPILMAZ. Zaten küçük olan bir kareyi hedefe kadar büyütmek
 * dosyayı şişirir ve tek bir yeni piksel bilgisi eklemez; o durumda
 * özgün ölçü döner ve çağıran taraf yeniden kodlamayı atlayabilir.
 *
 * Sonuç tam sayıya yuvarlanır ve hiçbir kenar 1'in altına düşmez —
 * canvas 0 genişlikte çizemez ve 0'a bölen bir oran hesabı üretirdi.
 */
export function fitWithin(source: Size, maxEdge: number): Size {
  const { width, height } = source;
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };

  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };

  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Küçültme gerekiyor mu? Gerekmiyorsa yeniden kodlamaya da gerek yok. */
export function needsResize(source: Size, maxEdge: number): boolean {
  return Math.max(source.width, source.height) > maxEdge;
}

/**
 * Depolama yolu üretir: `<user_id>/<photo_id>/<variant>.jpg`.
 *
 * İlk parça kullanıcı kimliği çünkü nesne politikaları sahipliği yolun
 * ilk klasöründen okuyor (0012). Kimlikleri yola koymak, dosya adından
 * gelen her türlü sürprizi (Türkçe karakter, boşluk, `../`) baştan
 * eler — kullanıcının seçtiği ad hiçbir zaman yola girmez.
 */
export function storagePath(
  userId: string,
  photoId: string,
  variant: 'display' | 'thumb' | 'original',
  extension = 'jpg'
): string {
  return `${userId}/${photoId}/${variant}.${extension}`;
}

/** Dosya adından uzantı — orijinal yüklenirken biçim korunsun diye. */
export function extensionOf(fileName: string, fallback = 'jpg'): string {
  const match = /\.([a-zA-Z0-9]{1,5})$/.exec(fileName);
  if (!match) return fallback;
  return match[1].toLowerCase();
}

/**
 * Canvas ile küçültülmüş bir JPEG üretir.
 *
 * Tarayıcıya dokunan tek yer burası. `createImageBitmap` desteklenmeyen
 * ortamlarda `null` döner; çağıran taraf o durumda orijinali yüklemeyi
 * seçebilir — sessizce bozuk bir kopya üretmektense hiç üretmemek.
 */
export async function renderResized(
  file: File,
  maxEdge: number,
  quality = JPEG_QUALITY
): Promise<{ blob: Blob; size: Size } | null> {
  if (typeof createImageBitmap !== 'function') return null;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }

  const source = { width: bitmap.width, height: bitmap.height };
  const target = fitWithin(source, maxEdge);

  const canvas = document.createElement('canvas');
  canvas.width = target.width;
  canvas.height = target.height;

  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    return null;
  }

  // Yıldız alanları için önemli: varsayılan düşük kaliteli örnekleme
  // küçültmede yıldızları kaybediyor.
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, target.width, target.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality)
  );

  return blob ? { blob, size: target } : null;
}

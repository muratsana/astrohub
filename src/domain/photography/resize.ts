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
 * ARŞİV KOPYASI MERDİVENİ — 10 MB bütçesine inerken ne feda edilir?
 *
 * Sıra bilinçli ve tek bir ilkeye dayanıyor: **önce sıkıştırma, sonra
 * çözünürlük.** Astrofotoğrafta piksel sayısı bilginin kendisi — 6000
 * pikselden 3000'e inmek yıldızları ve ince nebula yapısını geri
 * dönülmez biçimde siler. Aynı kareyi 0.9 yerine 0.7 kalitede kodlamak
 * ise ölçüyü korur ve gözle güçlükle ayırt edilir.
 *
 * Bu yüzden ilk dört basamak ÖLÇÜYÜ HİÇ DEĞİŞTİRMİYOR (`Infinity`), yalnızca
 * kaliteyi indiriyor. Ancak 0.55'in altına inmek astro karelerinin düz
 * gradyanlarında bant üretiyor; oradan sonra kaliteyi daha da düşürmek
 * yerine ölçüyü indirmek daha az zarar veriyor.
 *
 * Son basamak (2048 px / 0.6) pratikte her karede birkaç yüz kilobayt
 * üretiyor; yani bütçeye uymayan bir sonuç neredeyse imkânsız. "Neredeyse"
 * yeterli değil, bu yüzden `chooseWithinBudget` uymama durumunu ayrıca
 * bildiriyor ve çağıran taraf sessizce kabul etmiyor.
 */
export interface EncodeAttempt {
  /** Uzun kenar tavanı; `Infinity` ölçüye dokunma demek. */
  maxEdge: number;
  quality: number;
}

export const ARCHIVE_LADDER: readonly EncodeAttempt[] = [
  { maxEdge: Infinity, quality: 0.9 },
  { maxEdge: Infinity, quality: 0.8 },
  { maxEdge: Infinity, quality: 0.7 },
  { maxEdge: Infinity, quality: 0.6 },
  { maxEdge: 4096, quality: 0.7 },
  { maxEdge: 3000, quality: 0.7 },
  { maxEdge: DISPLAY_MAX_EDGE, quality: 0.6 },
];

export interface BudgetChoice<T> {
  result: T;
  attempt: EncodeAttempt;
  /** Bütçeye uyan bir basamak bulundu mu? */
  withinBudget: boolean;
}

/**
 * Merdiveni bütçeye ulaşana kadar iner — SAF KARAR, kodlayıcı dışarıdan.
 *
 * Canvas'ı buraya sokmamak bilinçli: asıl hata çıkacak yer sıralama ve
 * "hiçbiri sığmadı" dalı, ikisi de tarayıcı olmadan test edilebilir. Kodlama
 * işini çağıran veriyor.
 *
 * ERKEN ÇIKIŞ VAR: bütçeye uyan ilk basamakta duruluyor. Merdivenin tamamını
 * çalıştırıp en küçüğü seçmek, uyan bir sonuç varken gereksiz yere daha çok
 * kalite feda etmek olurdu — ve her basamak bir canvas turu demek.
 *
 * Hiçbiri sığmazsa EN KÜÇÜĞÜ dönüyor ama `withinBudget: false` ile. Sığmayan
 * bir sonucu sığmış gibi döndürmek, hatayı depolama API'sinin anlaşılmaz
 * 413'üne ertelerdi.
 */
export async function chooseWithinBudget<T extends { bytes: number }>(
  budget: number,
  ladder: readonly EncodeAttempt[],
  encode: (attempt: EncodeAttempt, index: number) => Promise<T | null>
): Promise<BudgetChoice<T> | null> {
  let smallest: BudgetChoice<T> | null = null;

  for (const [index, attempt] of ladder.entries()) {
    const result = await encode(attempt, index);
    if (!result) continue;

    if (result.bytes <= budget) {
      return { result, attempt, withinBudget: true };
    }
    if (!smallest || result.bytes < smallest.result.bytes) {
      smallest = { result, attempt, withinBudget: false };
    }
  }

  return smallest;
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
  quality = JPEG_QUALITY,
  mimeType = 'image/jpeg'
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
    canvas.toBlob(resolve, mimeType, quality)
  );

  return blob ? { blob, size: target } : null;
}

/**
 * Dosyayı verilen bayt bütçesine sığana kadar yeniden kodlar.
 *
 * KAYNAK BİR KEZ ÇÖZÜLÜYOR. Her basamakta `createImageBitmap` çağırmak,
 * 40 MB'lık bir kareyi yedi kez baştan çözmek demekti — merdivenin sonuna
 * kadar inen bir dosyada saniyeler. Bitmap bir kez açılıp her basamakta
 * yeniden çiziliyor ve sonunda tek yerden kapatılıyor.
 */
export async function encodeWithinBudget(
  file: File,
  budget: number,
  ladder: readonly EncodeAttempt[] = ARCHIVE_LADDER
): Promise<{ blob: Blob; size: Size; withinBudget: boolean } | null> {
  if (typeof createImageBitmap !== 'function') return null;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }

  const source = { width: bitmap.width, height: bitmap.height };
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    return null;
  }

  try {
    const choice = await chooseWithinBudget(
      budget,
      ladder,
      async (attempt) => {
        const target = fitWithin(source, attempt.maxEdge);
        canvas.width = target.width;
        canvas.height = target.height;
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(bitmap, 0, 0, target.width, target.height);

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', attempt.quality)
        );
        return blob ? { blob, size: target, bytes: blob.size } : null;
      }
    );

    if (!choice) return null;
    return {
      blob: choice.result.blob,
      size: choice.result.size,
      withinBudget: choice.withinBudget,
    };
  } finally {
    bitmap.close();
  }
}

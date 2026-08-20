/**
 * KIRPMA GEOMETRİSİ (§10.2).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN ASTROFOTOĞRAFTA KIRPMA AYRI BİR İŞ
 *
 * Sıradan bir fotoğrafta kırpma bir kompozisyon kararı. Astrofotoğrafta
 * ayrıca bir ÖLÇÜ değişikliği: kadraj daraldıkça alan (FOV) küçülüyor ve
 * künyedeki "şu kadar derecelik alan" ifadesi yanlış hale geliyor.
 *
 * Bu yüzden modül yalnızca dikdörtgen hesabı yapmıyor, kırpılmış alanın
 * DERECE karşılığını da veriyor. Piksel ölçeği (″/px) biliniyorsa bu
 * hesap kesin — tahmin değil.
 *
 * ══════════════════════════════════════════════════════════════════════
 * HER ŞEY ORANLA, PİKSELLE DEĞİL
 *
 * Kırpma dikdörtgeni 0–1 aralığında oranlarla tutuluyor. Sebep: kullanıcı
 * ekranda 800 px genişliğinde bir önizleme görüyor ama dosya 6000 px.
 * Piksel tutulsaydı önizleme boyutu değiştiğinde (pencere yeniden
 * boyutlandırma, kenar çubuğu açılması) seçim kayardı. Oran her ölçekte
 * aynı yeri gösteriyor.
 */

export interface CropRect {
  /** Sol kenar, 0–1. */
  x: number;
  /** Üst kenar, 0–1. */
  y: number;
  /** Genişlik, 0–1. */
  width: number;
  /** Yükseklik, 0–1. */
  height: number;
}

export const FULL_FRAME: CropRect = { x: 0, y: 0, width: 1, height: 1 };

/**
 * En-boy oranı ön ayarları.
 *
 * `null` = serbest. Astrofotoğrafta yaygın oranlar sıradan fotoğraftan
 * farklı: kare (mozaik parçaları), 3:2 (DSLR sensörü), 4:3 (çoğu CMOS
 * astro kamera) ve 16:9 (panoramik gece manzarası).
 */
export const ASPECT_PRESETS: {
  id: string;
  label: string;
  ratio: number | null;
}[] = [
  { id: 'serbest', label: 'Serbest', ratio: null },
  { id: 'kare', label: '1:1', ratio: 1 },
  { id: 'dortuce', label: '4:3', ratio: 4 / 3 },
  { id: 'uciki', label: '3:2', ratio: 3 / 2 },
  { id: 'onaltidokuz', label: '16:9', ratio: 16 / 9 },
];

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Dikdörtgeni kadrajın içine hapseder.
 *
 * Sürükleme sırasında kenar dışarı taşabiliyor; taşan bir dikdörtgen
 * `drawImage`e verildiğinde siyah şerit üretiyor — kırpılmış kare
 * kenarında olmayan bir gökyüzü çıkıyor.
 */
export function clampRect(rect: CropRect): CropRect {
  const width = Math.min(1, Math.max(0.05, rect.width));
  const height = Math.min(1, Math.max(0.05, rect.height));
  return {
    width,
    height,
    x: clamp01(Math.min(rect.x, 1 - width)),
    y: clamp01(Math.min(rect.y, 1 - height)),
  };
}

/**
 * Dikdörtgeni istenen en-boy oranına oturtur.
 *
 * `imageAspect` gerekli çünkü oran PİKSEL dünyasında tanımlı, dikdörtgen
 * ise oran dünyasında. 3000×2000 bir görüntüde 0.5 genişlik ve 0.5
 * yükseklik 1:1 değil, 3:2'dir. Dönüşüm yapılmasaydı "1:1 seç" düğmesi
 * kare olmayan bir kutu üretirdi.
 *
 * Küçülterek oturtuluyor, büyüterek değil: büyütmek kadrajın dışına
 * taşma riski getiriyor ve kullanıcının seçtiği alanı genişletmek onun
 * kararını ezmek olurdu.
 */
export function applyAspect(
  rect: CropRect,
  ratio: number | null,
  imageAspect: number
): CropRect {
  if (ratio === null) return clampRect(rect);

  /* Oran dünyasındaki hedef: piksel oranı / görüntü oranı. */
  const hedef = ratio / imageAspect;

  let { width, height } = rect;
  if (width / height > hedef) {
    width = height * hedef;
  } else {
    height = width / hedef;
  }

  /* Merkezi koru: kullanıcı bir yeri seçtiyse oran değişimi onu
     kaydırmamalı, yalnızca kenarları düzeltmeli. */
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;

  return clampRect({
    width,
    height,
    x: cx - width / 2,
    y: cy - height / 2,
  });
}

/** Kırpılmış alanın piksel ölçüsü. */
export function croppedPixels(
  rect: CropRect,
  source: { width: number; height: number }
): { width: number; height: number } {
  return {
    width: Math.max(1, Math.round(rect.width * source.width)),
    height: Math.max(1, Math.round(rect.height * source.height)),
  };
}

/**
 * Kırpılmış alanın gökyüzünde kapladığı yer, DERECE.
 *
 * `arcsecPerPixel` bilinmiyorsa `null` dönüyor — uydurulmuş bir alan
 * ölçüsü, hiç olmayandan kötü. Değer sihirbazdaki odak/piksel hesabından
 * geliyor ve orada da ancak ekipman seçilmişse doluyor.
 */
export function croppedFieldDeg(
  rect: CropRect,
  source: { width: number; height: number },
  arcsecPerPixel: number | null | undefined
): { widthDeg: number; heightDeg: number } | null {
  if (
    !arcsecPerPixel ||
    !Number.isFinite(arcsecPerPixel) ||
    arcsecPerPixel <= 0
  ) {
    return null;
  }
  const px = croppedPixels(rect, source);
  return {
    widthDeg: (px.width * arcsecPerPixel) / 3600,
    heightDeg: (px.height * arcsecPerPixel) / 3600,
  };
}

const SIYAH_KENAR_ESIGI = 8;
const PARLAK_PIKSEL_ESIGI = 32;
const EN_AZ_PARLAK_ORAN = 0.002;
const ORNEK_SINIRI = 900;

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function aktifSatirMi(
  data: Uint8ClampedArray,
  width: number,
  y: number
): boolean {
  const step = Math.max(1, Math.floor(width / ORNEK_SINIRI));
  let toplam = 0;
  let sayi = 0;
  let parlak = 0;

  for (let x = 0; x < width; x += step) {
    const i = (y * width + x) * 4;
    const l = luminance(data[i], data[i + 1], data[i + 2]);
    toplam += l;
    sayi += 1;
    if (l >= PARLAK_PIKSEL_ESIGI) parlak += 1;
  }

  return toplam / sayi > SIYAH_KENAR_ESIGI || parlak / sayi > EN_AZ_PARLAK_ORAN;
}

function aktifSutunMu(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number
): boolean {
  const step = Math.max(1, Math.floor(height / ORNEK_SINIRI));
  let toplam = 0;
  let sayi = 0;
  let parlak = 0;

  for (let y = 0; y < height; y += step) {
    const i = (y * width + x) * 4;
    const l = luminance(data[i], data[i + 1], data[i + 2]);
    toplam += l;
    sayi += 1;
    if (l >= PARLAK_PIKSEL_ESIGI) parlak += 1;
  }

  return toplam / sayi > SIYAH_KENAR_ESIGI || parlak / sayi > EN_AZ_PARLAK_ORAN;
}

/**
 * Siyah kenarları otomatik bulur.
 *
 * Astrofotoğrafta fon zaten koyu olduğu için "ilk koyu pikseli kırp" gibi
 * agresif bir kural kullanmıyoruz. Sadece tamamen siyaha yakın, satır/sütun
 * ortalaması ve parlak piksel oranı birlikte düşük kalan sürekli kenar
 * bantları atılıyor. Böylece gerçek karanlık gökyüzü korunurken işleme
 * sonrası oluşan letterbox/pillarbox boşlukları temizleniyor.
 */
export function detectBlackBorderCropFromPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number
): CropRect {
  if (width <= 1 || height <= 1 || data.length < width * height * 4) {
    return FULL_FRAME;
  }

  let left = 0;
  while (left < width && !aktifSutunMu(data, width, height, left)) left += 1;

  let right = width - 1;
  while (right > left && !aktifSutunMu(data, width, height, right)) right -= 1;

  let top = 0;
  while (top < height && !aktifSatirMi(data, width, top)) top += 1;

  let bottom = height - 1;
  while (bottom > top && !aktifSatirMi(data, width, bottom)) bottom -= 1;

  if (left >= right || top >= bottom) return FULL_FRAME;

  const guvenlikPayi = 1;
  left = Math.max(0, left - guvenlikPayi);
  top = Math.max(0, top - guvenlikPayi);
  right = Math.min(width - 1, right + guvenlikPayi);
  bottom = Math.min(height - 1, bottom + guvenlikPayi);

  const trimmedX = left + (width - 1 - right);
  const trimmedY = top + (height - 1 - bottom);
  const anlamliTrim = Math.max(2, Math.round(Math.min(width, height) * 0.003));
  if (trimmedX < anlamliTrim && trimmedY < anlamliTrim) return FULL_FRAME;

  const cropWidth = right - left + 1;
  const cropHeight = bottom - top + 1;
  const retainedArea = (cropWidth * cropHeight) / (width * height);
  if (retainedArea < 0.35) return FULL_FRAME;

  return clampRect({
    x: left / width,
    y: top / height,
    width: cropWidth / width,
    height: cropHeight / height,
  });
}

/**
 * Yüklenen görseli tarayıcıda örnekleyip siyah kenar kırpmasını hesaplar.
 * Canvas yoksa tam kadraj döner; otomatik kırpma yüklemeyi bloke etmez.
 */
export async function detectBlackBorderCrop(file: File): Promise<CropRect> {
  if (
    typeof createImageBitmap !== 'function' ||
    typeof document === 'undefined'
  ) {
    return FULL_FRAME;
  }

  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return FULL_FRAME;

    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return detectBlackBorderCropFromPixels(
      image.data,
      image.width,
      image.height
    );
  } finally {
    bitmap.close?.();
  }
}

/** Kırpma gerçekten bir şey değiştiriyor mu? */
export function isFullFrame(rect: CropRect): boolean {
  const e = 0.001;
  return (
    Math.abs(rect.x) < e &&
    Math.abs(rect.y) < e &&
    Math.abs(rect.width - 1) < e &&
    Math.abs(rect.height - 1) < e
  );
}

/**
 * Kırpmayı uygular ve yeni bir dosya üretir.
 *
 * TAM KADRAJDA DOSYAYA HİÇ DOKUNULMUYOR ve bu önemli: kırpma yapmayan
 * kullanıcının dosyası yeniden kodlanmamalı. Yeniden kodlama JPEG'de
 * kayıplı bir işlem — hiçbir şey kırpmadan kalite kaybetmek, kullanıcının
 * emeğini sessizce bozmak olurdu.
 *
 * Kırpma varsa çıktı JPEG: kaynak PNG olsa bile kırpılmış astrofotoğraf
 * gösterim için kullanılıyor ve PNG olarak yeniden kodlamak dosyayı
 * gereksiz büyütürdü.
 */
export async function applyCropToFile(
  file: File,
  rect: CropRect,
  quality = 0.92
): Promise<File> {
  if (isFullFrame(rect)) return file;

  if (
    typeof createImageBitmap !== 'function' ||
    typeof document === 'undefined'
  ) {
    /* Tarayıcı kırpamıyorsa özgün dosya geçiyor. Kırpma bir EK; onun
       yüzünden yüklemeyi düşürmek orantısız olurdu. */
    return file;
  }

  const bitmap = await createImageBitmap(file);
  try {
    const px = croppedPixels(rect, {
      width: bitmap.width,
      height: bitmap.height,
    });

    const canvas = document.createElement('canvas');
    canvas.width = px.width;
    canvas.height = px.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(
      bitmap,
      Math.round(rect.x * bitmap.width),
      Math.round(rect.y * bitmap.height),
      px.width,
      px.height,
      0,
      0,
      px.width,
      px.height
    );

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    );
    if (!blob) return file;

    const nokta = file.name.lastIndexOf('.');
    const govde = nokta > 0 ? file.name.slice(0, nokta) : file.name;

    return new File([blob], `${govde}-kirpilmis.jpg`, {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    });
  } finally {
    bitmap.close?.();
  }
}

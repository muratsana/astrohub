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
export const ASPECT_PRESETS: { id: string; label: string; ratio: number | null }[] =
  [
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
  if (!arcsecPerPixel || !Number.isFinite(arcsecPerPixel) || arcsecPerPixel <= 0) {
    return null;
  }
  const px = croppedPixels(rect, source);
  return {
    widthDeg: (px.width * arcsecPerPixel) / 3600,
    heightDeg: (px.height * arcsecPerPixel) / 3600,
  };
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

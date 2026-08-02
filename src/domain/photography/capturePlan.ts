import { formatIntegration } from './integration';

/**
 * ÇEKİM PLANI — poz, entegrasyon ve depolama (§14.2).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN `integration.ts`E EKLENMEDİ
 *
 * O modül ÇEKİLMİŞ olanı topluyor (`totalIntegrationSeconds`) ve
 * `PhotoCard` üzerinden ANA SAYFA paketine giriyor. Plan hesapları oraya
 * eklenseydi, hiç planlayıcı açmayan ziyaretçiye de inerdi. Ayrı modül;
 * `formatIntegration`ı ondan alıyor, yani biçimlendirme tek yerde.
 *
 * Yön de farklı: biri "ne çektim", öteki "ne çekmem gerek".
 *
 * ══════════════════════════════════════════════════════════════════════
 * NE HESAPLANIYOR, NE HESAPLANMIYOR — §14.2'NİN İKİ KURALI
 *
 * §14.2 iki şey emrediyor: "hesapların formüllerini testlerle doğrula"
 * ve "bilimsel sonucu belirsiz alanlarda kesinlik iddiası kullanma".
 * İkisi birlikte, neyin hesaplanacağını da belirliyor.
 *
 * HESAPLANIYOR (aritmetik, tek doğrusu var):
 *   · Hedef entegrasyona ulaşmak için filtre başına kare sayısı
 *   · Gece başına kullanılabilir süreye göre kaç gece gerektiği
 *   · Ham (sıkıştırılmamış) depolama ihtiyacı
 *
 * HESAPLANMIYOR (tek doğrusu YOK):
 *   · "Optimum" alt poz süresi. Gökyüzü parlaklığına, okuma gürültüsüne,
 *     f oranına ve montaj takibine bağlı; tek bir sayı vermek uydurma
 *     olurdu. Kullanıcı kendi süresini giriyor.
 *   · Dither aralığı. Yerleşik pratik bir ARALIK (bkz. `ditherAdvice`),
 *     formül değil.
 *   · Sıkıştırılmış dosya boyutu. Sıkıştırma orana göre değişir ve
 *     hedefin gürültüsüne bağlıdır; ham boyut veriliyor ve sıkıştırmanın
 *     bunu düşüreceği SÖYLENİYOR, bir çarpan uydurulmuyor.
 */

export interface FilterPlanInput {
  /** Filtre adı (L, R, G, B, Ha…). */
  filter: string;
  /**
   * Bu filtrenin toplam entegrasyondaki payı. Oran; birim önemsiz.
   * LRGB'de tipik olarak 4:1:1:1, SHO'da 1:1:1 kullanılır ama bu bir
   * tercih, kural değil.
   */
  weight: number;
  /** Alt poz süresi (saniye) — kullanıcıdan gelir, hesaplanmaz. */
  subSeconds: number;
}

export interface FilterPlanRow extends FilterPlanInput {
  /** Bu filtreden çekilecek kare sayısı. */
  frames: number;
  /** Kare sayısı × alt poz (saniye). */
  seconds: number;
}

export interface CapturePlan {
  rows: FilterPlanRow[];
  /** Planın gerçekte topladığı süre — yuvarlama sonrası. */
  totalSeconds: number;
  totalFrames: number;
  /**
   * Kaç gece gerekiyor. Gece başına kullanılabilir süre verilmezse
   * `null` — uydurulmuş bir "ortalama gece" ile hesaplamıyoruz.
   */
  nights: number | null;
  /** İnsan okunur toplam ("12 sa 30 dk"). */
  label: string;
}

/**
 * Hedef entegrasyonu filtrelere paylaştırır ve kare sayılarına çevirir.
 *
 * ══════════════════════════════════════════════════════════════════════
 * KARE SAYISI YUKARI YUVARLANIYOR
 *
 * `Math.ceil` bilinçli: 37,2 kare diye bir şey yok ve aşağı yuvarlamak
 * hedefin ALTINDA kalmak demek. Yukarı yuvarlayınca plan hedefi biraz
 * aşıyor; `totalSeconds` bu yüzden istenen hedefe eşit değil, planın
 * GERÇEK toplamı. Kullanıcıya "istediğin" değil "çıkan" gösteriliyor.
 *
 * Sıfır ağırlıklı filtre listede kalır ama sıfır kareyle: kullanıcı bir
 * filtreyi geçici olarak sıfırlayıp satırı kaybetmemeli.
 */
export function planCapture(
  targetHours: number,
  filters: FilterPlanInput[],
  options: { usableHoursPerNight?: number } = {}
): CapturePlan {
  if (targetHours < 0) throw new Error('Hedef süre negatif olamaz');
  for (const f of filters) {
    if (f.weight < 0) throw new Error('Filtre payı negatif olamaz');
    if (f.subSeconds <= 0) throw new Error('Alt poz süresi sıfırdan büyük olmalı');
  }

  const toplamAgirlik = filters.reduce((s, f) => s + f.weight, 0);
  const hedefSaniye = targetHours * 3600;

  const rows: FilterPlanRow[] = filters.map((f) => {
    /* Ağırlık toplamı sıfırsa (kullanıcı hepsini sıfırladı) bölme
       tanımsız olurdu; pay yok demek, kare de yok. */
    const pay = toplamAgirlik > 0 ? f.weight / toplamAgirlik : 0;
    const frames = Math.ceil((hedefSaniye * pay) / f.subSeconds);
    return { ...f, frames, seconds: frames * f.subSeconds };
  });

  const totalSeconds = rows.reduce((s, r) => s + r.seconds, 0);
  const totalFrames = rows.reduce((s, r) => s + r.frames, 0);

  const gece = options.usableHoursPerNight;
  const nights =
    gece && gece > 0 ? Math.ceil(totalSeconds / 3600 / gece) : null;

  return {
    rows,
    totalSeconds,
    totalFrames,
    nights,
    label: formatIntegration(totalSeconds),
  };
}

/* ── Depolama ────────────────────────────────────────────────────────── */

export interface SensorSpec {
  /** Piksel genişliği. */
  width: number;
  height: number;
  /** Bit derinliği — genellikle 16 (CMOS/CCD ham kare). */
  bitDepth: number;
}

export interface StorageEstimate {
  /** Tek karenin ham boyutu (bayt). */
  bytesPerFrame: number;
  /** Işık kareleri toplamı (bayt). */
  lightBytes: number;
  /** Kalibrasyon kareleri toplamı (bayt). */
  calibrationBytes: number;
  totalBytes: number;
  /** "4,8 GB" gibi okunur biçim. */
  label: string;
}

/**
 * Ham depolama ihtiyacı.
 *
 * FORMÜL: genişlik × yükseklik × (bitDerinliği / 8) × kare sayısı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SIKIŞTIRMA HESABA KATILMIYOR — ÇARPAN UYDURMUYORUZ
 *
 * FITS ve benzeri formatlar sıkıştırılabilir ama kazanç hedefin
 * gürültüsüne ve içeriğine göre değişir; sabit bir çarpan (%30 gibi)
 * yazmak §14.2'nin yasakladığı kesinlik iddiası olurdu. Ham boyut
 * veriliyor ve bunun ÜST SINIR olduğu arayüzde söyleniyor.
 *
 * Dosya başlığı (FITS header) da katılmıyor: birkaç kilobayt, gigabaytlar
 * yanında ölçülemez ve dahil etmek yanlış bir hassasiyet izlenimi verirdi.
 */
export function estimateStorage(
  sensor: SensorSpec,
  lightFrames: number,
  calibrationFrames = 0
): StorageEstimate {
  if (sensor.width <= 0 || sensor.height <= 0)
    throw new Error('Sensör boyutu sıfırdan büyük olmalı');
  if (sensor.bitDepth <= 0) throw new Error('Bit derinliği sıfırdan büyük olmalı');
  if (lightFrames < 0 || calibrationFrames < 0)
    throw new Error('Kare sayısı negatif olamaz');

  const bytesPerFrame = sensor.width * sensor.height * (sensor.bitDepth / 8);
  const lightBytes = bytesPerFrame * lightFrames;
  const calibrationBytes = bytesPerFrame * calibrationFrames;
  const totalBytes = lightBytes + calibrationBytes;

  return {
    bytesPerFrame,
    lightBytes,
    calibrationBytes,
    totalBytes,
    label: formatBytes(totalBytes),
  };
}

/**
 * Bayt → okunur birim.
 *
 * 1024 TABANI: depolama alanı işletim sisteminde GiB olarak gösteriliyor
 * ve kullanıcı sonucu diskiyle karşılaştıracak. 1000 tabanı kullansaydık
 * "40 GB" diyen bir plan, diskte 37,2 GB görünürdü ve fark açıklama
 * gerektirirdi.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 0) throw new Error('Boyut negatif olamaz');
  if (bytes < 1024) return `${Math.round(bytes)} B`;

  const birimler = ['KB', 'MB', 'GB', 'TB'];
  let deger = bytes / 1024;
  let i = 0;
  while (deger >= 1024 && i < birimler.length - 1) {
    deger /= 1024;
    i += 1;
  }
  /* GB ve üstünde bir ondalık; MB altında tam sayı yeter — 137,4 MB'ın
     ondalığı kimseye bir şey söylemiyor. */
  const ondalik = i >= 2 ? 1 : 0;
  return `${deger.toFixed(ondalik).replace('.', ',')} ${birimler[i]}`;
}

/* ── Dither ──────────────────────────────────────────────────────────── */

export interface DitherAdvice {
  /** Önerilen aralığın alt ve üst sınırı (kare). */
  min: number;
  max: number;
  note: string;
}

/**
 * Dither aralığı önerisi.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BU BİR FORMÜL DEĞİL, YERLEŞİK PRATİK — VE ÖYLE SÖYLENİYOR
 *
 * §14.2 "bilimsel sonucu belirsiz alanlarda kesinlik iddiası kullanma"
 * diyor. Dither aralığının türetilebileceği bir denklem yok; amatör
 * pratikte her 2–5 karede bir dither yaygın. Tek bir sayı döndürüp
 * "hesaplandı" demek uydurma olurdu.
 *
 * Aralık alt poza göre KABACA kayıyor ve gerekçesi mekanik: kısa
 * pozlarda kare çok olduğu için sık dither toplam süreden büyük pay
 * yer (her dither sonrası yeniden yerleşme bekleniyor); uzun pozlarda
 * kare az olduğu için sık dither'ın maliyeti göreli olarak düşük.
 */
export function ditherAdvice(subSeconds: number): DitherAdvice {
  if (subSeconds <= 0) throw new Error('Alt poz süresi sıfırdan büyük olmalı');

  if (subSeconds <= 60) {
    return {
      min: 4,
      max: 8,
      note: 'Kısa pozda kare sayısı yüksek; çok sık dither, yeniden yerleşme beklemeleriyle geceden belirgin süre götürür.',
    };
  }
  if (subSeconds <= 300) {
    return {
      min: 2,
      max: 5,
      note: 'Yaygın aralık. Sabit desen gürültüsü ve sıcak pikseller yığında elenecek kadar kayma sağlar.',
    };
  }
  return {
    min: 1,
    max: 3,
    note: 'Uzun pozda kare az; her karede dither etmenin süre maliyeti düşük, kazancı yüksek.',
  };
}

/**
 * FİZİKSEL BAĞLANTI STANDARTLARI.
 *
 * Astrofotoğraf zinciri, birbirine vidalanan parçalardan oluşur ve iki
 * parçanın "uyumlu" olması ancak bağlantı standartlarının eşleşmesiyle
 * mümkündür. Bu modül o eşleşmeyi ve eşleşmeyince gereken adaptörü bulur.
 *
 * NEDEN AYRI BİR MODÜL: bağlantı, kataloğun en çok hata yapılan alanı.
 * "M48" yazan bir kayıt M48x0.75 mi yoksa M48x1 mi belli değil ve ikisi
 * birbirine takılmaz. Standartları sabit bir listede tutmak, kataloğa
 * serbest metin girilmesini engelliyor.
 *
 * TAHMİN YOK: bir ürünün bağlantısı bilinmiyorsa `undefined` kalır ve
 * uyumluluk kontrolü "veri yetersiz" der. En yaygın standardı varsaymak,
 * kullanıcıya takılmayacak bir zinciri "uyumlu" diye göstermek olurdu.
 */

export type ConnectionStandard =
  /* Vidalı astronomi standartları */
  | 'M42x0.75' // T2
  | 'M42x1'
  | 'M48x0.75'
  | 'M54x0.75'
  | 'M63x1'
  | 'M68x1'
  | 'M72x1'
  | 'M90x1'
  | 'M92x1'
  /* Geçmeli (sürtünme) standartları */
  | '1.25in'
  | '2in'
  | '3in'
  /* Kamera bayonetleri */
  | 'C-mount'
  | 'CS-mount'
  | 'Canon EF'
  | 'Canon RF'
  | 'Nikon F'
  | 'Nikon Z'
  | 'Sony E'
  | 'Fujifilm X'
  | 'MFT'
  | 'Pentax K'
  /* Üreticiye özel */
  | 'Takahashi M56'
  | 'Celestron SCT'
  | 'Celestron EdgeHD'
  | 'Meade SCT'
  | 'Üreticiye özel';

export interface ConnectionInfo {
  label: string;
  /** Erkek/dişi ayrımı olmayan nominal dış çap ya da geçme çapı, mm. */
  nominalDiameterMm: number;
  /**
   * Işığın geçtiği en dar açıklık, mm. Vinyet hesabının girdisi.
   * Bilinmeyen değerler `null`; standardın kendisi bir açıklık garanti etmez.
   */
  clearApertureMm: number | null;
  note?: string;
}

export const CONNECTIONS: Record<ConnectionStandard, ConnectionInfo> = {
  'M42x0.75': {
    label: 'M42×0.75 (T2)',
    nominalDiameterMm: 42,
    clearApertureMm: 38,
    note: 'T2 olarak da bilinir. APS-C sensörün köşesini kırpabilir.',
  },
  'M42x1': {
    label: 'M42×1 (M42 vida)',
    nominalDiameterMm: 42,
    clearApertureMm: 38,
    note: 'Eski fotoğraf makinesi vidası. T2 ile aynı çapta ama hatvesi farklı — TAKILMAZ.',
  },
  'M48x0.75': {
    label: 'M48×0.75',
    nominalDiameterMm: 48,
    clearApertureMm: 44,
    note: 'Tam kare sensörlerde T2 yerine tercih edilir.',
  },
  'M54x0.75': { label: 'M54×0.75', nominalDiameterMm: 54, clearApertureMm: 50 },
  'M63x1': { label: 'M63×1', nominalDiameterMm: 63, clearApertureMm: 58 },
  'M68x1': { label: 'M68×1', nominalDiameterMm: 68, clearApertureMm: 63 },
  'M72x1': { label: 'M72×1', nominalDiameterMm: 72, clearApertureMm: 67 },
  'M90x1': { label: 'M90×1', nominalDiameterMm: 90, clearApertureMm: 84 },
  'M92x1': { label: 'M92×1', nominalDiameterMm: 92, clearApertureMm: 86 },
  '1.25in': {
    label: '1.25″ geçme',
    nominalDiameterMm: 31.75,
    clearApertureMm: 27,
    note: 'Vidalı değil, sıkıştırma halkasıyla tutulur. Ağır kamera zincirinde eğilme yapar.',
  },
  '2in': { label: '2″ geçme', nominalDiameterMm: 50.8, clearApertureMm: 46 },
  '3in': { label: '3″ geçme', nominalDiameterMm: 76.2, clearApertureMm: 70 },
  'C-mount': { label: 'C-mount', nominalDiameterMm: 25.4, clearApertureMm: 22 },
  'CS-mount': { label: 'CS-mount', nominalDiameterMm: 25.4, clearApertureMm: 22 },
  'Canon EF': { label: 'Canon EF', nominalDiameterMm: 54, clearApertureMm: 38 },
  'Canon RF': { label: 'Canon RF', nominalDiameterMm: 54, clearApertureMm: 38 },
  'Nikon F': { label: 'Nikon F', nominalDiameterMm: 44, clearApertureMm: 35 },
  'Nikon Z': { label: 'Nikon Z', nominalDiameterMm: 55, clearApertureMm: 45 },
  'Sony E': { label: 'Sony E', nominalDiameterMm: 46, clearApertureMm: 37 },
  'Fujifilm X': { label: 'Fujifilm X', nominalDiameterMm: 44, clearApertureMm: 35 },
  MFT: { label: 'Micro Four Thirds', nominalDiameterMm: 38, clearApertureMm: 32 },
  'Pentax K': { label: 'Pentax K', nominalDiameterMm: 44, clearApertureMm: 35 },
  'Takahashi M56': {
    label: 'Takahashi M56',
    nominalDiameterMm: 56,
    clearApertureMm: 52,
  },
  'Celestron SCT': {
    label: 'SCT arka hücre (2″×24 TPI)',
    nominalDiameterMm: 50.8,
    clearApertureMm: 42,
  },
  'Celestron EdgeHD': {
    label: 'EdgeHD arka hücre',
    nominalDiameterMm: 50.8,
    clearApertureMm: 42,
  },
  'Meade SCT': {
    label: 'Meade SCT arka hücre',
    nominalDiameterMm: 50.8,
    clearApertureMm: 42,
  },
  'Üreticiye özel': {
    label: 'Üreticiye özel',
    nominalDiameterMm: 0,
    clearApertureMm: null,
    note: 'Standart dışı bağlantı; yalnızca üreticinin kendi adaptörleriyle kullanılır.',
  },
};

export const CONNECTION_LIST = Object.keys(CONNECTIONS) as ConnectionStandard[];

export function connectionLabel(standard: ConnectionStandard): string {
  return CONNECTIONS[standard]?.label ?? standard;
}

export function isConnectionStandard(value: string): value is ConnectionStandard {
  return value in CONNECTIONS;
}

/* ══════════════════════ Bağlanabilirlik ══════════════════════ */

export type ConnectionVerdict =
  | { kind: 'direct' }
  | { kind: 'adapter-needed'; from: ConnectionStandard; to: ConnectionStandard }
  | { kind: 'unknown'; reason: string };

/**
 * İki bağlantı doğrudan birleşir mi?
 *
 * Aynı standart dışında hiçbir eşleşmeyi "doğrudan" saymıyoruz. M42×0.75
 * ile M42×1 aynı çapta ama hatveleri farklı ve zorlanırsa diş sıyırır;
 * "yakın çap" mantığı burada zarar verir.
 */
export function checkConnection(
  output: ConnectionStandard | undefined,
  input: ConnectionStandard | undefined
): ConnectionVerdict {
  if (!output || !input) {
    return {
      kind: 'unknown',
      reason:
        'Parçalardan en az birinin bağlantı standardı katalogda kayıtlı değil.',
    };
  }
  if (output === input) return { kind: 'direct' };
  return { kind: 'adapter-needed', from: output, to: input };
}

/**
 * Zincirin en dar açıklığı — vinyet hesabının belirleyicisi.
 *
 * Açıklığı bilinmeyen parçalar hesaba **girmez** ama sayılır: sonuç
 * "bulunan en dar açıklık" ile birlikte "kaç parçanın verisi eksik"
 * bilgisini taşır. Eksik veriyi yok saymak, dar bir filtre çarkını
 * görmezden gelip "vinyet yok" demek olurdu.
 */
export function narrowestAperture(
  apertures: (number | null | undefined)[]
): { valueMm: number | null; missing: number } {
  let min: number | null = null;
  let missing = 0;
  for (const value of apertures) {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      missing += 1;
      continue;
    }
    min = min === null ? value : Math.min(min, value);
  }
  return { valueMm: min, missing };
}

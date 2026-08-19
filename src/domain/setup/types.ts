import type { EquipmentModel } from '@/features/equipment/data';

/**
 * SETUP MODELİ VE HESAP SONUÇ TİPLERİ.
 *
 * Hesaplama motorunun tamamı bu tipler üzerinde çalışır. Ayrı bir dosyada
 * olmasının sebebi, motorun ve arayüzün aynı sözleşmeyi paylaşması ama
 * arayüzün motoru içe aktarmak zorunda kalmaması.
 */

/* ══════════════════════ Setup yapısı ══════════════════════ */

/**
 * Zincirdeki yuvalar — ışığın izlediği sıra.
 *
 * Sıra rastgele değil: backfocus zinciri bu diziyi kullanarak optik yolu
 * topluyor ve bağlantı uyumu ardışık iki yuva arasında kontrol ediliyor.
 * Yeni bir yuva eklerken doğru yere koymak, iki ayrı hesabı birden
 * düzeltmek demek.
 */
export const OPTICAL_CHAIN = [
  'optik',
  'reducer',
  'barlow',
  'rotator',
  'oag',
  'filtre-carki',
  'kamera',
] as const;

export type ChainSlot = (typeof OPTICAL_CHAIN)[number];

/** Optik zincirin dışında kalan ama ağırlığa/hesaba giren yuvalar. */
export const SUPPORT_SLOTS = [
  'montur',
  'filtre',
  'guide-scope',
  'guide-kamera',
  'odaklayici',
  'kontrol',
] as const;

export type SupportSlot = (typeof SUPPORT_SLOTS)[number];

export type SlotId = ChainSlot | SupportSlot;

export const SLOT_LABELS: Record<SlotId, string> = {
  montur: 'Montür',
  optik: 'Optik tüp / lens',
  reducer: 'Reducer / düzeltici',
  barlow: 'Barlow / uzatıcı',
  rotator: 'Rotator',
  oag: 'Off-axis guider',
  'filtre-carki': 'Filtre çarkı',
  filtre: 'Filtre',
  kamera: 'Ana kamera',
  'guide-scope': 'Guide teleskobu',
  'guide-kamera': 'Guide kamerası',
  odaklayici: 'Odaklayıcı / odak motoru',
  kontrol: 'Kontrol ve güç',
};

/** Bir yuvaya hangi katalog kategorileri konabilir. */
export const SLOT_CATEGORIES: Record<SlotId, string[]> = {
  montur: ['montur'],
  optik: ['optik-tup', 'lens'],
  reducer: ['reducer'],
  barlow: ['barlow'],
  rotator: ['aksesuar'],
  oag: ['guide'],
  'filtre-carki': ['filtre-carki'],
  filtre: ['filtre'],
  kamera: ['astro-kamera', 'fotograf-makinesi'],
  'guide-scope': ['guide', 'optik-tup'],
  'guide-kamera': ['guide', 'astro-kamera'],
  odaklayici: ['odaklayici'],
  kontrol: ['kontrol'],
};

/** Setup'ın zorunlu üç bileşeni — bunlarsız hiçbir hesap yapılamaz. */
export const REQUIRED_SLOTS: SlotId[] = ['montur', 'optik', 'kamera'];

export interface SetupDraft {
  /** Yuva → katalog slug'ı. Boş yuva anahtarı taşımaz. */
  slots: Partial<Record<SlotId, string>>;
  /**
   * EK FİLTRELER — çarktaki diğer filtreler (F02).
   *
   * ══════════════════════════════════════════════════════════════════
   * NEDEN AYRI BİR LİSTE, İKİNCİ BİR YUVA DEĞİL
   *
   * Astrofotoğrafçı çarkında beş yedi filtre taşıyor ama optik yolda
   * AYNI ANDA BİR tane var. Backfocus, ışık yolu ve uyumluluk hesabı bu
   * yüzden `slots.filtre`ye (takılı olan) bağlı kalmalı — ek filtreler
   * o hesaba girmiyor, girseydi her filtre kalınlığı üst üste eklenip
   * uydurma bir backfocus çıkardı.
   *
   * Liste künyede, profil vitrininde ve "hangi filtrelerim var"
   * sorusunda kullanılıyor. Yokluğu eski kayıtlarla uyumlu: alan
   * isteğe bağlı, boş liste "yalnızca takılı filtre" demek.
   */
  extraFilters?: string[];
  /** Kullanıcının eklediği ara halka toplamı, mm. */
  spacerMm: number;
  /** Katalogda olmayan parçaların toplam ağırlığı, kg. */
  extraWeightKg: number;
  /** Sahanın tipik seeing değeri, arcsaniye — örnekleme kararının girdisi. */
  seeingArcsec: number;
}

export const EMPTY_SETUP: SetupDraft = {
  slots: {},
  spacerMm: 0,
  extraWeightKg: 0,
  seeingArcsec: 3,
};

/** Yuvaların çözülmüş hâli — motor bunu alır. */
export type ResolvedSetup = {
  models: Partial<Record<SlotId, EquipmentModel>>;
} & Omit<SetupDraft, 'slots'>;

/* ══════════════════════ Hesap sonucu ══════════════════════ */

/**
 * Bir sayının nereden geldiği.
 *
 * "kesin" yalnızca doğrudan ölçülen/katalogdan gelen değerler için.
 * "varsayim" hesabın bir kabul kullandığını söyler — kullanıcı sonucu
 * buna göre tartar. "veri-yok" sonucun hiç üretilemediği durum.
 */
export type ComputationConfidence = 'kesin' | 'tek-kaynak' | 'varsayim' | 'veri-yok';

export interface ComputationInput {
  label: string;
  /** Biçimlendirilmiş değer, birimiyle. */
  value: string;
  /** Değerin geldiği yer: "katalog · ZWO ASI2600MM Pro" gibi. */
  source?: string;
}

export interface Computation {
  /** İnsan okunur formül — sonucun nasıl çıktığını gösterir. */
  formula: string;
  inputs: ComputationInput[];
  /** Sonuç; hesaplanamadıysa null. */
  value: number | null;
  unit: string;
  /** Kullanılan kabuller. Boşsa hesap tamamen ölçülen veriden çıkmıştır. */
  assumptions: string[];
  confidence: ComputationConfidence;
}

export type CheckStatus =
  | 'uyumlu'
  | 'dikkat'
  | 'adaptor-gerekli'
  | 'onerilmez'
  | 'uyumsuz'
  | 'veri-yok';

export const CHECK_STATUS_LABELS: Record<CheckStatus, string> = {
  uyumlu: 'Uyumlu',
  dikkat: 'Uyumlu — dikkat gerekli',
  'adaptor-gerekli': 'Adaptör gerekli',
  onerilmez: 'Önerilmez',
  uyumsuz: 'Uyumsuz',
  'veri-yok': 'Veri yetersiz',
};

/** 1 kritik · 2 önemli · 3 tavsiye · 4 bilgi. */
export type CheckSeverity = 1 | 2 | 3 | 4;

export const SEVERITY_LABELS: Record<CheckSeverity, string> = {
  1: 'Kritik',
  2: 'Önemli',
  3: 'Tavsiye',
  4: 'Bilgi',
};

export interface SetupCheck {
  id: string;
  title: string;
  status: CheckStatus;
  /** Tek bakışta okunan sonuç: "14.2 / 12.0 kg". */
  headline: string;
  /** Sonucun neden bu olduğu. */
  explanation: string;
  /** Önerilen aralık ya da hedef değer. */
  expected?: string;
  /** Ne yapılmalı. */
  advice?: string;
  severity: CheckSeverity;
  computation?: Computation;
}

export interface SetupReport {
  checks: SetupCheck[];
  /** En kötü durum — özet rozetinde kullanılır. */
  verdict: CheckStatus;
  /** Özet metrikler; hesaplanamayanlar null. */
  metrics: {
    totalWeightKg: Computation;
    usablePayloadKg: Computation;
    effectiveFocalLengthMm: Computation;
    effectiveFRatio: Computation;
    pixelScaleArcsec: Computation;
    fovWidthArcmin: Computation;
    fovHeightArcmin: Computation;
    sensorDiagonalMm: Computation;
    achievedBackfocusMm: Computation;
    guideRatio: Computation;
  };
  /** Hesaplanamayan kontrollerin sayısı — "veri eksik" rozetini besler. */
  missingDataCount: number;
}

/** Boş/hesaplanamamış bir hesap sonucu üretir. */
export function noData(
  formula: string,
  unit: string,
  reason: string
): Computation {
  return {
    formula,
    inputs: [],
    value: null,
    unit,
    assumptions: [reason],
    confidence: 'veri-yok',
  };
}

/**
 * Kurulumdaki BÜTÜN filtreler — takılı olan önce, sonra çarktakiler (F02).
 *
 * Tekrarlar ayıklanıyor: kullanıcı takılı filtreyi ek listeye de eklerse
 * künyede iki kez görünmemeli. Sıra anlamlı — ilk eleman optik yoldaki.
 */
export function tumFiltreler(draft: SetupDraft): string[] {
  const takili = draft.slots.filtre;
  const hepsi = [takili, ...(draft.extraFilters ?? [])].filter(
    (s): s is string => Boolean(s)
  );
  return [...new Set(hepsi)];
}

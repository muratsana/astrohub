import type { EquipmentModel } from '@/features/equipment/data';
import { parseMeasure, sensorSizeMm } from '@/domain/equipment/specs';
import {
  CONNECTIONS,
  checkConnection,
  connectionLabel,
  narrowestAperture,
  type ConnectionStandard,
} from '@/domain/equipment/connections';
import {
  OPTICAL_CHAIN,
  REQUIRED_SLOTS,
  SLOT_LABELS,
  noData,
  type ChainSlot,
  type CheckStatus,
  type Computation,
  type ComputationInput,
  type ResolvedSetup,
  type SetupCheck,
  type SetupReport,
  type SlotId,
} from './types';

/**
 * SETUP HESAPLAMA MOTORU.
 *
 * Sitedeki bütün optik/mekanik hesaplar buradan geçer. Formüller tek
 * yerde tutuluyor çünkü aynı piksel ölçeği formülünün FOV aracında,
 * uyumluluk kontrolünde ve fotoğraf künyesinde ayrı ayrı yazılması,
 * birinin düzeltilip diğerlerinin eskimesi demekti.
 *
 * İKİ KURAL, TAVİZSİZ:
 *
 * 1. TAHMİN ÜRETİLMEZ. Bir değer katalogda yoksa sonuç `null` döner ve
 *    kontrol "veri yetersiz" olur. Yaygın bir değeri varsaymak
 *    (ör. "bu tüpün backfocus'u herhalde 55 mm"), kurulamayacak bir
 *    zinciri "uyumlu" göstermek olur — kullanıcı sahada anlar.
 *
 * 2. HER SONUÇ İZLENEBİLİR. `Computation` formülü, girdileri, birimi ve
 *    kullanılan kabulleri taşır. "Neden uyumsuz?" sorusunun cevabı
 *    ekranda duruyor; kullanıcı bizim aritmetiğimize güvenmek zorunda
 *    değil.
 */

/** 1 radyan = 206.265 arcsaniye. */
const ARCSEC_PER_RAD = 206_265;

/**
 * Görüntüleme için kullanılabilir montür kapasitesi oranı.
 *
 * Üretici kapasitesi görsel gözlem içindir. Astrofotoğrafta rüzgâr,
 * periyodik hata ve dengesizlik aynı yükte guiding'i bozar. Sektörde
 * yerleşik pratik nominal kapasitenin %60'ı; harmonik dişli montürlerde
 * bu oran daha yüksek tutulabiliyor çünkü dişli boşluğu yok.
 *
 * BU BİR VARSAYIM ve sonuçta öyle işaretleniyor. Üretici kendi görüntüleme
 * kapasitesini yayımlıyorsa katalogdaki değer kullanılmalı.
 */
const IMAGING_PAYLOAD_RATIO = 0.6;
const HARMONIC_PAYLOAD_RATIO = 0.75;

/** Backfocus toleransı, mm. */
const BACKFOCUS_OK_MM = 0.5;
const BACKFOCUS_WARN_MM = 2;

/** Filtre camı optik yolu kalınlığının ~1/3'ü kadar uzatır (n≈1.5). */
const FILTER_PATH_FACTOR = 1 / 3;

/* ══════════════════════ Yardımcılar ══════════════════════ */

function fmt(value: number, digits = 2): string {
  const rounded = Math.round(value * 10 ** digits) / 10 ** digits;
  return String(rounded);
}

function src(model: EquipmentModel): string {
  return `katalog · ${model.brand} ${model.model}`;
}

function focalOf(model: EquipmentModel | undefined): number | null {
  return model ? parseMeasure(model.specs['Odak']) : null;
}

function apertureOf(model: EquipmentModel | undefined): number | null {
  return model ? parseMeasure(model.specs['Açıklık']) : null;
}

function pixelOf(model: EquipmentModel | undefined): number | null {
  return model ? parseMeasure(model.specs['Piksel']) : null;
}

function sensorOf(
  model: EquipmentModel | undefined
): { widthMm: number; heightMm: number } | null {
  if (!model) return null;
  return sensorSizeMm(model.specs['Çözünürlük'], pixelOf(model));
}

/**
 * Ağırlık: kullanıcı bir değer girmediyse katalogdan.
 * Katalogda da yoksa `null` — sıfır saymak, ağır bir parçayı
 * hesaba hiç katmamak olurdu.
 */
function weightOf(model: EquipmentModel | undefined): number | null {
  return model ? parseMeasure(model.specs['Ağırlık']) : null;
}

/* ══════════════════════ Ağırlık ══════════════════════ */

/**
 * Montüre binen toplam yük.
 *
 * Montürün kendisi hesaba GİRMEZ — montür kendini taşımıyor. Ağırlığı
 * bilinmeyen parçalar toplama katılmaz ama sayılır ve sonuç "en az şu
 * kadar" olarak sunulur; eksik parçaları yok sayıp kesin bir toplam
 * vermek, kapasitesi aşan bir kurulumu güvenli göstermek olurdu.
 */
export function computeTotalWeight(setup: ResolvedSetup): Computation {
  const inputs: ComputationInput[] = [];
  let total = 0;
  let missing = 0;

  for (const [slot, model] of Object.entries(setup.models) as [
    SlotId,
    EquipmentModel,
  ][]) {
    if (slot === 'montur') continue;
    const weight = weightOf(model);
    if (weight === null) {
      missing += 1;
      continue;
    }
    total += weight;
    inputs.push({
      label: SLOT_LABELS[slot],
      value: `${fmt(weight)} kg`,
      source: src(model),
    });
  }

  if (setup.extraWeightKg > 0) {
    total += setup.extraWeightKg;
    inputs.push({
      label: 'Kullanıcı ek ağırlığı',
      value: `${fmt(setup.extraWeightKg)} kg`,
      source: 'elle girildi',
    });
  }

  const assumptions =
    missing > 0
      ? [
          `${missing} parçanın ağırlığı katalogda yok; toplam en az bu kadar, gerçekte daha fazla.`,
        ]
      : [];

  return {
    formula: 'toplam = Σ(parça ağırlıkları) + ek ağırlık — montür hariç',
    inputs,
    value: inputs.length > 0 ? total : null,
    unit: 'kg',
    assumptions,
    confidence: missing > 0 ? 'varsayim' : 'tek-kaynak',
  };
}

/** Montürün görüntüleme için güvenli kapasitesi. */
export function computeUsablePayload(setup: ResolvedSetup): Computation {
  const mount = setup.models.montur;
  const nominal = mount ? parseMeasure(mount.specs['Yük kapasitesi']) : null;

  if (!mount || nominal === null) {
    return noData(
      'güvenli kapasite = nominal kapasite × görüntüleme oranı',
      'kg',
      'Montür seçilmedi ya da yük kapasitesi katalogda yok.'
    );
  }

  /* Harmonik dişli montürlerde dişli boşluğu olmadığı için güvenli oran
     daha yüksek tutulabiliyor; tür bilgisi katalogdaki "Tip" alanından. */
  const isHarmonic = (mount.specs['Tip'] ?? '')
    .toLocaleLowerCase('tr-TR')
    .includes('harmonik');
  const ratio = isHarmonic ? HARMONIC_PAYLOAD_RATIO : IMAGING_PAYLOAD_RATIO;

  return {
    formula: `güvenli kapasite = ${fmt(nominal)} kg × ${ratio}`,
    inputs: [
      {
        label: 'Nominal kapasite',
        value: `${fmt(nominal)} kg`,
        source: src(mount),
      },
      {
        label: 'Görüntüleme oranı',
        value: `%${Math.round(ratio * 100)}`,
        source: isHarmonic ? 'harmonik dişli kabulü' : 'sektör kabulü',
      },
    ],
    value: nominal * ratio,
    unit: 'kg',
    assumptions: [
      `Üretici görüntüleme kapasitesi yayımlamadığı için nominal kapasitenin %${Math.round(ratio * 100)}'i kullanıldı. Üretici kendi değerini yayımlıyorsa katalog güncellenmeli.`,
    ],
    confidence: 'varsayim',
  };
}

/* ══════════════════════ Optik ══════════════════════ */

/** Reducer ve barlow çarpanlarıyla düzeltilmiş odak uzaklığı. */
export function computeEffectiveFocal(setup: ResolvedSetup): Computation {
  const optic = setup.models.optik;
  const base = focalOf(optic);
  if (!optic || base === null) {
    return noData(
      'etkin odak = odak × reducer/barlow çarpanı',
      'mm',
      'Optik seçilmedi ya da odak uzaklığı katalogda yok.'
    );
  }

  const inputs: ComputationInput[] = [
    { label: 'Odak uzaklığı', value: `${fmt(base, 0)} mm`, source: src(optic) },
  ];
  let factor = 1;
  const missing: string[] = [];

  for (const slot of ['reducer', 'barlow'] as const) {
    const model = setup.models[slot];
    if (!model) continue;
    const f = model.optics?.factor;
    if (f === undefined) {
      missing.push(`${model.brand} ${model.model} çarpanı katalogda yok`);
      continue;
    }
    factor *= f;
    inputs.push({ label: SLOT_LABELS[slot], value: `×${f}`, source: src(model) });
  }

  return {
    formula: `etkin odak = ${fmt(base, 0)} mm × ${fmt(factor, 3)}`,
    inputs,
    value: base * factor,
    unit: 'mm',
    assumptions: missing.length > 0 ? [`${missing.join('; ')} — çarpan 1 kabul edildi.`] : [],
    confidence: missing.length > 0 ? 'varsayim' : 'tek-kaynak',
  };
}

export function computeEffectiveFRatio(setup: ResolvedSetup): Computation {
  const focal = computeEffectiveFocal(setup);
  const aperture = apertureOf(setup.models.optik);

  if (focal.value === null || aperture === null || aperture <= 0) {
    return noData(
      'f/ = etkin odak ÷ açıklık',
      '',
      'Etkin odak ya da açıklık hesaplanamadı.'
    );
  }

  return {
    formula: `f/ = ${fmt(focal.value, 0)} mm ÷ ${fmt(aperture, 0)} mm`,
    inputs: [
      { label: 'Etkin odak', value: `${fmt(focal.value, 0)} mm` },
      {
        label: 'Açıklık',
        value: `${fmt(aperture, 0)} mm`,
        source: setup.models.optik ? src(setup.models.optik) : undefined,
      },
    ],
    value: focal.value / aperture,
    unit: 'f/',
    assumptions: focal.assumptions,
    confidence: focal.confidence,
  };
}

/** Piksel ölçeği: 206.265 × piksel(µm) ÷ odak(mm). */
export function computePixelScale(setup: ResolvedSetup): Computation {
  const focal = computeEffectiveFocal(setup);
  const pixel = pixelOf(setup.models.kamera);

  if (focal.value === null || focal.value <= 0 || pixel === null) {
    return noData(
      'piksel ölçeği = 206.265 × piksel(µm) ÷ odak(mm)',
      '″/px',
      'Etkin odak ya da piksel boyutu bilinmiyor.'
    );
  }

  return {
    formula: `206.265 × ${pixel} µm ÷ ${fmt(focal.value, 0)} mm`,
    inputs: [
      {
        label: 'Piksel boyutu',
        value: `${pixel} µm`,
        source: setup.models.kamera ? src(setup.models.kamera) : undefined,
      },
      { label: 'Etkin odak', value: `${fmt(focal.value, 0)} mm` },
    ],
    value: (ARCSEC_PER_RAD * pixel) / (focal.value * 1000),
    unit: '″/px',
    assumptions: focal.assumptions,
    confidence: focal.confidence,
  };
}

function fovComputation(
  setup: ResolvedSetup,
  axis: 'width' | 'height'
): Computation {
  const focal = computeEffectiveFocal(setup);
  const sensor = sensorOf(setup.models.kamera);
  const label = axis === 'width' ? 'Sensör genişliği' : 'Sensör yüksekliği';

  if (focal.value === null || focal.value <= 0 || !sensor) {
    return noData(
      'FOV = 2 × atan(sensör ÷ (2 × odak))',
      '′',
      'Etkin odak ya da sensör boyutu bilinmiyor.'
    );
  }

  const size = axis === 'width' ? sensor.widthMm : sensor.heightMm;
  const deg = 2 * Math.atan(size / (2 * focal.value)) * (180 / Math.PI);

  return {
    formula: `2 × atan(${fmt(size)} mm ÷ (2 × ${fmt(focal.value, 0)} mm))`,
    inputs: [
      {
        label,
        value: `${fmt(size)} mm`,
        source: setup.models.kamera
          ? `${src(setup.models.kamera)} — çözünürlük × piksel boyutundan türetildi`
          : undefined,
      },
      { label: 'Etkin odak', value: `${fmt(focal.value, 0)} mm` },
    ],
    value: deg * 60,
    unit: '′',
    assumptions: focal.assumptions,
    confidence: focal.confidence,
  };
}

export function computeSensorDiagonal(setup: ResolvedSetup): Computation {
  const sensor = sensorOf(setup.models.kamera);
  if (!sensor) {
    return noData(
      'diyagonal = √(genişlik² + yükseklik²)',
      'mm',
      'Kamera seçilmedi ya da çözünürlük/piksel boyutu katalogda yok.'
    );
  }
  const diagonal = Math.hypot(sensor.widthMm, sensor.heightMm);
  return {
    formula: `√(${fmt(sensor.widthMm)}² + ${fmt(sensor.heightMm)}²)`,
    inputs: [
      { label: 'Sensör genişliği', value: `${fmt(sensor.widthMm)} mm` },
      { label: 'Sensör yüksekliği', value: `${fmt(sensor.heightMm)} mm` },
    ],
    value: diagonal,
    unit: 'mm',
    assumptions: [],
    confidence: 'tek-kaynak',
  };
}

/* ══════════════════════ Backfocus ══════════════════════ */

export interface BackfocusSegment {
  slot: SlotId | 'spacer' | 'filtre';
  label: string;
  lengthMm: number | null;
  source?: string;
  /** Uzunluğu bilinmeyen parça zinciri geçersiz kılar. */
  missing?: boolean;
}

/**
 * Backfocus zincirini parça parça kurar.
 *
 * Zincir görsel olarak da gösterildiği için segment listesi ayrı
 * döndürülüyor: kullanıcı hangi parçanın kaç mm yediğini görmeden
 * "3.2 mm fazla" uyarısıyla ne yapacağını bilemez.
 */
export function buildBackfocusChain(setup: ResolvedSetup): BackfocusSegment[] {
  const segments: BackfocusSegment[] = [];

  for (const slot of OPTICAL_CHAIN) {
    if (slot === 'optik' || slot === 'reducer' || slot === 'barlow') continue;
    const model = setup.models[slot as ChainSlot];
    if (!model) continue;
    const length = model.optics?.opticalLengthMm ?? null;
    segments.push({
      slot,
      label: `${model.brand} ${model.model}`,
      lengthMm: length,
      source: src(model),
      missing: length === null,
    });
  }

  const filter = setup.models.filtre;
  if (filter) {
    const thickness = filter.optics?.filterThicknessMm ?? null;
    segments.push({
      slot: 'filtre',
      label: `${filter.brand} ${filter.model} (cam düzeltmesi)`,
      lengthMm: thickness === null ? null : thickness * FILTER_PATH_FACTOR,
      source: `${src(filter)} — kalınlığın 1/3'ü`,
      missing: thickness === null,
    });
  }

  if (setup.spacerMm > 0) {
    segments.push({
      slot: 'spacer',
      label: 'Ara halkalar',
      lengthMm: setup.spacerMm,
      source: 'elle girildi',
    });
  }

  const camera = setup.models.kamera;
  if (camera) {
    const flange = camera.optics?.flangeDistanceMm ?? null;
    segments.push({
      slot: 'kamera',
      label: `${camera.brand} ${camera.model} (flanş–sensör)`,
      lengthMm: flange,
      source: src(camera),
      missing: flange === null,
    });
  }

  return segments;
}

/**
 * Düzelticinin istediği backfocus.
 *
 * Reducer varsa onun değeri, yoksa optiğin kendi değeri geçerli:
 * düzeltici takıldığında hedef mesafeyi o belirler.
 */
function requiredBackfocus(
  setup: ResolvedSetup
): { valueMm: number; from: EquipmentModel } | null {
  const reducer = setup.models.reducer;
  if (reducer?.optics?.requiredBackfocusMm !== undefined) {
    return { valueMm: reducer.optics.requiredBackfocusMm, from: reducer };
  }
  const optic = setup.models.optik;
  if (optic?.optics?.requiredBackfocusMm !== undefined) {
    return { valueMm: optic.optics.requiredBackfocusMm, from: optic };
  }
  return null;
}

export function computeAchievedBackfocus(setup: ResolvedSetup): Computation {
  const segments = buildBackfocusChain(setup);
  const known = segments.filter((s) => s.lengthMm !== null);
  const missing = segments.filter((s) => s.missing);

  if (known.length === 0) {
    return noData(
      'gerçekleşen mesafe = Σ(parça optik uzunlukları)',
      'mm',
      'Zincirdeki hiçbir parçanın optik uzunluğu katalogda yok.'
    );
  }

  const total = known.reduce((sum, s) => sum + (s.lengthMm ?? 0), 0);

  return {
    formula: 'gerçekleşen mesafe = Σ(parça optik uzunlukları)',
    inputs: known.map((s) => ({
      label: s.label,
      value: `${fmt(s.lengthMm ?? 0)} mm`,
      source: s.source,
    })),
    value: total,
    unit: 'mm',
    assumptions:
      missing.length > 0
        ? [
            `${missing.map((s) => s.label).join(', ')} için optik uzunluk katalogda yok; toplam eksik.`,
          ]
        : [],
    confidence: missing.length > 0 ? 'varsayim' : 'tek-kaynak',
  };
}

/* ══════════════════════ Guiding ══════════════════════ */

export function computeGuideRatio(setup: ResolvedSetup): Computation {
  const main = computePixelScale(setup);
  const guideScope = setup.models['guide-scope'];
  const guideCam = setup.models['guide-kamera'];
  const oag = setup.models.oag;

  /* OAG kullanılıyorsa guide odak uzaklığı ana optiğinkiyle aynıdır —
     ışık aynı optikten geliyor. Ayrı bir guide teleskobu varsa onun
     odağı geçerli. */
  const guideFocal = oag ? computeEffectiveFocal(setup).value : focalOf(guideScope);
  const guidePixel = pixelOf(guideCam);

  if (main.value === null || guideFocal === null || guidePixel === null) {
    return noData(
      'guide oranı = guide piksel ölçeği ÷ ana piksel ölçeği',
      '×',
      'Guide sistemi eksik ya da teknik değerleri katalogda yok.'
    );
  }

  const guideScale = (ARCSEC_PER_RAD * guidePixel) / (guideFocal * 1000);

  return {
    formula: `${fmt(guideScale)}″/px ÷ ${fmt(main.value)}″/px`,
    inputs: [
      {
        label: 'Guide odak uzaklığı',
        value: `${fmt(guideFocal, 0)} mm`,
        source: oag ? 'OAG — ana optikle aynı' : guideScope ? src(guideScope) : undefined,
      },
      {
        label: 'Guide piksel boyutu',
        value: `${guidePixel} µm`,
        source: guideCam ? src(guideCam) : undefined,
      },
      { label: 'Ana piksel ölçeği', value: `${fmt(main.value)}″/px` },
    ],
    value: guideScale / main.value,
    unit: '×',
    assumptions: main.assumptions,
    confidence: main.confidence,
  };
}

/* ══════════════════════ Kontroller ══════════════════════ */

const STATUS_ORDER: CheckStatus[] = [
  'uyumlu',
  'veri-yok',
  'dikkat',
  'adaptor-gerekli',
  'onerilmez',
  'uyumsuz',
];

function worst(a: CheckStatus, b: CheckStatus): CheckStatus {
  return STATUS_ORDER.indexOf(a) >= STATUS_ORDER.indexOf(b) ? a : b;
}

function payloadCheck(setup: ResolvedSetup): SetupCheck {
  const total = computeTotalWeight(setup);
  const usable = computeUsablePayload(setup);

  if (total.value === null || usable.value === null) {
    return {
      id: 'payload',
      title: 'Montür taşıma kapasitesi',
      status: 'veri-yok',
      headline: '—',
      explanation:
        'Bu kontrol için gerekli teknik veri ürün veritabanında bulunamadı.',
      advice: 'Montürün yük kapasitesi ve parça ağırlıkları katalogda eksik.',
      severity: 1,
      computation: total.value === null ? total : usable,
    };
  }

  const ratio = total.value / usable.value;
  const status: CheckStatus =
    ratio <= 0.85 ? 'uyumlu' : ratio <= 1 ? 'dikkat' : 'onerilmez';

  return {
    id: 'payload',
    title: 'Montür taşıma kapasitesi',
    status,
    headline: `${fmt(total.value, 1)} / ${fmt(usable.value, 1)} kg`,
    expected: `Görüntüleme için güvenli sınır ${fmt(usable.value, 1)} kg`,
    explanation:
      status === 'uyumlu'
        ? `Setup güvenli kapasitenin %${Math.round(ratio * 100)}'ini kullanıyor; rüzgâr payı var.`
        : status === 'dikkat'
          ? `Setup güvenli sınıra çok yakın (%${Math.round(ratio * 100)}). Rüzgârlı gecelerde guiding bozulabilir.`
          : `Setup güvenli sınırı %${Math.round((ratio - 1) * 100)} aşıyor. Guiding hatası ve dişli aşınması beklenir.`,
    advice:
      status === 'onerilmez'
        ? 'Daha hafif bir optik ya da daha yüksek kapasiteli montür gerekir.'
        : undefined,
    severity: status === 'onerilmez' ? 1 : 2,
    computation: total,
  };
}

function samplingCheck(setup: ResolvedSetup): SetupCheck {
  const scale = computePixelScale(setup);
  if (scale.value === null) {
    return {
      id: 'sampling',
      title: 'Örnekleme (piksel ölçeği)',
      status: 'veri-yok',
      headline: '—',
      explanation:
        'Bu kontrol için gerekli teknik veri ürün veritabanında bulunamadı.',
      severity: 2,
      computation: scale,
    };
  }

  /*
   * Nyquist'e göre seeing diskini iki piksele bölmek yeterli; pratikte
   * 1/3–1/2 seeing aralığı "uygun örnekleme" kabul edilir. Bu aralık
   * kullanıcının girdiği seeing değerine bağlı, sabit bir sayı değil.
   */
  const low = setup.seeingArcsec / 3;
  const high = setup.seeingArcsec / 2;
  const status: CheckStatus =
    scale.value >= low && scale.value <= high ? 'uyumlu' : 'dikkat';
  const under = scale.value > high;

  return {
    id: 'sampling',
    title: 'Örnekleme (piksel ölçeği)',
    status,
    headline: `${fmt(scale.value)} ″/px`,
    expected: `${fmt(low)}–${fmt(high)} ″/px (seeing ${setup.seeingArcsec}″)`,
    explanation:
      status === 'uyumlu'
        ? 'Piksel ölçeği seeing için uygun aralıkta; ne detay kaybı ne boş büyütme var.'
        : under
          ? 'Yetersiz örnekleme: seeing izin verdiği hâlde detay pikselden dolayı kaybediliyor. Yıldızlar kare görünebilir.'
          : 'Aşırı örnekleme: aynı sinyal daha çok piksele yayılıyor, poz süresi uzuyor ve dosya büyüyor.',
    advice: under
      ? 'Daha küçük pikselli kamera ya da daha uzun odak (barlow) örneklemeyi düzeltir.'
      : status === 'dikkat'
        ? 'Reducer ile odağı kısaltmak ya da 2×2 binleme örneklemeyi aralığa çeker.'
        : undefined,
    severity: 3,
    computation: scale,
  };
}

function backfocusCheck(setup: ResolvedSetup): SetupCheck {
  const achieved = computeAchievedBackfocus(setup);
  const required = requiredBackfocus(setup);

  if (achieved.value === null || !required) {
    return {
      id: 'backfocus',
      title: 'Backfocus zinciri',
      status: 'veri-yok',
      headline: '—',
      explanation:
        'Bu kontrol için gerekli teknik veri ürün veritabanında bulunamadı.',
      advice: !required
        ? 'Düzelticinin istediği backfocus katalogda kayıtlı değil.'
        : 'Zincirdeki parçaların optik uzunlukları eksik.',
      severity: 1,
      computation: achieved,
    };
  }

  const delta = achieved.value - required.valueMm;
  const abs = Math.abs(delta);
  const status: CheckStatus =
    abs <= BACKFOCUS_OK_MM ? 'uyumlu' : abs <= BACKFOCUS_WARN_MM ? 'dikkat' : 'uyumsuz';

  return {
    id: 'backfocus',
    title: 'Backfocus zinciri',
    status,
    headline: `${fmt(achieved.value)} / ${fmt(required.valueMm)} mm`,
    expected: `${fmt(required.valueMm)} mm ± ${BACKFOCUS_OK_MM} mm (${required.from.brand} ${required.from.model})`,
    explanation:
      status === 'uyumlu'
        ? 'Optik yol düzelticinin istediği mesafede; köşe yıldızları düzgün çıkar.'
        : `Optik yol ${delta > 0 ? 'uzun' : 'kısa'}: ${fmt(abs)} mm ${delta > 0 ? 'fazla' : 'eksik'}. Köşelerde yıldızlar uzar.`,
    advice:
      status === 'uyumlu'
        ? undefined
        : delta > 0
          ? `Zincirden ${fmt(abs)} mm çıkarın — daha ince bir ara halka kullanın.`
          : `Zincire ${fmt(abs)} mm ara halka ekleyin.`,
    severity: status === 'uyumsuz' ? 1 : 2,
    computation: achieved,
  };
}

function vignettingCheck(setup: ResolvedSetup): SetupCheck {
  const diagonal = computeSensorDiagonal(setup);
  const apertures: (number | null | undefined)[] = [];
  const contributors: string[] = [];

  for (const slot of OPTICAL_CHAIN) {
    const model = setup.models[slot as ChainSlot];
    if (!model || slot === 'kamera') continue;
    const clear = model.optics?.clearApertureMm;
    apertures.push(clear);
    if (clear !== undefined) contributors.push(`${model.model}: ${clear} mm`);

    /* Bağlantı standardının kendi net açıklığı da zinciri daraltır —
       M42×0.75 üzerinden tam kare sensör aydınlatılamaz. */
    const output = model.connections?.output;
    if (output) {
      const standardClear = CONNECTIONS[output].clearApertureMm;
      apertures.push(standardClear);
      if (standardClear !== null) {
        contributors.push(`${connectionLabel(output)}: ${standardClear} mm`);
      }
    }
  }

  const filter = setup.models.filtre;
  if (filter?.optics?.clearApertureMm !== undefined) {
    apertures.push(filter.optics.clearApertureMm);
    contributors.push(`${filter.model}: ${filter.optics.clearApertureMm} mm`);
  }

  const narrowest = narrowestAperture(apertures);
  const imageCircle =
    setup.models.reducer?.optics?.imageCircleMm ??
    setup.models.optik?.optics?.imageCircleMm ??
    null;

  if (diagonal.value === null || (narrowest.valueMm === null && imageCircle === null)) {
    return {
      id: 'vignetting',
      title: 'Vinyet ve görüntü çemberi',
      status: 'veri-yok',
      headline: '—',
      explanation:
        'Bu kontrol için gerekli teknik veri ürün veritabanında bulunamadı.',
      advice:
        'Sensör diyagonali, görüntü çemberi ya da zincirdeki net açıklıklar katalogda eksik.',
      severity: 2,
      computation: diagonal,
    };
  }

  const limit = Math.min(
    narrowest.valueMm ?? Number.POSITIVE_INFINITY,
    imageCircle ?? Number.POSITIVE_INFINITY
  );
  const margin = limit - diagonal.value;

  const status: CheckStatus =
    margin >= 4 ? 'uyumlu' : margin >= 0 ? 'dikkat' : 'onerilmez';

  return {
    id: 'vignetting',
    title: 'Vinyet ve görüntü çemberi',
    status,
    headline: `sensör ${fmt(diagonal.value)} mm · sınır ${fmt(limit)} mm`,
    expected: 'Sınır, sensör diyagonalinden en az 4 mm büyük olmalı',
    explanation:
      status === 'uyumlu'
        ? 'Aydınlatılan alan sensörden belirgin şekilde geniş; vinyet beklenmiyor.'
        : status === 'dikkat'
          ? 'Sınır sensöre çok yakın; köşelerde hafif kararma olabilir, flat kalibrasyonu düzeltir.'
          : 'Sensörün köşeleri aydınlatılamıyor — belirgin mekanik vinyet.',
    advice:
      contributors.length > 0 ? `Zincirdeki daraltıcılar: ${contributors.join(' · ')}` : undefined,
    severity: status === 'onerilmez' ? 2 : 3,
    computation: {
      ...diagonal,
      assumptions:
        narrowest.missing > 0
          ? [
              ...diagonal.assumptions,
              `${narrowest.missing} parçanın net açıklığı bilinmiyor; gerçek sınır daha dar olabilir.`,
            ]
          : diagonal.assumptions,
      confidence: narrowest.missing > 0 ? 'varsayim' : diagonal.confidence,
    },
  };
}

function connectionChecks(setup: ResolvedSetup): SetupCheck[] {
  const chain = OPTICAL_CHAIN.map((slot) => ({
    slot,
    model: setup.models[slot as ChainSlot],
  })).filter((entry) => entry.model);

  const checks: SetupCheck[] = [];

  for (let i = 0; i < chain.length - 1; i += 1) {
    const from = chain[i];
    const to = chain[i + 1];
    const verdict = checkConnection(
      from.model!.connections?.output,
      to.model!.connections?.input
    );

    const title = `Bağlantı: ${from.model!.model} → ${to.model!.model}`;

    if (verdict.kind === 'unknown') {
      checks.push({
        id: `connection-${from.slot}-${to.slot}`,
        title,
        status: 'veri-yok',
        headline: '—',
        explanation:
          'Bu kontrol için gerekli teknik veri ürün veritabanında bulunamadı.',
        advice: verdict.reason,
        severity: 3,
      });
      continue;
    }

    if (verdict.kind === 'direct') {
      const standard = from.model!.connections!.output as ConnectionStandard;
      checks.push({
        id: `connection-${from.slot}-${to.slot}`,
        title,
        status: 'uyumlu',
        headline: connectionLabel(standard),
        explanation: 'İki parça aynı standartla doğrudan birleşiyor.',
        severity: 4,
      });
      continue;
    }

    checks.push({
      id: `connection-${from.slot}-${to.slot}`,
      title,
      status: 'adaptor-gerekli',
      headline: `${connectionLabel(verdict.from)} → ${connectionLabel(verdict.to)}`,
      explanation:
        'İki parça doğrudan birleşmiyor; arada bir adaptör gerekiyor.',
      advice:
        'Adaptörün optik uzunluğu backfocus hesabına girer — seçtikten sonra ara halka değerini güncelleyin.',
      severity: 2,
    });
  }

  return checks;
}

function filterCheck(setup: ResolvedSetup): SetupCheck | null {
  const filter = setup.models.filtre;
  if (!filter) return null;

  const fRatio = computeEffectiveFRatio(setup);

  /*
   * Dar bant tespiti etikete değil ÖLÇÜYE dayanıyor: katalogdaki kayıtların
   * bir kısmında "Tip" alanı yok ama bant genişliği yazılı. Etikete güvenmek,
   * 3 nm bir Ha filtresini geniş bant sayıp uyarıyı hiç göstermiyordu
   * (bunu bir test yakaladı). 12 nm sınırı: üstü dual-band/geniş bant
   * davranıyor, altı hızlı optikte kayma riski taşıyor.
   */
  const bandwidthNm = parseMeasure(filter.specs['Bant genişliği'] ?? null);
  const isNarrowband =
    (bandwidthNm !== null && bandwidthNm <= 12) ||
    (filter.specs['Tip'] ?? '').toLocaleLowerCase('tr-TR').includes('dar bant');

  if (fRatio.value === null) {
    return {
      id: 'filter',
      title: 'Filtre uyumluluğu',
      status: 'veri-yok',
      headline: '—',
      explanation:
        'Bu kontrol için gerekli teknik veri ürün veritabanında bulunamadı.',
      advice: 'Etkin odak oranı hesaplanamadığı için bant kayması değerlendirilemiyor.',
      severity: 3,
    };
  }

  /*
   * Dar bant filtrelerde ışık ne kadar eğik gelirse geçirilen dalga boyu o
   * kadar maviye kayar. f/3'ten hızlı sistemlerde 3 nm bir filtre Ha
   * hattını kaçırabilir. Sınır f/3.5: altında uyarı, üstünde sorun yok.
   */
  const fast = fRatio.value < 3.5;
  const status: CheckStatus = isNarrowband && fast ? 'dikkat' : 'uyumlu';

  return {
    id: 'filter',
    title: 'Filtre uyumluluğu',
    status,
    headline: `f/${fmt(fRatio.value, 1)} · ${filter.specs['Tip'] ?? 'tip bilinmiyor'}`,
    expected: isNarrowband ? 'Dar bant filtreler f/3.5 ve üzerinde güvenli' : undefined,
    explanation:
      status === 'dikkat'
        ? 'Hızlı optikte dar bant filtrenin geçirdiği dalga boyu maviye kayar; hedef emisyon hattı bant dışına düşebilir.'
        : 'Filtre bu odak oranıyla uyumlu.',
    advice: status === 'dikkat'
      ? 'Hızlı sistemler için üretilmiş (f/2 uyumlu) bir filtre ya da daha geniş bant tercih edin.'
      : undefined,
    severity: 3,
    computation: fRatio,
  };
}

function guideCheck(setup: ResolvedSetup): SetupCheck | null {
  const hasGuide =
    setup.models['guide-kamera'] || setup.models['guide-scope'] || setup.models.oag;
  if (!hasGuide) return null;

  const ratio = computeGuideRatio(setup);
  if (ratio.value === null) {
    return {
      id: 'guide',
      title: 'Guide sistemi',
      status: 'veri-yok',
      headline: '—',
      explanation:
        'Bu kontrol için gerekli teknik veri ürün veritabanında bulunamadı.',
      severity: 3,
      computation: ratio,
    };
  }

  /*
   * Guide ölçeğinin ana ölçekten 3–4 kat kaba olması sorun değil: guiding
   * yazılımı alt piksel doğrulukla merkez bulur. 5 katın üstünde düzeltme
   * çözünürlüğü ana sistemin ihtiyacını karşılamaz.
   */
  const status: CheckStatus = ratio.value <= 5 ? 'uyumlu' : 'dikkat';

  return {
    id: 'guide',
    title: 'Guide sistemi',
    status,
    headline: `${fmt(ratio.value, 1)}× kaba`,
    expected: 'Guide/ana oranı 5× altında',
    explanation:
      status === 'uyumlu'
        ? 'Guide ölçeği ana sistemi izlemeye yetiyor; alt piksel merkez bulma düzeltmeyi taşır.'
        : 'Guide ölçeği ana sisteme göre çok kaba; küçük takip hatalarını yakalayamaz.',
    advice:
      status === 'dikkat'
        ? 'Daha uzun odaklı guide teleskobu ya da OAG kullanın.'
        : undefined,
    severity: 3,
    computation: ratio,
  };
}

function oagPrismCheck(setup: ResolvedSetup): SetupCheck | null {
  const oag = setup.models.oag;
  const guideCam = setup.models['guide-kamera'];
  if (!oag || !guideCam) return null;

  const prism = oag.optics?.prismSizeMm;
  const sensor = sensorOf(guideCam);

  if (prism === undefined || !sensor) {
    return {
      id: 'oag-prism',
      title: 'OAG prizma – guide sensör uyumu',
      status: 'veri-yok',
      headline: '—',
      explanation:
        'Bu kontrol için gerekli teknik veri ürün veritabanında bulunamadı.',
      severity: 4,
    };
  }

  const diagonal = Math.hypot(sensor.widthMm, sensor.heightMm);
  const status: CheckStatus = diagonal <= prism ? 'uyumlu' : 'dikkat';

  return {
    id: 'oag-prism',
    title: 'OAG prizma – guide sensör uyumu',
    status,
    headline: `prizma ${prism} mm · sensör ${fmt(diagonal)} mm`,
    expected: 'Guide sensör diyagonali prizma ölçüsünü aşmamalı',
    explanation:
      status === 'uyumlu'
        ? 'Prizma guide sensörünü tamamen aydınlatıyor.'
        : 'Guide sensörünün kenarları prizma dışında kalıyor; kullanılabilir alan daralıyor ama yıldız bulmak yine mümkün.',
    severity: 4,
  };
}

/* ══════════════════════ Rapor ══════════════════════ */

export function analyzeSetup(setup: ResolvedSetup): SetupReport {
  const missingRequired = REQUIRED_SLOTS.filter((slot) => !setup.models[slot]);

  const checks: SetupCheck[] = [];

  if (missingRequired.length > 0) {
    checks.push({
      id: 'required',
      title: 'Temel bileşenler',
      status: 'veri-yok',
      headline: `${missingRequired.length} bileşen eksik`,
      explanation: `Analiz için ${missingRequired
        .map((slot) => SLOT_LABELS[slot])
        .join(', ')} seçilmeli.`,
      severity: 1,
    });
  }

  checks.push(payloadCheck(setup));
  checks.push(samplingCheck(setup));
  checks.push(backfocusCheck(setup));
  checks.push(vignettingCheck(setup));
  checks.push(...connectionChecks(setup));

  const filter = filterCheck(setup);
  if (filter) checks.push(filter);
  const guide = guideCheck(setup);
  if (guide) checks.push(guide);
  const prism = oagPrismCheck(setup);
  if (prism) checks.push(prism);

  /* Sıralama önem sırasına göre: kritik olan en üstte görünmeli. */
  checks.sort((a, b) => a.severity - b.severity);

  const verdict = checks.reduce<CheckStatus>(
    (acc, check) => worst(acc, check.status),
    'uyumlu'
  );

  return {
    checks,
    verdict,
    metrics: {
      totalWeightKg: computeTotalWeight(setup),
      usablePayloadKg: computeUsablePayload(setup),
      effectiveFocalLengthMm: computeEffectiveFocal(setup),
      effectiveFRatio: computeEffectiveFRatio(setup),
      pixelScaleArcsec: computePixelScale(setup),
      fovWidthArcmin: fovComputation(setup, 'width'),
      fovHeightArcmin: fovComputation(setup, 'height'),
      sensorDiagonalMm: computeSensorDiagonal(setup),
      achievedBackfocusMm: computeAchievedBackfocus(setup),
      guideRatio: computeGuideRatio(setup),
    },
    missingDataCount: checks.filter((c) => c.status === 'veri-yok').length,
  };
}

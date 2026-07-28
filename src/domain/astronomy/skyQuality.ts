/**
 * GÖKYÜZÜ KALİTESİ — Bortle, SQM ve aralarındaki ilişki (§14.1).
 *
 * NEDEN BU MODÜL VAR
 * Şartname ışık kirliliği için lisanslı bir küresel veri seti öngörüyor
 * (§14.1) ve o lisans netleşmeden harita yayımlanamaz. Ama kullanıcının asıl
 * sorusu haritayla değil **karşılaştırmayla** ilgili: "şehirden şu sahaya
 * gitmek neyi değiştirir?" Bu sorunun cevabı elimizdeki verilerle —
 * gözlem noktası kayıtlarımızın SQM/Bortle değerleriyle — hesaplanabilir.
 *
 * SQM: gökyüzü fonu parlaklığı, kadir/arcsaniye² (mag/arcsec²). BÜYÜK değer
 * daha karanlık demektir; ölçek logaritmiktir ve 5 kadir tam olarak 100 kat
 * parlaklık farkıdır.
 *
 * Bu modüldeki her sayı **ölçüm ya da ölçümden türetilmiş**tir; hiçbir yerde
 * "tahmini harita değeri" üretilmez.
 */

/** Bortle sınıfı 1 (en karanlık) – 9 (şehir merkezi). */
export type BortleClass = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface BortleInfo {
  bortle: BortleClass;
  label: string;
  /** Tipik SQM aralığı (mag/arcsec²). */
  sqmRange: [number, number];
  /** Çıplak gözle görülebilen en sönük yıldızın kadiri. */
  nakedEyeLimit: string;
  description: string;
}

/**
 * Bortle ölçeği.
 *
 * SQM aralıkları Bortle'ın özgün makalesindeki tanımlarla, sahada yaygın
 * kabul gören SQM karşılıklarının kesişimidir. Sınıf sınırları keskin
 * değildir — bu yüzden aralık veriliyor, tek bir sayı değil.
 */
export const bortleScale: Record<BortleClass, BortleInfo> = {
  1: {
    bortle: 1,
    label: 'Mükemmel karanlık gökyüzü',
    sqmRange: [21.75, 22.0],
    nakedEyeLimit: '7.6–8.0 kadir',
    description:
      'Samanyolu gölge düşürür, zodyak ışığı belirgin. Türkiye’de pratikte ulaşılamaz; en iyi sahalarımız Bortle 2 sınıfındadır.',
  },
  2: {
    bortle: 2,
    label: 'Gerçek karanlık gökyüzü',
    sqmRange: [21.6, 21.75],
    nakedEyeLimit: '7.1–7.5 kadir',
    description:
      'Samanyolu yapılı ve parlak; M33 çıplak gözle görülür. Doğu Anadolu yaylalarında ulaşılabilir.',
  },
  3: {
    bortle: 3,
    label: 'Kırsal gökyüzü',
    sqmRange: [21.3, 21.6],
    nakedEyeLimit: '6.6–7.0 kadir',
    description:
      'Ufka yakın hafif ışık kubbesi var, zenit temiz. Deep-sky çekimi için fazlasıyla yeterli.',
  },
  4: {
    bortle: 4,
    label: 'Kırsal / banliyö geçişi',
    sqmRange: [20.4, 21.3],
    nakedEyeLimit: '6.1–6.5 kadir',
    description:
      'Işık kubbeleri birkaç yönde belirgin. Dar bant çekim rahat, geniş bant fon gürültüsü artar.',
  },
  5: {
    bortle: 5,
    label: 'Banliyö',
    sqmRange: [19.1, 20.4],
    nakedEyeLimit: '5.6–6.0 kadir',
    description:
      'Samanyolu ancak zenitte seçilir. Geniş bant çekimde fon hızla dolar; dar bant önerilir.',
  },
  6: {
    bortle: 6,
    label: 'Parlak banliyö',
    sqmRange: [18.5, 19.1],
    nakedEyeLimit: '5.1–5.5 kadir',
    description:
      'Samanyolu görünmez. Dar bant filtreyle bulutsu çalışmak hâlâ mümkün.',
  },
  7: {
    bortle: 7,
    label: 'Banliyö / şehir geçişi',
    sqmRange: [18.0, 18.5],
    nakedEyeLimit: '4.6–5.0 kadir',
    description:
      'Gökyüzü fonu gri. Dar bant zorunlu; geniş bant yalnızca parlak hedeflerde anlamlı.',
  },
  8: {
    bortle: 8,
    label: 'Şehir',
    sqmRange: [17.5, 18.0],
    nakedEyeLimit: '4.1–4.5 kadir',
    description:
      'Yalnızca parlak yıldızlar ve gezegenler. Ay, güneş ve gezegen çekimi için sorun değil.',
  },
  9: {
    bortle: 9,
    label: 'Şehir merkezi',
    sqmRange: [17.0, 17.5],
    nakedEyeLimit: '4.0 kadir ve altı',
    description:
      'Deep-sky pratikte kapalı. Ay ve gezegenler ışık kirliliğinden neredeyse etkilenmez.',
  },
};

/** Bortle sınıfının orta SQM değeri — tek sayı gerektiğinde. */
export function typicalSqm(bortle: BortleClass): number {
  const [min, max] = bortleScale[bortle].sqmRange;
  return (min + max) / 2;
}

/**
 * İki SQM değeri arasındaki gökyüzü fonu parlaklık oranı.
 *
 * Kadir ölçeği logaritmiktir: 2.5 kadir = 10 kat. `darker` daha büyük SQM
 * (daha karanlık) beklenir; sonuç "karanlık sahanın fonu kaç kat daha sönük"
 * sorusunun cevabıdır.
 */
export function brightnessRatio(darkerSqm: number, brighterSqm: number): number {
  return Math.pow(10, (darkerSqm - brighterSqm) / 2.5);
}

/**
 * Aynı sinyal/gürültü için gereken süre kazancı.
 *
 * Gökyüzü fonunun baskın gürültü kaynağı olduğu (background-limited) tipik
 * deep-sky çekiminde, gürültü fon parlaklığının kareköküyle artar; aynı SNR
 * için gereken süre fon parlaklığıyla **doğru orantılıdır**. Yani fonu 4 kat
 * sönük bir sahada aynı sonucu 4 kat kısa sürede alırsınız.
 *
 * BU BİR ÜST SINIRDIR: okuma gürültüsü, karanlık akım ve seeing hesaba
 * katılmaz; kısa pozlarda ve dar bant filtrelerde kazanç daha azdır. Arayüz
 * bu sınırı yazmak zorunda — "10 kat hızlı" cümlesi tek başına yanıltır.
 */
export function integrationAdvantage(
  darkerSqm: number,
  brighterSqm: number
): number {
  return brightnessRatio(darkerSqm, brighterSqm);
}

/** SQM değerinden en yakın Bortle sınıfı. */
export function bortleForSqm(sqm: number): BortleClass {
  const classes = Object.values(bortleScale);

  // Aralığın içine düşüyorsa doğrudan o sınıf.
  const exact = classes.find(
    (info) => sqm >= info.sqmRange[0] && sqm <= info.sqmRange[1]
  );
  if (exact) return exact.bortle;

  // Aralık dışındaysa (ölçüm uçlarda) en yakın sınır.
  let best = classes[0];
  let bestDistance = Infinity;
  for (const info of classes) {
    const distance = Math.min(
      Math.abs(sqm - info.sqmRange[0]),
      Math.abs(sqm - info.sqmRange[1])
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      best = info;
    }
  }
  return best.bortle;
}

/** Bortle değerini geçerli aralığa kırpar (veri hatasına karşı). */
export function clampBortle(value: number): BortleClass {
  const rounded = Math.round(value);
  return Math.min(9, Math.max(1, rounded)) as BortleClass;
}

export interface SkyComparison {
  /** Fon parlaklığı oranı (karanlık sahanın lehine). */
  ratio: number;
  /** Aynı SNR için süre kazancı (üst sınır). */
  timeAdvantage: number;
  /** Kadir farkı. */
  magnitudeDelta: number;
  /** Kullanıcıya tek cümlelik özet. */
  summary: string;
}

/** İki nokta arasındaki gökyüzü kalitesi farkını özetler. */
export function compareSky(
  darkerSqm: number,
  brighterSqm: number
): SkyComparison {
  const magnitudeDelta = darkerSqm - brighterSqm;
  const ratio = brightnessRatio(darkerSqm, brighterSqm);

  const summary =
    magnitudeDelta <= 0.05
      ? 'İki nokta arasında kayda değer fark yok.'
      : `Gökyüzü fonu ${ratio.toFixed(1)} kat daha sönük; aynı sonuç için gereken süre en iyi durumda ${ratio.toFixed(1)} kat kısalır.`;

  return {
    ratio,
    timeAdvantage: ratio,
    magnitudeDelta,
    summary,
  };
}

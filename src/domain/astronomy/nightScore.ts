/**
 * GECE SKORU — "bu gece gözlem yapmaya değer mi?" sorusunun tek sayılı
 * cevabı ve o sayının nereden geldiği.
 *
 * TEK FONKSİYON, ÇÜNKÜ TOPLAM İLE KIRILIM TUTMAK ZORUNDA. Skoru bir yerde,
 * kırılım çubuklarını başka yerde hesaplamak, arayüzde "92" yazarken
 * altındaki dört çubuğun ortalamasının 78 çıkması demekti — kullanıcı
 * hangisine inanacağını bilemez. İkisi de buradan çıkıyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BULUT BİR TERİM DEĞİL, ÇARPAN
 *
 * Dört bileşeni ortalamak yanlış sonuç veriyor: %100 bulutlu bir gecede
 * seeing'in mükemmel olması hiçbir işe yaramaz, teleskop hiçbir şey
 * görmez. Ortalama alan bir model o geceye 60 verirdi.
 *
 * Bu yüzden şeffaflık diğerlerini ÇARPIYOR. Aynı karar depoda zaten
 * verilmişti (`observingVerdict`, seeing.ts) — iki yerde iki ayrı
 * felsefe tutmak, aynı gece için iki farklı hüküm üretmek olurdu.
 *
 * SEEING VERİSİ YOKSA "ÇOK İYİ" DENMİYOR. Üst atmosfer rüzgârı gelmediğinde
 * seeing hesaplanamıyor (`SeeingEstimate | null`). Eksik bileşeni ortalamadan
 * düşürüp kalanı yükseltmek, veri eksikliğini iyimserliğe çevirirdi. Ağırlık
 * yeniden dağıtılıyor ama hüküm "İyi gece" ile SINIRLANIYOR: elde olmayan
 * bir ölçümle en yüksek notu vermek, QA ASTRO-05'in hard-stop kuralının
 * ihlali.
 *
 * ══════════════════════════════════════════════════════════════════════
 * REFERANS TASARIMIN SAYILARI ÜRETİLEBİLİR DEĞİL — bilerek yakalanmıyor.
 *
 * Tasarım paketindeki örnek gecede kırılım 97/88/46/80 ve toplam 92
 * gösteriliyor. Bu dört sayının hiçbir ağırlıklandırması 92 vermiyor
 * (düz ortalama 77.75). Daha önemlisi o gecenin kendi eksi maddesi
 * "%98 ay tüm gece yukarıda — aysız pencere yok" diyor; ayın dolu olduğu
 * bir geceye derin gök için "Çok iyi gece" demek doğru değil.
 *
 * README de zaten sayıların örnek, eşiklerin öneri olduğunu yazıyor.
 * Buradaki model aynı girdilerle 67 ("Orta gece") üretiyor: bulutsuz ve
 * sakin ama dolunay altında bir gece derin gök için gerçekten orta bir
 * gecedir — küme, çift yıldız ve gezegen için hâlâ iyidir ve öneri satırı
 * kullanıcıyı oraya yönlendiriyor.
 */

/** Skor kırılımının tek satırı. */
export interface ScoreRow {
  key: 'transparency' | 'seeing' | 'darkness' | 'comfort';
  label: string;
  /** 0–100; ölçülemeyen bileşende `null`. */
  value: number | null;
  /** Çubuğun rengi — uyarı eşiğinin altındakiler turuncu. */
  tone: 'good' | 'warn';
}

export type NightVerdict = 'cok-iyi' | 'iyi' | 'orta' | 'zayif';

export interface NightScore {
  /** 0–100. */
  total: number;
  verdict: NightVerdict;
  verdictLabel: string;
  rows: ScoreRow[];
  /** Skoru yukarı çeken somut gerekçeler. */
  pros: string[];
  /** Aşağı çekenler. */
  cons: string[];
  /** Tek cümlelik eylem önerisi. */
  recommendation: string;
  /** Seeing ölçülemediği için hüküm sınırlandı mı? */
  limitedBySeeing: boolean;
}

export interface NightScoreInputs {
  /** Bulut örtüsü yüzdesi (0–100). */
  cloudCover: number;
  /** `estimateSeeing` indeksi (1 mükemmel – 5 kötü); ölçülemediyse null. */
  seeingIndex: number | null;
  /** Bağıl nem (0–100). */
  humidity: number;
  /** Yer rüzgârı (km/sa). */
  windSpeed: number;
  /** Yer sıcaklığı (°C). */
  temperature: number;
  /** Çiy noktası (°C). */
  dewPoint: number;
  /** Tam karanlık süresi (dakika). */
  darkMinutes: number;
  /** Aysız karanlık süresi (dakika). */
  moonlessMinutes: number;
  /** Ay aydınlanma oranı (0–1). */
  moonIllumination: number;
}

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

/**
 * Ağırlıklar. Şeffaflık burada YOK — o çarpan.
 *
 * Seeing en ağır çünkü ölçüyü o belirliyor: bulutsuz ama çalkantılı bir
 * gecede yıldızlar şişer ve hiçbir işleme bunu geri getirmez. Karanlık
 * (ay) en hafif değil ama ikinci sırada değil: dar bant filtre ayın
 * etkisini büyük ölçüde siliyor, yani "ay var" mutlak bir engel değil.
 */
const WEIGHTS = { seeing: 0.45, comfort: 0.3, darkness: 0.25 } as const;

/** Kırılım çubuğunun turuncuya döndüğü eşik. */
const WARN_BELOW = 55;

function toneFor(value: number | null): 'good' | 'warn' {
  return value !== null && value < WARN_BELOW ? 'warn' : 'good';
}

/**
 * Seeing indeksi 1–5 → 100–0.
 *
 * Doğrusal: 1 → 100, 3 → 50, 5 → 0. İndeksin kendisi zaten yarım
 * basamağa yuvarlanıyor, buraya ondalık hassasiyet iddiası taşımıyor.
 */
function seeingScore(index: number): number {
  return clamp(((5 - index) / 4) * 100);
}

/**
 * Rüzgâr ve nem birlikte: ikisi de aynı şeyi bozuyor — teleskopun
 * kararlılığını ve optiğin kuru kalmasını.
 *
 * Çiy noktası farkı (spread) nemden daha bilgilendirici: %90 nem 20°C'de
 * sorun değil, 8°C'de optik buğulanır. Bu yüzden nem değil FARK
 * kullanılıyor; `dewRisk` de aynı büyüklüğe bakıyor.
 */
function comfortScore(
  windSpeed: number,
  temperature: number,
  dewPoint: number
): number {
  // 0 km/sa → 100, 35 km/sa → 0.
  const wind = clamp(100 - (windSpeed / 35) * 100);
  // 8°C fark ve üstü tamam, 0°C fark çiy kesin.
  const spread = clamp(((temperature - dewPoint) / 8) * 100);
  return clamp(wind * 0.4 + spread * 0.6);
}

/**
 * Karanlık: gecenin ne kadarı AYSIZ karanlık.
 *
 * Payda tam karanlık süresi, gecenin tamamı değil — alacakaranlıkta ay
 * olup olmaması derin gök için zaten bir şey değiştirmiyor. Tam karanlık
 * hiç oluşmuyorsa (yaz, yüksek enlem) skor 0: o gece derin gök için
 * gerçekten yok.
 */
function darknessScore(darkMinutes: number, moonlessMinutes: number): number {
  if (darkMinutes <= 0) return 0;
  return clamp((moonlessMinutes / darkMinutes) * 100);
}

function verdictFor(total: number, limited: boolean): NightVerdict {
  if (total >= 85 && !limited) return 'cok-iyi';
  if (total >= 70) return 'iyi';
  if (total >= 50) return 'orta';
  return 'zayif';
}

const VERDICT_LABELS: Record<NightVerdict, string> = {
  'cok-iyi': 'Çok iyi gece',
  iyi: 'İyi gece',
  orta: 'Orta gece',
  zayif: 'Zayıf gece',
};

export function nightScore(inputs: NightScoreInputs): NightScore {
  const transparency = clamp(100 - inputs.cloudCover);
  const seeing =
    inputs.seeingIndex === null ? null : seeingScore(inputs.seeingIndex);
  const comfort = comfortScore(
    inputs.windSpeed,
    inputs.temperature,
    inputs.dewPoint
  );
  const darkness = darknessScore(inputs.darkMinutes, inputs.moonlessMinutes);

  /*
   * Seeing yoksa ağırlığı kalan ikisine oranlarını koruyarak dağıtılıyor.
   * Sıfır saymak "seeing berbat" demekti; ortalamadan çıkarıp kalanları
   * olduğu gibi toplamak ise toplamı 55'e sabitlerdi.
   */
  const base =
    seeing === null
      ? (comfort * WEIGHTS.comfort + darkness * WEIGHTS.darkness) /
        (WEIGHTS.comfort + WEIGHTS.darkness)
      : seeing * WEIGHTS.seeing +
        comfort * WEIGHTS.comfort +
        darkness * WEIGHTS.darkness;

  const total = Math.round((transparency / 100) * base);
  const limitedBySeeing = seeing === null;

  const rows: ScoreRow[] = [
    {
      key: 'transparency',
      label: 'Şeffaflık',
      value: Math.round(transparency),
      tone: toneFor(transparency),
    },
    {
      key: 'seeing',
      label: 'Seeing',
      value: seeing === null ? null : Math.round(seeing),
      tone: toneFor(seeing),
    },
    {
      key: 'darkness',
      label: 'Karanlık',
      value: Math.round(darkness),
      tone: toneFor(darkness),
    },
    {
      key: 'comfort',
      label: 'Rüzgâr & nem',
      value: Math.round(comfort),
      tone: toneFor(comfort),
    },
  ];

  const { pros, cons } = reasons(inputs, {
    transparency,
    seeing,
    darkness,
    comfort,
  });

  return {
    total,
    verdict: verdictFor(total, limitedBySeeing),
    verdictLabel: VERDICT_LABELS[verdictFor(total, limitedBySeeing)],
    rows,
    pros,
    cons,
    recommendation: recommend(inputs, darkness, seeing),
    limitedBySeeing,
  };
}

/**
 * Gerekçeler — SAYIYI TEKRARLAMIYOR, SEBEBİNİ SÖYLÜYOR.
 *
 * "Şeffaflık 97" zaten çubukta yazıyor. Buradaki satırların işi kullanıcının
 * karar verirken ihtiyaç duyduğu somut bilgiyi vermek: bulut yüzdesi değil
 * "gece boyunca %3 bulut, kuru hava (çiy 8°C)".
 */
function reasons(
  inputs: NightScoreInputs,
  scores: {
    transparency: number;
    seeing: number | null;
    darkness: number;
    comfort: number;
  }
): { pros: string[]; cons: string[] } {
  const pros: string[] = [];
  const cons: string[] = [];
  const spread = inputs.temperature - inputs.dewPoint;

  if (scores.transparency >= 85) {
    pros.push(
      `Gece boyunca %${Math.round(inputs.cloudCover)} bulut, çiy noktası ${Math.round(inputs.dewPoint)}°C`
    );
  } else if (scores.transparency < 55) {
    cons.push(`%${Math.round(inputs.cloudCover)} bulut örtüsü — açıklık dar`);
  }

  if (scores.seeing !== null) {
    if (scores.seeing >= 75) {
      pros.push('Üst atmosfer sakin — gezegen ve çift yıldız için ideal');
    } else if (scores.seeing < 50) {
      cons.push('Jet akımı hareketli — yıldızlar şişecek, uzun odak zor');
    }
  } else {
    cons.push('Üst atmosfer verisi yok — seeing tahmin edilemiyor');
  }

  const illum = Math.round(inputs.moonIllumination * 100);
  if (scores.darkness >= 85) {
    pros.push(
      illum <= 15
        ? `Ay %${illum} — gece boyunca karanlık`
        : 'Ay karanlık pencerenin dışında'
    );
  } else if (scores.darkness < 30) {
    cons.push(
      inputs.darkMinutes <= 0
        ? 'Tam karanlık oluşmuyor — astronomik alacakaranlık gece boyu sürüyor'
        : `%${illum} ay karanlığın çoğunda yukarıda — aysız pencere ${inputs.moonlessMinutes} dk`
    );
  }

  if (spread <= 2) {
    cons.push(`Çiy noktası ${spread.toFixed(1)}°C yakın — optik buğulanabilir`);
  } else if (scores.comfort >= 75 && inputs.windSpeed < 15) {
    pros.push(`Rüzgâr ${Math.round(inputs.windSpeed)} km/sa — montür kararlı`);
  }

  return { pros, cons };
}

/**
 * Öneri — gecenin zayıf yanına göre NE YAPILACAĞINI söylüyor.
 *
 * "Gece kötü" demek bilgi değil; kullanıcı zaten skoru görüyor. Değerli
 * olan, o koşulda hangi hedef türünün hâlâ çalıştığı.
 */
function recommend(
  inputs: NightScoreInputs,
  darkness: number,
  seeing: number | null
): string {
  if (inputs.cloudCover >= 70) {
    return 'Bulut yoğun — ekipmanı kurmadan önce saatlik tahmini kontrol edin.';
  }
  if (darkness < 40) {
    return 'Ay parlak: dar bant (Ha/OIII) filtre ile bulutsu, aksi halde küme ve gezegen.';
  }
  if (seeing !== null && seeing < 50) {
    return 'Seeing zayıf: geniş alan ve kısa odak; gezegen için gece yarısını bekleyin.';
  }
  if (inputs.temperature - inputs.dewPoint <= 2) {
    return 'Çiylenme riski yüksek — ısıtıcı bant takın, optiği ara ara kontrol edin.';
  }
  return 'Koşullar açık: uzun pozlara ve zayıf hedeflere uygun bir gece.';
}

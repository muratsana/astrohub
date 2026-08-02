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
 * Bu yüzden bulut diğerlerini ÇARPIYOR. Aynı karar depoda zaten
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
 * Buradaki model aynı girdilerle gözle gözlem için 53 ("Orta gece")
 * üretiyor: bulutsuz ve sakin ama dolunay altında bir gece derin gök için
 * gerçekten orta bir gecedir — küme, çift yıldız ve gezegen için hâlâ
 * iyidir ve öneri satırı kullanıcıyı oraya yönlendiriyor.
 */

/** Skor kırılımının tek satırı. */
export interface ScoreRow {
  key:
    | 'cloudCover'
    | 'seeing'
    | 'darkness'
    | 'comfort';
  label: string;
  /** 0–100; ölçülemeyen bileşende `null`. */
  value: number | null;
  /** Görsel çubuğun iyiye giden değeri; verilmezse `value` kullanılır. */
  barValue?: number | null;
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
  /** Skorun hangi kullanım için hesaplandığı. */
  profile: NightProfile;
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
  /**
   * Rüzgâr hamlesi (km/sa); ölçülmediyse `null`.
   *
   * ORTALAMADAN AYRI GİRDİ ve asıl olarak astrofotoğrafta belirleyici:
   * 12 km/sa ortalama sorunsuz görünürken 40 km/sa hamle beş dakikalık
   * pozu tek başına çöpe atar. Gözle gözlemde etkisi çok daha az —
   * titreşim geçer, gözlemci bekler.
   */
  windGust?: number | null;
  /** Eski API uyumluluğu; skor artık şeffaflığı ayrı bileşen yapmıyor. */
  transparencyIndex?: number | null;
}

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

/**
 * Ağırlıklar. Bulut burada YOK — o çarpan.
 *
 * Seeing en ağır çünkü ölçüyü o belirliyor: bulutsuz ama çalkantılı bir
 * gecede yıldızlar şişer ve hiçbir işleme bunu geri getirmez. Karanlık
 * (ay) en hafif değil ama ikinci sırada değil: dar bant filtre ayın
 * etkisini büyük ölçüde siliyor, yani "ay var" mutlak bir engel değil.
 */
/**
 * ══════════════════════════════════════════════════════════════════════
 * İKİ AYRI SKOR — belge ikisini de zorunlu tutuyor (§7.2, 18. alan).
 *
 * Tek skor vardı ve bu, iki farklı geceyi aynı sayıyla anlatıyordu.
 * Aynı gece iki gözlemci için farklıdır:
 *
 * · GÖZLE GÖZLEM anlıktır. 30 km/sa rüzgârda gözlemci teleskobun
 *   arkasına geçer, titreşim beklerken sönümlenir; çiy oküleri değil
 *   objektifi geç yakalar ve silinir. Buna karşılık AY ACIMASIZDIR:
 *   gözün eşiği yok, dolunayda sönük galaksi kaybolur ve dar bant
 *   filtre gözle işe yaramaz.
 * · ASTROFOTOĞRAF birikimlidir. Tek bir 40 km/sa hamle beş dakikalık
 *   pozu çöpe atar; çiy tuttuğu anda gecenin geri kalanı gider. Ayın
 *   etkisi ise dar bant filtreyle büyük ölçüde silinir — bu yüzden
 *   karanlık AĞIRLIĞI DAHA DÜŞÜK, konfor ağırlığı daha yüksek.
 *
 * Seeing ikisinde de ağır ama sebebi farklı: gözle yüksek büyütmede
 * görüntüyü kaynatır, fotoğrafta yıldızları şişirir.
 *
 * SEEING TOPLAMDA HÂLÂ EN AĞIRI DEĞİL ASTROFOTOĞRAFTA: rehberli poz
 * seeing'i kısmen tolere eder (yıldız şişer ama kare kullanılabilir),
 * oysa hamle ya da çiy kareyi TAMAMEN alır.
 */
export type NightProfile = 'gozlem' | 'astrofoto';

const PROFILE_WEIGHTS: Record<
  NightProfile,
  { seeing: number; comfort: number; darkness: number }
> = {
  gozlem: { seeing: 0.45, comfort: 0.15, darkness: 0.4 },
  astrofoto: { seeing: 0.35, comfort: 0.4, darkness: 0.25 },
};

export const PROFILE_LABELS: Record<NightProfile, string> = {
  gozlem: 'Gözle gözlem',
  astrofoto: 'Astrofotoğraf',
};


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
  dewPoint: number,
  profile: NightProfile,
  windGust: number | null | undefined
): number {
  /*
   * ASTROFOTOĞRAFTA RÜZGÂR HAMLESİ KULLANILIYOR, ORTALAMA DEĞİL.
   * Poz birikimli: ortalaması sakin bir gecede tek bir hamle kareyi
   * alır. Gözle gözlemde tersi doğru — anlık titreşim geçer, bu yüzden
   * orada ortalama daha temsili.
   */
  const effectiveWind =
    profile === 'astrofoto' && windGust != null
      ? Math.max(windSpeed, windGust)
      : windSpeed;

  // 0 km/sa → 100, 35 km/sa → 0.
  const wind = clamp(100 - (effectiveWind / 35) * 100);
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

export function nightScore(
  inputs: NightScoreInputs,
  profile: NightProfile = 'gozlem'
): NightScore {
  const weights = PROFILE_WEIGHTS[profile];
  const cloudClear = clamp(100 - inputs.cloudCover);
  const seeing =
    inputs.seeingIndex === null ? null : seeingScore(inputs.seeingIndex);
  const comfort = comfortScore(
    inputs.windSpeed,
    inputs.temperature,
    inputs.dewPoint,
    profile,
    inputs.windGust
  );
  const darkness = darknessScore(inputs.darkMinutes, inputs.moonlessMinutes);

  /*
   * Seeing yoksa ağırlığı kalan ikisine oranlarını koruyarak dağıtılıyor.
   * Sıfır saymak "seeing berbat" demekti; ortalamadan çıkarıp kalanları
   * olduğu gibi toplamak ise toplamı 55'e sabitlerdi.
   */
  const base =
    seeing === null
      ? (comfort * weights.comfort + darkness * weights.darkness) /
        (weights.comfort + weights.darkness)
      : seeing * weights.seeing +
        comfort * weights.comfort +
        darkness * weights.darkness;

  const total = Math.round((cloudClear / 100) * base);
  const limitedBySeeing = seeing === null;

  const rows: ScoreRow[] = [
    {
      key: 'cloudCover',
      label: 'Bulut örtüsü',
      value: Math.round(inputs.cloudCover),
      barValue: Math.round(cloudClear),
      tone: toneFor(cloudClear),
    },
    {
      key: 'seeing',
      label: 'Seeing',
      value: seeing === null ? null : Math.round(seeing),
      tone: toneFor(seeing),
    },
    {
      key: 'darkness',
      label: 'Karanlık/Ay',
      value: Math.round(darkness),
      tone: toneFor(darkness),
    },
    {
      key: 'comfort',
      label: 'Rüzgâr/Çiy',
      value: Math.round(comfort),
      tone: toneFor(comfort),
    },
  ];

  const { pros, cons } = reasons(inputs, {
    cloudClear,
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
    recommendation: recommend(inputs, darkness, seeing, profile),
    limitedBySeeing,
    profile,
  };
}

/**
 * Gerekçeler — SAYIYI TEKRARLAMIYOR, SEBEBİNİ SÖYLÜYOR.
 *
 * "Bulut örtüsü 12" zaten çubukta yazıyor. Buradaki satırların işi kullanıcının
 * karar verirken ihtiyaç duyduğu somut bilgiyi vermek: sadece yüzde değil
 * "gece boyunca %3 bulut, kuru hava (çiy 8°C)".
 */
function reasons(
  inputs: NightScoreInputs,
  scores: {
    cloudClear: number;
    seeing: number | null;
    darkness: number;
    comfort: number;
  }
): { pros: string[]; cons: string[] } {
  const pros: string[] = [];
  const cons: string[] = [];
  const spread = inputs.temperature - inputs.dewPoint;

  if (scores.cloudClear >= 85) {
    pros.push(
      `Gece boyunca %${Math.round(inputs.cloudCover)} bulut, çiy noktası ${Math.round(inputs.dewPoint)}°C`
    );
  } else if (scores.cloudClear < 55) {
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
  seeing: number | null,
  profile: NightProfile
): string {
  /*
   * ÖNERİ DE PROFİLE GÖRE. Aynı ay parlaklığında gözlemciye "dar bant
   * filtre tak" demek işe yaramaz — dar bant gözle çalışmaz, gözün
   * eşiği yoktur. İki kullanıcıya aynı cümleyi kurmak, birinin
   * gecesini boşa harcatmak demekti.
   */
  if (profile === 'gozlem' && darkness < 40 && inputs.cloudCover < 70) {
    return 'Ay parlak: sönük galaksi yerine küme, çift yıldız ve gezegen; dar bant filtre gözle işe yaramaz.';
  }
  if (
    profile === 'astrofoto' &&
    inputs.windGust != null &&
    inputs.windGust >= 30 &&
    inputs.cloudCover < 70
  ) {
    return `Hamle ${Math.round(inputs.windGust)} km/sa — pozu kısaltın ya da rüzgâr siperi kurun.`;
  }
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

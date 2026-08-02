import {
  equatorialToHorizontal,
  moonPhase,
  sunEclipticLongitude,
} from './ephemeris';

/**
 * METEOR YAĞMURLARI — gökyüzü olayları takvimi (§14.3).
 *
 * ══════════════════════════════════════════════════════════════════════
 * "DIŞ VERİ KAYNAĞI GEREKİYOR" DOĞRU DEĞİLDİ
 *
 * Durum kaydı bu maddeyi ISS geçişleriyle aynı kutuya koymuştu. İkisi
 * AYNI ŞEY DEĞİL: ISS'in konumu her gün değişen bir yörünge verisi
 * (TLE) gerektiriyor ve gerçekten dışarıdan gelmek zorunda. Meteor
 * yağmuru ise bir KATALOG — Messier listesi gibi, yıldan yıla değişmeyen
 * referans bilgisi.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TARİH SABİT YAZILMIYOR, HESAPLANIYOR
 *
 * "Perseidler 12 Ağustos'ta zirve yapar" cümlesi yaklaşık ve yıllar
 * içinde kayar. Maksimum aslında bir TAKVİM GÜNÜNE değil, Dünya'nın
 * yörüngesindeki bir NOKTAYA bağlı: güneşin ekliptik boylamı
 * (λ☉ = 140.0°). Artık yıl döngüsü yüzünden aynı λ☉ farklı yıllarda
 * farklı saate düşüyor.
 *
 * Bu yüzden tabloda tarih değil AÇI duruyor; tarih her yıl
 * `sunEclipticLongitude`den geri çözülüyor. Sabit tarih yazan bir
 * takvim birkaç yıl sonra bir gün kayar ve kimse fark etmez —
 * kullanıcı yanlış gece dışarı çıkar.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ASIL SORU "NE ZAMAN" DEĞİL, "BU YIL DEĞER Mİ"
 *
 * Zirve tarihini söylemek yarım cevap: ZHR 100 olan bir yağmur dolunayda
 * pratikte ZHR 10 gibi izlenir. Modül o yüzden zirve gecesinin AY
 * AYDINLANMASINI ve radyantın gözlemcinin ufkundaki YÜKSEKLİĞİNİ de
 * veriyor — ikisi de zaten elimizdeki `ephemeris` ile hesaplanıyor.
 *
 * Kaynak: IMO çalışma listesi (kamuya açık referans değerleri).
 */

export interface MeteorShower {
  /** IAU üç harfli kod — kanonik kimlik. */
  code: string;
  name: string;
  /** Maksimumda güneşin ekliptik boylamı, derece. */
  solarLongitude: number;
  /** Radyantın ekvatoral koordinatı (maksimum civarı). */
  radiantRa: number;
  radiantDec: number;
  /** İdeal koşulda saatlik zirve oranı; `null` = değişken. */
  zhr: number | null;
  /** Atmosfere giriş hızı, km/s. */
  velocityKmS: number;
  /** Ana cisim — kuyrukluyıldız ya da asteroit. */
  parent: string;
}

/**
 * BÜYÜK YAĞMURLAR — on iki kayıt.
 *
 * Liste bilinçli olarak KISA. IMO'nun tam listesi yüzden fazla akım
 * içeriyor ve çoğunun ZHR'si 2–3; bir gözlem takviminde onları
 * göstermek, gerçekten fark yaratan beş yağmuru gürültüye gömerdi.
 * Eşik: ZHR ≥ 5 ya da tarihsel olarak fırtına üretmiş olmak
 * (Drakonidler bu yüzden listede — ZHR'si değişken ama 1933 ve 1946'da
 * saatte binlerce meteor verdi).
 */
export const METEOR_SHOWERS: MeteorShower[] = [
  { code: 'QUA', name: 'Quadrantidler', solarLongitude: 283.15, radiantRa: 230, radiantDec: 49, zhr: 110, velocityKmS: 41, parent: '2003 EH1' },
  { code: 'LYR', name: 'Lyridler', solarLongitude: 32.32, radiantRa: 271, radiantDec: 34, zhr: 18, velocityKmS: 49, parent: 'C/1861 G1 Thatcher' },
  { code: 'ETA', name: 'Eta Aquariidler', solarLongitude: 45.5, radiantRa: 338, radiantDec: -1, zhr: 50, velocityKmS: 66, parent: '1P/Halley' },
  { code: 'SDA', name: 'Delta Aquariidler', solarLongitude: 125, radiantRa: 340, radiantDec: -16, zhr: 25, velocityKmS: 41, parent: '96P/Machholz' },
  { code: 'PER', name: 'Perseidler', solarLongitude: 140, radiantRa: 48, radiantDec: 58, zhr: 100, velocityKmS: 59, parent: '109P/Swift-Tuttle' },
  { code: 'DRA', name: 'Drakonidler', solarLongitude: 195.4, radiantRa: 262, radiantDec: 54, zhr: null, velocityKmS: 20, parent: '21P/Giacobini-Zinner' },
  { code: 'ORI', name: 'Orionidler', solarLongitude: 208, radiantRa: 95, radiantDec: 16, zhr: 20, velocityKmS: 66, parent: '1P/Halley' },
  { code: 'STA', name: 'Güney Tauridler', solarLongitude: 223, radiantRa: 52, radiantDec: 15, zhr: 5, velocityKmS: 27, parent: '2P/Encke' },
  { code: 'NTA', name: 'Kuzey Tauridler', solarLongitude: 230, radiantRa: 58, radiantDec: 22, zhr: 5, velocityKmS: 29, parent: '2P/Encke' },
  { code: 'LEO', name: 'Leonidler', solarLongitude: 235.27, radiantRa: 152, radiantDec: 22, zhr: 15, velocityKmS: 71, parent: '55P/Tempel-Tuttle' },
  { code: 'GEM', name: 'Geminidler', solarLongitude: 262.2, radiantRa: 112, radiantDec: 33, zhr: 150, velocityKmS: 35, parent: '3200 Phaethon' },
  { code: 'URS', name: 'Ursidler', solarLongitude: 270.7, radiantRa: 217, radiantDec: 76, zhr: 10, velocityKmS: 33, parent: '8P/Tuttle' },
];


/**
 * Verilen yılda güneşin belirli bir ekliptik boylama ULAŞTIĞI an.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN İKİLİ ARAMA, NEDEN FORMÜL DEĞİL
 *
 * λ☉ → tarih dönüşümünün kapalı formu yok (merkez denklemi yüzünden
 * ilişki doğrusal değil). Ama fonksiyon yıl içinde MONOTON artıyor, yani
 * ikili arama kesin yakınsıyor: 40 adımda milisaniye altına iniyor ve
 * her adım birkaç çarpma.
 *
 * BAŞLANGIÇ ARALIĞI yılın tamamı. Kaba bir tahminden (λ/360 × 365 gün)
 * başlamak daha hızlı olurdu ama 0°/360° sarmasında yanlış tarafa
 * düşebilirdi; bir gökyüzü takviminde hız değil doğruluk pahalı olan.
 */
export function solarLongitudeDate(year: number, longitude: number): Date {
  const hedef = ((longitude % 360) + 360) % 360;

  /* Referans: yıl başındaki λ☉ (~280°). Aranan açı ondan küçükse olay
     yılın ilerisinde, büyükse aynı yıl içinde — sarmayı bu belirliyor. */
  let alt = Date.UTC(year, 0, 1);
  let ust = Date.UTC(year + 1, 0, 1);

  /* Sarmayı tek bir noktada çözmek için λ'yı yıl başına göre KAYDIRILMIŞ
     olarak ölçüyoruz: böylece aranan değer aralıkta artan tek bir
     fonksiyona dönüşüyor. */
  const taban = sunEclipticLongitude(new Date(alt));
  const kaydir = (t: number) =>
    (((sunEclipticLongitude(new Date(t)) - taban) % 360) + 360) % 360;
  const hedefKaydirilmis = (((hedef - taban) % 360) + 360) % 360;

  for (let i = 0; i < 60; i++) {
    const orta = (alt + ust) / 2;
    if (kaydir(orta) < hedefKaydirilmis) alt = orta;
    else ust = orta;
  }
  return new Date(Math.round((alt + ust) / 2));
}

export interface ShowerPeak {
  shower: MeteorShower;
  /** Maksimum anı (UTC). */
  peak: Date;
  /** O andaki ay aydınlanması, 0–1. */
  moonIllumination: number;
  /**
   * Ay engeli — aydınlanma ve ZHR birlikte.
   *
   * Dolunayda ZHR 100'lük bir yağmur pratikte onda biri kadar meteor
   * gösteriyor; kullanıcının kararı "zirve ne zaman"dan çok bu.
   */
  moonVerdict: 'temiz' | 'kısmi' | 'engelli';
}

/** Ay aydınlanmasını üç kademeye indirger. */
function ayKarari(illumination: number): ShowerPeak['moonVerdict'] {
  /* Eşikler gözlem pratiğinden: hilal (<%30) çıplak gözle meteor
     saymayı bozmuyor; yarım ay (%30–70) zayıf meteorları siliyor;
     üstü gökyüzünü yıkıyor. */
  if (illumination < 0.3) return 'temiz';
  if (illumination < 0.7) return 'kısmi';
  return 'engelli';
}

/**
 * Bir yılın bütün yağmurları, zirve tarihine göre sıralı.
 *
 * Aralık sonundaki Ursidler ile ocak başındaki Quadrantidler AYNI
 * takvim yılında görünüyor ve bu doğru: kullanıcı "2026'da hangi
 * yağmurlar var" diye soruyor, gökyüzü döngüsünü değil takvimi
 * okuyor.
 */
export function showersInYear(year: number): ShowerPeak[] {
  return METEOR_SHOWERS.map((shower) => {
    const peak = solarLongitudeDate(year, shower.solarLongitude);
    const illumination = moonPhase(peak).illumination;
    return {
      shower,
      peak,
      moonIllumination: illumination,
      moonVerdict: ayKarari(illumination),
    };
  }).sort((a, b) => a.peak.getTime() - b.peak.getTime());
}

/**
 * Verilen andan sonraki ilk N yağmur.
 *
 * YIL SINIRINI AŞIYOR: aralık ortasında bakan kullanıcıya yalnızca
 * Ursidleri göstermek, listeyi takvimin kenarına çarptığı için
 * kısaltmak olurdu.
 */
export function upcomingShowers(now: Date, count = 3): ShowerPeak[] {
  const yil = now.getUTCFullYear();
  return [...showersInYear(yil), ...showersInYear(yil + 1)]
    .filter((s) => s.peak.getTime() >= now.getTime())
    .slice(0, count);
}

/**
 * Radyantın zirve gecesi ulaştığı EN YÜKSEK nokta, derece.
 *
 * Radyant ufkun altındaysa o yağmur o konumdan İZLENEMEZ — güney
 * yarımküre yağmurları Türkiye'den zayıf görünür ve takvim bunu
 * söylemek zorunda. Negatif değer "hiç yükselmiyor" demek.
 *
 * Gece boyunca saatlik örnekleniyor: radyantın kulminasyonunu analitik
 * çözmek mümkün ama tek satırlık bir kazanç için ikinci bir formül
 * ailesi getirirdi.
 */
export function radiantMaxAltitude(
  peak: ShowerPeak,
  latitude: number,
  longitude: number
): number {
  const coords = { ra: peak.shower.radiantRa, dec: peak.shower.radiantDec };
  let enYuksek = -90;
  /* Zirve gününün tamamı taranıyor, yalnızca gece değil: "gece" tanımı
     enleme ve mevsime göre değişiyor ve burada aranan şey radyantın
     ulaşabildiği tavan. */
  for (let saat = 0; saat < 24; saat++) {
    const an = new Date(peak.peak.getTime() + saat * 3_600_000 - 12 * 3_600_000);
    const { altitude } = equatorialToHorizontal(coords, an, latitude, longitude);
    if (altitude > enYuksek) enYuksek = altitude;
  }
  return enYuksek;
}

/** Zirve tarihi Türkçe okunur biçimde — takvim satırı için. */
export function formatPeak(peak: Date, timeZone = 'Europe/Istanbul'): string {
  return peak.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    timeZone,
  });
}

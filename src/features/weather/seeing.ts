/**
 * SEEING TAHMİNİ.
 *
 * ÖNEMLİ — bu bir ÖLÇÜM DEĞİL, TAHMİNDİR.
 *
 * Gerçek seeing (yıldız diskinin yaydığı açı, saniye-yay cinsinden) yalnızca
 * sahadaki bir DIMM/SHABAR cihazıyla ölçülür. Hiçbir ücretsiz hava servisi
 * bunu vermez. Astronomi sitelerinde gördüğünüz "seeing" değerleri de
 * ölçüm değil, aynı bizim burada yaptığımız gibi model çıktısından türetilmiş
 * tahminlerdir.
 *
 * YÖNTEM
 * Atmosferik türbülansın baskın kaynağı yüksek irtifa rüzgâr kesmesidir
 * (jet akımı). Klasik yaklaşım — Meteoblue'nun "jet stream seeing"
 * göstergesinin de dayandığı fikir — 200–300 hPa seviyesindeki rüzgâr
 * hızını türbülans göstergesi saymaktır: jet ne kadar hızlıysa, üstteki
 * hava katmanları o kadar karışır ve yıldız o kadar oynar.
 *
 * Buna iki düzeltme ekliyoruz:
 *   · 500 hPa rüzgârı — orta troposfer katkısı, jetten daha az ağırlıklı
 *   · yer rüzgârı — yerel/kubbe türbülansı; küçük ama gerçek bir etken
 *
 * Çıktı 1–5 arası bir **indeks**tir, saniye-yay değil. Kasıtlı: saniye-yay
 * yazmak, üretmediğimiz bir kesinlik iddia etmek olurdu. Kullanıcı "2.1″"
 * görürse bunu ölçüm sanır; "İyi" görürse tahmin olduğunu anlar.
 */

export interface SeeingInputs {
  /** 200 hPa rüzgâr hızı (km/sa) — jet akımı seviyesi. */
  wind200hPa: number;
  /** 500 hPa rüzgâr hızı (km/sa) — orta troposfer. */
  wind500hPa: number;
  /** 10 m yer rüzgârı (km/sa). */
  windSurface: number;
}

export interface SeeingEstimate {
  /** 1 (mükemmel) – 5 (çok kötü) arası indeks. */
  index: number;
  /** Hesabı hangi bileşenin sürüklediği — arayüzde açıklama olarak kullanılır. */
  driver: 'jet' | 'orta-troposfer' | 'yer-rüzgarı';
}

/** Bir değeri verilen aralıktan 0–1 aralığına doğrusal olarak taşır. */
function normalize(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

/**
 * Seeing indeksini hesaplar.
 *
 * Eşikler pratik gözlem deneyiminden alınmıştır:
 *   200 hPa  <  40 km/sa  → sakin jet;  > 180 km/sa → güçlü jet
 *   500 hPa  <  20 km/sa  → sakin;      >  90 km/sa → hareketli
 *   yer      <   5 km/sa  → sakin;      >  35 km/sa → rüzgârlı
 */
export function estimateSeeing(inputs: SeeingInputs): SeeingEstimate {
  const jet = normalize(inputs.wind200hPa, 40, 180);
  const mid = normalize(inputs.wind500hPa, 20, 90);
  const surface = normalize(inputs.windSurface, 5, 35);

  // Ağırlıklar: jet baskın, orta troposfer ikincil, yer rüzgârı küçük düzeltme.
  const weighted = jet * 0.6 + mid * 0.25 + surface * 0.15;

  // 0–1 → 1–5 indeksi. Yarım basamağa yuvarlanır; ondalık hassasiyet
  // iddiası taşımaz.
  const index = Math.round((1 + weighted * 4) * 2) / 2;

  const contributions = [
    { driver: 'jet' as const, value: jet * 0.6 },
    { driver: 'orta-troposfer' as const, value: mid * 0.25 },
    { driver: 'yer-rüzgarı' as const, value: surface * 0.15 },
  ];
  const driver = contributions.reduce((a, b) => (b.value > a.value ? b : a))
    .driver;

  return { index, driver };
}

/** İndeksin insan tarafından okunabilir karşılığı. */
export function seeingLabel(index: number): string {
  if (index <= 1.5) return 'Mükemmel';
  if (index <= 2.5) return 'İyi';
  if (index <= 3.5) return 'Orta';
  if (index <= 4.5) return 'Zayıf';
  return 'Kötü';
}

/**
 * Gözlem uygunluğu: bulut örtüsü ve seeing birlikte değerlendirilir.
 *
 * Bulut baskındır — %80 bulutta seeing'in mükemmel olması hiçbir işe
 * yaramaz, teleskop hiçbir şey görmez. Bu yüzden bulut bir çarpan gibi
 * davranır, ortalama gibi değil.
 */
export function observingVerdict(
  cloudCover: number,
  seeingIndex: number
): { label: string; tone: 'success' | 'primary' | 'warning' | 'danger' } {
  if (cloudCover >= 80) return { label: 'Kapalı', tone: 'danger' };
  if (cloudCover >= 50) return { label: 'Parçalı bulutlu', tone: 'warning' };

  if (seeingIndex <= 2 && cloudCover < 20)
    return { label: 'Çok iyi gece', tone: 'success' };
  if (seeingIndex <= 3 && cloudCover < 35)
    return { label: 'Gözleme uygun', tone: 'success' };
  if (seeingIndex <= 4) return { label: 'Geniş alan için uygun', tone: 'primary' };

  return { label: 'Türbülanslı', tone: 'warning' };
}

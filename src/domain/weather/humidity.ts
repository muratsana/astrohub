/**
 * NEM VE ÇİYLENME — fiziksel dönüşümler.
 *
 * Alan katmanında duruyor çünkü bunlar sunum değil, ölçüden ölçüye
 * dönüşüm: aynı sıcaklık ve bağıl nem her serviste aynı çiy noktasını
 * verir. Servis adaptörünün içinde dursaydı, ikinci bir servis
 * eklendiğinde formül kopyalanır ve iki kopya sessizce ayrışırdı.
 */

/**
 * Magnus–Tetens yaklaşımı ile çiy noktası (°C).
 *
 * Katsayılar (17.62 / 243.12) Sonntag 1990 kalibrasyonundan; −45 °C ile
 * +60 °C arasında ±0.35 °C hata veriyor. Gözlem sıcaklıklarının tamamı bu
 * aralıkta.
 *
 * NEDEN HESAPLIYORUZ: bazı servisler çiy noktasını doğrudan veriyor,
 * bazıları yalnızca sıcaklık ve bağıl nem. İkincisinde alanı boş bırakmak
 * ısıtıcı bandı kararını imkânsız kılardı; oysa veri aslında elimizde,
 * yalnızca başka birimde.
 *
 * Bağıl nem 0 ya da negatifse `null` döner — logaritma tanımsız ve
 * "%0 nem" gerçek bir ölçüm değil, eksik veridir.
 */
export function dewPointFromHumidity(
  temperatureC: number,
  relativeHumidityPct: number
): number | null {
  if (!Number.isFinite(temperatureC)) return null;
  if (!Number.isFinite(relativeHumidityPct) || relativeHumidityPct <= 0) {
    return null;
  }

  const rh = Math.min(100, relativeHumidityPct) / 100;
  const b = 17.62;
  const c = 243.12;

  const gamma = Math.log(rh) + (b * temperatureC) / (c + temperatureC);
  const dew = (c * gamma) / (b - gamma);

  return Number.isFinite(dew) ? Math.round(dew * 10) / 10 : null;
}

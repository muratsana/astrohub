/**
 * ŞEFFAFLIK (TRANSPARENCY) — belgenin 18 zorunlu alanından sonuncusu.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN BUGÜNE KADAR YOKTU VE NEDEN ARTIK VAR
 *
 * Durum kaydında bu satır "doğrudan API alanı değil" gerekçesiyle açık
 * bırakılmıştı: yaygın vekil olan aerosol optik derinliği (AOD)
 * Open-Meteo'nun TAHMİN ucunda yok. Bu doğruydu ama eksikti — AOD hava
 * KALİTESİ ucunda var ve o uç da anahtarsız, ücretsiz.
 *
 * Ölçüldü (1 Ağustos, Ankara 39.93/32.86): `aerosol_optical_depth`
 * saatlik seri hâlinde geliyor, gece saatlerinde 0.15–0.17 aralığında.
 * Yani veri gerçek, alan gerçek; eksik olan tek şey isteğin kendisiydi.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN NEMDEN TÜRETİLMEDİ
 *
 * Nem ve çiy noktasından bir "şeffaflık" sayısı uydurmak kolaydı ve
 * yanlış olurdu: nem yüksekken de kristal berrak gökyüzü olur (soğuk
 * cephe sonrası), toz taşınımında ise nem düşükken gökyüzü süt gibi
 * olur. İkisi ayrı fiziksel büyüklük. Ölçülmemiş bir metriği ölçülmüş
 * gibi sunmak, hiç göstermemekten kötü.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BULUT DEĞİL — İKİSİ AYRI SORU
 *
 * Gece skorunda "şeffaflık" adıyla duran bileşen aslında `100 - bulut`
 * idi, yani AÇIKLIK. Bulutsuz bir gece şeffaf olmak zorunda değil:
 * Sahra tozu taşındığında gökyüzü bulutsuz görünür ama sönük yıldızlar
 * kaybolur, sınır kadir 1–1.5 düşer. Artık ikisi ayrı ölçülüyor;
 * skor bulutu çarpan olarak, aerosolü ayrı bir bileşen olarak kullanıyor.
 */

const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

/**
 * AOD → 1–5 şeffaflık indeksi.
 *
 * Eşikler AERONET literatüründeki kaba sınıflandırmayı izliyor: 550 nm
 * AOD'de 0.1 altı "çok temiz" (dağ gözlemevi koşulu), 0.1–0.2 tipik
 * temiz kıtasal hava, 0.2–0.4 kentsel/hafif tozlu, 0.4–0.7 belirgin
 * bulanıklık, üstü toz taşınımı veya duman.
 *
 * SAYI ONDALIKLI SUNULMUYOR. AOD tahmini birkaç yüzde hata taşıyor;
 * "0.187" yazmak sahip olmadığımız bir hassasiyeti iddia etmek olurdu.
 * Beş kademe kararı değiştirmek için yeterli.
 */
export type TransparencyIndex = 1 | 2 | 3 | 4 | 5;

export interface TransparencyEstimate {
  /** 550 nm aerosol optik derinliği — ham ölçüm. */
  aod: number;
  /** 1 = çok berrak … 5 = çok bulanık. */
  index: TransparencyIndex;
  label: string;
  /**
   * Sönük hedeflerde beklenen sınır kadir kaybı (yaklaşık).
   *
   * Kullanıcının kararını AOD sayısı değil bu değiştiriyor: "0.35"
   * hiçbir şey söylemez, "sönük hedeflerde ~0.4 kadir kayıp" seansın
   * hedef listesini değiştirir.
   */
  magnitudeLoss: number;
}

const LABELS: Record<TransparencyIndex, string> = {
  1: 'Çok berrak',
  2: 'Berrak',
  3: 'Orta',
  4: 'Bulanık',
  5: 'Çok bulanık',
};

export function transparencyFromAod(aod: number): TransparencyEstimate | null {
  if (!Number.isFinite(aod) || aod < 0) return null;

  const index: TransparencyIndex =
    aod < 0.1 ? 1 : aod < 0.2 ? 2 : aod < 0.4 ? 3 : aod < 0.7 ? 4 : 5;

  /*
   * Kaba bir yaklaşım ve öyle olduğu yazılı: zenitte sönümleme
   * 1.086 × AOD kadir. Ufka yakın hedeflerde bu iki-üç katına çıkar;
   * burada zenit değeri veriliyor, yani İYİMSER uç. Hava kütlesiyle
   * ölçeklemek hedef yüksekliğini bilmeyi gerektirir ve panel tek bir
   * gece için tek sayı gösteriyor.
   */
  return {
    aod,
    index,
    label: LABELS[index],
    magnitudeLoss: Math.round(1.086 * aod * 100) / 100,
  };
}

interface AirQualityResponse {
  hourly?: {
    time?: string[];
    aerosol_optical_depth?: (number | null)[];
  };
}

/** İstenen ana en yakın saatin dizinini bulur. */
function indexForHour(times: string[] | undefined, at: Date): number {
  if (!times || times.length === 0) return -1;
  const target = at.getTime();
  let best = -1;
  let bestDiff = Infinity;
  for (let i = 0; i < times.length; i += 1) {
    /* Servis `timezone=auto` ile yerel saat veriyor; `Date` bunu ayrıştırıp
       aynı ana çeviriyor. UTC varsayıp elle kaydırmak, yaz saati olan
       ülkelerde bir saat kaydırırdı. */
    const diff = Math.abs(new Date(times[i]).getTime() - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  /* Üç saatten uzak bir eşleşme, istenen anın tahmin ufkunun dışında
     kaldığı anlamına gelir — komşu günün değerini o geceye yazmaktansa
     "veri yok" demek doğru. */
  return bestDiff <= 3 * 60 * 60 * 1000 ? best : -1;
}

/**
 * Şeffaflığı getirir; servis vermezse `null`.
 *
 * HATA SESSİZ: şeffaflık panelin 18 alanından biri ve olmaması diğer
 * 17'yi engellememeli. Çağıran taraf `null`ı "veri yok" olarak çiziyor.
 */
export async function fetchTransparency(
  latitude: number,
  longitude: number,
  at?: Date,
  signal?: AbortSignal
): Promise<TransparencyEstimate | null> {
  const url =
    `${AIR_QUALITY_URL}?latitude=${latitude.toFixed(3)}` +
    `&longitude=${longitude.toFixed(3)}` +
    '&hourly=aerosol_optical_depth&timezone=auto&forecast_days=5';

  try {
    const response = await fetch(url, { signal });
    if (!response.ok) return null;

    const raw = (await response.json()) as AirQualityResponse;
    const i = indexForHour(raw.hourly?.time, at ?? new Date());
    if (i < 0) return null;

    const aod = raw.hourly?.aerosol_optical_depth?.[i];
    return aod === null || aod === undefined ? null : transparencyFromAod(aod);
  } catch {
    return null;
  }
}

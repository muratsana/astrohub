/**
 * AZURACAST YANIT ÇÖZÜMLEYİCİSİ — Deno'suz, test edilebilir.
 *
 * `index.ts`ten ayrı çünkü buradaki kararların hepsi ölçülebilir ve
 * ölçülmeli: hangi alan "yayın var mı" sorusunun cevabı, eksik alan ne
 * yapıyor, hata yolunda ne dönüyor. Bunları bir `Deno.serve` çağrısının
 * içinden sınamak, ağ ve ortam değişkeni taklit etmek demekti.
 */

export interface Durum {
  canli: boolean;
  dinleyici: number | null;
  calan: string | null;
  gecikmeMs: number | null;
  hata: string | null;
}

/**
 * ÇEVRİMDIŞI HER ZAMAN GEÇERLİ BİR CEVAP.
 *
 * §10.2'nin son maddesi sahte "canlı" ibaresini yasaklıyor ve bu, hata
 * yolunun da uyması gereken bir kural: yapılandırma eksik, sunucu
 * ulaşılamıyor ya da yanıt anlaşılmıyor — üçünde de cevap `canli:
 * false`. "Bilmiyorum" ile "canlı" arasında varsayılan asla "canlı"
 * olamaz.
 */
export function cevrimdisi(hata: string): Durum {
  return {
    canli: false,
    dinleyici: null,
    calan: null,
    gecikmeMs: null,
    hata,
  };
}

/**
 * AzuraCast `nowplaying` yanıtını çözer.
 *
 * ALAN ADLARI SAVUNMACI OKUNUYOR: AzuraCast sürümleri arasında yapı
 * değişebiliyor. Eksik alan `null` oluyor ve fonksiyon çökmüyor — bir
 * alanın gelmemesi yayının düştüğü anlamına gelmez.
 */
export function cozumle(veri: unknown, gecikmeMs: number): Durum {
  if (!veri || typeof veri !== 'object' || Array.isArray(veri)) {
    return cevrimdisi('Yanıt çözümlenemedi');
  }

  const kok = veri as Record<string, unknown>;
  const nowPlaying = kok.now_playing as Record<string, unknown> | undefined;
  const listeners = kok.listeners as Record<string, unknown> | undefined;
  const song = nowPlaying?.song as Record<string, unknown> | undefined;

  /* AYAKTA OLMAK, CANLI YAYINCI OLMAKTAN FARKLI.
     `live.is_live` "şu an bir DJ bağlı mı" demek ve AutoDJ çalarken
     `false` döner — ama yayın ayaktadır ve dinleyici müzik duyar.
     Kullanıcıya lazım olan soru "yayın var mı", "DJ var mı" değil.
     `is_online` bu yüzden okunuyor. */
  const yayindaMi = kok.is_online === true;

  /* `current` anlık, `total` kümülatif olabiliyor; ikisi de yoksa
     BOŞ bırakılıyor. 0 yazmak "kimse dinlemiyor" demek olurdu ve bu,
     "sayamadık"tan farklı bir cümle. */
  const dinleyici =
    typeof listeners?.current === 'number'
      ? (listeners.current as number)
      : typeof listeners?.total === 'number'
        ? (listeners.total as number)
        : null;

  const calanHam = typeof song?.text === 'string' ? song.text.trim() : '';

  return {
    canli: yayindaMi,
    dinleyici: dinleyici !== null && dinleyici >= 0 ? dinleyici : null,
    calan: calanHam || null,
    gecikmeMs,
    hata: yayindaMi ? null : 'Yayın çevrimdışı',
  };
}

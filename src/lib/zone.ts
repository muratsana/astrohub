/**
 * SAAT DİLİMİ MATEMATİĞİ — tek kaynak.
 *
 * İki yerde lazım oldu: etkinlik hatırlatmaları ("etkinlik günü sabahı
 * 09:00") ve radyo program takvimi ("her salı 21:00"). İkisi de aynı
 * soruyu soruyor — "şu yerel duvar saati hangi ana denk geliyor" — ve
 * iki kopya kaçınılmaz olarak ayrışırdı: biri düzeltilir, diğeri
 * unutulur ve fark "bir bildirim bir saat erken geldi" olarak görünür,
 * bulunması en zor hata türü.
 *
 * SABİT +03 YAZILMADI. Türkiye 2016'dan beri yaz saati uygulamıyor,
 * yani bugün sonuç her zaman +180. Sabitlemek, kural değişirse bu
 * dosyanın sessizce yanlış hesaplamaya başlaması demekti. `Intl`
 * tarayıcının/Node'un IANA veritabanını okuyor ve o veritabanı
 * güncelleniyor.
 */

/** Bir anın verilen dilimdeki UTC farkı (dakika). */
export function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? '0');

  /* `hour12: false` bazı motorlarda gece yarısını 24 olarak veriyor. */
  const hour = get('hour') % 24;

  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    hour,
    get('minute'),
    get('second')
  );

  return (asUtc - instant.getTime()) / 60_000;
}

/** Bir anın verilen dilimdeki yerel takvim alanları. */
export interface ZonedParts {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number;
  minute: number;
  /** ISO hafta günü: 1 = pazartesi … 7 = pazar. */
  weekday: number;
}

export function zonedParts(instant: Date, timeZone: string): ZonedParts {
  const offset = zoneOffsetMinutes(instant, timeZone);
  /* Farkı ekleyip UTC alanlarını okumak, yerel duvar saatini verir. */
  const local = new Date(instant.getTime() + offset * 60_000);
  /* `getUTCDay()` pazar = 0; ISO'da pazar 7. */
  const isoWeekday = local.getUTCDay() === 0 ? 7 : local.getUTCDay();

  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth() + 1,
    day: local.getUTCDate(),
    hour: local.getUTCHours(),
    minute: local.getUTCMinutes(),
    weekday: isoWeekday,
  };
}

/**
 * Yerel duvar saatinden ana çevirir.
 *
 * İKİ GEÇİŞ. İlk tahminin farkı, sonucun kendi farkından ayrılabilir —
 * yaz saati sınırında saat ileri/geri alınırken. İkinci geçiş bunu
 * düzeltiyor. Türkiye'de bugün fark yok ama kod dilime bağlı değil.
 */
export function wallToInstant(
  wall: { year: number; month: number; day: number; hour: number; minute?: number },
  timeZone: string
): Date {
  const asUtc = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute ?? 0
  );
  const guess = new Date(asUtc - zoneOffsetMinutes(new Date(asUtc), timeZone) * 60_000);
  return new Date(asUtc - zoneOffsetMinutes(guess, timeZone) * 60_000);
}

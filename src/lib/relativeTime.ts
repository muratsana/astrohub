/**
 * GÖRECELİ ZAMAN — "3 dk önce".
 *
 * Bildirim ve mesaj listelerinin ikisi de aynı ifadeye ihtiyaç duyuyor.
 * İki yerde ayrı yazılsaydı biri "3 dakika önce", diğeri "3 dk önce"
 * derdi ve aynı ekranda iki farklı zaman dili görünürdü.
 *
 * MUTLAK TARİHE NE ZAMAN DÖNÜLÜYOR. Yedi günden eskisi artık göreceli
 * yazılmıyor: "34 gün önce" okuyan kişi zihninde takvim hesabı yapmak
 * zorunda kalıyor ve genellikle yapmıyor. O eşikten sonra tarihin
 * kendisi daha kullanışlı.
 *
 * `Intl.RelativeTimeFormat` kullanılıyor, elle çekim eki değil: Türkçe
 * çoğul yok ama "1 saat önce / 2 saat önce" gibi biçimler yerel ayarın
 * işi ve tarayıcı bunu bizden iyi biliyor.
 */

const rtf = new Intl.RelativeTimeFormat('tr-TR', { numeric: 'auto' });

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Bu eşikten eskisi mutlak tarih olarak yazılıyor. */
const ABSOLUTE_AFTER = 7 * DAY;

/**
 * ISO zaman damgasını okunur bir ifadeye çevirir.
 *
 * `now` dışarıdan verilebiliyor — testin sabit bir "şimdi" ile
 * çalışabilmesi için. Varsayılanı gerçek zaman.
 */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';

  const diff = now - then;

  /*
   * İLERİ TARİH GERİYE ÇEVRİLMİYOR. Sunucu saatiyle tarayıcı saati
   * arasındaki birkaç saniyelik fark, yeni gelen bir bildirimi
   * "3 saniye sonra" diye yazdırıyordu. Bir dakikaya kadar olan ileri
   * sapma "az önce" sayılıyor; gerçekten geleceğe ait bir kayıt
   * (hatırlatma) zaten mutlak tarih eşiğine düşüyor.
   */
  if (diff < MINUTE) return 'az önce';

  if (diff >= ABSOLUTE_AFTER) {
    return new Date(then).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  if (diff < HOUR) return rtf.format(-Math.floor(diff / MINUTE), 'minute');
  if (diff < DAY) return rtf.format(-Math.floor(diff / HOUR), 'hour');
  return rtf.format(-Math.floor(diff / DAY), 'day');
}

/** Mesaj balonunun altındaki saat — aynı gün içindeyse yalnızca saat. */
export function clockTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

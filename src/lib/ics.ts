/**
 * TAKVİM DOSYASI (RFC 5545) — ortak yazıcı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN BURAYA TAŞINDI
 *
 * Bu kodun tamamı `features/events/reminders.ts` içinde yaşıyordu ve
 * `AstroEvent` tipine bağlıydı. §14.1 planlayıcıdan da "takvime ekleme"
 * istiyor; fazın açılış kuralı ("çakışan modülleri birleştir") gereği
 * ikinci bir `.ics` yazıcısı yazmak yerine RFC katmanı buraya alındı.
 *
 * Kaçışlama ve satır katlama kuralları RFC'nin kuralları — etkinliğe
 * ya da gece planına ait değil. İki kopya olsaydı biri düzeltilir,
 * öteki sessizce bozuk kalırdı; üstelik hata takvim uygulamasında
 * görünürdü, bizde değil.
 *
 * `reminders.ts` kendi `buildIcs`ini KORUYOR: iki saatlik varsayılan
 * bitiş, `UID` deseni ve VALARM yokluğu ETKİNLİĞE ait kararlar, RFC'ye
 * değil. Orası artık bu modülü çağırıyor.
 */

/** RFC 5545 §3.3.11: ters bölü, noktalı virgül, virgül ve satır sonu. */
export function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * RFC 5545 §3.1: satırlar 75 OKTETİ geçemez, taşan kısım bir boşlukla
 * katlanır. Ölçü karakter değil oktet — "Gözlem Şenliği"nin Türkçe
 * harfleri UTF-8'de iki oktet ve karakter sayarak katlayan bir kod
 * sınırı sessizce aşardı.
 */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  /* Karakter karakter ilerliyoruz: bir karakteri iki satıra bölmek
     UTF-8 dizisini ortadan keserdi. */
  for (const char of line) {
    const size = encoder.encode(char).length;
    /* Devam satırları baştaki boşlukla birlikte 75 okteti geçmemeli. */
    const limit = parts.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);

  return parts.join('\r\n ');
}

/** `20260815T203000Z` — UTC biçimi, VTIMEZONE bloğuna gerek bırakmıyor. */
export function icsStamp(value: Date): string {
  return `${value.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}

export interface IcsEvent {
  /** Kararlı kimlik. Aynı dosya ikinci kez açılınca takvim kaydı
   *  çoğaltmak yerine günceller. */
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  location?: string;
  url?: string;
}

export interface CalendarOptions {
  /** `PRODID`in orta parçası — hangi modülün ürettiği belli olsun. */
  product: string;
  /** `DTSTAMP`; testte sabitlenebilsin diye dışarıdan verilebiliyor. */
  now?: Date;
}

/**
 * Bir ya da daha çok VEVENT içeren takvim metni üretir.
 *
 * ÇOKLU VEVENT DESTEKLENİYOR — gece planı için gerekli: bir gecede beş
 * hedef, beş ayrı takvim kaydı. Tek etkinlik yazan bir imza, planlayıcı
 * için beş ayrı dosya indirtirdi.
 *
 * VALARM YOK. Takvim dosyasına alarm gömseydik, hatırlatmasını sitede
 * kuran kullanıcı aynı an için İKİ bildirim alırdı. Hatırlatma yönetimi
 * sitenin işi; takvim dosyasının işi kaydı takvime koymak.
 */
export function buildCalendar(
  events: IcsEvent[],
  options: CalendarOptions
): string {
  const stamp = icsStamp(options.now ?? new Date());

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//AstroHub//${options.product}//TR`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events.flatMap((event) => [
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsStamp(event.start)}`,
      `DTEND:${icsStamp(event.end)}`,
      `SUMMARY:${escapeIcs(event.summary)}`,
      ...(event.description
        ? [`DESCRIPTION:${escapeIcs(event.description)}`]
        : []),
      ...(event.location ? [`LOCATION:${escapeIcs(event.location)}`] : []),
      ...(event.url ? [`URL:${escapeIcs(event.url)}`] : []),
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
  ];

  /* RFC 5545 satır sonu CRLF; sonda da bir tane olmalı. */
  return lines.map(foldIcsLine).join('\r\n') + '\r\n';
}

/**
 * Metni tarayıcıya indirtir.
 *
 * `Blob` + `URL.createObjectURL`: veri zaten istemcide, sunucuya gidip
 * geri getirmenin anlamı yok. `revokeObjectURL` çağrılıyor — çağrılmazsa
 * nesne URL'si sekme kapanana kadar bellekte kalır.
 */
export function downloadText(
  fileName: string,
  content: string,
  mime = 'text/calendar;charset=utf-8'
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

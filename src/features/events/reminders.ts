import { wallToInstant, zonedParts } from '@/lib/zone';
import type { AstroEvent } from './types';
import { buildCalendar } from '@/lib/ics';

/**
 * HATIRLATMA ANI VE TAKVİM DOSYASI (§9).
 *
 * Bileşenden ayrı: buradaki iki kural da — "etkinlik günü sabah 09:00
 * hangi ana denk gelir" ve "takvim dosyası nasıl kaçışlanır" — doğrudan
 * test edilebilir olmalı, bir React ağacının içinden değil.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * BU DOSYA VERİTABANININ KOPYASI DEĞİL, ÖN GÖRÜNÜMÜ
 *
 * Kuralın tek sahibi `app.reminder_due_at` ve `app.reminders_before_write`
 * (0049). Buradaki hesap, kullanıcıya HANGİ SEÇENEĞİN SEÇİLEBİLİR
 * olduğunu söylemek için var: yarın olan bir etkinlikte "1 hafta önce"
 * seçeneğini tıklanabilir gösterip sunucudan "bu hatırlatmanın zamanı
 * geçmiş" hatası aldırmak, kullanıcıyı boşuna gezdirmek olurdu.
 *
 * Sunucu yine de son sözü söylüyor: istemcinin saati yanlış olabilir,
 * kullanıcı sayfayı açık bırakıp bir hafta sonra tıklayabilir.
 * ═══════════════════════════════════════════════════════════════════════
 */

export type ReminderKind = 'hafta' | 'gun' | 'etkinlik_gunu' | 'ozel';

export const reminderLabels: Record<ReminderKind, string> = {
  hafta: '1 hafta önce',
  gun: '1 gün önce',
  etkinlik_gunu: 'Etkinlik günü sabahı',
  ozel: 'Kendi seçtiğim zaman',
};

/** Etkinlik takviminin referans dilimi — site Türkiye'ye ait (0049). */
const ZONE = 'Europe/Istanbul';

/** Etkinliğin YEREL günündeki sabah 09:00 — `app.reminder_due_at` ile aynı. */
export function eventMorning(startsAt: string | Date): Date {
  const local = zonedParts(new Date(startsAt), ZONE);
  return wallToInstant(
    { year: local.year, month: local.month, day: local.day, hour: 9 },
    ZONE
  );
}

/** `app.reminder_due_at` karşılığı. `ozel` için özel an aynen dönüyor. */
export function reminderDueAt(
  startsAt: string | Date,
  kind: ReminderKind,
  customAt?: string | Date | null
): Date | null {
  const start = new Date(startsAt).getTime();
  if (Number.isNaN(start)) return null;

  switch (kind) {
    case 'hafta':
      return new Date(start - 7 * 24 * 60 * 60 * 1000);
    case 'gun':
      return new Date(start - 24 * 60 * 60 * 1000);
    case 'etkinlik_gunu':
      return eventMorning(startsAt);
    case 'ozel': {
      if (!customAt) return null;
      const custom = new Date(customAt);
      return Number.isNaN(custom.getTime()) ? null : custom;
    }
  }
}

export type ReminderAvailability =
  | { ok: true; dueAt: Date }
  | { ok: false; reason: string };

/**
 * Bir seçeneğin kurulabilir olup olmadığı — `app.reminders_before_write`
 * üç kuralının aynısı: an hesaplanabilmeli, geçmişte olmamalı ve
 * etkinlikten önce olmalı.
 *
 * Üçüncü kural sabah 09:00 seçeneğini erken etkinliklerde eliyor: 06:00'da
 * başlayan bir gözlem için "etkinlik günü sabahı" hatırlatması etkinlik
 * başladıktan sonra çalardı.
 */
export function reminderAvailability(
  startsAt: string | Date,
  kind: ReminderKind,
  customAt?: string | Date | null,
  now: Date = new Date()
): ReminderAvailability {
  const dueAt = reminderDueAt(startsAt, kind, customAt);
  if (!dueAt) {
    return { ok: false, reason: 'Zaman seçilmedi.' };
  }

  if (dueAt.getTime() <= now.getTime()) {
    return { ok: false, reason: 'Bu zaman geçti.' };
  }

  if (dueAt.getTime() >= new Date(startsAt).getTime()) {
    return { ok: false, reason: 'Etkinlikten sonraya kurulamaz.' };
  }

  return { ok: true, dueAt };
}

/* ══════════════════════════════════════════════════════════════════════
 * TAKVİME EKLE (§9)
 *
 * İNDİRİLEN DOSYA, BAĞLANTI DEĞİL. "Google Takvime ekle" bağlantısı
 * kullanıcıyı üçüncü tarafa yönlendirir ve etkinliğin adını, yerini,
 * saatini o servise taşır. `.ics` dosyası her takvim uygulamasında
 * (Apple, Outlook, Google, Thunderbird) açılıyor ve kimseye bir şey
 * söylemiyor.
 *
 * VALARM YOK. Takvim dosyasına bir alarm gömseydik, hatırlatmasını
 * sitede kuran kullanıcı aynı an için İKİ bildirim alırdı. Hatırlatma
 * yönetimi sitenin işi; takvim dosyasının işi etkinliği takvime koymak.
 * ══════════════════════════════════════════════════════════════════════ */

export interface IcsOptions {
  /** Etkinliğin site adresi — takvim kaydından geri dönülebilsin. */
  url?: string;
  /** `DTSTAMP`; testte sabitlenebilsin diye dışarıdan verilebiliyor. */
  now?: Date;
}

/**
 * Etkinlikten `.ics` metni üretir.
 *
 * BİTİŞ SAATİ YOKSA İKİ SAAT VARSAYILIYOR. Alternatif `DTEND`i hiç
 * yazmamaktı; o zaman takvim uygulamaları etkinliği "bütün gün" ya da
 * "anlık" gösteriyor ve ikisi de yanlış. İki saat, sitedeki etkinlik
 * türlerinin (gözlem, atölye, konferans) alt sınırına yakın dürüst bir
 * varsayım — ve kullanıcı takvimde düzeltebilir.
 */
export function buildIcs(event: AstroEvent, options: IcsOptions = {}): string {
  const start = new Date(event.startsAt);
  const end = event.endsAt
    ? new Date(event.endsAt)
    : new Date(start.getTime() + 2 * 60 * 60 * 1000);

  /* RFC katmanı `lib/ics`e taşındı (§14.1): kaçışlama ve 75 oktetlik
     satır katlama etkinliğe değil STANDARDA ait kurallar ve planlayıcı
     da aynılarına ihtiyaç duyuyordu. Buradaki üç karar ETKİNLİĞE ait ve
     burada kalıyor: iki saatlik varsayılan bitiş, slug'a bağlı `UID`
     ve mekân + şehir birleşimi. */
  return buildCalendar(
    [
      {
        /* Kimlik slug'a bağlı: aynı etkinlik ikinci kez indirilince
           takvim yeni bir kayıt açmak yerine mevcut olanı güncelliyor. */
        uid: `${event.slug}@astrohub`,
        start,
        end,
        summary: event.title,
        description: event.description,
        location: [event.venue, event.city].filter(Boolean).join(', '),
        ...(options.url ? { url: options.url } : {}),
      },
    ],
    { product: 'Etkinlik', ...(options.now ? { now: options.now } : {}) }
  );
}

/** Dosya adı — Türkçe harfler ve boşluklar indirmede sorun çıkarıyor. */
export function icsFileName(event: AstroEvent): string {
  return `${event.slug || 'etkinlik'}.ics`;
}

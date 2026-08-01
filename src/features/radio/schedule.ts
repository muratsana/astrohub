import { wallToInstant, zonedParts } from '@/lib/zone';

/**
 * PROGRAM TAKVİMİ (§10.2 "program takvimi").
 *
 * Veritabanı kuralı saklıyor, an değil (`program_slots`, 0051): "her
 * salı 21:00". Bu dosya kuralı bir tarih aralığındaki gerçek anlara
 * açıyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN OKUMA SIRASINDA HESAPLANIYOR
 *
 * Alternatif, iki yıllık yayınları satır satır veritabanına yazmaktı.
 * O zaman program saati değiştiğinde yüzlerce satır güncellenecekti ve
 * biri kaçtığında takvim yalan söyleyecekti. Hesap ucuz: bir haftalık
 * takvim, birkaç düzine slot üstünde bir döngü.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SAAT YEREL, "21:00" HER ZAMAN 21:00
 *
 * Radyo takvimi yerel saatte ilan edilir. `timestamptz` saklasaydık
 * saat dilimi kayması programı 20:00'a ya da 22:00'a taşırdı. Slot
 * yerel saati tutuyor, buradaki hesap onu `Europe/Istanbul` üstünden
 * ana çeviriyor.
 */

const ZONE = 'Europe/Istanbul';

export interface ProgramSlot {
  id: string;
  programId: string;
  /** ISO hafta günü 1–7; tek seferlik yayında boş. */
  weekday: number | null;
  /** `HH:MM` ya da `HH:MM:SS` — haftalık tekrarda dolu. */
  localTime: string | null;
  /** Tek seferlik yayın anı (ISO); haftalık tekrarda boş. */
  airsAt: string | null;
  durationMin: number;
  startsOn: string | null;
  endsOn: string | null;
  isRepeat: boolean;
}

export interface Occurrence {
  slotId: string;
  programId: string;
  start: Date;
  end: Date;
  isRepeat: boolean;
}

/** `21:00` / `21:00:00` → { hour, minute }. Bozuksa null. */
function parseLocalTime(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

/** `2026-08-01` → yerel gün alanları. Bozuksa null. */
function parseDate(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

/**
 * Sezon aralığı kontrolü — program yaz arası verdiyse takvimde
 * görünmemeli.
 *
 * Karşılaştırma YEREL GÜN üstünden: `starts_on` bir tarih, bir an değil.
 * `Date` nesnelerini karşılaştırsaydık, 00:00 UTC ile yerel gün sınırı
 * arasındaki üç saat, sezonun ilk gününü kaçırırdı.
 */
function inSeason(slot: ProgramSlot, local: { year: number; month: number; day: number }): boolean {
  const asNumber = (d: { year: number; month: number; day: number }) =>
    d.year * 10000 + d.month * 100 + d.day;
  const gun = asNumber(local);

  if (slot.startsOn) {
    const bas = parseDate(slot.startsOn);
    if (bas && gun < asNumber(bas)) return false;
  }
  if (slot.endsOn) {
    const son = parseDate(slot.endsOn);
    if (son && gun > asNumber(son)) return false;
  }
  return true;
}

/**
 * Verilen aralıktaki yayınları üretir, başlangıca göre sıralı.
 *
 * ARALIK YARI AÇIK: `[from, to)`. Kapalı olsaydı ardışık iki hafta
 * çağrıldığında sınırdaki yayın iki kez görünürdü.
 */
export function occurrences(
  slots: ProgramSlot[],
  from: Date,
  to: Date
): Occurrence[] {
  const sonuc: Occurrence[] = [];

  for (const slot of slots) {
    /* Tek seferlik yayın: an zaten belli, yalnızca aralığa düşüyor mu. */
    if (slot.airsAt) {
      const start = new Date(slot.airsAt);
      if (Number.isNaN(start.getTime())) continue;
      if (start < from || start >= to) continue;
      sonuc.push({
        slotId: slot.id,
        programId: slot.programId,
        start,
        end: new Date(start.getTime() + slot.durationMin * 60_000),
        isRepeat: slot.isRepeat,
      });
      continue;
    }

    if (slot.weekday === null || !slot.localTime) continue;
    const saat = parseLocalTime(slot.localTime);
    if (!saat) continue;

    /* Yerel günler üstünde yürüyoruz, UTC günleri üstünde değil:
       "salı" yerel bir kavram ve gece yarısına yakın yayınlarda ikisi
       ayrışıyor. Bir gün önceden başlıyoruz çünkü `from` anındaki
       yerel gün, UTC'de bir önceki gün olabilir. */
    const ilk = zonedParts(new Date(from.getTime() - 24 * 3600_000), ZONE);
    const gunSayisi =
      Math.ceil((to.getTime() - from.getTime()) / 86_400_000) + 2;

    for (let i = 0; i < gunSayisi; i++) {
      /* Yerel takvimde i gün ileri: `Date.UTC` ile gün taşmasını
         (ay/yıl sonu) motora bırakıyoruz. */
      const yürüyen = new Date(
        Date.UTC(ilk.year, ilk.month - 1, ilk.day + i)
      );
      const gun = {
        year: yürüyen.getUTCFullYear(),
        month: yürüyen.getUTCMonth() + 1,
        day: yürüyen.getUTCDate(),
      };
      const isoWeekday = yürüyen.getUTCDay() === 0 ? 7 : yürüyen.getUTCDay();

      if (isoWeekday !== slot.weekday) continue;
      if (!inSeason(slot, gun)) continue;

      const start = wallToInstant({ ...gun, hour: saat.hour, minute: saat.minute }, ZONE);
      if (start < from || start >= to) continue;

      sonuc.push({
        slotId: slot.id,
        programId: slot.programId,
        start,
        end: new Date(start.getTime() + slot.durationMin * 60_000),
        isRepeat: slot.isRepeat,
      });
    }
  }

  return sonuc.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * ŞU AN YAYINDA OLAN — takvime göre.
 *
 * BU "CANLI" DEMEK DEĞİL. Takvim "bu saatte şu program olmalı" diyor;
 * yayının gerçekten ayakta olup olmadığı ayrı bir ölçüm
 * (`app.station_is_live`, 0051). İkisini karıştırmak, sunucu düştüğünde
 * sitenin "Gece Gökyüzü canlı yayında" yazması demekti — §10.2'nin
 * yasakladığı şeyin ta kendisi.
 */
export function currentOccurrence(
  slots: ProgramSlot[],
  now: Date = new Date()
): Occurrence | null {
  /* Bir gün geriden bakıyoruz: gece yarısını aşan uzun bir program hâlâ
     sürüyor olabilir. */
  const list = occurrences(
    slots,
    new Date(now.getTime() - 24 * 3600_000),
    new Date(now.getTime() + 60_000)
  );
  const suan = list.filter((o) => o.start <= now && o.end > now);
  /* Çakışma varsa en SON başlayan kazanıyor: iki program aynı saate
     konduysa yayında olan sonuncusudur. */
  return suan.length ? suan[suan.length - 1] : null;
}

/** Sıradaki yayın (§10.2 "sonraki program"). */
export function nextOccurrence(
  slots: ProgramSlot[],
  now: Date = new Date()
): Occurrence | null {
  /* İki hafta ileri bakmak yeterli: haftalık bir programın bir sonraki
     yayını en fazla yedi gün sonra. İki hafta, sezonu bu hafta biten
     bir programın ardından gelen başka bir programı da yakalıyor. */
  const list = occurrences(
    slots,
    now,
    new Date(now.getTime() + 14 * 86_400_000)
  );
  return list.find((o) => o.start > now) ?? null;
}

/** Haftanın ISO adları — takvim başlıkları için. */
export const weekdayNames = [
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
  'Pazar',
] as const;

export function weekdayName(isoWeekday: number): string {
  return weekdayNames[isoWeekday - 1] ?? '';
}

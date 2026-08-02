import { FORECAST_DAYS } from '@/features/weather/openMeteo';

/**
 * ═══════════════════════════════════════════════════════════════════════
 * GECE SEÇİMİ — offset ile tarih arasındaki çeviri (Faz 3.4)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Panel içeride "bugünden kaç gün ileri" (offset) ile çalışıyor; kullanıcı
 * ve URL ise TARİH konuşuyor. Çeviri saf bir modülde çünkü iki tuzağı var
 * ve ikisi de bileşenin içinde gözden kaçar.
 *
 * ─────────────────────────────────────────────────────────────────────
 * TUZAK 1 — PAYLAŞILAN BAĞLANTI YARIN BAŞKA GECEYİ GÖSTERİR
 *
 * URL'ye offset yazmak (`?gun=3`) kolay olurdu ama bağlantıyı alan kişi
 * ertesi gün açtığında BAŞKA bir geceyi görür. Paylaşılan şey "üç gün
 * sonrası" değil, belirli bir gece. Bu yüzden URL'de tarih var
 * (`?gece=2026-08-05`) ve offset ondan yeniden hesaplanıyor.
 *
 * ─────────────────────────────────────────────────────────────────────
 * TUZAK 2 — GÜN FARKI SAAT FARKI DEĞİLDİR
 *
 * İki tarih arasındaki farkı milisaniyeden bölmek yaz saati geçişlerinde
 * 23 ya da 25 saatlik günler yüzünden bir gün kayar. Fark, saat bileşeni
 * atılmış YEREL GÜN kimlikleri üzerinden alınıyor.
 */

/**
 * Panelin izin verdiği en ileri gece.
 *
 * Hava adaptörü 16 güne kadar veri çekebiliyor, ama ana sayfadaki bu modül
 * bir haftalık karar aracı. Daha uzun ufuk görselde "tahmin" kesinliği
 * varmış gibi okunuyor; seçim yüzeyi bu yüzden 7 günle sınırlı.
 */
export const NIGHT_PICKER_DAYS = Math.min(FORECAST_DAYS, 7);
export const MAX_OFFSET = NIGHT_PICKER_DAYS - 1;

/** `YYYY-MM-DD` — yerel takvim gününü zaman diliminden bağımsız kimlikler. */
export function toISODate(d: Date): string {
  const ay = String(d.getMonth() + 1).padStart(2, '0');
  const gun = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${ay}-${gun}`;
}

/** `YYYY-MM-DD` → yerel gece yarısı. Geçersizse `null`. */
export function fromISODate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [, y, ay, gun] = m;
  const d = new Date(Number(y), Number(ay) - 1, Number(gun));
  /*
   * `new Date(2026, 1, 31)` sessizce 3 Mart'a taşar. Geri çevirip
   * karşılaştırmak, taşan tarihi yakalayan tek güvenilir yol.
   */
  return toISODate(d) === `${y}-${ay}-${gun}` ? d : null;
}

/** Saat bileşeni atılmış kopya — gün farkı hesabı için. */
function gunBasi(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * İki tarih arasındaki TAM gün farkı.
 *
 * Milisaniye farkını 86 400 000'e bölmek yaz saati geçişlerinde bir gün
 * kaydırır (23 ve 25 saatlik günler). Gün başlarına indirip yuvarlamak
 * o kaymayı kapatıyor.
 */
export function gunFarki(from: Date, to: Date): number {
  const a = gunBasi(from).getTime();
  const b = gunBasi(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Offset'i izin verilen aralığa çeker. */
export function clampOffset(offset: number): number {
  if (!Number.isFinite(offset)) return 0;
  return Math.min(MAX_OFFSET, Math.max(0, Math.trunc(offset)));
}

/** Offset → o gecenin tarihi. */
export function offsetToDate(offset: number, today: Date): Date {
  const d = gunBasi(today);
  d.setDate(d.getDate() + clampOffset(offset));
  return d;
}

/**
 * Tarih → offset. Aralık dışındaki tarih `null` döner.
 *
 * `null` bilinçli: geçmiş ya da ufkun ötesindeki bir tarihi sessizce
 * en yakın güne KIRPMAK, kullanıcıya istemediği bir geceyi istediği
 * gece diye gösterirdi. Arayüz `null` görünce bağlantıyı yok sayıp
 * bu geceye düşüyor.
 */
export function dateToOffset(date: Date, today: Date): number | null {
  const fark = gunFarki(today, date);
  return fark < 0 || fark > MAX_OFFSET ? null : fark;
}

/** `<input type="date">` için sınırlar. */
export function dateBounds(today: Date): { min: string; max: string } {
  return { min: toISODate(today), max: toISODate(offsetToDate(MAX_OFFSET, today)) };
}

/**
 * URL parametresinden offset okur.
 *
 * Bozuk, geçmiş ya da ufkun ötesindeki değer sessizce 0'a düşer —
 * paylaşılan bir bağlantının eskimesi hata ekranı göstermeyi hak
 * etmiyor, ama yanlış geceyi göstermeyi de hak etmiyor.
 */
export function offsetFromParam(param: string | null, today: Date): number {
  if (!param) return 0;
  const d = fromISODate(param);
  if (!d) return 0;
  return dateToOffset(d, today) ?? 0;
}

/**
 * Tek üyelik entitlement hesaplaması (§4.1, §4.3). Astrohub'da tek ücretli
 * paket vardır; aylık/yıllık aynı hakları verir. Entitlement sunucu tarafında
 * hesaplanır (§14.5) — bu modül o hesabın referans kurallarıdır.
 */

export type MembershipStatus =
  | 'active' // ödeme geçerli
  | 'grace' // süresi doldu, ödemesiz süre içinde (§4.3)
  | 'expired' // ödemesiz süre de bitti
  | 'none'; // hiç üyelik yok

/** Ödemesiz (grace) süre gün sayısı (§4.3). */
export const GRACE_PERIOD_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface MembershipState {
  /** Üyelik hiç oluşturulmadıysa null. */
  currentPeriodEnd: Date | null;
  /** İptal edilmiş ama dönem sonuna kadar aktif kalabilir. */
  canceled?: boolean;
}

/**
 * Verilen ana göre üyelik durumunu belirler.
 * @param now değerlendirme anı (test edilebilirlik için parametre).
 */
export function getMembershipStatus(
  state: MembershipState,
  now: Date
): MembershipStatus {
  if (!state.currentPeriodEnd) return 'none';

  const end = state.currentPeriodEnd.getTime();
  const t = now.getTime();

  if (t <= end) return 'active';

  const graceEnd = end + GRACE_PERIOD_DAYS * DAY_MS;
  if (t <= graceEnd) return 'grace';

  return 'expired';
}

/** Kullanıcı yeni içerik yükleyip yayımlayabilir mi? (§4.3: bitince durur) */
export function canUploadNewContent(status: MembershipStatus): boolean {
  // Aktif üyelik gerekir; grace süresinde mevcut içerik yayında kalır ama
  // yeni yükleme/ilan durdurulur (§4.3 madde 2).
  return status === 'active';
}

/** Mevcut içerik görünür kalmalı mı? */
export function contentStaysVisible(status: MembershipStatus): boolean {
  // Grace süresinde içerik yayında kalır; expired'da arşivlenir/sınırlandırılır
  // (silinmez — §4.3 madde 5).
  return status === 'active' || status === 'grace';
}

/** Grace süresinin bitişine kalan gün (uyarı bildirimleri için). */
export function daysUntilGraceEnds(
  state: MembershipState,
  now: Date
): number | null {
  if (!state.currentPeriodEnd) return null;
  const graceEnd =
    state.currentPeriodEnd.getTime() + GRACE_PERIOD_DAYS * DAY_MS;
  const diff = graceEnd - now.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / DAY_MS);
}

/**
 * Üyelik kota kuralları (§4.2). İş kuralları React'ten ayrı domain katmanında
 * tutulur (§12.5). Bu fonksiyonlar sunucu tarafı doğrulamanın referansıdır;
 * gerçek zorlama ayrıca API + DB fonksiyonunda yapılır (§4.2 çift doğrulama).
 */

/** Tek üyelik paketinde aktif yayımlanmış fotoğraf üst sınırı (§4.1). */
export const MAX_ACTIVE_PHOTOS = 50;

/** Geçici taslak fotoğraf üst sınırı (§4.1). */
export const MAX_DRAFT_PHOTOS = 10;

export interface QuotaState {
  activePublished: number;
  drafts: number;
}

/** Yeni bir fotoğraf yayımlanabilir mi? Aktif kota sınırı kontrolü. */
export function canPublishPhoto(state: QuotaState): boolean {
  return state.activePublished < MAX_ACTIVE_PHOTOS;
}

/** Yeni bir taslak oluşturulabilir mi? */
export function canCreateDraft(state: QuotaState): boolean {
  return state.drafts < MAX_DRAFT_PHOTOS;
}

/** Kalan aktif fotoğraf hakkı (negatif olamaz). */
export function remainingPhotoQuota(state: QuotaState): number {
  return Math.max(0, MAX_ACTIVE_PHOTOS - state.activePublished);
}

/** Panel için "34 / 50" biçiminde kota etiketi (§7.16). */
export function formatQuotaLabel(activePublished: number): string {
  return `${activePublished} / ${MAX_ACTIVE_PHOTOS}`;
}

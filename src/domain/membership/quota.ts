/**
 * ÜYELİK KOTA KURALLARI (§4.2).
 *
 * İş kuralları React'ten ayrı alan katmanında tutulur (§12.5). Bu
 * fonksiyonlar sunucu tarafı doğrulamanın **referansıdır**; gerçek zorlama
 * ayrıca veritabanı tetikleyicisinde yapılır (§4.2 çift doğrulama). İkisi
 * ayrışırsa kazanan veritabanıdır — istemci yalnızca hızlı geri bildirim
 * verir.
 *
 * İKİ KADEME
 *   standart → 3 aktif yayımlanmış fotoğraf
 *   premium  → 50
 *
 * Küçük sınır bir kısıtlama değil, bir seçim zorunluluğu: üç fotoğrafla
 * gelen kullanıcı en iyi üçünü seçer ve galeri, herkesin arşivini
 * boşalttığı bir yığına dönmez. Premium'un 50 olması da sonsuz değil;
 * depolama ve moderasyon maliyeti gerçek.
 */

export type MembershipTier = 'standart' | 'premium';

/** Kademeye göre aktif yayımlanmış fotoğraf üst sınırı. */
export const PHOTO_LIMITS: Record<MembershipTier, number> = {
  standart: 3,
  premium: 50,
};

/** Premium sınırı — eski adıyla anılan yerler için korunuyor. */
export const MAX_ACTIVE_PHOTOS = PHOTO_LIMITS.premium;

/** Geçici taslak fotoğraf üst sınırı (§4.1). Kademeden bağımsız. */
export const MAX_DRAFT_PHOTOS = 10;

/**
 * Tek dosya için üst sınır: 50 MB.
 *
 * Bu sınırın altındaki büyük dosyalar reddedilmez, **küçültülür**: 16-bit
 * TIFF ya da işlenmemiş bir yığın çıktısı kolayca 200 MB olur ve
 * kullanıcıya "dosyanı küçült" demek, bizim yapabileceğimiz bir işi ona
 * elle yaptırmak olurdu. Sınır yine de var, çünkü tarayıcıda küçültme
 * dosyanın belleğe sığmasını gerektiriyor.
 */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** Bunun altındaki dosyalar olduğu gibi yüklenir; üstü optimize edilir. */
export const DIRECT_UPLOAD_BYTES = 8 * 1024 * 1024;

export interface QuotaState {
  activePublished: number;
  drafts: number;
  /** Verilmezse standart kabul edilir — en kısıtlı olan varsayılan olmalı. */
  tier?: MembershipTier;
}

function limitOf(state: QuotaState): number {
  return PHOTO_LIMITS[state.tier ?? 'standart'];
}

/** Yeni bir fotoğraf yayımlanabilir mi? */
export function canPublishPhoto(state: QuotaState): boolean {
  return state.activePublished < limitOf(state);
}

/** Yeni bir taslak oluşturulabilir mi? */
export function canCreateDraft(state: QuotaState): boolean {
  return state.drafts < MAX_DRAFT_PHOTOS;
}

/** Kalan aktif fotoğraf hakkı (negatif olamaz). */
export function remainingPhotoQuota(state: QuotaState): number {
  return Math.max(0, limitOf(state) - state.activePublished);
}

/** Panel için "2 / 3" biçiminde kota etiketi (§7.16). */
export function formatQuotaLabel(
  activePublished: number,
  tier: MembershipTier = 'standart'
): string {
  return `${activePublished} / ${PHOTO_LIMITS[tier]}`;
}

/**
 * Kota dolduğunda gösterilecek cümle.
 *
 * Standart kullanıcıya yükseltmeden söz ediyoruz çünkü onun bir çıkışı
 * var; premium kullanıcıya söylenecek tek doğru şey arşivlemesi. Aynı
 * cümleyi ikisine göstermek, birine olmayan bir yol önermek olurdu.
 */
export function quotaFullMessage(tier: MembershipTier = 'standart'): string {
  return tier === 'premium'
    ? `Aktif fotoğraf kotanız dolu (${PHOTO_LIMITS.premium}). Yeni bir fotoğraf yayımlamak için mevcut bir kaydı arşivleyin — arşivlenen kayıt silinmez, yalnızca galeriden çıkar.`
    : `Standart üyelikte aynı anda ${PHOTO_LIMITS.standart} fotoğraf yayımda kalabilir; premium üyelikte bu sınır ${PHOTO_LIMITS.premium}. Mevcut bir kaydı arşivleyip yerine yenisini yayımlayabilirsiniz.`;
}

/**
 * Dosya boyutu kararı.
 *
 * Üç sonuç var ve arayüzün üçünü ayrı anlatması gerekiyor: kabul,
 * küçülterek kabul, ret. Tek bir "çok büyük" mesajı, küçültülebilecek bir
 * dosyayı reddedilmiş gibi gösterirdi.
 */
export type UploadSizeVerdict =
  | { kind: 'ok' }
  | { kind: 'optimize'; reason: string }
  | { kind: 'reject'; reason: string };

export function checkUploadSize(bytes: number): UploadSizeVerdict {
  if (bytes <= 0) {
    return { kind: 'reject', reason: 'Dosya boş görünüyor.' };
  }
  if (bytes > MAX_UPLOAD_BYTES) {
    return {
      kind: 'reject',
      reason: `Dosya ${formatBytes(bytes)} — üst sınır ${formatBytes(MAX_UPLOAD_BYTES)}. Bu boyut tarayıcıda küçültülemiyor; kaydı dışa aktarırken çözünürlüğü düşürün.`,
    };
  }
  if (bytes > DIRECT_UPLOAD_BYTES) {
    return {
      kind: 'optimize',
      reason: `Dosya ${formatBytes(bytes)}; yükleme sırasında otomatik küçültülecek. Orijinal arşivde saklanır, galeride küçültülmüş kopya gösterilir.`,
    };
  }
  return { kind: 'ok' };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
}

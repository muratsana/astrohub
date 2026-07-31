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
 *   standart → 5 aktif yayımlanmış fotoğraf
 *   premium  → 30
 *
 * SAYILAR NEDEN BUNLAR. Kota bir "cömertlik" ayarı değil, depolama
 * bütçesinin doğrudan kendisi: her fotoğraf en fazla 10 MB arşiv +
 * gösterim kopyaları tuttuğuna göre (`MAX_STORED_BYTES`) standart üye
 * ~58 MB, premium üye ~350 MB yer kaplıyor. Bu tavanlar olmadan tek bir
 * kullanıcı 100 MB'lık ham TIFF'lerle bütçenin tamamını yiyebilirdi —
 * eski sınırlar (3/50) sayıyı kısıtlıyordu ama BOYUTU serbest bırakmıştı
 * ve asıl maliyet boyuttaydı.
 *
 * Küçük sınır ayrıca bir seçim zorunluluğu: beş fotoğrafla gelen kullanıcı
 * en iyi beşini seçer ve galeri, herkesin arşivini boşalttığı bir yığına
 * dönmez.
 */

export type MembershipTier = 'standart' | 'premium';

/** Kademeye göre aktif yayımlanmış fotoğraf üst sınırı. */
export const PHOTO_LIMITS: Record<MembershipTier, number> = {
  standart: 5,
  premium: 30,
};

/** Premium sınırı — eski adıyla anılan yerler için korunuyor. */
export const MAX_ACTIVE_PHOTOS = PHOTO_LIMITS.premium;

/** Geçici taslak fotoğraf üst sınırı (§4.1). Kademeden bağımsız. */
export const MAX_DRAFT_PHOTOS = 10;

/**
 * Tek fotoğraf için saklanan en büyük dosya: 10 MB.
 *
 * Bu bir RET eşiği değil, bir HEDEF. Kullanıcı 40 MB'lık bir kare
 * seçtiğinde ona "dosyanı küçült" demiyoruz — bizim yapabileceğimiz bir
 * işi ona elle yaptırmak olurdu; yükleme sırasında bu bütçeye kadar
 * yeniden kodluyoruz (`encodeWithinBudget`).
 *
 * Aynı sayı `photo-originals` bucket'ında `file_size_limit` olarak da
 * duruyor. İstemci tarafı sınır yalnızca bir nezaket: tarayıcıyı atlayan
 * biri doğrudan depolama API'sine yükleyebilir. Asıl tavan sunucudaki.
 */
export const MAX_STORED_BYTES = 10 * 1024 * 1024;

/**
 * Kullanıcının seçebileceği en büyük dosya: 50 MB.
 *
 * `MAX_STORED_BYTES` ile karıştırılmamalı — bu, işleyebildiğimiz girdinin
 * sınırı, sakladığımızın değil. Tarayıcıda küçültme dosyanın çözülüp
 * belleğe sığmasını gerektiriyor; 50 MB'lık bir JPEG zaten çözüldüğünde
 * yüzlerce megabayt tutuyor. Üstündeki dosya reddediliyor çünkü
 * küçültemediğimiz bir dosyayı "optimize edeceğiz" diye kabul etmek,
 * sekmeyi kilitleyip kullanıcıyı hiçbir açıklama olmadan bırakmak olurdu.
 */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/**
 * Bunun altındaki dosyalar olduğu gibi saklanır; üstü optimize edilir.
 * Eşik doğrudan saklama tavanı: 10 MB'ın altındaki bir dosyayı yeniden
 * kodlamak, kazanç getirmeden kaliteyi düşürürdü.
 */
export const DIRECT_UPLOAD_BYTES = MAX_STORED_BYTES;

/**
 * Kademenin kabaca tuttuğu yer.
 *
 * Arşiv kopyası tavana dayandığında bile gösterim (~1.5 MB) ve küçük
 * resim (~150 KB) ekleniyor; kapasite planı bu toplamla yapılmalı, tek
 * başına 10 MB ile değil.
 */
export function tierStorageBudgetBytes(tier: MembershipTier): number {
  const perPhoto = MAX_STORED_BYTES + 1_600_000;
  return PHOTO_LIMITS[tier] * perPhoto;
}

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

/** Panel için "2 / 5" biçiminde kota etiketi (§7.16). */
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
      reason: `Dosya ${formatBytes(bytes)} — işleyebildiğimiz üst sınır ${formatBytes(MAX_UPLOAD_BYTES)}. Bu boyut tarayıcıda açılamıyor; kaydı dışa aktarırken çözünürlüğü düşürün.`,
    };
  }
  if (bytes > DIRECT_UPLOAD_BYTES) {
    return {
      kind: 'optimize',
      reason: `Dosya ${formatBytes(bytes)}; yükleme sırasında ${formatBytes(MAX_STORED_BYTES)} sınırına otomatik küçültülecek. Çözünürlük korunur, yalnızca sıkıştırma artar.`,
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

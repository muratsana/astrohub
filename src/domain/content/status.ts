/**
 * ORTAK İÇERİK DURUMU — istemci tarafı (FAZ 3).
 *
 * ══════════════════════════════════════════════════════════════════════
 * VERİTABANINDAKİ `app.content_status` ENUM'UNUN KOPYASI
 *
 * Altı içerik tablosu (astro_photos, events, listings, observing_sites,
 * clubs, content_entries) bu kümeyi paylaşıyor. Daha önce her tablonun
 * kendi enum'u ve her modülün kendi birleşim tipi vardı: `PhotoStatus`
 * 'published' derken `ListingStatus` 'active' diyordu ve ikisi aynı şeyi
 * anlatıyordu.
 *
 * Liste burada TAM olarak yazılı ve testle sabitlenmiş. Şemaya yeni bir
 * değer eklenirse buraya da eklenmeli — eklenmezse arayüz o durumu
 * "tanınmayan" sayar ve etiketi boş kalır; sessizce yanlış bir etiket
 * göstermekten iyidir.
 *
 * ══════════════════════════════════════════════════════════════════════
 * PUBLIC'TE GÖRÜNEN TEK DEĞER: 'yayinda'
 *
 * Kural veritabanında `app.icerik_gorunur()` fonksiyonunda ve RLS
 * politikalarında zorlanıyor. Buradaki `isPubliclyVisible` bir güvenlik
 * sınırı DEĞİL: sunucudan zaten dönmeyecek bir satır için arayüzün
 * "yayında" rozeti göstermemesini sağlıyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SATIŞ VE İPTAL BU KÜMEDE YOK
 *
 * `sold`, `reserved` ve `cancelled` bilerek dışarıda. Üçü de yayın
 * durumu değil, alan durumu ve kendi kolonlarında duruyorlar:
 * `listings.sale_state` ve `events.cancelled_at`. Satılmış bir ilan da
 * iptal edilmiş bir etkinlik de YAYINDA kalır — kullanıcının onları
 * görmesi gerekir.
 */

export const CONTENT_STATUSES = [
  'taslak',
  'incelemede',
  'onaylandi',
  'yayinda',
  'reddedildi',
  'arsivlendi',
  'yayindan_kaldirildi',
  'silindi',
] as const;

export type ContentStatus = (typeof CONTENT_STATUSES)[number];

/** Sahibine ve yönetime gösterilen etiketler. Public'te durum GÖSTERİLMEZ. */
export const contentStatusLabels: Record<ContentStatus, string> = {
  taslak: 'Taslak',
  incelemede: 'İncelemede',
  onaylandi: 'Onaylandı',
  yayinda: 'Yayında',
  reddedildi: 'Reddedildi',
  arsivlendi: 'Arşivde',
  yayindan_kaldirildi: 'Yayından kaldırıldı',
  silindi: 'Silindi',
};

/** Public'te görünen tek durum. Asıl sınır RLS'te. */
export const PUBLIC_CONTENT_STATUS: ContentStatus = 'yayinda';

export function isPubliclyVisible(status: ContentStatus | undefined): boolean {
  /* Durumu okunamamış kayıt görünür sayılıyor: tohum verilerde durum yok
     ve onların sayfası var. Yanlış tarafa düşmek ölü bağlantı değil,
     fazladan bir bağlantı üretiyor. */
  return status === undefined || status === PUBLIC_CONTENT_STATUS;
}

export function isContentStatus(value: unknown): value is ContentStatus {
  return (
    typeof value === 'string' &&
    (CONTENT_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * SATIŞ DURUMU — `listings.sale_state`.
 *
 * Yayın durumundan ayrı bir eksen: satılmış ilan yayında kalır ve
 * listede "Satıldı" rozetiyle görünür.
 */
export const SALE_STATES = ['satilik', 'rezerve', 'satildi'] as const;

export type SaleState = (typeof SALE_STATES)[number];

export const saleStateLabels: Record<SaleState, string> = {
  satilik: 'Satılık',
  rezerve: 'Rezerve',
  satildi: 'Satıldı',
};

export function isSaleState(value: unknown): value is SaleState {
  return (
    typeof value === 'string' && (SALE_STATES as readonly string[]).includes(value)
  );
}

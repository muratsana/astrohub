import type { AlertTone } from '@/components/ui/Alert';

/**
 * SİTE AYARLARI — ZİYARETÇİ TARAFI (§13.2).
 *
 * `home_modules` için yazdığımız hikâyenin aynısı, bu kez bayraklarda:
 * panelde yedi anahtar vardı, `set_feature_flag` çalışıyordu, değişiklik
 * geçmişine kayıt düşüyordu — ve anahtarların HİÇBİRİ kod tarafından
 * okunmuyordu. Yönetici "bakım modu"nu açıyor, site açık kalıyordu.
 *
 * 0058 bu dosyanın var olma sebebini kendi başlığında yazmış:
 *
 *   "Bir bayrağın kodda karşılığı yoksa açmak da kapatmak da hiçbir şey
 *    yapmaz; panelde duran ve hiçbir şey yapmayan anahtar, panelin
 *    tamamına olan güveni bozar."
 *
 * O cümle yazıldığı gün yedi bayrağın yedisi için de yanlıştı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * `FLAG_DEFAULTS` HEM VARSAYILAN HEM BEYAZ LİSTE
 *
 * Burada yazmayan bir anahtar okunmuyor: tabloya elle bir satır girilse
 * bile kodda karşılığı olmadığı için görmezden geliniyor. Tersi de
 * güvenli — tabloda olmayan anahtar buradaki varsayılana düşüyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * YEDEK YÖNÜ RASTGELE DEĞİL: "SİTE NORMAL ÇALIŞIYOR"
 *
 * İçerik bayrakları AÇIK, bakım ve duyuru KAPALI varsayılıyor. Bu, tohum
 * değerlerinin kopyası değil aynı kuralın sonucu: ağ düşerse ziyaretçi
 * sitenin OLAĞAN hâlini görmeli.
 *
 * Ters yönü düşünmek gerekçeyi netleştiriyor. `bakim_modu` okunamadığında
 * `true` sayılsaydı, tek bir başarısız istek bütün siteyi "bakımdayız"
 * ekranına düşürürdü. `radyo_acik` okunamadığında `false` sayılsaydı,
 * aynı istek çalışan radyoyu sessizce yok ederdi. İki hata da aynı
 * kaynaktan (ağ) çıkıp ürünü kapatırdı.
 */
export const FLAG_DEFAULTS = {
  bakim_modu: false,
  kayit_acik: true,
  yorumlar_acik: true,
  ilanlar_acik: true,
  radyo_acik: true,
  tv_acik: true,
  duyuru_acik: false,
} as const;

export type FlagKey = keyof typeof FLAG_DEFAULTS;
export type SiteFlags = Record<FlagKey, boolean>;

export const DEFAULT_FLAGS: SiteFlags = { ...FLAG_DEFAULTS };

const FLAG_KEYS = Object.keys(FLAG_DEFAULTS) as FlagKey[];

/** Anahtar kodda karşılığı olan bir bayrak mı? */
export function isFlagKey(key: unknown): key is FlagKey {
  return typeof key === 'string' && (FLAG_KEYS as string[]).includes(key);
}

/**
 * `feature_flags` satırlarını bayrak haritasına çevirir.
 *
 * Yalnızca `enabled === false` kapatır. Alan eksik ya da bozuk gelirse
 * varsayılan geçerli — bir okuma eksiğini ürün kararına çevirmiyoruz.
 */
export function toFlags(rows: unknown): SiteFlags {
  const flags: SiteFlags = { ...DEFAULT_FLAGS };
  if (!Array.isArray(rows)) return flags;

  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const { key, enabled } = row as { key?: unknown; enabled?: unknown };
    if (!isFlagKey(key)) continue;
    if (typeof enabled === 'boolean') flags[key] = enabled;
  }
  return flags;
}

/* ── Site duyurusu ───────────────────────────────────────────────────── */

export interface Announcement {
  metin: string;
  ton: AlertTone;
  /** ISO damga ya da `null`. Pencere YOKSA duyuru her zaman geçerli. */
  baslangic: string | null;
  bitis: string | null;
  kapatilabilir: boolean;
}

export const DEFAULT_ANNOUNCEMENT: Announcement = {
  metin: '',
  ton: 'info',
  baslangic: null,
  bitis: null,
  kapatilabilir: true,
};

const TONES: AlertTone[] = ['danger', 'warning', 'success', 'info'];

export function toAnnouncement(value: unknown): Announcement {
  if (!value || typeof value !== 'object') return DEFAULT_ANNOUNCEMENT;
  const v = value as Record<string, unknown>;
  return {
    metin: typeof v.metin === 'string' ? v.metin.trim() : '',
    ton: TONES.includes(v.ton as AlertTone) ? (v.ton as AlertTone) : 'info',
    baslangic: typeof v.baslangic === 'string' ? v.baslangic : null,
    bitis: typeof v.bitis === 'string' ? v.bitis : null,
    /* Yalnızca açıkça `false` kapatma düğmesini kaldırır: kapatılamayan
       bir bant, yanlışlıkla kalıcı hâle gelen bir bant demek. */
    kapatilabilir: v.kapatilabilir !== false,
  };
}

/**
 * Duyuru şu anda gösterilmeli mi?
 *
 * Üç koşul: bayrak açık, metin dolu, tarih penceresi içinde.
 *
 * PENCERE İSTEMCİ SAATİYLE ÖLÇÜLÜYOR — `home_modules`un aksine. Orada
 * pencereyi sunucu (`home_layout`) uyguluyor çünkü ileri tarihli bir
 * modülün ziyaretçiye SIZMAMASI gerekiyordu. Duyuru öyle değil: metni
 * zaten herkese açık bir satırda duruyor, saati kaydırmakla elde
 * edilebilecek bir şey yok. Karşılığında bir RPC'den ve her sayfa
 * açılışında bir ağ gidiş dönüşünden kurtuluyoruz.
 *
 * Bozuk tarih YOK SAYILIYOR: `new Date('saçma')` `NaN` verir ve her
 * karşılaştırma `false` döner — sessizce "hep gizli" olurdu. Yönetici bir
 * tarihi yanlış girdiğinde duyuru kaybolmuyor, penceresiz sayılıyor.
 */
export function announcementVisible(
  duyuru: Announcement,
  flags: SiteFlags,
  now: Date = new Date()
): boolean {
  if (!flags.duyuru_acik) return false;
  if (!duyuru.metin) return false;

  const an = now.getTime();
  const basla = zaman(duyuru.baslangic);
  const bit = zaman(duyuru.bitis);

  if (basla !== null && an < basla) return false;
  if (bit !== null && an >= bit) return false;
  return true;
}

function zaman(deger: string | null): number | null {
  if (!deger) return null;
  const t = new Date(deger).getTime();
  return Number.isFinite(t) ? t : null;
}

/* ── Bakım modu ──────────────────────────────────────────────────────── */

export interface Maintenance {
  baslik: string;
  metin: string;
  beklenen_bitis: string | null;
}

export const DEFAULT_MAINTENANCE: Maintenance = {
  baslik: 'Bakım çalışması',
  metin: 'Kısa bir bakım yapıyoruz, birazdan buradayız.',
  beklenen_bitis: null,
};

/**
 * Bakım ekranının metni.
 *
 * Boş başlık/metin varsayılana düşüyor: bakım modu açıkken ziyaretçiye
 * BOŞ bir sayfa göstermek, sitenin çökmesinden ayırt edilemez — oysa
 * anlatılmak istenen tam tersi, "kasıtlı ve geçici".
 */
export function toMaintenance(value: unknown): Maintenance {
  if (!value || typeof value !== 'object') return DEFAULT_MAINTENANCE;
  const v = value as Record<string, unknown>;
  const metin = typeof v.metin === 'string' ? v.metin.trim() : '';
  const baslik = typeof v.baslik === 'string' ? v.baslik.trim() : '';
  return {
    baslik: baslik || DEFAULT_MAINTENANCE.baslik,
    metin: metin || DEFAULT_MAINTENANCE.metin,
    beklenen_bitis:
      typeof v.beklenen_bitis === 'string' ? v.beklenen_bitis : null,
  };
}

/**
 * Bakım modunda bile açık kalan adresler.
 *
 * KİLİTLENME TUZAĞI: bakım modunu yalnızca yönetici kapatabilir, yönetici
 * olduğunu anlamak için oturum gerekir, oturum açmak için giriş sayfası
 * gerekir. Giriş sayfası da kapatılsaydı, oturumu kapalıyken bakım modunu
 * açan yönetici siteyi kendi kilitlemiş olurdu — geri dönüşü yalnızca
 * veritabanından elle UPDATE.
 *
 * `/kayit` LİSTEDE YOK: yeni hesap açmak bakım sırasında yapılacak iş
 * değil ve kilidi açmıyor.
 */
export const MAINTENANCE_ALLOWED_PATHS = ['/giris'];

export function maintenanceBypass(pathname: string): boolean {
  return MAINTENANCE_ALLOWED_PATHS.some(
    (yol) => pathname === yol || pathname.startsWith(`${yol}/`)
  );
}

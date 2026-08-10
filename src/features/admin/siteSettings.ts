import { getSupabase } from '@/services/supabase/client';
import { sanitizeText } from '@/lib/sanitize';
import type { HeroScene } from '@/components/media/HeroBackdrop';

/**
 * SİTE AYARLARI — veri katmanı (§13.2, §13.3).
 *
 * ══════════════════════════════════════════════════════════════════════
 * BU DOSYA NEDEN RPC ÇAĞIRIYOR, TABLOYA YAZMIYOR
 *
 * Yazmaların çoğu `set_app_setting` / `set_feature_flag` / `save_home_draft`
 * üzerinden gidiyor. Sebep tek: GEREKÇE. Değişiklik geçmişini yazan
 * tetikleyici gerekçeyi `astrohub.reason` oturum değişkeninden okuyor ve
 * PostgREST tek çağrıda `set local` çalıştıramıyor. Fonksiyon `set_config`
 * yapıp güncellemeyi aynı işlemde uyguluyor; tetikleyici gerekçeyi
 * görüyor.
 *
 * `nav_links` istisna: gerekçe gerektirmiyor (yüksek riskli değil) ve
 * doğrudan tabloya yazılıyor. RLS `app.is_admin()` ile koruyor, adres
 * kısıtı da veritabanında.
 *
 * ══════════════════════════════════════════════════════════════════════
 * OKUMA DA RPC'DEN — AMA PANEL `home_layout` OKUMAZ
 *
 * Ana sayfa düzenini tabloyu okuyarak da alabilirdik. Alınmıyor çünkü
 * taslak birleştirme mantığı fonksiyonun içinde. İstemcide ikinci bir
 * kopyasını yazmak, iki mantığın zamanla ayrışması demekti — ve ayrışan
 * iki mantıktan hangisinin doğru olduğu ancak kullanıcı şikâyet edince
 * anlaşılır.
 *
 * İKİ AYRI OKUMA YOLU VAR ve karıştırılmamalı:
 *
 *   `home_layout(onizleme)`  → ZİYARETÇİ görüşü. Yayın penceresini
 *                              UYGULAR: ileri tarihli modül dönmez.
 *   `home_modules_admin()`   → YÖNETİCİ görüşü. Pencereyi uygulamaz,
 *                              hepsini döndürür ve pencereyi ayrıca
 *                              alan olarak verir.
 *
 * Panel ikincisini okur. Birincisini okusaydı bir modüle ileri tarih
 * verildiği anda modül panelden de kaybolurdu: düzenlemek için görmek
 * gerekir, görmek için yayında olması gerekirdi. Yönetici kendi kurduğu
 * zamanlamayı geri alamazdı. (0059 bu tuzağı kapatmak için yazıldı.)
 */

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

/* ── Ana sayfa modülleri ─────────────────────────────────────────────── */

export interface HomeModule {
  key: string;
  title: string | null;
  subtitle: string | null;
  enabled: boolean;
  position: number;
  item_limit: number;
  layout: 'grid' | 'list';
  hide_when_empty: boolean;
  show_mobile: boolean;
  show_desktop: boolean;
  publish_from: string | null;
  publish_to: string | null;
  /** Yayımlanmamış değişiklikler. `null` = taslak yok. */
  draft: HomeDraftPatch | null;
  updated_at: string;
}

/** Modül anahtarlarının okunabilir adı. Anahtar teknik, başlık yönetici
 *  tarafından değiştirilebilir — ikisi karışmasın diye ayrı duruyor. */
export const moduleLabels: Record<string, string> = {
  hero: 'Hero',
  tonight: 'Bu Gece',
  records: 'Galeri şeridi',
  news: 'Haberler ve yazılar',
  events: 'Yaklaşan etkinlikler',
  listings: 'Son ilanlar',
  weekly_photo: 'Haftanın Fotoğrafı',
};

/** Panelin okuma yolu — yayın penceresini UYGULAMAZ (yukarıdaki nota bak). */
export async function fetchHomeModules(): Promise<HomeModule[]> {
  const supabase = await client();
  const { data, error } = await supabase.rpc('home_modules_admin');
  if (error) throw new Error(error.message);
  return (data ?? []) as HomeModule[];
}

/**
 * Taslağa yazılabilecek alanlar.
 *
 * `HomeModule`dan `Pick` ile TÜRETİLMİYOR: `HomeModule.draft` bu tipi
 * kullandığı için ikisi birbirine bakar ve döngü olurdu. Ayrıca listenin
 * 0059'daki anahtar beyaz listesiyle BİREBİR aynı kalması gerekiyor —
 * ayrı durunca o eşleşme gözle görülebilir kalıyor.
 */
export interface HomeDraftPatch {
  title?: string | null;
  subtitle?: string | null;
  enabled?: boolean;
  position?: number;
  item_limit?: number;
  layout?: 'grid' | 'list';
  hide_when_empty?: boolean;
  show_mobile?: boolean;
  show_desktop?: boolean;
  publish_from?: string | null;
  publish_to?: string | null;
}

export async function saveHomeDraft(
  moduleKey: string,
  patch: HomeDraftPatch
): Promise<void> {
  const supabase = await client();
  const temiz: Record<string, unknown> = { ...patch };
  if (typeof patch.title === 'string')
    temiz.title = sanitizeText(patch.title, { maxLength: 60 }) || null;
  if (typeof patch.subtitle === 'string')
    temiz.subtitle = sanitizeText(patch.subtitle, { maxLength: 120 }) || null;

  const { error } = await supabase.rpc('save_home_draft', {
    modul: moduleKey,
    degisiklik: temiz,
  });
  if (error) throw new Error(error.message);
}

export async function publishHomeDraft(reason?: string): Promise<number> {
  const supabase = await client();
  const { data, error } = await supabase.rpc('publish_home_draft', {
    gerekce: reason ?? null,
  });
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}

export async function discardHomeDraft(): Promise<number> {
  const supabase = await client();
  const { data, error } = await supabase.rpc('discard_home_draft');
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}

/* ── Navigasyon ve footer ────────────────────────────────────────────── */

export interface NavLink {
  id: string;
  menu: 'header' | 'footer';
  group_label: string | null;
  label: string;
  path: string;
  position: number;
  enabled: boolean;
  new_tab: boolean;
  auth_only: boolean;
}

export async function fetchNavLinks(): Promise<NavLink[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('nav_links')
    .select(
      'id, menu, group_label, label, path, position, enabled, new_tab, auth_only'
    )
    .order('menu')
    .order('position');
  if (error) throw new Error(error.message);
  return (data ?? []) as NavLink[];
}

/**
 * ADRESİ BURADA DA DOĞRULUYORUZ — ama güvenlik için değil.
 *
 * Gerçek kapı veritabanındaki CHECK; o atlanamaz. Buradaki kontrol
 * kullanıcıya ANLAŞILIR bir cümle söylemek için var: PostgreSQL'in
 * "new row violates check constraint nav_links_path_check" hatası
 * yöneticiye ne yapması gerektiğini anlatmıyor.
 *
 * İki deseni de veritabanındakiyle aynı tutmak zorunda değiliz; buranın
 * daha DAR olması sorun değil, daha GENİŞ olması sorun olurdu (o zaman
 * arayüz "tamam" deyip veritabanı reddederdi).
 */
export function describePathProblem(path: string): string | null {
  const value = path.trim();
  if (!value) return 'Adres boş olamaz.';
  if (value.startsWith('//'))
    return 'Adres `//` ile başlayamaz — tarayıcı bunu dış site adresi sayar.';
  if (value.startsWith('/')) return null;
  if (value.startsWith('https://')) {
    if (/[@\s]/.test(value.slice(8).split('/')[0] ?? ''))
      return 'Adreste kullanıcı adı (`@`) veya boşluk bulunamaz.';
    return null;
  }
  return 'Adres `/` ile başlayan site içi yol ya da `https://` adresi olmalı.';
}

export async function upsertNavLink(input: {
  id?: string;
  menu: 'header' | 'footer';
  group_label: string;
  label: string;
  path: string;
  position: number;
  enabled: boolean;
  new_tab: boolean;
  auth_only: boolean;
}): Promise<void> {
  const sorun = describePathProblem(input.path);
  if (sorun) throw new Error(sorun);

  const supabase = await client();
  const satir = {
    ...(input.id ? { id: input.id } : {}),
    menu: input.menu,
    group_label: sanitizeText(input.group_label, { maxLength: 40 }) || null,
    label: sanitizeText(input.label, { maxLength: 40 }),
    path: input.path.trim(),
    position: input.position,
    enabled: input.enabled,
    new_tab: input.new_tab,
    auth_only: input.auth_only,
  };
  /* `.select()` SÜS DEĞİL — RLS'in sessizliğini kırıyor.
     Bir `update`/`delete` RLS yüzünden hiçbir satıra dokunamazsa
     PostgREST HATA DÖNDÜRMEZ: `error` null, iş bitmiş görünür. Yönetici
     "kaydedildi" yazısını görür, veri eskisi gibi durur. Dönen satırı
     isteyip saymak, "yetkim yokmuş" ile "kaydettim"i ayıran tek şey. */
  const { data, error } = input.id
    ? await supabase.from('nav_links').update(satir).eq('id', input.id).select('id')
    : await supabase.from('nav_links').insert(satir).select('id');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0)
    throw new Error(
      input.id
        ? 'Bağlantı güncellenemedi — kayıt bulunamadı ya da yetkiniz yok.'
        : 'Bağlantı eklenemedi — yetkiniz yok.'
    );
}

export async function deleteNavLink(id: string): Promise<void> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('nav_links')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0)
    throw new Error('Bağlantı silinemedi — kayıt bulunamadı ya da yetkiniz yok.');
}

/* ── Hero slaytları ──────────────────────────────────────────────────── */

export interface HeroSlideRow {
  key: string;
  /** Çizilen arka plan; `HeroScene` ile aynı beşli. */
  scene: HeroScene;
  /** Sahne rengi "R,G,B". Boş = koddaki varsayılana düş (`effectiveTint`). */
  tint: string;
  badge: string;
  title: string;
  subtitle: string;
  cta_label: string;
  cta_to: string;
  image_url: string | null;
  image_credit: string | null;
  image_licence: string | null;
  focal_x: number;
  focal_y: number;
  text_align: 'left' | 'center';
  position: number;
  enabled: boolean;
  publish_from: string | null;
  publish_to: string | null;
}

/**
 * Panelin hero okuma yolu.
 *
 * `home_modules_admin` gibi AYRI BİR RPC'YE GEREK YOK: `hero_slides`ın
 * SELECT politikası yöneticiye pencereyi aşma izni veriyor
 * (`or app.is_admin()`), yani aynı tablo sorgusu yönetici için ileri
 * tarihli slaytları da döndürüyor. 0059'un tuzağı (düzenlemek için görmek
 * gerekir, görmek için yayında olmak gerekirdi) politikada çözüldüğü için
 * ikinci bir yol yazılmadı.
 */
export async function fetchHeroSlides(): Promise<HeroSlideRow[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('hero_slides')
    .select(
      'key, scene, tint, badge, title, subtitle, cta_label, cta_to, image_url, image_credit, image_licence, focal_x, focal_y, text_align, position, enabled, publish_from, publish_to'
    )
    .order('position');
  if (error) throw new Error(error.message);
  return (data ?? []) as HeroSlideRow[];
}

/**
 * Panelden düzenlenebilen alanlar.
 *
 * `key` YOK: anahtar slaydın kimliği, `DEFAULT_HERO_SLIDES` içindeki
 * varsayılan rozetle eşleşiyor ve güncellemenin `.eq('key', …)` filtresi
 * de ona bakıyor. Değiştirilmesi gereken bir anahtar, aslında yeni bir
 * slayt demek — ekle ve sil artık var.
 *
 * `scene` VAR (eskiden yoktu): kodla eşleştiği doğru ama eşleşme sabit
 * bir çift değil, beş seçenekli bir liste. Sahneyi kilitli tutmak,
 * "yeni slaydın arka planı ne olacak" sorusunu cevapsız bırakırdı.
 */
export type HeroSlidePatch = Partial<
  Omit<HeroSlideRow, 'key'>
>;

/**
 * GEREKÇE ALANI YOK — `nav_links` ile aynı gerekçe.
 *
 * Gerekçe yalnızca `set_*` RPC'lerinden geçen yazmalarda kaydedilebiliyor:
 * tetikleyici onu `astrohub.reason` oturum değişkeninden okuyor ve
 * PostgREST tek çağrıda `set local` çalıştıramıyor. Hero için ayrı bir
 * RPC yazmadık; değişiklik geçmişi yine tam çalışıyor (kim, ne zaman,
 * önceki değer, yeni değer, geri alma) — eksik olan tek alan gerekçe.
 *
 * Bunu yazılı bırakmak önemli: geçmişte gerekçesi boş satırlar görüp
 * "tetikleyici bozuk" diye aramak, olmayan bir hatayı kovalamak olurdu.
 */
export async function updateHeroSlide(
  key: string,
  patch: HeroSlidePatch
): Promise<void> {
  if (typeof patch.cta_to === 'string') {
    const sorun = describePathProblem(patch.cta_to);
    if (sorun) throw new Error(sorun);
  }

  /* Panelin renk seçicisi bu biçimi üretiyor; kontrol yine de burada,
     çünkü `HeroSlidePatch` başka bir çağırana da açık ve veritabanı
     kısıtının (`hero_slides_tint_check`) ham metni yöneticiye bir şey
     anlatmaz. */
  if (
    typeof patch.tint === 'string' &&
    patch.tint !== '' &&
    !/^\d{1,3},\d{1,3},\d{1,3}$/.test(patch.tint)
  )
    throw new Error('Sahne rengi "R,G,B" biçiminde olmalı (örn. 150,185,235).');

  const temiz: Record<string, unknown> = { ...patch };
  if (typeof patch.badge === 'string')
    temiz.badge = sanitizeText(patch.badge, { maxLength: 40 });
  if (typeof patch.title === 'string')
    temiz.title = sanitizeText(patch.title, { maxLength: 90 });
  if (typeof patch.subtitle === 'string')
    temiz.subtitle = sanitizeText(patch.subtitle, { maxLength: 180 });
  if (typeof patch.cta_label === 'string')
    temiz.cta_label = sanitizeText(patch.cta_label, { maxLength: 40 });

  const supabase = await client();
  /* `.select()` RLS'in sessizliğini kırıyor — `upsertNavLink`teki
     gerekçenin aynısı. */
  const { data, error } = await supabase
    .from('hero_slides')
    .update(temiz)
    .eq('key', key)
    .select('key');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0)
    throw new Error('Slayt güncellenemedi — kayıt bulunamadı ya da yetkiniz yok.');
}

/**
 * Anahtar biçimi — veritabanındaki `hero_slides_key_check` ile aynı kural.
 *
 * Buradaki kopya, hatayı Postgres'in `23514` metnine bırakmamak için var:
 * yönetici "yeni kısıt ihlali" değil, ne yazması gerektiğini okur.
 */
export function describeHeroKeyProblem(key: string): string | null {
  const v = key.trim();
  if (!v) return 'Anahtar boş olamaz.';
  if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(v))
    return 'Anahtar 2–40 karakter olmalı; yalnızca küçük harf, rakam ve tire kullanın (örn. "yaz-kampi").';
  return null;
}

/**
 * Yeni hero slaydı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * `position` ÇAĞIRAN TARAFTAN GELİYOR
 *
 * Sütunun varsayılanı yok (göç 20260810100000 bunu bilerek böyle
 * bıraktı): varsayılan 0 olsaydı her yeni slayt listenin BAŞINA düşer,
 * anasayfa yöneticinin daha doldurmadığı bir slaytla açılırdı. Sıradaki
 * yeri bilen taraf listeyi zaten okumuş olan panel.
 *
 * ══════════════════════════════════════════════════════════════════════
 * YENİ SLAYT KAPALI DOĞUYOR
 *
 * `enabled: false` sabit, parametre değil. Hero anasayfanın ilk boyanan
 * bloğu; slayt açık doğsaydı, yönetici başlığı yazar yazmaz yarım içerik
 * yayına çıkardı. Açma ayrı ve bilinçli bir hareket olarak kalıyor —
 * satırdaki "Açık" kutusu.
 */
export async function createHeroSlide(input: {
  key: string;
  scene: HeroScene;
  title: string;
  cta_to: string;
  position: number;
}): Promise<void> {
  const anahtarSorunu = describeHeroKeyProblem(input.key);
  if (anahtarSorunu) throw new Error(anahtarSorunu);

  const adresSorunu = describePathProblem(input.cta_to);
  if (adresSorunu) throw new Error(adresSorunu);

  const title = sanitizeText(input.title, { maxLength: 90 });
  if (!title) throw new Error('Başlık boş olamaz.');

  const supabase = await client();
  const { data, error } = await supabase
    .from('hero_slides')
    .insert({
      key: input.key.trim(),
      scene: input.scene,
      title,
      cta_to: input.cta_to.trim(),
      position: input.position,
      enabled: false,
    })
    .select('key');

  if (error) {
    /* Benzersizlik ihlalinin ham metni ("duplicate key value violates
       unique constraint…") yöneticiye hiçbir şey anlatmıyor. */
    if (error.code === '23505')
      throw new Error(`"${input.key.trim()}" anahtarı zaten kullanılıyor.`);
    throw new Error(error.message);
  }
  if (!data || data.length === 0)
    throw new Error('Slayt eklenemedi — yetkiniz yok.');
}

/**
 * Slayt siler.
 *
 * SON SLAYT SİLİNEBİLİR ve bu bir kayıp değil: tablo boşalınca
 * `toHeroSlides` koddaki beş varsayılan slayda düşüyor, yani anasayfa
 * tepesi kesik açılmıyor. Hero'yu tamamen kaldırmak isteyen yönetici
 * slaytları silmez — `home_modules` içindeki `hero` modülünü kapatır.
 */
export async function deleteHeroSlide(key: string): Promise<void> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('hero_slides')
    .delete()
    .eq('key', key)
    .select('key');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0)
    throw new Error('Slayt silinemedi — kayıt bulunamadı ya da yetkiniz yok.');
}

/* ── Feature flag'ler ────────────────────────────────────────────────── */

export interface FeatureFlag {
  key: string;
  label: string;
  description: string | null;
  enabled: boolean;
  high_risk: boolean;
}

export async function fetchFeatureFlags(): Promise<FeatureFlag[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('feature_flags')
    .select('key, label, description, enabled, high_risk')
    .order('high_risk', { ascending: false })
    .order('key');
  if (error) throw new Error(error.message);
  return (data ?? []) as FeatureFlag[];
}

export async function setFeatureFlag(
  key: string,
  enabled: boolean,
  reason?: string
): Promise<void> {
  const supabase = await client();
  const { error } = await supabase.rpc('set_feature_flag', {
    bayrak: key,
    acik: enabled,
    gerekce: reason?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

/* ── Serbest ayarlar (duyuru, bakım, SEO) ────────────────────────────── */

export interface AppSetting {
  key: string;
  value: Record<string, unknown>;
}

export async function fetchAppSettings(): Promise<AppSetting[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value')
    .order('key');
  if (error) throw new Error(error.message);
  return (data ?? []) as AppSetting[];
}

export async function setAppSetting(
  key: string,
  value: Record<string, unknown>,
  reason?: string
): Promise<void> {
  const supabase = await client();
  const { error } = await supabase.rpc('set_app_setting', {
    ayar_key: key,
    ayar_value: value,
    gerekce: reason?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

/* ── Değişiklik geçmişi ──────────────────────────────────────────────── */

export interface HistoryEntry {
  id: number;
  scope: string;
  record_key: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  reason: string | null;
  rolled_back_from: number | null;
  created_at: string;
}

export const scopeLabels: Record<string, string> = {
  app_settings: 'Site ayarı',
  home_modules: 'Ana sayfa',
  nav_links: 'Navigasyon',
  feature_flags: 'Özellik anahtarı',
};

export async function fetchHistory(limit = 50): Promise<HistoryEntry[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('setting_history')
    .select(
      'id, scope, record_key, old_value, new_value, reason, rolled_back_from, created_at'
    )
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as HistoryEntry[];
}

export async function rollbackSetting(
  historyId: number,
  reason?: string
): Promise<void> {
  const supabase = await client();
  const { error } = await supabase.rpc('rollback_setting', {
    gecmis_id: historyId,
    gerekce: reason?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

/**
 * DEĞİŞİKLİK ÖZETİ (§13.3 "değişiklik özeti").
 *
 * Geçmiş satırı iki JSON taşıyor; yöneticiye iki JSON göstermek onu
 * `diff` yapmaya zorlamak demek. Bu fonksiyon farkı cümleye çeviriyor.
 *
 * `updated_at`/`updated_by` ATLANIYOR: her yazmada değişiyorlar ve
 * özetin başını çekerlerse gerçek değişiklik gözden kaçıyor.
 */
const GIZLI_ALANLAR = new Set(['updated_at', 'updated_by', 'draft', 'id']);

export function summarize(entry: HistoryEntry): string {
  const eski = entry.old_value ?? {};
  const yeni = entry.new_value ?? {};

  if (entry.old_value === null) return 'Kayıt oluşturuldu';
  if (entry.new_value === null) return 'Kayıt silindi';

  const anahtarlar = new Set([...Object.keys(eski), ...Object.keys(yeni)]);
  const degisenler: string[] = [];
  for (const alan of anahtarlar) {
    if (GIZLI_ALANLAR.has(alan)) continue;
    const a = JSON.stringify(eski[alan] ?? null);
    const b = JSON.stringify(yeni[alan] ?? null);
    if (a !== b) degisenler.push(`${alan}: ${kisalt(a)} → ${kisalt(b)}`);
  }
  return degisenler.length === 0
    ? 'Değer değişmedi'
    : degisenler.slice(0, 3).join(', ') +
        (degisenler.length > 3 ? ` (+${degisenler.length - 3})` : '');
}

function kisalt(value: string): string {
  const temiz = value.replace(/^"|"$/g, '');
  return temiz.length > 24 ? `${temiz.slice(0, 24)}…` : temiz || '—';
}

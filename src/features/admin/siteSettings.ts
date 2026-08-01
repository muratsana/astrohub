import { getSupabase } from '@/services/supabase/client';
import { sanitizeText } from '@/lib/sanitize';

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
 * OKUMA DA `home_layout` RPC'SİNDEN
 *
 * Ana sayfa düzenini tabloyu okuyarak da alabilirdik. Alınmıyor çünkü
 * zamanlanmış yayın penceresi (`publish_from`/`publish_to`) ve taslak
 * birleştirme mantığı fonksiyonun içinde. İstemcide ikinci bir kopyasını
 * yazmak, iki mantığın zamanla ayrışması demekti — ve ayrışan iki
 * mantıktan hangisinin doğru olduğu ancak kullanıcı şikâyet edince
 * anlaşılır.
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
  has_draft: boolean;
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
};

export async function fetchHomeModules(preview = false): Promise<HomeModule[]> {
  const supabase = await client();
  const { data, error } = await supabase.rpc('home_layout', {
    onizleme: preview,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as HomeModule[];
}

export type HomeDraftPatch = Partial<
  Pick<
    HomeModule,
    | 'title'
    | 'subtitle'
    | 'enabled'
    | 'position'
    | 'item_limit'
    | 'layout'
    | 'hide_when_empty'
    | 'show_mobile'
    | 'show_desktop'
  >
>;

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
  const { error } = input.id
    ? await supabase.from('nav_links').update(satir).eq('id', input.id)
    : await supabase.from('nav_links').insert(satir);
  if (error) throw new Error(error.message);
}

export async function deleteNavLink(id: string): Promise<void> {
  const supabase = await client();
  const { error } = await supabase.from('nav_links').delete().eq('id', id);
  if (error) throw new Error(error.message);
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

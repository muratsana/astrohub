import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';

/**
 * BİLDİRİM MERKEZİ — istemci tarafı.
 *
 * OKUMA VE İŞARETLEME BURADA, ÜRETİM DEĞİL. Bu dosyanın hiçbir yerinde
 * `insert` yok ve olamaz: `notifications` tablosunda `authenticated`
 * rolünün ekleme yetkisi yok (0042). Bildirimi veritabanı tetikleyicileri
 * üretiyor. Bu ayrım kasıtlı — istemciden yazılabilseydi bir kullanıcı
 * başkasının adına "seni takip etti" bildirimi uydurabilirdi.
 *
 * KATEGORİ SUNUCUDAN GELİYOR. `category` kolonu türden ÜRETİLİYOR
 * (`app.notification_category_of`); burada ikinci bir tür→kategori
 * tablosu tutmuyoruz. Tutsaydık, tercih ekranında "sosyal"i kapatan
 * kullanıcı veritabanının "içerik" saydığı bir bildirimi almaya devam
 * ederdi ve iki taraf hangisinin doğru olduğunu bilemezdi.
 */

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

/** Sunucudaki `app.notification_category` enum'unun aynısı. */
export type NotificationCategory =
  | 'sosyal'
  | 'icerik'
  | 'etkinlik'
  | 'yayin'
  | 'sistem'
  | 'mesaj'
  | 'forum'
  | 'galeri'
  | 'ilan'
  | 'moderasyon';

export interface NotificationItem {
  id: string;
  kind: string;
  category: NotificationCategory;
  title: string;
  body: string | null;
  /** Uygulama içi yol; yoksa satır bağlantı değil. */
  url: string | null;
  readAt: string | null;
  archivedAt: string | null;
  createdAt: string;
}

interface NotificationRow {
  id: string;
  kind: string;
  category: NotificationCategory;
  title: string;
  body: string | null;
  url: string | null;
  read_at: string | null;
  archived_at: string | null;
  created_at: string;
}

const SELECT =
  'id, kind, category, title, body, url, read_at, archived_at, created_at';

function mapRow(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    kind: row.kind,
    category: row.category,
    title: row.title,
    body: row.body,
    /*
     * DIŞ ADRES BURADAN GEÇMEZ. Sunucu tarafında `url like '/%'` kısıtı
     * var; bu ikinci kontrol o kısıttan önce yazılmış satırlara ve ileride
     * kısıt gevşerse diye duruyor. Bildirim listesi, siteyi tanıyan bir
     * kullanıcının en çok güvendiği yer — oradan çıkan bir bağlantının
     * siteyi terk etmesi beklenmez.
     */
    url: row.url && row.url.startsWith('/') ? row.url : null,
    readAt: row.read_at,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
  };
}

/** Bildirim listesinde gösterilecek görünüm. */
export type NotificationView = 'gelen' | 'arsiv';

export interface NotificationsState {
  items: NotificationItem[];
  loading: boolean;
  error: string | null;
  /** Yeniden okuma — işaretleme sonrası ve yeniden dene düğmesi için. */
  refresh: () => void;
}

const PAGE_SIZE = 50;

/**
 * Bildirim listesi.
 *
 * Kategori süzgeci SUNUCUDA uygulanıyor (`eq('category', …)`): elli satır
 * indirip beşini göstermek, sayfalama sayacını da yanlış yapardı.
 *
 * `limit` üst çubuktaki panel için: zil altına açılan kutuda beş satır
 * gösteriliyor ve elli satır indirmenin anlamı yok. Varsayılanı sayfanın
 * ihtiyacı (50).
 */
export function useNotifications(
  view: NotificationView,
  category: NotificationCategory | 'tumu',
  limit: number = PAGE_SIZE
): NotificationsState {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      setItems([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const supabase = await client();
        let query = supabase
          .from('notifications')
          .select(SELECT)
          .order('created_at', { ascending: false })
          .limit(limit);

        query =
          view === 'arsiv'
            ? query.not('archived_at', 'is', null)
            : query.is('archived_at', null);

        if (category !== 'tumu') query = query.eq('category', category);

        const { data, error: readError } = await query;
        if (readError) throw new Error(readError.message);
        if (!active) return;
        setItems((data as NotificationRow[] | null)?.map(mapRow) ?? []);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Bildirimler okunamadı');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user, view, category, limit, tick]);

  return { items, loading, error, refresh };
}

/**
 * OKUNMAMIŞ SAYACI — zil rozetinin kaynağı.
 *
 * SAYIYI SATIRLARI İNDİREREK BULMUYORUZ. `head: true` ile yalnızca sayı
 * geliyor; her sayfada elli bildirim gövdesi indirmek, hiç açılmayacak bir
 * liste için bant genişliği harcamak olurdu.
 *
 * CANLI YAYIN AÇIK. Yeni bildirim satırı geldiğinde sayaç kendiliğinden
 * artıyor — yenilemek için sayfa değiştirmek gerekmiyor. Realtime'da da
 * RLS geçerli: kullanıcı yalnızca kendi satırını duyuyor.
 */
export function useUnreadCount(): { count: number; refresh: () => void } {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  /* Abonelik geri çağrısı en güncel `refresh`i görsün diye ref'te:
     bağımlılığa koymak her yeniden render'da kanalı kapatıp açardı. */
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      setCount(0);
      return;
    }

    let active = true;
    void (async () => {
      try {
        const supabase = await client();
        const { count: total, error: readError } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .is('read_at', null)
          .is('archived_at', null);
        if (readError) throw new Error(readError.message);
        if (active) setCount(total ?? 0);
      } catch {
        /* Sayaç okunamadıysa rozet gösterilmiyor. Yanlış bir sayı
           göstermektense hiç göstermemek daha dürüst. */
        if (active) setCount(0);
      }
    })();

    return () => {
      active = false;
    };
  }, [user, tick]);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) return;

    let channel: { unsubscribe: () => void } | null = null;
    let disposed = false;

    void (async () => {
      const supabase = await client();
      if (disposed) return;
      const created = supabase
        .channel(`bildirim:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => refreshRef.current()
        )
        .subscribe();
      channel = created as unknown as { unsubscribe: () => void };
    })();

    return () => {
      disposed = true;
      channel?.unsubscribe();
    };
  }, [user]);

  return { count, refresh };
}

/** Tek bildirimi okundu işaretler. */
export async function markNotificationRead(id: string): Promise<void> {
  const supabase = await client();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null);
  if (error) throw new Error(error.message);
}

/**
 * Tümünü okundu işaretler.
 *
 * RLS zaten satırları kullanıcının kendi bildirimlerine indirdiği için
 * `user_id` süzgeci yazmıyoruz: yazsaydık aynı kuralı iki yerde tutmuş
 * olurduk ve biri değişince diğeri sessizce eskirdi.
 */
export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await client();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null)
    .is('archived_at', null);
  if (error) throw new Error(error.message);
}

/** Bildirimi arşive alır — listeden çıkar, kayıt durur. */
export async function archiveNotification(id: string): Promise<void> {
  const supabase = await client();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('notifications')
    /* Arşivlenen bildirim aynı anda okunmuş sayılıyor: arşivde duran ama
       "okunmamış" görünen bir satır sayacı sonsuza dek şişik tutardı. */
    .update({ archived_at: now, read_at: now })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** Bildirimi tümüyle siler. */
export async function deleteNotification(id: string): Promise<void> {
  const supabase = await client();
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* ══════════════════════════════════════════════════════════════════════
 * TERCİHLER
 *
 * `notification_preferences.categories` İKİ BİÇİM taşıyor ve ikisi de
 * geçerli — sunucudaki `app.notification_allowed` da ikisini birden
 * okuyor:
 *
 *   {"galeri": false}                          → hiçbir kanaldan
 *   {"galeri": {"site": true, "email": false}} → sitede var, postada yok
 *
 * Anahtar yoksa AÇIK sayılıyor; haritada yazmayan kanal da açık —
 * anahtarın yokluğu "hayır" değil "belirtilmemiş" demek. İki taraf farklı
 * varsayılan kullansaydı, hiç tercih kaydetmemiş kullanıcı için ekran
 * "açık" derken sunucu "kapalı" davranırdı.
 * ══════════════════════════════════════════════════════════════════════ */

/** Site içi kanal — bu ekranın yönettiği tek kanal. */
const SITE_CHANNEL = 'site';

/**
 * Ham `categories` değerinden site içi bildirimin açık olup olmadığını
 * çıkarır. Sunucudaki `app.notification_allowed` ile birebir aynı kural:
 * boolean tüm kanallar için geçerli, nesne kanal kanal okunur, tanınmayan
 * biçim açık sayılır.
 */
function siteChannelEnabled(value: unknown): boolean {
  if (value === false) return false;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const channel = (value as Record<string, unknown>)[SITE_CHANNEL];
    return channel !== false;
  }
  return true;
}

/**
 * Kullanıcının kapatabileceği kategoriler.
 *
 * BUGÜN GERÇEKTEN BİLDİRİM ÜRETEN kategoriler listeleniyor; küme
 * veritabanından ölçüldü (`app.notify` çağıran tetikleyicilerin ürettiği
 * türler). `ilan` kategorisi enum'da var ama onu yazan bir tetikleyici
 * henüz yok (FAZ 8'in konusu) — hiçbir şeyi değiştirmeyen bir kutu
 * göstermek, kullanıcıya kontrolü olduğu yalanını söylemek olurdu.
 *
 * `sistem` LİSTEDE YOK ve bu bir eksik değil: üyelik bitişi, hesap
 * uyarısı, yöneticinin doğrudan mesajı kapatılamıyor — sunucu tarafı da
 * kapatmıyor. `moderasyon` ise ARTIK LİSTEDE: kendi şikâyetinin sonucunu
 * almak istememek meşru bir tercih ve sunucu bu kategoriyi kapatılabilir
 * sayıyor.
 */
export const TOGGLEABLE_CATEGORIES: {
  key: NotificationCategory;
  label: string;
  hint: string;
}[] = [
  {
    key: 'mesaj',
    label: 'Mesaj',
    hint: 'Sana özel mesaj geldiğinde',
  },
  {
    key: 'sosyal',
    label: 'Takip',
    hint: 'Biri seni takip etmeye başladığında',
  },
  {
    key: 'galeri',
    label: 'Galeri',
    hint: 'Fotoğrafına yorum, yanıt, beğeni, puan ve öne çıkarma',
  },
  {
    key: 'forum',
    label: 'Forum',
    hint: 'Açtığın konuya yanıt yazıldığında',
  },
  {
    key: 'icerik',
    label: 'Gönderdiğin içerik',
    hint: 'Haber, yazı ve topluluk gönderin onaylandığında ya da reddedildiğinde',
  },
  {
    key: 'moderasyon',
    label: 'Moderasyon',
    hint: 'Bildirdiğin içerik hakkında verilen karar',
  },
  {
    key: 'etkinlik',
    label: 'Etkinlik',
    hint: 'Takip ettiğin etkinlikte değişiklik, iptal ve hatırlatma',
  },
  {
    key: 'yayin',
    label: 'Yayın',
    hint: 'Radyo ve TV yayını başladığında, yeni podcast bölümü',
  },
];

export interface PreferenceState {
  /** Kategori → açık mı. Kayıt yoksa hepsi açık. */
  categories: Record<string, boolean>;
  loading: boolean;
  error: string | null;
  saving: boolean;
  toggle: (key: NotificationCategory, enabled: boolean) => Promise<void>;
}

export function useNotificationPreferences(): PreferenceState {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /*
   * Sunucudan okunan haritanın DOKUNULMAMIŞ hâli. Ekran durumunda
   * (`categories`) yalnızca site içi kanalın boolean karşılığı duruyor;
   * yazarken kaybolmaması gereken her şey burada. Ref, çünkü değeri
   * değiştiğinde yeniden çizim gerekmiyor — yalnızca bir sonraki yazmada
   * okunuyor.
   */
  const rawCategories = useRef<Record<string, unknown>>({});

  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      rawCategories.current = {};
      setCategories({});
      return;
    }

    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const supabase = await client();
        const { data, error: readError } = await supabase
          .from('notification_preferences')
          .select('categories')
          .eq('user_id', user.id)
          .maybeSingle();
        if (readError) throw new Error(readError.message);
        if (!active) return;
        const raw = (data?.categories ?? {}) as Record<string, unknown>;
        /*
         * HAM HARİTA SAKLANIYOR. Ekran yalnızca site içi kanalı ve yalnızca
         * listelenen kategorileri gösteriyor; ama kayıtta e-posta/push
         * tercihleri ve henüz listelenmeyen kategoriler de olabilir.
         * Yazarken ham haritanın üstüne biniyoruz — aşağıdaki `toggle`
         * bunu temel alıyor. Sadece ekrandaki dokuz anahtarı geri
         * yazsaydık, kullanıcının "e-postayı sadece moderasyon için
         * istiyorum" tercihi ilk kutu tıklamasında silinirdi.
         */
        rawCategories.current = raw;
        const next: Record<string, boolean> = {};
        for (const { key } of TOGGLEABLE_CATEGORIES) {
          next[key] = siteChannelEnabled(raw[key]);
        }
        setCategories(next);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Tercihler okunamadı');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user]);

  const toggle = useCallback(
    async (key: NotificationCategory, enabled: boolean) => {
      if (!user) return;
      const previous = categories;
      const next = { ...categories, [key]: enabled };
      setCategories(next);
      setSaving(true);
      setError(null);

      /*
       * TÜM HARİTA YAZILIYOR, TEK ANAHTAR DEĞİL: `jsonb` kolonuna kısmi
       * yazma PostgREST üstünden mümkün değil. Ama yazılan harita ekrandaki
       * anahtarlardan ibaret değil — okunan HAM harita temel alınıyor, ki
       * e-posta/push tercihleri ve henüz listelenmeyen kategoriler yerinde
       * kalsın.
       *
       * DEĞİŞTİRİLEN ANAHTARIN BİÇİMİ KORUNUYOR: kanal haritası olarak
       * kaydedilmiş bir kategoride yalnızca `site` alanı yazılıyor,
       * boolean ise boolean kalıyor. Aksi hâlde site içi bildirimi kapatan
       * kullanıcı, aynı hamlede e-posta tercihini de kaybederdi.
       */
      const stored = rawCategories.current[key];
      const merged: Record<string, unknown> = { ...rawCategories.current };
      merged[key] =
        stored && typeof stored === 'object' && !Array.isArray(stored)
          ? { ...(stored as Record<string, unknown>), [SITE_CHANNEL]: enabled }
          : enabled;

      try {
        const supabase = await client();
        const { error: writeError } = await supabase
          .from('notification_preferences')
          .upsert(
            { user_id: user.id, categories: merged },
            { onConflict: 'user_id' }
          );
        if (writeError) throw new Error(writeError.message);
        rawCategories.current = merged;
      } catch (e) {
        setCategories(previous);
        setError(e instanceof Error ? e.message : 'Tercih kaydedilemedi');
      } finally {
        setSaving(false);
      }
    },
    [user, categories]
  );

  return { categories, loading, error, saving, toggle };
}

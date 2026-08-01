import { getSupabase } from '@/services/supabase/client';

/**
 * İÇERİK KAYITLARI — fotoğraf, ilan, forum, etkinlik, gözlem noktası.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN BU SEFER ORTAK SOYUTLAMA YAZILDI
 *
 * `BroadcastControl` başında "ortak bir kaynak yöneticisi yazılmadı"
 * diyor ve gerekçesi doğru: TV ile radyonun ALANLARI ve EYLEMLERİ
 * farklı (canlıya alma, yol/bağlantı ayrımı) ve o farkları tek bileşende
 * parametreleştirmek iki basit listeyi tek karmaşık listeye çevirirdi.
 *
 * Burada durum tersi. Beş içerik türünün yönetici tarafındaki işi
 * BİREBİR aynı: son kayıtları listele, durumunu değiştir, gerekirse sil.
 * Alanlar da aynı üçe iniyor — başlık, sahip, tarih. Beş ayrı bileşen
 * yazmak, aynı yüz satırı beş kez kopyalamak ve beşini ayrı ayrı
 * bozulabilir hale getirmek olurdu.
 *
 * Sınır şu: türe ÖZGÜ bir eylem gerektiği anda (ilanı "satıldı"
 * işaretlemek gibi) o tür buradan çıkıp kendi bileşenine gider. Bu
 * dosya ortak olanı taşıyor, hepsini değil.
 *
 * ══════════════════════════════════════════════════════════════════════
 * YETKİ VERİTABANINDA
 *
 * Beş tablonun hepsinde admin/moderatör için `*_moderate` ya da
 * `*_write` politikası var. Buradaki kod yetki kontrolü YAPMIYOR; admin
 * olmayan biri çağırırsa sunucu reddediyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SİLME YERİNE DURUM DEĞİŞTİRME
 *
 * Varsayılan eylem silmek değil, `archived`/`draft`a çekmek. Sebebi:
 * moderasyon kararları geri alınabilir olmalı ve silinen bir fotoğrafın
 * beğenileri, yorumları, puanları da gider. Kalıcı silme ayrı bir düğme
 * ve onay istiyor.
 */

export type RecordKind = 'photo' | 'listing' | 'thread' | 'event' | 'site';

export interface RecordRow {
  id: string;
  title: string;
  /** Kullanıcı adı ya da kategori — türe göre ikincil bilgi. */
  subtitle: string | null;
  status: string;
  createdAt: string | null;
  /** Sitedeki adresi; yoksa satır bağlantısız çiziliyor. */
  path: string | null;
}

interface KindSpec {
  label: string;
  table: string;
  select: string;
  statusColumn: string | null;
  /** Durum sütununun alabileceği değerler; yoksa durum değiştirilemiyor. */
  statuses: readonly string[];
  orderColumn: string;
  map: (row: Record<string, unknown>) => RecordRow;
}

const s = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() !== '' ? v : null;

export const RECORD_KINDS: Record<RecordKind, KindSpec> = {
  photo: {
    label: 'Fotoğraflar',
    table: 'astro_photos',
    select: 'id, slug, title, status, created_at, profiles!astro_photos_user_id_profiles_fkey(username)',
    statusColumn: 'status',
    statuses: ['draft', 'published', 'archived'],
    orderColumn: 'created_at',
    map: (r) => ({
      id: String(r.id),
      title: s(r.title) ?? '(başlıksız)',
      subtitle: s((r.profiles as { username?: string } | null)?.username)
        ? `@${(r.profiles as { username: string }).username}`
        : null,
      status: String(r.status ?? '—'),
      createdAt: s(r.created_at),
      path: s(r.slug) ? `/fotograf/${r.slug}` : null,
    }),
  },
  listing: {
    label: 'İlanlar',
    table: 'listings',
    select: 'id, slug, title, status, created_at, city',
    statusColumn: 'status',
    statuses: ['draft', 'active', 'reserved', 'sold', 'archived'],
    orderColumn: 'created_at',
    map: (r) => ({
      id: String(r.id),
      title: s(r.title) ?? '(başlıksız)',
      subtitle: s(r.city),
      status: String(r.status ?? '—'),
      createdAt: s(r.created_at),
      path: s(r.slug) ? `/ilan/${r.slug}` : null,
    }),
  },
  thread: {
    label: 'Forum konuları',
    table: 'forum_threads',
    select: 'id, slug, title, created_at, locked, category_id',
    /* Forumda `status` yok; kilit tek durum ve ayrı bir kolon. */
    statusColumn: null,
    statuses: [],
    orderColumn: 'created_at',
    map: (r) => ({
      id: String(r.id),
      title: s(r.title) ?? '(başlıksız)',
      subtitle: s(r.category_id),
      status: r.locked ? 'kilitli' : 'açık',
      createdAt: s(r.created_at),
      path: s(r.slug) ? `/forum/${r.slug}` : null,
    }),
  },
  event: {
    label: 'Etkinlikler',
    table: 'events',
    select: 'id, slug, title, status, created_at, city',
    statusColumn: 'status',
    statuses: ['draft', 'published', 'cancelled'],
    orderColumn: 'created_at',
    map: (r) => ({
      id: String(r.id),
      title: s(r.title) ?? '(başlıksız)',
      subtitle: s(r.city),
      status: String(r.status ?? '—'),
      createdAt: s(r.created_at),
      path: s(r.slug) ? `/etkinlik/${r.slug}` : null,
    }),
  },
  site: {
    label: 'Gözlem noktaları',
    table: 'observing_sites',
    /* Gözlem noktasında `city` YOK, `region` var — konum burada ilçe
       değil bölge olarak tutuluyor (nokta koordinatı ayrı). */
    select: 'id, slug, name, status, created_at, region',
    statusColumn: 'status',
    statuses: ['pending', 'published', 'rejected'],
    orderColumn: 'created_at',
    map: (r) => ({
      id: String(r.id),
      title: s(r.name) ?? '(adsız)',
      subtitle: s(r.region),
      status: String(r.status ?? '—'),
      createdAt: s(r.created_at),
      path: s(r.slug) ? `/saha/${r.slug}` : null,
    }),
  },
};

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

export async function fetchRecords(
  kind: RecordKind,
  limit = 40
): Promise<RecordRow[]> {
  const spec = RECORD_KINDS[kind];
  const supabase = await client();

  const { data, error } = await supabase
    .from(spec.table)
    .select(spec.select)
    .order(spec.orderColumn, { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(spec.map);
}

export async function setRecordStatus(
  kind: RecordKind,
  id: string,
  status: string
): Promise<void> {
  const spec = RECORD_KINDS[kind];
  if (!spec.statusColumn) {
    throw new Error(`${spec.label} için durum değiştirilemiyor.`);
  }
  /* Değer beyaz listede yoksa yazılmıyor: serbest bir string, enum
     kısıtına takılıp kullanıcıya ham veritabanı hatası gösterirdi. */
  if (!spec.statuses.includes(status)) {
    throw new Error(`Geçersiz durum: ${status}`);
  }

  const supabase = await client();
  const { error } = await supabase
    .from(spec.table)
    .update({ [spec.statusColumn]: status })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** Forum konusunu kilitler/açar — foruma özgü tek eylem. */
export async function setThreadLocked(
  id: string,
  locked: boolean
): Promise<void> {
  const supabase = await client();
  const { error } = await supabase
    .from('forum_threads')
    .update({ locked })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Kalıcı silme.
 *
 * Geri alınamaz ve bağlı kayıtları da götürüyor (fotoğrafın beğenileri,
 * yorumları, puanları `on delete cascade`). Arayüz bu yüzden ayrı bir
 * onay istiyor; buradaki fonksiyon onayı VARSAYIYOR.
 */
export async function deleteRecord(
  kind: RecordKind,
  id: string
): Promise<void> {
  const spec = RECORD_KINDS[kind];
  const supabase = await client();
  const { error } = await supabase.from(spec.table).delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* ══════════════════════════════════════════════════════════════════════
   DENETİM KAYDI

   `audit_logs` admin'e SALT OKUNUR açık ve öyle kalmalı: değiştirilebilen
   bir denetim kaydı denetim kaydı değildir.
   ══════════════════════════════════════════════════════════════════════ */

export interface AuditRow {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  actorId: string | null;
  createdAt: string;
}

export async function fetchAuditLog(limit = 30): Promise<AuditRow[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, action, target_type, target_id, actor_id, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return ((data ?? []) as {
    id: string;
    action: string;
    target_type: string | null;
    target_id: string | null;
    actor_id: string | null;
    created_at: string;
  }[]).map((r) => ({
    id: r.id,
    action: r.action,
    targetType: r.target_type,
    targetId: r.target_id,
    actorId: r.actor_id,
    createdAt: r.created_at,
  }));
}

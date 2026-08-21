import {
  CONTENT_STATUSES,
  contentStatusLabels,
  isContentStatus,
} from '@/domain/content/status';
import { events as eventsSeed } from '@/features/events/data';
import {
  equipmentCategoryLabels,
  equipmentCategoryOrder,
} from '@/features/equipment/taxonomy';
import {
  listingCurrencies,
  listingCurrencyLabels,
} from '@/features/marketplace/data';
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

export function recordStatusLabel(status: string): string {
  if (isContentStatus(status)) return contentStatusLabels[status];
  if (status === 'kilitli') return 'Kilitli';
  if (status === 'açık') return 'Açık';
  return status;
}

export interface RecordRow {
  id: string;
  title: string;
  /** Kullanıcı adı ya da kategori — türe göre ikincil bilgi. */
  subtitle: string | null;
  status: string;
  createdAt: string | null;
  /** Sitedeki adresi; yoksa satır bağlantısız çiziliyor. */
  path: string | null;
  /** Soft delete anı (FAZ 3). Dolu ise kayıt public'te yok, geri alınabilir. */
  deletedAt: string | null;
  /** Veritabanı satırı olmayan katalog tohumu; panelde görünür ama yazılamaz. */
  readOnly?: boolean;
}

/**
 * DÜZENLENEBİLİR ALAN TANIMI.
 *
 * ══════════════════════════════════════════════════════════════════════
 * PANELDE DÜZENLEME YOKTU
 *
 * Kayıt ekranı durumu değiştirebiliyor, kilitleyebiliyor, kaldırıp geri
 * getirebiliyordu — ama tek bir ALANI düzenleyemiyordu. Yönetici yanlış
 * yazılmış bir ilan başlığını ya da fotoğraf açıklamasını göremediği
 * için düzeltemiyor, tek çare kaydı tümden kaldırmak oluyordu.
 *
 * Alanlar tür tanımlayıcısında duruyor, formda değil: form JENERİK ve
 * yeni bir tür eklemek yeni bir ekran değil, birkaç satır tanım demek.
 * Aksi hâlde beş tür için beş form yazılır, dördü zamanla eskirdi.
 *
 * BEYAZ LİSTE OLMASI ASIL GÜVENLİK DEĞİL — yaptırım RLS'te. Ama liste,
 * panelin `status` ya da `user_id` gibi bir kolonu kazara yazmasını
 * engelliyor: jenerik bir form ne verilirse onu gönderir.
 */
export interface EditField {
  column: string;
  label: string;
  /** `text` tek satır, `multiline` çok satır, `number` sayısal, `select` kapalı seçenek. */
  type: 'text' | 'multiline' | 'number' | 'select';
  options?: { value: string; label: string }[];
  hint?: string;
  maxLength?: number;
}

interface KindSpec {
  label: string;
  table: string;
  select: string;
  statusColumn: string | null;
  /** Durum sütununun alabileceği değerler; yoksa durum değiştirilemiyor. */
  statuses: readonly string[];
  /**
   * Tabloda `deleted_at` var mı (FAZ 3).
   *
   * Forum konularında YOK: soft delete altı içerik tablosuna eklendi,
   * forum kendi kilit mekanizmasıyla yönetiliyor. Bayrak olmadan
   * "silinmişler" sekmesi forum için var olmayan bir kolonu sorgular ve
   * ham veritabanı hatası verirdi.
   */
  softDeletable: boolean;
  orderColumn: string;
  map: (row: Record<string, unknown>) => RecordRow;
  /** Panelden düzenlenebilen alanlar; boşsa düzenleme açılmıyor. */
  editFields: EditField[];
  /**
   * Kaydın SAHİBİNİ tutan kolon.
   *
   * Bildirim için gerekli: yöneticinin düzenlediği içeriğin sahibi bunu
   * öğrenmeli. Sessiz düzenleme, kullanıcının kendi yazdığını sandığı
   * bir metnin değişmiş olması demek — ve bunu fark ettiğinde güveni
   * kaybolan taraf biz oluruz.
   */
  ownerColumn: string | null;
}

const s = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() !== '' ? v : null;

export const RECORD_KINDS: Record<RecordKind, KindSpec> = {
  photo: {
    label: 'Fotoğraflar',
    table: 'astro_photos',
    select:
      'id, slug, title, status, created_at, deleted_at, ' +
      'profiles!astro_photos_user_id_profiles_fkey(username)',
    statusColumn: 'status',
    statuses: [...CONTENT_STATUSES],
    softDeletable: true,
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
      deletedAt: s(r.deleted_at),
    }),
    ownerColumn: 'user_id',
    editFields: [
      { column: 'title', label: 'Başlık', type: 'text', maxLength: 120 },
      {
        column: 'description',
        label: 'Açıklama',
        type: 'multiline',
        maxLength: 2000,
      },
      {
        column: 'target_label',
        label: 'Hedef etiketi',
        type: 'text',
        hint: 'Katalog bağı ayrı; bu yalnızca gösterilen metin.',
        maxLength: 120,
      },
    ],
  },
  listing: {
    label: 'İlanlar',
    table: 'listings',
    select: 'id, slug, title, status, created_at, deleted_at, city',
    statusColumn: 'status',
    statuses: [...CONTENT_STATUSES],
    softDeletable: true,
    orderColumn: 'created_at',
    map: (r) => ({
      id: String(r.id),
      title: s(r.title) ?? '(başlıksız)',
      subtitle: s(r.city),
      status: String(r.status ?? '—'),
      createdAt: s(r.created_at),
      path: s(r.slug) ? `/ilan/${r.slug}` : null,
      deletedAt: s(r.deleted_at),
    }),
    ownerColumn: 'seller_id',
    editFields: [
      { column: 'title', label: 'Başlık', type: 'text', maxLength: 120 },
      {
        column: 'description',
        label: 'Açıklama',
        type: 'multiline',
        maxLength: 4000,
      },
      {
        column: 'category_id',
        label: 'Kategori',
        type: 'select',
        options: equipmentCategoryOrder.map((category) => ({
          value: category,
          label: equipmentCategoryLabels[category],
        })),
      },
      { column: 'price', label: 'Fiyat', type: 'number' },
      {
        column: 'currency',
        label: 'Para birimi',
        type: 'select',
        options: listingCurrencies.map((currency) => ({
          value: currency,
          label: listingCurrencyLabels[currency],
        })),
      },
      { column: 'city', label: 'Şehir', type: 'text', maxLength: 60 },
    ],
  },
  thread: {
    label: 'Forum konuları',
    table: 'forum_threads',
    select: 'id, slug, title, created_at, locked, category_id',
    /* Forumda `status` yok; kilit tek durum ve ayrı bir kolon. */
    statusColumn: null,
    statuses: [],
    softDeletable: false,
    orderColumn: 'created_at',
    map: (r) => ({
      id: String(r.id),
      title: s(r.title) ?? '(başlıksız)',
      subtitle: s(r.category_id),
      status: r.locked ? 'kilitli' : 'açık',
      createdAt: s(r.created_at),
      path: s(r.slug) ? `/forum/${r.slug}` : null,
      deletedAt: null,
    }),
    ownerColumn: 'author_id',
    editFields: [
      { column: 'title', label: 'Başlık', type: 'text', maxLength: 160 },
      {
        column: 'body',
        label: 'Gövde',
        type: 'multiline',
        hint: 'Moderasyon düzeltmesi; sahibine bildirim gider.',
        maxLength: 8000,
      },
    ],
  },
  event: {
    label: 'Etkinlikler',
    table: 'events',
    select: 'id, slug, title, status, starts_at, created_at, deleted_at, city',
    statusColumn: 'status',
    statuses: [...CONTENT_STATUSES],
    softDeletable: true,
    orderColumn: 'starts_at',
    map: (r) => ({
      id: String(r.id),
      title: s(r.title) ?? '(başlıksız)',
      subtitle: s(r.city),
      status: String(r.status ?? '—'),
      createdAt: s(r.starts_at) ?? s(r.created_at),
      path: s(r.slug) ? `/etkinlik/${r.slug}` : null,
      deletedAt: s(r.deleted_at),
    }),
    ownerColumn: 'organizer_id',
    editFields: [
      { column: 'title', label: 'Başlık', type: 'text', maxLength: 160 },
      {
        column: 'description',
        label: 'Açıklama',
        type: 'multiline',
        maxLength: 4000,
      },
      { column: 'city', label: 'Şehir', type: 'text', maxLength: 60 },
      { column: 'venue', label: 'Mekân', type: 'text', maxLength: 160 },
      {
        column: 'rules',
        label: 'Katılım kuralları',
        type: 'multiline',
        maxLength: 2000,
      },
    ],
  },
  site: {
    label: 'Gözlem noktaları',
    table: 'observing_sites',
    /* Gözlem noktasında `city` YOK, `region` var — konum burada ilçe
       değil bölge olarak tutuluyor (nokta koordinatı ayrı). */
    select: 'id, slug, name, status, created_at, deleted_at, region',
    statusColumn: 'status',
    statuses: [...CONTENT_STATUSES],
    softDeletable: true,
    orderColumn: 'created_at',
    map: (r) => ({
      id: String(r.id),
      title: s(r.name) ?? '(adsız)',
      subtitle: s(r.region),
      status: String(r.status ?? '—'),
      createdAt: s(r.created_at),
      path: s(r.slug) ? `/saha/${r.slug}` : null,
      deletedAt: s(r.deleted_at),
    }),
    ownerColumn: 'submitted_by',
    editFields: [
      { column: 'name', label: 'Ad', type: 'text', maxLength: 120 },
      { column: 'region', label: 'Bölge', type: 'text', maxLength: 120 },
      {
        column: 'description',
        label: 'Açıklama',
        type: 'multiline',
        maxLength: 4000,
      },
      {
        column: 'warnings',
        label: 'Uyarılar',
        type: 'multiline',
        hint: 'Yol, güvenlik, izin — ziyaretçinin önceden bilmesi gerekenler.',
        maxLength: 2000,
      },
    ],
  },
};

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

/**
 * Kayıt listesi.
 *
 * `deleted` bayrağı iki ayrı görünüm veriyor (FAZ 3): varsayılan liste
 * YAŞAYAN kayıtları, `deleted: true` ise SİLİNMİŞLERİ gösteriyor. İkisini
 * tek listede karıştırmak, silinmiş kaydı yanlışlıkla düzenlemeye açık
 * bırakırdı; ayrı sekme "burada olanlar geri alınabilir" diyor.
 *
 * Forum konularında `deleted_at` yok; o türde bayrak yok sayılıyor.
 */
export async function fetchRecords(
  kind: RecordKind,
  limit = 40,
  slug?: string | null,
  options: { deleted?: boolean } = {}
): Promise<RecordRow[]> {
  const spec = RECORD_KINDS[kind];
  const supabase = await client();

  let query = supabase
    .from(spec.table)
    .select(spec.select)
    .order(spec.orderColumn, { ascending: false })
    .limit(limit);

  if (spec.softDeletable) {
    query = options.deleted
      ? query.not('deleted_at', 'is', null)
      : query.is('deleted_at', null);
  }

  if (slug) query = query.eq('slug', slug);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = ((data ?? []) as unknown as Record<string, unknown>[]).map(
    spec.map
  );
  return kind === 'event' && !options.deleted ? mergeEventSeeds(rows, limit) : rows;
}

/**
 * Public etkinlik kataloğu veritabanı + tohum kayıtlarından oluşuyor.
 * Admin listesi yalnızca `events` tablosunu okuyunca Ethem Hoca gibi
 * sitede görünen ama DB'de olmayan doğrulanmış katalog etkinlikleri
 * panelde yokmuş gibi görünüyordu.
 */
export function mergeEventSeeds(rows: RecordRow[], limit: number): RecordRow[] {
  const slugs = new Set(
    rows
      .map((row) => row.path?.split('/').pop())
      .filter((slug): slug is string => Boolean(slug))
  );

  return [
    ...rows,
    ...eventsSeed
      .filter((event) => !slugs.has(event.slug))
      .map(
        (event): RecordRow => ({
          id: `seed:${event.slug}`,
          title: event.title,
          subtitle: event.city,
          status: 'yayinda',
          createdAt: event.startsAt,
          path: `/etkinlik/${event.slug}`,
          deletedAt: null,
          readOnly: true,
        })
      ),
  ]
    .sort(
      (a, b) =>
        new Date(b.createdAt ?? 0).getTime() -
        new Date(a.createdAt ?? 0).getTime()
    )
    .slice(0, limit);
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

/**
 * Düzenlenebilir alanların MEVCUT değerleri.
 *
 * Liste sorgusu bunları çekmiyor — 200 satırlık bir listede her kaydın
 * 4.000 karakterlik açıklamasını indirmek, kullanıcının açmayacağı veri
 * için bant genişliği harcamak olurdu. Form açıldığında tek kayıt
 * çekiliyor.
 */
export async function fetchRecordDetail(
  kind: RecordKind,
  id: string
): Promise<Record<string, string>> {
  const spec = RECORD_KINDS[kind];
  if (spec.editFields.length === 0) {
    throw new Error(`${spec.label} bu ekrandan düzenlenemiyor.`);
  }

  const supabase = await client();
  const { data, error } = await supabase
    .from(spec.table)
    .select(spec.editFields.map((f) => f.column).join(', '))
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Kayıt bulunamadı.');

  const row = data as unknown as Record<string, unknown>;
  const values: Record<string, string> = {};
  for (const field of spec.editFields) {
    const raw = row[field.column];
    /* `null` boş dizeye çevriliyor: form kutusuna "null" yazmak yerine
       boş göstermek doğru, ve geri yazarken boş dize yeniden `null`
       oluyor (bkz. `updateRecord`). */
    values[field.column] = raw === null || raw === undefined ? '' : String(raw);
  }
  return values;
}

/**
 * KAYIT ALANLARINI GÜNCELLER — iz bırakarak ve sahibine söyleyerek.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ÜÇ İŞ, TEK ÇAĞRI
 *
 *   1. Yazma. Yalnızca tür tanımındaki alanlar; jenerik form ne
 *      gönderirse göndersin, beyaz liste dışı kolon yazılmıyor.
 *   2. DENETİM İZİ (`denetim_yaz`). Hangi alanın ne olduğu detayda
 *      duruyor. İzsiz düzenleme, bir kullanıcının metninin sessizce
 *      değişmesi demek — ve sonradan "ben böyle yazmamıştım" dendiğinde
 *      elimizde cevap olmaz.
 *   3. SAHİBİNE BİLDİRİM. Kararı veren siz oldunuz: yönetici düzenlemesi
 *      görünür olmalı. Sahibi kendi içeriğinin değiştiğini bizden
 *      öğrenmeli, tesadüfen değil.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SIRA VE HATA DAVRANIŞI
 *
 * Yazma başarısızsa iz de bildirim de atılmıyor — olmayan bir
 * değişikliğin izini bırakmak, günlüğü yalancı yapar.
 *
 * İz ya da bildirim başarısızsa YAZMA GERİ ALINMIYOR ve hata da
 * yutulmuyor: çağıran tarafa "kaydedildi ama iz/bildirim atılamadı"
 * diye dönüyor. Kaydı geri almak, başarılı bir düzenlemeyi yan bir
 * sistemin arızası yüzünden iptal etmek olurdu.
 */
export async function updateRecord(
  kind: RecordKind,
  id: string,
  values: Record<string, string>
): Promise<{ warning: string | null }> {
  const spec = RECORD_KINDS[kind];
  if (spec.editFields.length === 0) {
    throw new Error(`${spec.label} bu ekrandan düzenlenemiyor.`);
  }

  const payload: Record<string, string | number | null> = {};
  for (const field of spec.editFields) {
    if (!(field.column in values)) continue;
    const raw = values[field.column].trim();

    if (field.type === 'number') {
      if (raw === '') {
        payload[field.column] = null;
        continue;
      }
      const sayi = Number(raw);
      if (!Number.isFinite(sayi)) {
        throw new Error(`${field.label} sayı olmalı.`);
      }
      payload[field.column] = sayi;
      continue;
    }

    if (field.type === 'select') {
      if (!field.options?.some((option) => option.value === raw)) {
        throw new Error(`${field.label} geçerli bir seçenek olmalı.`);
      }
      payload[field.column] = raw;
      continue;
    }

    if (field.maxLength && raw.length > field.maxLength) {
      throw new Error(
        `${field.label} en fazla ${field.maxLength} karakter olabilir.`
      );
    }
    /* Boş dize `null` olarak yazılıyor: "girilmemiş" ile "boş bırakılmış"
       arasındaki farkı korumak, sayfaların "—" gösterebilmesini
       sağlıyor. */
    payload[field.column] = raw === '' ? null : raw;
  }

  if (Object.keys(payload).length === 0) {
    throw new Error('Değiştirilecek alan yok.');
  }

  const supabase = await client();

  /* Sahibi ÖNCE okunuyor: güncellemeden sonra okusaydık ve sahip kolonu
     bir tetikleyiciyle değişseydi yanlış kişiye bildirim giderdi. */
  let ownerId: string | null = null;
  let sahipHatasi: string | null = null;
  if (spec.ownerColumn) {
    const { data: sahip, error: sahipError } = await supabase
      .from(spec.table)
      .select(spec.ownerColumn)
      .eq('id', id)
      .maybeSingle();
    /*
     * Hata YUTULMUYOR ama yazmayı da DURDURMUYOR: sahibi okuyamamak
     * düzenlemenin kendisini geçersiz kılmaz, yalnızca bildirimi
     * engeller. Aşağıdaki uyarı listesine giriyor, böylece yönetici
     * sahibinin haberdar edilmediğini biliyor.
     */
    if (sahipError) sahipHatasi = sahipError.message;
    const deger = (sahip as Record<string, unknown> | null)?.[spec.ownerColumn];
    ownerId = typeof deger === 'string' ? deger : null;
  }

  const { data, error } = await supabase
    .from(spec.table)
    .update(payload)
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error('Kayıt güncellenemedi — bulunamadı ya da yetki yok.');
  }

  const uyarilar: string[] = [];
  if (sahipHatasi) uyarilar.push(`içerik sahibi okunamadı (${sahipHatasi})`);

  const { error: izError } = await supabase.rpc('denetim_yaz', {
    p_action: 'content.edit',
    p_target_type: kind,
    p_target_id: id,
    p_detail: { alanlar: Object.keys(payload) },
  });
  if (izError) uyarilar.push('denetim kaydı yazılamadı');

  if (ownerId) {
    const { error: bildirimError } = await supabase.rpc('notify_user', {
      recipient: ownerId,
      title: `${spec.label} içeriğiniz düzenlendi`,
      body: `Yönetim şu alanları güncelledi: ${Object.keys(payload).join(', ')}.`,
      url: null,
    });
    if (bildirimError) uyarilar.push('sahibine bildirim gönderilemedi');
  }

  return {
    warning: uyarilar.length > 0 ? uyarilar.join(' · ') : null,
  };
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
 * SOFT DELETE (FAZ 3, plan görev 5).
 *
 * Kayıt public'ten düşüyor ama veritabanında duruyor ve geri alınabiliyor.
 * `deleted_by` ile denetim kaydını `app.icerik_silme_izi()` tetikleyicisi
 * yazıyor — istemci kimliği göndermiyor.
 */
export async function softDeleteRecord(
  kind: RecordKind,
  id: string
): Promise<void> {
  const spec = RECORD_KINDS[kind];
  if (!spec.softDeletable) {
    throw new Error(`${spec.label} için kaldırma bu ekrandan yapılamıyor.`);
  }

  const supabase = await client();
  const { data, error } = await supabase
    .from(spec.table)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error('Kayıt kaldırılamadı — bulunamadı ya da yetki yok.');
  }
}

/** Silinmiş kaydı geri getirir (plan görev 5). */
export async function restoreRecord(
  kind: RecordKind,
  id: string
): Promise<void> {
  const spec = RECORD_KINDS[kind];
  if (!spec.softDeletable) {
    throw new Error(`${spec.label} için geri alma yok.`);
  }

  const supabase = await client();
  const { data, error } = await supabase
    .from(spec.table)
    .update({ deleted_at: null })
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error('Kayıt geri alınamadı — bulunamadı ya da yetki yok.');
  }
}

/**
 * Kalıcı silme — YALNIZCA ADMİN.
 *
 * Geri alınamaz ve bağlı kayıtları da götürüyor (fotoğrafın beğenileri,
 * yorumları, puanları `on delete cascade`). Arayüz ayrı bir onay istiyor;
 * buradaki fonksiyon onayı VARSAYIYOR.
 *
 * Yetki sınırı `*_hard_delete_admin` kısıtlayıcı politikalarında. Moderatör
 * çağırırsa RLS isteği süzüyor ve PostgREST sıfır satırda HATA DÖNDÜRMÜYOR;
 * `select('id')` bunu hataya çeviriyor ki çağıran sessizce "silindi"
 * sanmasın.
 */
export async function deleteRecord(
  kind: RecordKind,
  id: string
): Promise<void> {
  const spec = RECORD_KINDS[kind];
  const supabase = await client();
  const { data, error } = await supabase
    .from(spec.table)
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error(
      'Kalıcı silme reddedildi — bu işlem yalnızca yöneticilere açık.'
    );
  }
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
  /** Eylemi yapanın kullanıcı adı; `actor_id` NULL ise (sistem) yok. */
  actorName: string | null;
  createdAt: string;
  /** Eyleme göre şekli değişen ayrıntı; öncesi/sonrası burada. */
  detail: Record<string, unknown>;
}

export interface AuditQuery {
  /** Eylem kodu ya da bir parçası (`user.` → tüm kullanıcı eylemleri). */
  action?: string;
  targetType?: string;
  /** ISO tarih (gün başlangıcı) — bu tarihten itibaren. */
  from?: string;
  /** ISO tarih — bu tarihe kadar (gün sonuna genişletiliyor). */
  to?: string;
  limit?: number;
}

/**
 * DENETİM KAYDI OKUMA (Görev 1.6).
 *
 * ══════════════════════════════════════════════════════════════════════
 * `actor_id` DEĞİL, KULLANICI ADI
 *
 * Ham UUID bir yöneticiye hiçbir şey söylemiyor: "8f2c1a…" kim? İkinci
 * bir sorguyla `profiles`tan adlar çekiliyor ve satıra yazılıyor.
 * PostgREST gömmesi kullanılmadı çünkü `audit_logs.actor_id` üzerinde
 * yabancı anahtar `auth.users`a gidiyor, `profiles`a değil — gömme o
 * yolu göremiyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TARİH ARALIĞI GÜN SONUNA GENİŞLİYOR
 *
 * Kullanıcı "5 Ağustos'a kadar" derken 5 Ağustos'u dahil kastediyor.
 * Ham `lte` ile o gün saat 00:00'dan sonrası düşerdi; bitiş tarihi bir
 * gün ileri alınıp `lt` uygulanıyor.
 */
export async function fetchAuditLog(
  query: AuditQuery = {}
): Promise<AuditRow[]> {
  const { action = '', targetType = '', from = '', to = '', limit = 100 } = query;
  const supabase = await client();

  let sorgu = supabase
    .from('audit_logs')
    .select('id, action, target_type, target_id, actor_id, created_at, detail')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (action.trim()) sorgu = sorgu.ilike('action', `%${action.trim()}%`);
  if (targetType.trim()) sorgu = sorgu.eq('target_type', targetType.trim());
  if (from) sorgu = sorgu.gte('created_at', from);
  if (to) {
    const bitis = new Date(to);
    bitis.setDate(bitis.getDate() + 1);
    sorgu = sorgu.lt('created_at', bitis.toISOString());
  }

  const { data, error } = await sorgu;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as {
    id: string;
    action: string;
    target_type: string | null;
    target_id: string | null;
    actor_id: string | null;
    created_at: string;
    detail: Record<string, unknown> | null;
  }[];

  /* Eylemi yapanların adları — tek sorguda, benzersiz kimliklerle. */
  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter(Boolean))] as string[];
  const adlar = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: profiles, error: adHatasi } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', actorIds);
    if (adHatasi) console.warn(`kullanıcı adları okunamadı: ${adHatasi.message}`);
    for (const p of (profiles ?? []) as { id: string; username: string }[]) {
      adlar.set(p.id, p.username);
    }
  }

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    targetType: r.target_type,
    targetId: r.target_id,
    actorId: r.actor_id,
    actorName: r.actor_id ? (adlar.get(r.actor_id) ?? null) : null,
    createdAt: r.created_at,
    detail: r.detail ?? {},
  }));
}

/**
 * Kayıtta geçen eylem kodları ve hedef tipleri — filtre listesi için.
 *
 * Sabit bir liste yazmadım: yeni bir tetikleyici yeni bir eylem kodu
 * getirdiğinde filtre onu kendiliğinden görsün. Karşılığı fazladan bir
 * sorgu, ama denetim ekranı sık açılan bir yer değil.
 */
export async function fetchAuditFacets(): Promise<{
  actions: string[];
  targetTypes: string[];
}> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('audit_logs')
    .select('action, target_type')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as { action: string; target_type: string | null }[];
  return {
    actions: [...new Set(rows.map((r) => r.action))].sort(),
    targetTypes: [
      ...new Set(rows.map((r) => r.target_type).filter(Boolean) as string[]),
    ].sort(),
  };
}

/**
 * YÖNETİM GÖSTERGE PANELİ — tek çağrı (Görev 1.2).
 *
 * ══════════════════════════════════════════════════════════════════════
 * SAYILAR NEDEN RPC'DEN
 *
 * Belge §1.2 "tek RPC/görünüm, N ayrı sorgu değil" diyor ve gerekçesi
 * ölçülebilir: dokuz sayı dokuz istek demek — dokuz ağ gidiş-dönüşü,
 * dokuz ayrı hata yolu ve ekranda dokuz ayrı "—".
 *
 * Ölçülen eski durum daha kötüydü: panel yalnızca moderasyon sayımlarını
 * gösteriyordu ve onları da kuyruğun İLK 100 kaydından istemcide
 * hesaplıyordu. 100'den fazla kayıt olduğunda sayı yanlıştı ve yanlış
 * olduğunu söyleyen bir şey yoktu.
 *
 * Yetki kontrolü fonksiyonun içinde (`app.admin_dashboard`); burada
 * ikinci bir kontrol yok, çünkü asıl sınır orası.
 */
export interface DashboardStats {
  kullaniciToplam: number;
  kullaniciYeni7g: number;
  kullaniciAskida: number;
  moderasyonBekleyen: number;
  icerikTaslak: number;
  icerikYayinda: number;
  fotografBekleyen: number;
  silmeTalebi: number;
  auditBugun: number;
  sonHareketler: {
    zaman: string;
    eylem: string;
    hedef: string | null;
    kim: string | null;
  }[];
}

export async function fetchDashboard(): Promise<DashboardStats> {
  const supabase = await client();
  const { data, error } = await supabase.rpc('admin_dashboard');
  if (error) throw new Error(error.message);

  const d = (data ?? {}) as Record<string, unknown>;
  const sayi = (k: string) => Number(d[k] ?? 0);

  return {
    kullaniciToplam: sayi('kullanici_toplam'),
    kullaniciYeni7g: sayi('kullanici_yeni_7g'),
    kullaniciAskida: sayi('kullanici_askida'),
    moderasyonBekleyen: sayi('moderasyon_bekleyen'),
    icerikTaslak: sayi('icerik_taslak'),
    icerikYayinda: sayi('icerik_yayinda'),
    fotografBekleyen: sayi('fotograf_bekleyen'),
    silmeTalebi: sayi('silme_talebi'),
    auditBugun: sayi('audit_bugun'),
    sonHareketler: (d.son_hareketler ?? []) as DashboardStats['sonHareketler'],
  };
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';

/**
 * KOLEKSİYONLAR — fotoğraf seçkileri.
 *
 * `collections` ve `collection_items` zaten adlandırılmış listeleri
 * destekliyordu. Arayüz artık aynı modeli açıyor: fotoğraf detayında
 * koleksiyon seçilir, Hesabım altında listeler yönetilir. Tek fotoğrafın
 * aynı kullanıcıda tek koleksiyonda kalması RPC/trigger tarafında
 * korunur; istemci aynı kuralı sadece anlık görünüm için takip eder.
 */

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

export interface SavedState {
  collectionId: string | null;
  collectionName: string | null;
  collections: CollectionSummary[];
  saved: boolean;
  /** Oturum yok ya da kayıt yapılamaz — arayüz girişe yönlendirir. */
  canSave: boolean;
  loading: boolean;
  busy: boolean;
  error: string | null;
  moveTo: (collectionId: string) => Promise<void>;
  remove: () => Promise<void>;
  createAndMove: (name: string) => Promise<void>;
  toggle: () => Promise<void>;
}

export interface CollectionSummary {
  id: string;
  name: string;
  slug: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionPhoto {
  photoId: string;
  slug: string;
  title: string;
  thumbPath: string | null;
  addedAt: string;
}

export interface PhotoCollection extends CollectionSummary {
  photos: CollectionPhoto[];
}

export interface CollectionsManagerState {
  collections: PhotoCollection[];
  loading: boolean;
  busy: boolean;
  error: string | null;
  canManage: boolean;
  refresh: () => void;
  create: (name: string) => Promise<string | null>;
  rename: (collectionId: string, name: string) => Promise<void>;
  removeCollection: (collectionId: string) => Promise<void>;
  movePhoto: (photoId: string, collectionId: string) => Promise<void>;
  removePhoto: (photoId: string) => Promise<void>;
}

export function collectionSlug(name: string): string {
  return (
    name
      .trim()
      .toLocaleLowerCase('tr-TR')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'koleksiyon'
  );
}

export function nextCollectionSlug(
  name: string,
  existing: Iterable<string>
): string {
  const used = new Set(existing);
  const base = collectionSlug(name);
  if (!used.has(base)) return base;

  for (let i = 2; i < 1000; i += 1) {
    const suffix = `-${i}`;
    const candidate = `${base.slice(0, 60 - suffix.length)}${suffix}`;
    if (!used.has(candidate)) return candidate;
  }

  return `${base.slice(0, 51)}-${Date.now().toString(36)}`;
}

async function createCollection(
  userId: string,
  name: string,
  existingSlugs: Iterable<string>
): Promise<CollectionSummary> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Koleksiyon adı boş olamaz.');

  const supabase = await client();
  const { data, error } = await supabase
    .from('collections')
    .insert({
      user_id: userId,
      name: trimmed,
      slug: nextCollectionSlug(trimmed, existingSlugs),
    })
    .select('id, name, slug, is_public, created_at, updated_at')
    .single();

  if (error) throw new Error(error.message);
  return mapCollection(data as RawCollection);
}

async function movePhotoToCollection(
  photoId: string,
  collectionId: string | null
): Promise<void> {
  const supabase = await client();
  const { error } = await supabase.rpc('move_photo_to_collection', {
    target_photo: photoId,
    target_collection: collectionId,
  });
  if (error) throw new Error(error.message);
}

/**
 * Bir fotoğrafın kaydedilmiş olup olmadığı.
 *
 * İYİMSER GÜNCELLEME. Kaydetme tek bitlik bir durum: yanlış giderse geri
 * almak bir tıklama. Beğeni ve takiple aynı gerekçe (bkz.
 * `engagement.ts`, `social.ts`); metin taşıyan işlemlerde iyimserlik
 * yapılmıyor.
 */
export function useSavedPhoto(photoId: string | undefined): SavedState {
  const { user } = useAuth();
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [collectionName, setCollectionName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const canSave = Boolean(user && photoId && isSupabaseConfigured);
  const saved = Boolean(collectionId);

  useEffect(() => {
    if (!user || !photoId || !isSupabaseConfigured) {
      setCollections([]);
      setCollectionId(null);
      setCollectionName(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const supabase = await client();
        /*
         * RLS public koleksiyonları da okutuyor. Kişisel "hangi
         * koleksiyonumda?" cevabı için sahibi burada açıkça süzülür.
         */
        const { data } = await supabase
          .from('collection_items')
          .select(
            'photo_id, collections!inner(id, name, slug, is_public, created_at, updated_at)'
          )
          .eq('photo_id', photoId)
          .eq('collections.user_id', user.id)
          .maybeSingle();

        const { data: listData, error: listError } = await supabase
          .from('collections')
          .select('id, name, slug, is_public, created_at, updated_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });
        if (listError) throw new Error(listError.message);
        if (!active) return;

        const current = extractCollection(
          (
            data as {
              collections?: RawCollection | RawCollection[] | null;
            } | null
          )?.collections
        );
        setCollections(
          ((listData as RawCollection[] | null) ?? []).map(mapCollection)
        );
        setCollectionId(current?.id ?? null);
        setCollectionName(current?.name ?? null);
      } catch {
        /* Durum okunamadıysa "kaydedilmedi" varsayılıyor; kullanıcı
           basarsa sunucu doğru durumu döndürüyor. */
        if (active) {
          setCollections([]);
          setCollectionId(null);
          setCollectionName(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user, photoId, tick]);

  const moveTo = useCallback(
    async (targetCollectionId: string) => {
      if (!user || !photoId) return;

      const previousId = collectionId;
      const previousName = collectionName;
      const nextName =
        collections.find((collection) => collection.id === targetCollectionId)
          ?.name ?? null;
      setCollectionId(targetCollectionId);
      setCollectionName(nextName);
      setBusy(true);
      setError(null);

      try {
        await movePhotoToCollection(photoId, targetCollectionId);
        setTick((n) => n + 1);
      } catch (e) {
        setCollectionId(previousId);
        setCollectionName(previousName);
        setError(e instanceof Error ? e.message : 'Koleksiyona eklenemedi');
      } finally {
        setBusy(false);
      }
    },
    [collectionId, collectionName, collections, photoId, user]
  );

  const remove = useCallback(async () => {
    if (!user || !photoId) return;

    const previousId = collectionId;
    const previousName = collectionName;
    setCollectionId(null);
    setCollectionName(null);
    setBusy(true);
    setError(null);

    try {
      await movePhotoToCollection(photoId, null);
      setTick((n) => n + 1);
    } catch (e) {
      setCollectionId(previousId);
      setCollectionName(previousName);
      setError(e instanceof Error ? e.message : 'Koleksiyondan kaldırılamadı');
    } finally {
      setBusy(false);
    }
  }, [collectionId, collectionName, photoId, user]);

  const createAndMove = useCallback(
    async (name: string) => {
      if (!user || !photoId) return;

      setBusy(true);
      setError(null);
      try {
        const collection = await createCollection(
          user.id,
          name,
          collections.map((item) => item.slug)
        );
        await movePhotoToCollection(photoId, collection.id);
        setCollections((items) => [...items, collection]);
        setCollectionId(collection.id);
        setCollectionName(collection.name);
        setTick((n) => n + 1);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Koleksiyon oluşturulamadı');
      } finally {
        setBusy(false);
      }
    },
    [collections, photoId, user]
  );

  const toggle = useCallback(async () => {
    if (!user || !photoId) return;
    if (collectionId) {
      await remove();
      return;
    }

    const fallback =
      collections.find((collection) => collection.slug === 'kaydedilenler') ??
      (await createCollection(
        user.id,
        'Kaydedilenler',
        collections.map((item) => item.slug)
      ));
    await moveTo(fallback.id);
  }, [collectionId, collections, moveTo, photoId, remove, user]);

  return {
    collectionId,
    collectionName,
    collections,
    saved,
    canSave,
    loading,
    busy,
    error,
    moveTo,
    remove,
    createAndMove,
    toggle,
  };
}

export interface SavedPhoto {
  photoId: string;
  slug: string;
  title: string;
  thumbPath: string | null;
  addedAt: string;
}

export interface SavedListState {
  items: SavedPhoto[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Kaydedilen fotoğrafların listesi (panel bölümü).
 *
 * Fotoğraf satırı GÖMÜLÜ geliyor: `collection_items.photo_id` doğrudan
 * `astro_photos`a bakan bir yabancı anahtar, yani PostgREST ilişkiyi
 * kurabiliyor (engelleme listesindeki durumun tersi — orada anahtar
 * `auth.users`a bakıyordu ve ikinci sorgu gerekmişti).
 */
export function useSavedPhotos(): SavedListState {
  const { user } = useAuth();
  const [items, setItems] = useState<SavedPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      setItems([]);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const supabase = await client();
        const { data, error: readError } = await supabase
          .from('collection_items')
          .select(
            'photo_id, added_at, collections!inner(slug), astro_photos!inner(slug, title, thumb_path)'
          )
          .eq('collections.user_id', user.id)
          .eq('collections.slug', 'kaydedilenler')
          .order('added_at', { ascending: false })
          .limit(50);
        if (readError) throw new Error(readError.message);
        if (!active) return;

        interface PhotoSide {
          slug: string;
          title: string;
          thumb_path: string | null;
        }
        interface Row {
          photo_id: string;
          added_at: string;
          /*
           * PostgREST gömülü ilişkiyi tekil nesne olarak döndürüyor ama
           * ÜRETİLEN TİPLER dizi diyor: kardinaliteyi şemadan çıkaramadığı
           * durumlarda geniş tarafı seçiyor. İki biçimi de kabul etmek,
           * `as unknown as` ile tipi zorlamaktan dürüst — gerçekten
           * ikisi de gelebilir.
           */
          astro_photos: PhotoSide | PhotoSide[] | null;
        }

        const tekil = (value: Row['astro_photos']): PhotoSide | null =>
          Array.isArray(value) ? (value[0] ?? null) : value;

        setItems(
          ((data as unknown as Row[] | null) ?? [])
            .map((row) => ({ row, photo: tekil(row.astro_photos) }))
            /* Fotoğraf satırı gelmediyse (RLS ile süzülmüş taslak) kayıt
               atlanıyor: başlıksız bir satır göstermek, kullanıcıya
               kaydettiği şeyin ne olduğunu söylemezdi. */
            .filter(
              (entry): entry is { row: Row; photo: PhotoSide } =>
                entry.photo !== null
            )
            .map(({ row, photo }) => ({
              photoId: row.photo_id,
              slug: photo.slug,
              title: photo.title,
              thumbPath: photo.thumb_path,
              addedAt: row.added_at,
            }))
        );
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Kayıtlar okunamadı');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user, tick]);

  return { items, loading, error, refresh };
}

interface RawCollection {
  id: string;
  name: string;
  slug: string;
  is_public?: boolean;
  created_at?: string;
  updated_at?: string;
  collection_items?: RawCollectionItem[] | null;
}

interface RawCollectionItem {
  photo_id: string;
  added_at: string;
  astro_photos?: RawPhoto | RawPhoto[] | null;
}

interface RawPhoto {
  slug: string;
  title: string;
  thumb_path: string | null;
}

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function extractCollection(
  value: RawCollection | RawCollection[] | null | undefined
): CollectionSummary | null {
  const collection = one(value);
  return collection ? mapCollection(collection) : null;
}

function mapCollection(row: RawCollection): CollectionSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    isPublic: Boolean(row.is_public),
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  };
}

function mapManagerCollection(row: RawCollection): PhotoCollection {
  return {
    ...mapCollection(row),
    photos: (row.collection_items ?? [])
      .map((item) => ({ item, photo: one(item.astro_photos) }))
      .filter(
        (entry): entry is { item: RawCollectionItem; photo: RawPhoto } =>
          entry.photo !== null
      )
      .map(({ item, photo }) => ({
        photoId: item.photo_id,
        slug: photo.slug,
        title: photo.title,
        thumbPath: photo.thumb_path,
        addedAt: item.added_at,
      }))
      .sort((a, b) => b.addedAt.localeCompare(a.addedAt)),
  };
}

export function useCollectionsManager(): CollectionsManagerState {
  const { user } = useAuth();
  const [collections, setCollections] = useState<PhotoCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((n) => n + 1), []);
  const canManage = Boolean(user && isSupabaseConfigured);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      setCollections([]);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const supabase = await client();
        const { data, error: readError } = await supabase
          .from('collections')
          .select(
            'id, name, slug, is_public, created_at, updated_at, collection_items(photo_id, added_at, astro_photos(slug, title, thumb_path))'
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });
        if (readError) throw new Error(readError.message);
        if (active) {
          setCollections(
            ((data as RawCollection[] | null) ?? []).map(mapManagerCollection)
          );
        }
      } catch (e) {
        if (active)
          setError(e instanceof Error ? e.message : 'Koleksiyonlar okunamadı');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user, tick]);

  const slugs = useMemo(
    () => collections.map((item) => item.slug),
    [collections]
  );

  const create = useCallback(
    async (name: string) => {
      if (!user) return null;
      setBusy(true);
      setError(null);
      try {
        const collection = await createCollection(user.id, name, slugs);
        refresh();
        return collection.id;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Koleksiyon oluşturulamadı');
        return null;
      } finally {
        setBusy(false);
      }
    },
    [refresh, slugs, user]
  );

  const rename = useCallback(
    async (collectionId: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        setError('Koleksiyon adı boş olamaz.');
        return;
      }

      setBusy(true);
      setError(null);
      try {
        const current = collections.find((item) => item.id === collectionId);
        const slug =
          current?.name === trimmed
            ? current.slug
            : nextCollectionSlug(
                trimmed,
                collections
                  .filter((item) => item.id !== collectionId)
                  .map((item) => item.slug)
              );
        const supabase = await client();
        const { error: updateError } = await supabase
          .from('collections')
          .update({ name: trimmed, slug })
          .eq('id', collectionId);
        if (updateError) throw new Error(updateError.message);
        refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Koleksiyon güncellenemedi');
      } finally {
        setBusy(false);
      }
    },
    [collections, refresh]
  );

  const removeCollection = useCallback(
    async (collectionId: string) => {
      setBusy(true);
      setError(null);
      try {
        const supabase = await client();
        const { error: deleteError } = await supabase
          .from('collections')
          .delete()
          .eq('id', collectionId);
        if (deleteError) throw new Error(deleteError.message);
        refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Koleksiyon silinemedi');
      } finally {
        setBusy(false);
      }
    },
    [refresh]
  );

  const movePhoto = useCallback(
    async (photoId: string, collectionId: string) => {
      setBusy(true);
      setError(null);
      try {
        await movePhotoToCollection(photoId, collectionId);
        refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Fotoğraf taşınamadı');
      } finally {
        setBusy(false);
      }
    },
    [refresh]
  );

  const removePhoto = useCallback(
    async (photoId: string) => {
      setBusy(true);
      setError(null);
      try {
        await movePhotoToCollection(photoId, null);
        refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Fotoğraf kaldırılamadı');
      } finally {
        setBusy(false);
      }
    },
    [refresh]
  );

  return {
    collections,
    loading,
    busy,
    error,
    canManage,
    refresh,
    create,
    rename,
    removeCollection,
    movePhoto,
    removePhoto,
  };
}

/* ── Kimlik kümeleri — explorer facet'leri için ─────────────────────── */

/**
 * Sayfada süzmek için gereken KİMLİK KÜMESİ.
 *
 * `ready`: küme gerçekten okundu mu. Oturumsuz kullanıcıda ve yükleme
 * sürerken `false` — çağıran taraf facet'i o zaman ÇİZMİYOR
 * (`personalFacets.ts` başlığındaki gerekçe).
 */
export interface IdSet {
  ids: ReadonlySet<string>;
  ready: boolean;
}

const BOS: IdSet = { ids: new Set(), ready: false };

/**
 * Kaydedilen fotoğrafların KİMLİKLERİ — satırların kendisi değil.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN `useSavedPhotos` KULLANILMIYOR
 *
 * O kanca panel bölümü için yazıldı: fotoğraf satırını gömülü
 * getiriyor (başlık, küçük görsel yolu) ve 50 kayıtla sınırlı. Süzgeç
 * için ikisi de yanlış — çizilecek bir şey yok, ama 51'inci kayıttan
 * sonrası SESSİZCE süzgecin dışında kalırdı ve kullanıcı "kaydetmiştim
 * ama görünmüyor" derdi.
 *
 * Bu kanca yalnızca `photo_id` seçiyor ve sınırı yükseltiyor. Sınır
 * hâlâ var (`LIMIT`) çünkü sınırsız bir sorgu bir gün birinin 20 bin
 * kaydında sayfayı kilitler; ama artık gerçekçi bir tavanın üstünde ve
 * aşıldığında `truncated` ile SÖYLENİYOR — sessiz kırpma, yanlış
 * cevabın en sinsi biçimi.
 */
const KIMLIK_SINIRI = 1000;

export interface SavedIdSet extends IdSet {
  /** Sınıra dayanıldı mı — arayüz uyarabilsin diye. */
  truncated: boolean;
}

export function useSavedPhotoIds(): SavedIdSet {
  const { user } = useAuth();
  const [state, setState] = useState<SavedIdSet>({ ...BOS, truncated: false });

  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      setState({ ...BOS, truncated: false });
      return;
    }

    let active = true;
    void (async () => {
      try {
        const supabase = await client();
        const { data, error } = await supabase
          .from('collection_items')
          .select('photo_id, collections!inner(slug)')
          .eq('collections.user_id', user.id)
          .eq('collections.slug', 'kaydedilenler')
          .limit(KIMLIK_SINIRI);
        if (error) throw new Error(error.message);
        if (!active) return;

        const rows = (data ?? []) as { photo_id: string }[];
        setState({
          ids: new Set(rows.map((r) => r.photo_id)),
          ready: true,
          truncated: rows.length >= KIMLIK_SINIRI,
        });
      } catch {
        /* Okunamadıysa facet çizilmiyor: yarım bir küme, "bunu
           kaydetmemişim" diye yanlış cevap üretirdi. */
        if (active) setState({ ...BOS, truncated: false });
      }
    })();

    return () => {
      active = false;
    };
  }, [user]);

  return state;
}

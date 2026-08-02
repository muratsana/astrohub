import { useCallback, useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';

/**
 * KOLEKSİYONLAR — "kaydet" düğmesinin arkası.
 *
 * ŞEMA İKİ TABLO, ARAYÜZ TEK KOLEKSİYON. `collections` +
 * `collection_items` adlandırılmış listeleri destekliyor (0048); bugün
 * gösterilen tek yüzey varsayılan "Kaydedilenler". İkinci koleksiyonun
 * arayüzü gelene kadar kullanıcıya seçim sunulmuyor — çalışmayan bir
 * "koleksiyona ekle" menüsü, olmayan bir özelliği varmış gibi
 * göstermekti.
 *
 * KAYDETME TEK ÇAĞRI. `toggle_saved_photo` varsayılan koleksiyonu
 * gerekirse kendisi açıyor; istemci "önce koleksiyon var mı" diye
 * sormuyor. İki gidiş-dönüş, ilk kaydetmede yarış koşulu demekti.
 */

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

export interface SavedState {
  saved: boolean;
  /** Oturum yok ya da kayıt yapılamaz — arayüz girişe yönlendirir. */
  canSave: boolean;
  busy: boolean;
  error: string | null;
  toggle: () => Promise<void>;
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
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = Boolean(user && photoId && isSupabaseConfigured);

  useEffect(() => {
    if (!user || !photoId || !isSupabaseConfigured) {
      setSaved(false);
      return;
    }

    let active = true;
    void (async () => {
      try {
        const supabase = await client();
        /*
         * RLS zaten koleksiyonları kullanıcının kendi satırlarına
         * indiriyor; `user_id` süzgeci yazmıyoruz. Yazsaydık aynı kuralı
         * iki yerde tutmuş olurduk.
         */
        const { data } = await supabase
          .from('collection_items')
          .select('photo_id, collections!inner(slug)')
          .eq('photo_id', photoId)
          .eq('collections.slug', 'kaydedilenler')
          .maybeSingle();
        if (active) setSaved(Boolean(data));
      } catch {
        /* Durum okunamadıysa "kaydedilmedi" varsayılıyor; kullanıcı
           basarsa sunucu doğru durumu döndürüyor. */
        if (active) setSaved(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user, photoId]);

  const toggle = useCallback(async () => {
    if (!user || !photoId) return;

    const next = !saved;
    setSaved(next);
    setBusy(true);
    setError(null);

    try {
      const supabase = await client();
      const { data, error: writeError } = await supabase.rpc(
        'toggle_saved_photo',
        { target_photo: photoId }
      );
      if (writeError) throw new Error(writeError.message);
      /* Sunucunun döndürdüğü durum otorite: iki sekme açıksa iyimser
         tahmin yanlış olabilir. */
      setSaved(Boolean(data));
    } catch (e) {
      setSaved(!next);
      setError(e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setBusy(false);
    }
  }, [user, photoId, saved]);

  return { saved, canSave, busy, error, toggle };
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
            .filter((entry): entry is { row: Row; photo: PhotoSide } =>
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

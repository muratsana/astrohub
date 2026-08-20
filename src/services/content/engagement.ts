import { useCallback, useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import { sanitizeText } from '@/lib/sanitize';

/**
 * BEĞENİ VE YORUM.
 *
 * Şema ve RLS hazırdı; `photo_likes` ve `photo_comments` tabloları boştu
 * çünkü istemci tarafı hiç yazılmamıştı. Fotoğraf detayında beğeni sayısı
 * duruyordu ama tıklanamıyordu — sayının kendisi bile tohum veriden
 * geliyordu.
 *
 * BEĞENİ İYİMSER, YORUM DEĞİL. Beğeni tek bitlik bir durum: yanlış
 * giderse geri almak bir tıklama ve arada gösterilen sayı bir saniye
 * şişik kalıyor. Yorum ise metin; iyimser eklenip sonra kaybolan bir
 * yorum kullanıcıya "yazdım mı yazmadım mı" sorusunu sordurur.
 *
 * SAYIM TETİKLEYİCİDE. `like_count` kolonunu istemciden artırmıyoruz;
 * veritabanı tetikleyicisi sayıyor. İki kaynak olsaydı ikisi ayrışırdı ve
 * hangisinin doğru olduğu belli olmazdı.
 */

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

export interface LikeState {
  liked: boolean;
  count: number;
  /** Oturum yoksa beğeni yazılamaz; arayüz girişe yönlendirir. */
  canLike: boolean;
  busy: boolean;
  error: string | null;
  toggle: () => Promise<void>;
}

/**
 * Fotoğraf beğenisi.
 *
 * `photoId` yoksa (tohum veriyle çalışan bir kurulum) kanca hiçbir istek
 * yapmıyor ve `canLike` false kalıyor: kaydı olmayan bir fotoğrafı
 * beğenmek anlamsız.
 */
export function usePhotoLike(
  photoId: string | undefined,
  initialCount: number
): LikeState {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setCount(initialCount), [initialCount]);

  /* Kullanıcının bu fotoğrafı beğenip beğenmediği ayrı bir sorgu:
     liste sorgusuna eklemek her fotoğraf için kullanıcıya özel bir alan
     demekti ve önbelleği kullanıcı başına parçalardı. */
  useEffect(() => {
    if (!photoId || !user || !isSupabaseConfigured) {
      setLiked(false);
      return;
    }

    let active = true;
    void (async () => {
      try {
        const supabase = await client();
        const { data } = await supabase
          .from('photo_likes')
          .select('photo_id')
          .eq('photo_id', photoId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (active) setLiked(Boolean(data));
      } catch {
        /* Beğeni durumu okunamadıysa varsayılan "beğenmedim" kalır;
           kullanıcı tıklarsa veritabanı zaten tekrarı reddediyor. */
      }
    })();

    return () => {
      active = false;
    };
  }, [photoId, user]);

  const toggle = useCallback(async () => {
    if (!photoId || !user) return;

    const next = !liked;
    setLiked(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    setBusy(true);
    setError(null);

    try {
      const supabase = await client();
      const { error: writeError } = next
        ? await supabase
            .from('photo_likes')
            .upsert(
              { photo_id: photoId, user_id: user.id },
              { onConflict: 'photo_id,user_id' }
            )
        : await supabase
            .from('photo_likes')
            .delete()
            .eq('photo_id', photoId)
            .eq('user_id', user.id);

      if (writeError) throw new Error(writeError.message);
    } catch (e) {
      /* İyimser değişikliği geri al: sayının bir süre yanlış kalması
         kabul edilebilir, kalıcı olarak yanlış kalması değil. */
      setLiked(!next);
      setCount((c) => Math.max(0, c + (next ? -1 : 1)));
      setError(e instanceof Error ? e.message : 'Beğeni kaydedilemedi');
    } finally {
      setBusy(false);
    }
  }, [photoId, user, liked]);

  return {
    liked,
    count,
    canLike: Boolean(photoId && user && isSupabaseConfigured),
    busy,
    error,
    toggle,
  };
}

export interface PhotoComment {
  id: string;
  body: string;
  createdAt: string;
  author: { username: string; displayName: string; avatarPath: string | null };
  /**
   * Moderasyon kaldırdıysa gösterilecek gerekçe; doluysa `body` boştur.
   *
   * Kaldırılan yorum listeden düşmüyor. Bir yorumu izsiz silmek, ona
   * verilen yanıtları anlamsız bırakıyor ve okuyan kişiye hiçbir şey
   * söylemiyor.
   */
  removalReason?: string;
}

interface CommentRow {
  id: string;
  body: string;
  created_at: string;
  removal_reason: string | null;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_path: string | null;
  } | null;
}

export interface CommentThread {
  comments: PhotoComment[];
  loading: boolean;
  canWrite: boolean;
  busy: boolean;
  error: string | null;
  send: (body: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Oturumdaki kullanıcının kimliği — kendi yorumunu silebilsin. */
  currentUsername: string | null;
}

export function usePhotoComments(photoId: string | undefined): CommentThread {
  const { user } = useAuth();
  const [comments, setComments] = useState<PhotoComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!photoId || !isSupabaseConfigured) {
      setComments([]);
      return;
    }
    setLoading(true);
    try {
      const supabase = await client();
      const { data, error: readError } = await supabase
        .from('photo_comments')
        .select(
          'id, body, created_at, removal_reason, ' +
            'profiles!photo_comments_user_id_profiles_fkey(username, display_name, avatar_path)'
        )
        .eq('photo_id', photoId)
        .order('created_at', { ascending: true });

      if (readError) throw new Error(readError.message);

      setComments(
        (data as unknown as CommentRow[]).map((row) => ({
          id: row.id,
          body: row.body,
          createdAt: row.created_at,
          /* Boş dize `undefined`a düşürülüyor: arayüz "gerekçe var mı"
             diye baktığı için boş bir metni geçirmek, açıklaması olmayan
             bir kaldırma kutusu çizdirirdi. */
          removalReason: (row.removal_reason ?? '').trim() || undefined,
          author: {
            username: row.profiles?.username ?? 'bilinmiyor',
            displayName:
              row.profiles?.display_name ??
              row.profiles?.username ??
              'Bilinmiyor',
            avatarPath: row.profiles?.avatar_path ?? null,
          },
        }))
      );
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yorumlar okunamadı');
    } finally {
      setLoading(false);
    }
  }, [photoId]);

  useEffect(() => {
    void load();
  }, [load]);

  /* Kendi kullanıcı adını biliyoruz ki "sil" düğmesi yalnızca kendi
     yorumunda görünsün. RLS zaten başkasınınkini silmiyor; bu yalnızca
     kullanılamayacak bir düğmeyi göstermemek için. */
  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      setCurrentUsername(null);
      return;
    }
    let active = true;
    void (async () => {
      try {
        const supabase = await client();
        const { data } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .maybeSingle();
        if (active)
          setCurrentUsername(
            (data as { username: string } | null)?.username ?? null
          );
      } catch {
        /* Profil okunamazsa silme düğmesi gizli kalır — güvenli taraf. */
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const send = useCallback(
    async (raw: string) => {
      if (!photoId || !user) return;
      const body = sanitizeText(raw, { multiline: true, maxLength: 4000 });
      if (body.length < 2) {
        setError('Boş yorum gönderilemez.');
        return;
      }

      setBusy(true);
      setError(null);
      try {
        const supabase = await client();
        const { error: writeError } = await supabase
          .from('photo_comments')
          .insert({ photo_id: photoId, user_id: user.id, body });
        if (writeError) throw new Error(writeError.message);
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Yorum gönderilemedi');
      } finally {
        setBusy(false);
      }
    },
    [photoId, user, load]
  );

  const remove = useCallback(
    async (id: string) => {
      setBusy(true);
      try {
        const supabase = await client();
        const { error: writeError } = await supabase
          .from('photo_comments')
          .delete()
          .eq('id', id);
        if (writeError) throw new Error(writeError.message);
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Yorum silinemedi');
      } finally {
        setBusy(false);
      }
    },
    [load]
  );

  return {
    comments,
    loading,
    canWrite: Boolean(photoId && user && isSupabaseConfigured),
    busy,
    error,
    send,
    remove,
    currentUsername,
  };
}

/* ══════════════════════════════════════════════════════════════════════
   PUANLAMA — 10 üzerinden (0036)

   BEĞENİDEN AYRI BİR KANCA çünkü davranışı farklı: beğeni tek bitlik ve
   iyimser yazılabilir, puan ise bir HÜKÜM ve ortalamayı taşıyor. Yanlış
   giden bir puanın bir süre ekranda kalması, ortalamayı görünür biçimde
   kaydırır — bu yüzden puan İYİMSER YAZILMIYOR: sunucu onaylayana kadar
   eski değer duruyor.

   ORTALAMA SUNUCUDAN OKUNUYOR, istemcide yeniden hesaplanmıyor. Yerel
   hesap `(toplam ± eski ± yeni) / sayi` demekti ve o aritmetiği iki
   yerde (burada ve tetikleyicide) tutmak, ikisinin ayrışması için davet.
   Yazma başarılı olunca yeni toplam/sayı sunucudan geri okunuyor.
   ══════════════════════════════════════════════════════════════════════ */

export interface RatingState {
  /** Kullanıcının verdiği puan; vermemişse null. */
  mine: number | null;
  /** Ortalama — oy yoksa null (0.0 göstermek "herkes sıfır verdi" demek). */
  average: number | null;
  count: number;
  /** Oturum var mı, kayıt gerçek mi, kendi fotoğrafı değil mi. */
  canRate: boolean;
  /** Kendi fotoğrafına puan verilemez — sebep ayrı taşınıyor ki arayüz söyleyebilsin. */
  isOwn: boolean;
  busy: boolean;
  error: string | null;
  rate: (score: number) => Promise<void>;
  clear: () => Promise<void>;
}

export function usePhotoRating(
  photoId: string | undefined,
  initial: { toplam: number; sayi: number }
): RatingState {
  const { user } = useAuth();
  const [mine, setMine] = useState<number | null>(null);
  const [total, setTotal] = useState(initial.toplam);
  const [count, setCount] = useState(initial.sayi);
  const [busy, setBusy] = useState(false);
  const [isOwn, setIsOwn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTotal(initial.toplam);
    setCount(initial.sayi);
  }, [initial.toplam, initial.sayi]);

  /*
   * Kullanıcının kendi puanı ve sahiplik ayrı bir sorguda.
   *
   * SAHİPLİK KULLANICI ADIYLA SORULMUYOR. Kartta duran `user.username`
   * profil tablosundan gelen bir GÖRÜNTÜ adı; oturumdaki kimlik ise
   * `auth.users.id`. İkisini karşılaştırmak, kullanıcı adı değişen ya da
   * profili henüz oluşmamış birinde sessizce yanlış cevap verirdi.
   * Sahiplik doğrudan `astro_photos.user_id` üzerinden soruluyor.
   */
  useEffect(() => {
    if (!photoId || !user || !isSupabaseConfigured) {
      setMine(null);
      setIsOwn(false);
      return;
    }

    let active = true;
    void (async () => {
      try {
        const supabase = await client();
        const [own, photo] = await Promise.all([
          supabase
            .from('photo_ratings')
            .select('score')
            .eq('photo_id', photoId)
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('astro_photos')
            .select('user_id')
            .eq('id', photoId)
            .maybeSingle(),
        ]);
        if (!active) return;
        setMine((own.data as { score: number } | null)?.score ?? null);
        setIsOwn(
          (photo.data as { user_id: string } | null)?.user_id === user.id
        );
      } catch {
        /* Okunamadıysa "puan vermedim" varsayılıyor; yazma denemesi
           zaten sunucuda doğrulanıyor. */
      }
    })();

    return () => {
      active = false;
    };
  }, [photoId, user]);

  /** Yazmadan sonra sunucudaki gerçek toplamı geri okur. */
  const refresh = useCallback(async () => {
    if (!photoId) return;
    try {
      const supabase = await client();
      const { data } = await supabase
        .from('astro_photos')
        .select('rating_sum, rating_count')
        .eq('id', photoId)
        .maybeSingle();
      const row = data as { rating_sum: number; rating_count: number } | null;
      if (row) {
        setTotal(row.rating_sum ?? 0);
        setCount(row.rating_count ?? 0);
      }
    } catch {
      /* Ortalama bir sonraki sayfa yüklemesinde tazelenir. */
    }
  }, [photoId]);

  const rate = useCallback(
    async (score: number) => {
      if (!photoId || !user) return;
      /* Aralık istemcide de kapatılıyor: sunucu zaten reddediyor ama
         kullanıcıya dönen mesaj "check kısıtı ihlali" olurdu. */
      const clamped = Math.round(Math.min(10, Math.max(1, score)));

      setBusy(true);
      setError(null);
      try {
        const supabase = await client();
        const { error: writeError } = await supabase
          .from('photo_ratings')
          .upsert(
            { photo_id: photoId, user_id: user.id, score: clamped },
            { onConflict: 'photo_id,user_id' }
          );
        if (writeError) throw new Error(writeError.message);
        setMine(clamped);
        await refresh();
      } catch (e) {
        setError(
          e instanceof Error && /row-level security/i.test(e.message)
            ? 'Kendi fotoğrafına puan veremezsin.'
            : e instanceof Error
              ? e.message
              : 'Puan kaydedilemedi'
        );
      } finally {
        setBusy(false);
      }
    },
    [photoId, user, refresh]
  );

  const clear = useCallback(async () => {
    if (!photoId || !user || mine === null) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = await client();
      const { error: writeError } = await supabase
        .from('photo_ratings')
        .delete()
        .eq('photo_id', photoId)
        .eq('user_id', user.id);
      if (writeError) throw new Error(writeError.message);
      setMine(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Puan geri alınamadı');
    } finally {
      setBusy(false);
    }
  }, [photoId, user, mine, refresh]);

  return {
    mine,
    average: count > 0 ? total / count : null,
    count,
    canRate: Boolean(photoId && user && isSupabaseConfigured && !isOwn),
    isOwn,
    busy,
    error,
    rate,
    clear,
  };
}

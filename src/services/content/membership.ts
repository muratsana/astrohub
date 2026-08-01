import { useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';

/**
 * ÜYELİK VE KOTA — istemci tarafı (§12).
 *
 * ═══════════════════════════════════════════════════════════════════════
 * ÖDEME AÇIK MI SORUSU VERİTABANINDAN GELİYOR, KODDAN DEĞİL
 *
 * §12.2 "feature flag ile ödeme sistemi kapalı olmalıdır" diyor.
 * Anahtarı koda gömseydik, açmak için yeni bir dağıtım gerekirdi ve
 * "açık mı" sorusunun cevabı derlenmiş pakete bakmayı gerektirirdi.
 * `app_settings.billing` satırında duruyor.
 *
 * ANAHTAR KAPALIYKEN ARAYÜZ SATIN ALMA GÖSTERMİYOR — devre dışı bir
 * düğme bile. §12.2'nin son maddesi: "premium kapalıyken public
 * kullanıcı 'satın al' düğmesiyle çıkmaza sokulmamalıdır". Basılamayan
 * bir düğme de bir çıkmazdır; kullanıcı ona bakıp bekler.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * KOTA TEK ÇAĞRIDA
 *
 * `my_quota()` altı değeri birlikte veriyor. Üç ayrı sorgu atsaydık
 * aralarında kota değişebilirdi ve kullanıcı "4/5" görürken beşinciyi
 * yükleyip reddedilebilirdi.
 * ═══════════════════════════════════════════════════════════════════════
 */

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

export interface BillingState {
  /** Ödeme sistemi açık mı. Kapalıyken satın alma yüzeyi hiç yok. */
  open: boolean;
  /** Kullanıcıya gösterilecek durum — "Geliştirme aşamasında" gibi. */
  note: string;
  loading: boolean;
}

/**
 * VARSAYILAN KAPALI. Ayar okunamazsa `open` false kalıyor: ödeme
 * sisteminin yanlışlıkla AÇIK görünmesi, kullanıcıyı çalışmayan bir
 * ödeme akışına sokmak demekti. Kapalı görünmesi ise yalnızca bir
 * özelliği geciktirir.
 */
export function useBilling(): BillingState {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('Geliştirme aşamasında');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let active = true;
    void (async () => {
      try {
        const supabase = await client();
        const { data } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'billing')
          .maybeSingle();

        if (!active || !data) return;
        const value = (data as { value: { odeme_acik?: boolean; durum_notu?: string } })
          .value;
        setOpen(value?.odeme_acik === true);
        if (value?.durum_notu) setNote(value.durum_notu);
      } catch {
        /* Okunamadıysa kapalı kalıyor — gerekçe yukarıda. */
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return { open, note, loading };
}

export interface QuotaState {
  tier: 'standart' | 'premium';
  photosUsed: number;
  photosLimit: number;
  revisionsLimit: number;
  storageUsed: number;
  storageLimit: number;
  /**
   * Fotoğraf sayısı limitin ÜSTÜNDE. Premium bitmiş bir hesapta olur.
   * §12.3: "premium süresi biterse mevcut fotoğrafları silmeme" —
   * silinmiyor, yalnızca yeni yükleme durduruluyor ve kullanıcı bunu
   * görüyor.
   */
  overLimit: boolean;
  loading: boolean;
}

export function useQuota(): QuotaState | null {
  const { user } = useAuth();
  const [state, setState] = useState<QuotaState | null>(null);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      setState(null);
      return;
    }

    let active = true;
    void (async () => {
      try {
        const supabase = await client();
        const { data } = await supabase.rpc('my_quota');
        const row = (data as Record<string, unknown>[] | null)?.[0];
        if (!active || !row) return;

        setState({
          tier: (row.tier as 'standart' | 'premium') ?? 'standart',
          photosUsed: Number(row.photos_used ?? 0),
          photosLimit: Number(row.photos_limit ?? 0),
          revisionsLimit: Number(row.revisions_limit ?? 0),
          storageUsed: Number(row.storage_used ?? 0),
          storageLimit: Number(row.storage_limit ?? 0),
          overLimit: row.over_limit === true,
          loading: false,
        });
      } catch {
        if (active) setState(null);
      }
    })();

    return () => {
      active = false;
    };
  }, [user]);

  return state;
}

/** Bayt → okunabilir. Depolama kutusunda kullanılıyor. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

/** Yönetici: test premium ver (denetim kaydına düşüyor). */
export async function grantTestPremium(
  userId: string,
  days = 30
): Promise<string> {
  const supabase = await client();
  const { data, error } = await supabase.rpc('grant_test_premium', {
    target_user: userId,
    gun: days,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Yönetici: test premium geri al. Gerçek aboneliğe dokunmuyor. */
export async function revokeTestPremium(userId: string): Promise<void> {
  const supabase = await client();
  const { error } = await supabase.rpc('revoke_test_premium', {
    target_user: userId,
  });
  if (error) throw new Error(error.message);
}

import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '@/services/supabase/client';

/**
 * TOPLULUK SİLME TALEBİ — SAHİP TARAFI (FAZ 6).
 *
 * Topluluk sahibi kendi kaydını doğrudan silemiyor: veritabanındaki
 * `app.kulup_yonetim_alanlari` tetikleyicisi `deleted_at` yazmayı
 * reddediyor ve "silme talebi açın" diyor. Bu dosya o talebin arayüz
 * tarafı.
 *
 * BU DOSYADA "SAHİP MİYİM" KONTROLÜ YOK. Sahiplik sorusunun cevabını
 * `topluluk_silme_durumu` veriyor: sahip değilseniz RPC boş dönüyor.
 * İstemcide ikinci bir kontrol yazmak, `manager_user_id` alanını
 * istemciye çekmeyi gerektirirdi — kulüp sorgusu o alanı bilerek
 * seçmiyor (bkz. `clubsSource.test.ts`).
 */

export type TalepDurumu =
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'escalated'
  | 'archived';

export interface SilmeTalebi {
  id: string;
  durum: TalepDurumu;
  gerekce: string;
  kararNotu: string | null;
  olusturuldu: string;
}

export interface SilmeDurumu {
  /** Çağıran bu topluluğun sahibi. RPC satır döndüyse zaten öyle. */
  yonetici: true;
  /** Son talep — hiç talep açılmadıysa `null`. */
  talep: SilmeTalebi | null;
}

/** Talep hâlâ karara bağlanmayı mı bekliyor? */
export function beklemede(talep: SilmeTalebi | null): boolean {
  return talep?.durum === 'pending' || talep?.durum === 'in_review';
}

interface HamTalep {
  id?: unknown;
  durum?: unknown;
  gerekce?: unknown;
  karar_notu?: unknown;
  olusturuldu?: unknown;
}

/* RPC `jsonb` döndürüyor; alanları tek tek okuyoruz çünkü şema
   değişirse tip hatası değil, sessiz `undefined` gelirdi. */
function talepOku(ham: unknown): SilmeTalebi | null {
  if (!ham || typeof ham !== 'object') return null;
  const t = ham as HamTalep;
  if (typeof t.id !== 'string' || typeof t.durum !== 'string') return null;
  return {
    id: t.id,
    durum: t.durum as TalepDurumu,
    gerekce: typeof t.gerekce === 'string' ? t.gerekce : '',
    kararNotu: typeof t.karar_notu === 'string' ? t.karar_notu : null,
    olusturuldu:
      typeof t.olusturuldu === 'string' ? t.olusturuldu : new Date().toISOString(),
  };
}

/**
 * Sahiplik ve son talebin durumu. Sahip değilse `null` — çağıran bunu
 * "kutu gösterme" diye okuyor.
 */
export async function fetchSilmeDurumu(
  slug: string
): Promise<SilmeDurumu | null> {
  const clientPromise = getSupabase();
  if (!clientPromise) return null;

  const client = await clientPromise;
  const { data, error } = await client.rpc('topluluk_silme_durumu', {
    p_slug: slug,
  });

  if (error) throw new Error(error.message);
  if (!data || typeof data !== 'object') return null;

  const govde = data as { yonetici?: unknown; talep?: unknown };
  if (govde.yonetici !== true) return null;

  return { yonetici: true, talep: talepOku(govde.talep) };
}

/**
 * Silme talebi açar ve kuyruk kaydının kimliğini döndürür.
 *
 * Gerekçe boşken sunucuya gidilmiyor. Veritabanındaki CHECK kısıtı da
 * reddediyor — ama oradan dönen hata sahibine gösterilecek cümle değil,
 * üstelik gerekçe kararın kendisiyle birlikte saklanan metin: yazarken
 * uyarmak, reddedildikten sonra açıklamaktan iyi.
 */
export async function silmeTalebiAc(
  slug: string,
  gerekce: string
): Promise<string> {
  const metin = gerekce.trim();
  if (!metin) {
    throw new Error(
      'Silme gerekçesi zorunlu — yönetim kararını bu metne bakarak verecek.'
    );
  }

  const clientPromise = getSupabase();
  if (!clientPromise) throw new Error('Supabase yapılandırılmamış');

  const client = await clientPromise;
  const { data, error } = await client.rpc('topluluk_silme_talebi', {
    p_slug: slug,
    p_gerekce: metin,
  });

  if (error) throw new Error(error.message);
  return String(data);
}

/**
 * Sayfada silme kutusunu çizmek için gereken her şey.
 *
 * Yükleme hatası kutuyu GİZLEMİYOR, hatayı taşıyor: sahip olduğu hâlde
 * kutuyu göremeyen kullanıcı, talebinin ne olduğunu bilmeden ikinci kez
 * denerdi.
 */
export function useSilmeDurumu(slug: string | undefined, aktif: boolean) {
  const [durum, setDurum] = useState<SilmeDurumu | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const oku = useCallback(() => {
    if (!slug || !aktif) {
      setDurum(null);
      return;
    }
    setYukleniyor(true);
    fetchSilmeDurumu(slug)
      .then((d) => {
        setDurum(d);
        setHata(null);
      })
      .catch((e: unknown) =>
        setHata(e instanceof Error ? e.message : 'Talep durumu okunamadı')
      )
      .finally(() => setYukleniyor(false));
  }, [slug, aktif]);

  useEffect(oku, [oku]);

  return { durum, yukleniyor, hata, yenile: oku };
}

import { getSupabase } from '@/services/supabase/client';

/**
 * SON GÖRÜLME DAMGASI.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN VAR
 *
 * Kullanıcı listesinde "son görülme" sütunu (Görev 1.3) bu alanı
 * okuyor. Alan hiç yazılmazsa sütun boş kalır ve sıralama anlamsız
 * olur — yani sütunu eklemek tek başına yetmiyor, birinin yazması
 * gerekiyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SAATTE BİR, DAHA SIK DEĞİL
 *
 * Her sayfa açılışında yazsaydık altı kullanıcıda sorun olmazdı ama
 * ölçek büyüdüğünde `profiles` tablosuna sürekli UPDATE gider: her
 * satır yeniden yazılır, indeksler güncellenir ve tablo şişer. "Son
 * görülme" bilgisinin çözünürlüğü zaten saat mertebesinde — yönetici
 * "dün mü, bu hafta mı" diye bakıyor, "14:32 mi 14:47 mi" diye değil.
 *
 * Eşik `localStorage`ta: sekmeler arasında paylaşılıyor ve sayfa
 * yenilemesinde sıfırlanmıyor. Depolama kapalıysa (gizli sekme, katı
 * gizlilik ayarı) yazma yine yapılıyor — kaydı hiç tutmamaktansa biraz
 * fazla yazmak yeğdir.
 *
 * ══════════════════════════════════════════════════════════════════════
 * HATA SESSİZ
 *
 * Bu bir yan iş. Oturum yenilenirken damga yazılamazsa kullanıcıya
 * gösterilecek bir şey yok ve gösterilmemeli: "son görülme
 * güncellenemedi" uyarısı, kullanıcının hiç ilgilenmediği bir iç
 * ayrıntı.
 */
const KEY = 'astrohub:last-seen';
const ARALIK_MS = 60 * 60 * 1000;

function sonYazma(): number {
  try {
    return Number(localStorage.getItem(KEY) ?? 0);
  } catch {
    return 0;
  }
}

function damgala(now: number): void {
  try {
    localStorage.setItem(KEY, String(now));
  } catch {
    /* Depolama kapalı; bir sonraki çağrıda yine yazılır. */
  }
}

/** Gerekirse `profiles.last_seen_at` alanını günceller. */
export async function touchLastSeen(userId: string | undefined): Promise<void> {
  if (!userId) return;

  const now = Date.now();
  if (now - sonYazma() < ARALIK_MS) return;
  /* Damga İSTEKTEN ÖNCE: istek uzun sürerse aynı anda ikinci bir çağrı
     gelip aynı yazmayı tekrarlamasın. */
  damgala(now);

  try {
    const promise = getSupabase();
    if (!promise) return;
    const supabase = await promise;
    await supabase
      .from('profiles')
      .update({ last_seen_at: new Date(now).toISOString() })
      .eq('id', userId);
  } catch {
    /* Yan iş; sessiz. Gerekçe başlıkta. */
  }
}

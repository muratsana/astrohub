import { useEffect, type ReactNode } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import {
  notifyPreferenceChange,
  setPreferenceAdapter,
} from '@/components/ui/preferenceStore';

/**
 * ARAYÜZ TERCİHLERİNİ HESABA BAĞLAYAN KATMAN (Faz 4).
 *
 * ══════════════════════════════════════════════════════════════════════
 * ÇOCUK ÇİZMİYOR, YALNIZCA KAYIT YAPIYOR
 *
 * Bir bağlam (`context`) değil: tercihleri okuyan yer
 * `components/ui/useViewMode`, yani tasarım sistemi. Oradan bir
 * `useContext` çağırmak, tasarım sistemini ürün ağacına bağlardı.
 * Bunun yerine sağlayıcı kendini `preferenceStore` defterine YAZIYOR
 * ve kanca yalnızca deftere bakıyor (gerekçenin tamamı o dosyada).
 *
 * ══════════════════════════════════════════════════════════════════════
 * YAZMA İYİMSER VE SESSİZ
 *
 * Görünüm tercihi tek bitlik bir tercih: yazma düşerse kullanıcı bir
 * sonraki açılışta eski görünümü görür ve tek tıkla düzeltir. Bunun
 * için hata ekranı göstermek, kaybın büyüklüğüyle orantısız olurdu —
 * beğeni ve takiple aynı gerekçe.
 *
 * YEREL ÖNBELLEK ANINDA GÜNCELLENİYOR: `set` önce belleğe yazıp
 * aboneleri uyandırıyor, sonra ağa gidiyor. Aksi hâlde kullanıcı
 * görünümü değiştirir, defter hâlâ eski değeri döndürür ve kancanın
 * "hesap kazanır" etkisi seçimi GERİ ALIRDI.
 */
export function UiPreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      /* Oturum yoksa defter TEMİZLENİYOR: çıkış yapan kullanıcının
         tercihleri bir sonraki kullanıcıya sızmamalı. */
      setPreferenceAdapter(null);
      return;
    }

    const cache = new Map<string, string>();
    let active = true;

    setPreferenceAdapter({
      get: (key) => cache.get(key) ?? null,
      set: (key, value) => {
        cache.set(key, value);
        notifyPreferenceChange();
        void (async () => {
          try {
            const supabase = await getSupabase();
            if (!supabase) return;
            await supabase
              .from('ui_preferences')
              .upsert(
                { user_id: user.id, key, value },
                { onConflict: 'user_id,key' }
              );
          } catch {
            /* Sessiz: tercih kaybı ekran hatası değil (başlıktaki
               gerekçe). */
          }
        })();
      },
    });

    void (async () => {
      try {
        const supabase = await getSupabase();
        if (!supabase || !active) return;
        const { data, error } = await supabase
          .from('ui_preferences')
          .select('key, value');
        if (error || !active) return;

        for (const row of (data ?? []) as { key: string; value: string }[]) {
          /* KULLANICININ BU OTURUMDA YAPTIĞI SEÇİM KORUNUYOR: ağdan
             gelen satır, sayfa açılırken değiştirilen bir tercihin
             üstüne yazmamalı. `cache.has` kontrolü bunu sağlıyor. */
          if (!cache.has(row.key)) cache.set(row.key, row.value);
        }
        notifyPreferenceChange();
      } catch {
        /* Okunamadıysa yerel tercihler geçerli kalıyor. */
      }
    })();

    return () => {
      active = false;
      setPreferenceAdapter(null);
    };
  }, [user]);

  return <>{children}</>;
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '@/services/supabase/client';

/**
 * ALAN ÇÖZÜMÜNÜ ELLE İSTEME.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN GEREKLİ
 *
 * Çözüm yükleme akışında otomatik tetikleniyordu (`upload.ts`) ve tek
 * yol oydu. Bu üç durumda kullanıcıyı çaresiz bırakıyordu:
 *
 *   · 0032 ÖNCESİ YÜKLENEN fotoğraflar. Otomatik tetikleme yokken
 *     yüklenmişler; hiçbir zaman çözülmeyecekler.
 *   · ÇÖZÜLEMEYENLER. astrometry.net bazen düşük yıldız sayısında ya da
 *     yoğun bulutsu alanlarında bulamıyor; ikinci deneme çoğu zaman
 *     tutuyor.
 *   · ANAHTAR SONRADAN TANIMLANDIYSA. `ASTROMETRY_API_KEY` yokken
 *     yüklenen her fotoğraf sessizce atlandı.
 *
 * Düğme bu üç durumun tamamını tek hareketle çözüyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * YETKİ FONKSİYONDA, BURADA DEĞİL
 *
 * `plate-solve` kenar fonksiyonu çağıranın kendi anahtarıyla sahiplik
 * kontrolü yapıyor: başkasının fotoğrafı için 403 dönüyor. Buradaki
 * `canManage` kontrolü yalnızca ARAYÜZ düzeyinde — düğmeyi göstermemek
 * güvenlik değil, nezaket. Gerçek sınır sunucuda.
 */
export interface CozumIstegiSonucu {
  durum: 'kuyrukta' | 'atlandi';
  aciklama?: string;
}

export async function alanCozumuIste(
  photoId: string
): Promise<CozumIstegiSonucu> {
  const promise = getSupabase();
  if (!promise) throw new Error('Sunucu bağlantısı yok.');

  const supabase = await promise;
  const { data, error } = await supabase.functions.invoke('plate-solve', {
    body: { photoId },
  });

  if (error) throw new Error(error.message);

  const govde = data as { durum?: string; aciklama?: string; hata?: string };
  if (govde?.hata) throw new Error(govde.hata);

  return {
    durum: govde?.durum === 'kuyrukta' ? 'kuyrukta' : 'atlandi',
    aciklama: govde?.aciklama,
  };
}

/**
 * Çözüm isteği kancası.
 *
 * Başarıda fotoğraf sorguları geçersizleştiriliyor ama SAYFA
 * YENİLENMİYOR: astrometry.net kuyruğu dakikalar sürüyor ve durum
 * `kuyrukta`ya geçtiği anda kullanıcı zaten doğru cümleyi görüyor.
 * Sonucun kendisi beş dakikalık yoklama işiyle geliyor.
 */
export function useAlanCozumuIstegi(photoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => alanCozumuIste(photoId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['fotograf'] });
      void queryClient.invalidateQueries({ queryKey: ['fotograflar'] });
    },
  });
}

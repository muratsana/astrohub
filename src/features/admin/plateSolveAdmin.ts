import { getSupabase } from '@/services/supabase/client';

/**
 * ÇÖZÜLMEMİŞ FOTOĞRAFLARI TOPLU KUYRUĞA ALMA.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN GEREKLİ
 *
 * Yükleme akışı her yeni fotoğraf için çözüm istiyor (`requestPlateSolve`)
 * ama `ASTROMETRY_API_KEY` tanımlı değilken kenar fonksiyonu sessizce
 * atlıyor ve kayıt `yok` durumunda kalıyor. Anahtar sonradan
 * tanımlandığında o fotoğraflar kendiliğinden çözülmüyor: her sahibin
 * tek tek kendi fotoğrafına girip düğmeye basması gerekirdi ve çoğu
 * bunu hiç yapmayacaktı.
 *
 * Canlıda tam olarak bu durum var — altı fotoğrafın altısı da `yok`.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TEK TEK GÖNDERİLİYOR, TOPLU UÇ YOK
 *
 * Kenar fonksiyonu fotoğraf başına çalışıyor ve öyle kalıyor: toplu bir
 * uç yazmak, sahiplik/yetki kontrolünü ikinci kez ve farklı biçimde
 * uygulamak olurdu. Buradaki döngü aynı kapıdan geçiyor, yalnızca
 * çağrıyı tekrarlıyor.
 *
 * SIRAYLA, paralel değil: astrometry.net kuyruğuna aynı anda onlarca iş
 * atmak nazik değil ve servisin sınırına takılmak, atılan işlerin
 * tamamını kaybettirir.
 */

export interface CozulmemisFotograf {
  id: string;
  slug: string;
  title: string;
  solve_status: string;
}

/** Çözülmemiş ya da çözülememiş yayındaki fotoğraflar. */
export async function fetchUnsolvedPhotos(): Promise<CozulmemisFotograf[]> {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yok.');
  const supabase = await promise;

  const { data, error } = await supabase
    .from('astro_photos')
    .select('id, slug, title, solve_status')
    /* `kuyrukta` DIŞARIDA: zaten gönderilmiş, yoklayıcı sonucu
       yazacak. Yeniden göndermek astrometry.net kuyruğunu aynı işle
       doldurmak olurdu. */
    .in('solve_status', ['yok', 'basarisiz'])
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);
  return (data ?? []) as CozulmemisFotograf[];
}

export interface TopluSonuc {
  kuyruga_alinan: number;
  atlanan: number;
  hatali: number;
  /** İlk hatanın metni — hepsini biriktirmek ekranı doldururdu. */
  ilkHata: string | null;
}

/**
 * Verilen fotoğrafları sırayla çözüm kuyruğuna alır.
 *
 * Hata TOPLANIYOR, döngüyü durdurmuyor: tek bir fotoğrafın düşmesi
 * kalan yüz doksan dokuzunun gönderilmemesi demek olmamalı.
 */
export async function requestBulkSolve(
  ids: string[],
  onIlerleme?: (tamamlanan: number, toplam: number) => void
): Promise<TopluSonuc> {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yok.');
  const supabase = await promise;

  const sonuc: TopluSonuc = {
    kuyruga_alinan: 0,
    atlanan: 0,
    hatali: 0,
    ilkHata: null,
  };

  for (let i = 0; i < ids.length; i += 1) {
    try {
      const { data, error } = await supabase.functions.invoke('plate-solve', {
        body: { photoId: ids[i] },
      });
      if (error) throw new Error(error.message);

      const govde = data as { durum?: string; aciklama?: string; hata?: string };
      if (govde?.hata) throw new Error(govde.hata);

      if (govde?.durum === 'kuyrukta') sonuc.kuyruga_alinan += 1;
      else {
        sonuc.atlanan += 1;
        /*
         * "Atlandı" en sık ANAHTAR YOK demek ve bunu ilk hata olarak
         * taşımak şart: sayaç "0 kuyruğa alındı, 6 atlandı" derken
         * sebebini söylemeyen bir ekran, yöneticiyi log aramaya
         * gönderirdi.
         */
        if (!sonuc.ilkHata && govde?.aciklama) sonuc.ilkHata = govde.aciklama;
      }
    } catch (e) {
      sonuc.hatali += 1;
      if (!sonuc.ilkHata) {
        sonuc.ilkHata = e instanceof Error ? e.message : 'bilinmeyen hata';
      }
    }
    onIlerleme?.(i + 1, ids.length);
  }

  return sonuc;
}

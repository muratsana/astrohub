import { useQuery } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';
import { selectContent, type ContentSelection } from './select';

/**
 * REFERANS KATALOĞU OKUMA KANCASI.
 *
 * Tek bir desen: tohum dizisiyle **anında** boya, veritabanı satırları
 * gelince değiştir. Yükleniyor durumu yok — çünkü gösterilecek geçerli bir
 * liste zaten var ve iskelet ekran göstermek burada kullanıcıya hiçbir şey
 * kazandırmaz, yalnızca boş bir kare gösterir.
 *
 * Sorgu yalnızca yapılandırma varsa çalışır; yoksa hiç ağ isteği kurulmaz
 * ve `@supabase/supabase-js` paketi indirilmez (§16.4). Tek dosya önizleme
 * ve çevrimdışı kabuk bu yolla hiçbir değişiklik yapmadan çalışmaya devam
 * eder.
 *
 * `staleTime` beş dakika: referans veri (ekipman, hedef, saha, etkinlik)
 * editör düzenlemesiyle değişir, saniyede bir değil. Rota değiştikçe aynı
 * kataloğu yeniden çekmek boşuna istek.
 */
export function useCatalog<T>(
  key: string,
  seed: T[],
  fetcher: (client: SupabaseClient) => Promise<T[]>
): ContentSelection<T> {
  const query = useQuery({
    queryKey: ['katalog', key],
    enabled: isSupabaseConfigured,
    staleTime: 5 * 60 * 1000,
    // Tek yeniden deneme: kalıcı bir hata durumunda kullanıcıyı bekletmeden
    // tohuma düşmek, üç kez deneyip aynı yere varmaktan iyidir.
    retry: 1,
    queryFn: async () => {
      const clientPromise = getSupabase();
      if (!clientPromise) return [] as T[];
      return fetcher(await clientPromise);
    },
  });

  return selectContent({
    seed,
    rows: query.data,
    configured: isSupabaseConfigured,
    failed: query.isError,
    refresh: () => void query.refetch(),
  });
}

import { useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';
import { isGeneratedUsername } from '@/features/auth/accountSetup';

/**
 * ASTROFOTOĞRAFÇI DİZİNİ.
 *
 * ══════════════════════════════════════════════════════════════════════
 * KULLANICIYA GİDEN HİÇBİR YOL YOKTU
 *
 * Profil sayfası vardı, takip vardı, mesajlaşma vardı — ama başka bir
 * kullanıcıyı BULMANIN yolu yoktu. Tek giriş, birinin fotoğrafına denk
 * gelip adına tıklamaktı. Canlıda sıfır konuşma ve iki takip olmasının
 * sebebi mesajlaşmanın bozuk olması değil, kimsenin kimseyi
 * bulamamasıydı.
 *
 * Kulüp dizini (`/topluluklar`) aynı işi topluluklar için yapıyor; bu
 * modül onun kullanıcı karşılığı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * KİMLER LİSTELENİYOR
 *
 * Yasaklı hesaplar RLS'te zaten eleniyor (`profiles_select_all`).
 * Buna ek olarak KURULUMUNU TAMAMLAMAMIŞ hesaplar listelenmiyor:
 * `user_16206d94efc3` gibi üretilmiş adla duran bir profil, dizinde
 * tıklanacak bir kart değil — adı yok, şehri yok, gösterilecek hiçbir
 * şeyi yok. Kurulum kapısı (0132) bu hesapları zaten bir kez
 * dolduracak; o güne kadar dizini boş kartlarla doldurmuyoruz.
 */

export interface Photographer {
  userId: string;
  username: string;
  displayName: string | null;
  avatarPath: string | null;
  city: string | null;
  district: string | null;
  bio: string | null;
  /** Profilinde gösterdiği ekipmanların adları — kartın alt satırı. */
  equipment: string[];
}

export interface PhotographerFilters {
  city?: string;
  district?: string;
  /** Yalnızca ekipmanını paylaşmış olanlar. */
  onlyWithEquipment?: boolean;
  /** Ad ya da kullanıcı adında geçen metin. */
  search?: string;
}

interface ProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  display_name_visible: boolean | null;
  avatar_path: string | null;
  city: string | null;
  district: string | null;
  bio: string | null;
}

interface SetupRow {
  user_id: string;
  name: string;
}

export function usePhotographers(filters: PhotographerFilters): {
  items: Photographer[];
  loading: boolean;
  error: string | null;
} {
  const [items, setItems] = useState<Photographer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { city, district, onlyWithEquipment, search } = filters;

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setItems([]);
      return;
    }

    let active = true;
    setLoading(true);

    void (async () => {
      try {
        const supabase = await getSupabase();
        if (!supabase) return;

        let query = supabase
          .from('profiles')
          .select(
            'id, username, display_name, display_name_visible, avatar_path, city, district, bio'
          )
          .order('last_seen_at', { ascending: false, nullsFirst: false })
          .limit(200);

        if (city) query = query.eq('city', city);
        if (district) query = query.eq('district', district);

        const { data, error: queryError } = await query;
        if (queryError) throw new Error(queryError.message);

        /*
         * Herkese açık ekipmanlar TEK sorguda çekiliyor, kullanıcı başına
         * bir tane değil. 200 kart için 200 istek atmak, dizini
         * kullanılamaz hâle getirirdi.
         */
        const { data: setups, error: setupError } = await supabase
          .from('user_setups')
          .select('user_id, name, visibility')
          .in('visibility', ['profilde', 'herkese-acik']);
        if (setupError) throw new Error(setupError.message);

        const byUser = new Map<string, string[]>();
        for (const row of (setups ?? []) as SetupRow[]) {
          const list = byUser.get(row.user_id) ?? [];
          list.push(row.name);
          byUser.set(row.user_id, list);
        }

        const q = search?.trim().toLocaleLowerCase('tr-TR') ?? '';

        const mapped = ((data ?? []) as ProfileRow[])
          /* Kurulumunu tamamlamamış hesap dizinde yok (bkz. başlık). */
          .filter((row) => !isGeneratedUsername(row.username))
          .map((row) => ({
            userId: row.id,
            username: row.username,
            displayName:
              row.display_name_visible === false ? null : row.display_name,
            avatarPath: row.avatar_path,
            city: row.city,
            district: row.district,
            bio: row.bio,
            equipment: byUser.get(row.id) ?? [],
          }))
          .filter((p) => (onlyWithEquipment ? p.equipment.length > 0 : true))
          .filter((p) =>
            q
              ? (p.displayName ?? '').toLocaleLowerCase('tr-TR').includes(q) ||
                p.username.toLocaleLowerCase('tr-TR').includes(q)
              : true
          );

        if (!active) return;
        setItems(mapped);
        setError(null);
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : 'Dizin okunamadı');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [city, district, onlyWithEquipment, search]);

  return { items, loading, error };
}

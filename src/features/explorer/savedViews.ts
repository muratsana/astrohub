import { useCallback, useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import { sanitizeText } from '@/lib/sanitize';

/**
 * KAYDEDİLMİŞ GÖRÜNÜMLER (Faz 4).
 *
 * ══════════════════════════════════════════════════════════════════════
 * SAKLANAN ŞEY ADRES PARÇASI
 *
 * `?ara=m31&tur=galaksi&sirala=yeni`. Ayrıştırılmış bir nesne DEĞİL:
 * explorer'ın tek kaynağı zaten adres çubuğu ve ikinci bir gösterim,
 * iki tarafın ayrışabileceği bir yer açardı. Bir facet eklendiğinde
 * jsonb şeması da güncellenmeli olurdu; unutulursa kaydedilmiş görünüm
 * sessizce eksik uygulanırdı.
 *
 * Yan fayda: `parseQuery` bilinmeyen parametreyi zaten sessizce
 * düşürüyor, yani bir facet kaldırıldığında eski kayıt patlamıyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * `?` BAŞTAN ATILIYOR
 *
 * Kayıt bir ADRES değil bir SORGU DURUMU. Baştaki `?` ile saklasaydık
 * iki farklı yazımı (`?a=1` ve `a=1`) aynı görünüm için iki ayrı kayıt
 * hâline gelirdi. Normalleştirme tek yerde: `normalizeQuery`.
 */

export interface SavedView {
  id: string;
  module: string;
  name: string;
  /** Adres parçası, baştaki `?` olmadan. */
  query: string;
  isDefault: boolean;
  /** Yöneticinin herkese açtığı görünüm. */
  isShared: boolean;
  /** Bu görünüm oturumdaki kullanıcıya mı ait — silme/varsayılan hakkı. */
  isMine: boolean;
}

/**
 * Adres parçasını kayıt biçimine getirir.
 *
 * BOŞ PARAMETRELER ELENİYOR: `?ara=&tur=galaksi` ile `?tur=galaksi`
 * aynı görünüm. Elenmeseydi kullanıcı arama kutusuna yazıp silince
 * "değişmiş" bir görünüm kaydederdi.
 *
 * SIRA KORUNUYOR, alfabetik sıralanmıyor: kullanıcının kurduğu sıra
 * adres çubuğunda göründüğü sıradır ve kaydı açtığında aynı adresi
 * görmek onu şaşırtmaz.
 */
export function normalizeQuery(search: string): string {
  const params = new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search
  );
  const out = new URLSearchParams();
  for (const [key, value] of params) {
    if (value.trim() === '') continue;
    out.append(key, value);
  }
  return out.toString();
}

/** Kaydın adresi — sayfaya uygulanırken kullanılıyor. */
export function viewSearch(view: SavedView): string {
  return view.query ? `?${view.query}` : '';
}

/**
 * Kaydedilecek adın sorunu; yoksa `null`.
 *
 * SAF FONKSİYON — ekran açmadan test edilebiliyor. Veritabanı kısıtı
 * aynı kuralı tutuyor; buradaki kapı kullanıcıya PostgREST hata metni
 * yerine anlaşılır bir cümle söylemek için.
 */
export function describeViewProblem(
  name: string,
  query: string,
  existing: SavedView[]
): string | null {
  const ad = name.trim();
  if (!ad) return 'Görünüme bir ad verin.';
  if (ad.length > 60) return 'Ad en fazla 60 karakter olabilir.';
  if (query.length > 2000) return 'Bu filtre bileşimi kaydedilemeyecek kadar uzun.';
  /* Aynı adı ikinci kez kaydetmek, listede hangisinin hangisi olduğu
     anlaşılmayan iki satır demek. */
  if (existing.some((v) => v.isMine && v.name.toLocaleLowerCase('tr') === ad.toLocaleLowerCase('tr'))) {
    return 'Bu adda bir görünümünüz zaten var.';
  }
  return null;
}

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

interface Row {
  id: string;
  user_id: string;
  module: string;
  name: string;
  query: string;
  is_default: boolean;
  is_shared: boolean;
}

const SELECT = 'id, user_id, module, name, query, is_default, is_shared';

export interface SavedViewsState {
  views: SavedView[];
  /** Oturum var ve liste okundu mu — arayüz kontrolü buna bakıyor. */
  ready: boolean;
  busy: boolean;
  error: string | null;
  save: (name: string, search: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  makeDefault: (id: string) => Promise<void>;
  refresh: () => void;
}

/**
 * Bir modülün kaydedilmiş görünümleri.
 *
 * OTURUM YOKSA `ready` FALSE ve liste boş. Arayüz kontrolü o zaman
 * çizilmiyor — `personalFacets.ts` ile aynı kural: çalışmayan bir
 * kontrol, olmayan kontrolden kötü.
 */
export function useSavedViews(module: string): SavedViewsState {
  const { user } = useAuth();
  const [views, setViews] = useState<SavedView[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      setViews([]);
      setReady(false);
      return;
    }

    let active = true;
    void (async () => {
      try {
        const supabase = await client();
        const { data, error: readError } = await supabase
          .from('saved_views')
          .select(SELECT)
          .eq('module', module)
          .order('name');
        if (readError) throw new Error(readError.message);
        if (!active) return;

        setViews(
          ((data ?? []) as Row[]).map((r) => ({
            id: r.id,
            module: r.module,
            name: r.name,
            query: r.query,
            isDefault: r.is_default,
            isShared: r.is_shared,
            isMine: r.user_id === user.id,
          }))
        );
        setReady(true);
        setError(null);
      } catch (e) {
        if (!active) return;
        /* Okunamadıysa kontrol çizilmiyor: yarım bir liste,
           "kaydetmiştim ama yok" diye yanlış cevap üretirdi. */
        setViews([]);
        setReady(false);
        setError(e instanceof Error ? e.message : 'Görünümler okunamadı');
      }
    })();

    return () => {
      active = false;
    };
  }, [user, module, tick]);

  const run = useCallback(
    async (islem: () => Promise<void>) => {
      setBusy(true);
      setError(null);
      try {
        await islem();
        setTick((n) => n + 1);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'İşlem uygulanamadı');
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const save = useCallback(
    (name: string, search: string) =>
      run(async () => {
        if (!user) throw new Error('Görünüm kaydetmek için oturum gerekiyor.');
        const query = normalizeQuery(search);
        const supabase = await client();
        const { error: writeError } = await supabase.from('saved_views').insert({
          user_id: user.id,
          module,
          name: sanitizeText(name, { maxLength: 60 }),
          query,
        });
        if (writeError) throw new Error(writeError.message);
      }),
    [run, user, module]
  );

  const remove = useCallback(
    (id: string) =>
      run(async () => {
        const supabase = await client();
        const { error: delError } = await supabase
          .from('saved_views')
          .delete()
          .eq('id', id);
        if (delError) throw new Error(delError.message);
      }),
    [run]
  );

  /**
   * Varsayılan atama TEK ÇAĞRIDA.
   *
   * İki ayrı istekle (eskisini bırak, yenisini al) yapılsaydı arada
   * varsayılan HİÇ olmazdı ve ikinci istek düşerse kalıcı olarak öyle
   * kalırdı. `set_default_view` ikisini tek transaction'da yapıyor.
   */
  const makeDefault = useCallback(
    (id: string) =>
      run(async () => {
        const supabase = await client();
        const { error: rpcError } = await supabase.rpc('set_default_view', {
          gorunum_id: id,
        });
        if (rpcError) throw new Error(rpcError.message);
      }),
    [run]
  );

  return { views, ready, busy, error, save, remove, makeDefault, refresh };
}

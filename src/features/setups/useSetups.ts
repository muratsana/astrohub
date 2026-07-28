import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import {
  deleteSetup,
  duplicateSetup,
  listSetups,
  replaceAll,
  saveSetup,
  setDefaultSetup,
  type SaveInput,
  type SavedSetup,
} from './store';
import {
  fetchMySetups,
  isUuid,
  mergeSetups,
  pushDefault,
  pushSetup,
  removeSetup,
} from './remote';

/**
 * SETUP DEPOSU — yerel öncelikli, veritabanı kalıcı.
 *
 * OKUMA yerelden: anlık. Oturum varsa arka planda veritabanı çekilip
 * birleştiriliyor ve liste tazeleniyor. Ağ beklemesi hiçbir tuşu
 * geciktirmiyor.
 *
 * YAZMA önce yerele, sonra veritabanına. Sıra önemli: ağ hatasında
 * kullanıcının emeği tarayıcıda duruyor ve bir sonraki girişte yukarı
 * gidiyor. Tersi sırada ağ hatası kaydı tamamen kaybettirirdi.
 *
 * OTURUM YOKSA her şey eskisi gibi yerelde. Setup kurmak için hesap
 * gerekmiyor — araç önce işe yaramalı, kayıt sonra gelir.
 *
 * SENKRONİZASYON HATASI SESSİZ DEĞİL: `error` alanı çağırana veriliyor.
 * "Kaydedildi" deyip aslında yalnızca tarayıcıya yazmış olmak, kullanıcı
 * cihaz değiştirdiğinde ortaya çıkan ve sebebi anlaşılmayan bir kayıp
 * üretirdi.
 */

export interface SetupStore {
  setups: SavedSetup[];
  /** Veritabanıyla eşitleniyor mu? */
  syncing: boolean;
  /** Kalıcılaştırma başarısızsa sebebi; yerel kayıt yine de duruyor. */
  error: string | null;
  /** Kayıt veritabanına gidiyor mu, yalnızca tarayıcıda mı duruyor? */
  durable: boolean;
  save: (input: SaveInput) => Promise<SavedSetup>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<void>;
  makeDefault: (id: string) => Promise<void>;
}

export function useSetups(): SetupStore {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [setups, setSetups] = useState<SavedSetup[]>(() => listSetups());
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Giriş anında birleştirme ──
     Oturum açan kullanıcının başka cihazdaki setup'ları iniyor, çevrimdışı
     kurdukları da yukarı çıkıyor. Kimliği yerel biçimde olanlar (UUID
     değil) veritabanında yeni kimlik alıyor ve yerel kayıt onunla
     değiştiriliyor — aksi hâlde her açılışta kopyası oluşurdu. */
  useEffect(() => {
    if (!userId) {
      setSetups(listSetups());
      return;
    }

    let active = true;
    setSyncing(true);

    void (async () => {
      try {
        const remote = await fetchMySetups(userId);
        if (!active) return;

        const local = listSetups();
        const merged = mergeSetups(local, remote);

        const remoteIds = new Set(remote.map((s) => s.id));
        const uploaded: SavedSetup[] = [];
        for (const setup of merged) {
          const needsPush = !remoteIds.has(setup.id) || !isUuid(setup.id);
          uploaded.push(needsPush ? await pushSetup(setup, userId) : setup);
        }

        if (!active) return;
        replaceAll(uploaded);
        setSetups(listSetups());
        setError(null);
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : 'Setup senkronizasyonu başarısız');
        }
      } finally {
        if (active) setSyncing(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [userId]);

  const refresh = useCallback(() => setSetups(listSetups()), []);

  const save = useCallback(
    async (input: SaveInput) => {
      const record = saveSetup(input, new Date().toISOString());
      refresh();

      if (!userId) return record;
      try {
        const stored = await pushSetup(record, userId);
        /* Veritabanı yeni bir kimlik verdiyse yerel kaydı değiştir —
           yoksa aynı setup iki kimlikle iki kez görünür. */
        if (stored.id !== record.id) {
          replaceAll(
            listSetups().map((s) => (s.id === record.id ? stored : s))
          );
          refresh();
        }
        setError(null);
        return stored;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Veritabanına yazılamadı');
        return record;
      }
    },
    [userId, refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      deleteSetup(id);
      refresh();
      if (!userId) return;
      try {
        await removeSetup(id);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Veritabanından silinemedi');
      }
    },
    [userId, refresh]
  );

  const duplicate = useCallback(
    async (id: string) => {
      const copy = duplicateSetup(id, new Date().toISOString());
      refresh();
      if (!copy || !userId) return;
      try {
        const stored = await pushSetup(copy, userId);
        if (stored.id !== copy.id) {
          replaceAll(listSetups().map((s) => (s.id === copy.id ? stored : s)));
          refresh();
        }
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Kopya kaydedilemedi');
      }
    },
    [userId, refresh]
  );

  const makeDefault = useCallback(
    async (id: string) => {
      setDefaultSetup(id);
      refresh();
      if (!userId) return;
      try {
        await pushDefault(id, userId);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Varsayılan kaydedilemedi');
      }
    },
    [userId, refresh]
  );

  return {
    setups,
    syncing,
    error,
    durable: userId !== null,
    save,
    remove,
    duplicate,
    makeDefault,
  };
}

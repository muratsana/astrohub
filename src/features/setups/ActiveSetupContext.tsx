import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useSetups } from './useSetups';
import type { SavedSetup } from './store';

/**
 * AKTİF SETUP — araçlar arasında paylaşılan tek seçim.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ÇÖZDÜĞÜ SORUN
 *
 * Denetim (docs/DENETIM-2026-08-05.md §3.1) şunu ölçtü: Simülatör, Mozaik
 * Planlayıcı ve Ekipman modülü aynı üç soruyu ayrı ayrı soruyor —
 * hangi montür, hangi teleskop, hangi kamera. Üçü aynı katalogdan
 * besleniyor ama SEÇİM paylaşılmıyordu. Daha kötüsü: kullanıcı Ekipman
 * modülünde setup kaydedebiliyordu ve hiçbir hesaplayıcı o kaydı
 * okumuyordu.
 *
 * Modülleri bölmek tek başına bunu çözmezdi — yalnızca sayfa sayısını
 * azaltırdı. Tekrar eden veri girişini bitiren şey bu bağlam.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN AYRI BİR BAĞLAM, NEDEN `useSetups` YETMİYOR
 *
 * `useSetups` KAYITLARI yönetiyor: liste, kaydet, sil, öntanımlı yap.
 * Burada yönetilen şey "şu anda hangisiyle çalışıyorum" — bir kayıt
 * değil, bir OTURUM durumu. İkisini karıştırmak, araçta bir kutuyu
 * değiştirmenin kaydedilmiş setup'ı bozması demekti.
 *
 * Bağlam yalnızca `id` tutuyor; kaydın kendisi `useSetups`ten çözülüyor.
 * Kopya tutsaydık, kullanıcı Ekipman modülünde setup'ı düzenlediğinde
 * araçlar eski hâline bakmaya devam ederdi.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SEÇİM SEKMELER ARASINDA DEĞİL, SEKMENİN İÇİNDE KALIYOR
 *
 * `sessionStorage` kullanılıyor, `localStorage` değil. Kullanıcı bir
 * sekmede M31 için dar bant setup'ıyla, diğerinde geniş alan setup'ıyla
 * çalışabilir; ortak depo ikisini birbirine karıştırırdı. Kalıcı olması
 * gereken şey zaten kayıtlı setup'ın kendisi ve o `useSetups`te duruyor.
 */

interface ActiveSetupValue {
  /** Seçili kayıt; hiç setup yoksa ya da seçim temizlendiyse null. */
  setup: SavedSetup | null;
  setActiveId: (id: string | null) => void;
  /** Seçilebilecek kayıtlar — seçici bileşeni bunu listeliyor. */
  options: SavedSetup[];
  /** Kayıtlar hâlâ veritabanıyla eşitleniyor mu? */
  syncing: boolean;
}

const ActiveSetupContext = createContext<ActiveSetupValue | null>(null);

const STORAGE_KEY = 'astrohub:aktif-setup';

function readStored(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    /* Özel mod ya da kota — seçimi hatırlamamak, çökmekten iyidir. */
    return null;
  }
}

export function ActiveSetupProvider({ children }: { children: ReactNode }) {
  const store = useSetups();
  const [activeId, setActiveIdState] = useState<string | null>(readStored);

  const setActiveId = useCallback((id: string | null) => {
    setActiveIdState(id);
    if (typeof sessionStorage === 'undefined') return;
    try {
      if (id) sessionStorage.setItem(STORAGE_KEY, id);
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* yok sayılır — seçim bu oturumda bellekte yaşar */
    }
  }, []);

  /*
   * SEÇİM YOKSA ÖNTANIMLI SETUP DEVREYE GİRİYOR.
   *
   * Kullanıcı fotoğraf yüklerken zaten bir setup'ı "öntanımlı" olarak
   * işaretliyor; araçlarda ikinci bir seçim istemek aynı kararı iki kez
   * sordurmak olurdu. Öntanımlı yoksa tek kayıt varsa o, o da yoksa
   * seçim boş kalıyor — rastgele bir setup'ı seçip hesabı onun üstünden
   * yapmak, kullanıcının bakmadığı bir sayıya güvenmesine yol açardı.
   */
  useEffect(() => {
    if (activeId !== null) return;
    if (store.setups.length === 0) return;
    const varsayilan =
      store.setups.find((s) => s.isDefault) ??
      (store.setups.length === 1 ? store.setups[0] : null);
    if (varsayilan) setActiveId(varsayilan.id);
  }, [activeId, store.setups, setActiveId]);

  /* Seçili kayıt silinmişse seçim de düşüyor — var olmayan bir id'yi
     taşımak, araçlarda sessizce boş sonuç üretirdi. */
  useEffect(() => {
    if (activeId === null || store.syncing) return;
    if (!store.setups.some((s) => s.id === activeId)) setActiveId(null);
  }, [activeId, store.setups, store.syncing, setActiveId]);

  const value = useMemo<ActiveSetupValue>(
    () => ({
      setup: store.setups.find((s) => s.id === activeId) ?? null,
      setActiveId,
      options: store.setups,
      syncing: store.syncing,
    }),
    [store.setups, store.syncing, activeId, setActiveId]
  );

  return (
    <ActiveSetupContext.Provider value={value}>
      {children}
    </ActiveSetupContext.Provider>
  );
}

/**
 * Aktif setup'ı okur.
 *
 * SAĞLAYICI YOKSA ÇÖKMÜYOR, boş bir değer dönüyor. Araç sayfaları
 * testlerde ve prerender sırasında sağlayıcı olmadan da render ediliyor;
 * orada "setup seçilmedi" doğru cevap — hata değil.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useActiveSetup(): ActiveSetupValue {
  return (
    useContext(ActiveSetupContext) ?? {
      setup: null,
      setActiveId: () => {},
      options: [],
      syncing: false,
    }
  );
}

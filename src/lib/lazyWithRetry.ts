import { lazy } from 'react';
import type { ComponentType } from 'react';

/**
 * YENİDEN DENEYEN `lazy()`.
 *
 * SORUN: kod bölünmüş bir uygulamada yeni sürüm yayına alındığında eski
 * chunk dosyaları sunucudan silinir. O sırada sayfayı açık tutan kullanıcı
 * bir bağlantıya tıkladığında tarayıcı artık var olmayan bir chunk'ı ister,
 * dinamik `import()` reddedilir ve React ağacı hata sınırına düşer. Kullanıcı
 * için görüntü "site bozuldu"dur; oysa tek gereken sayfayı yenilemektir.
 *
 * ÇÖZÜM üç kademeli:
 *   1. İlk hatada bir kez daha dene (geçici ağ kesintisi buysa düzelir).
 *   2. Yine olmazsa **sayfayı bir kez** yeniden yükle: yeni index.html yeni
 *      chunk adlarını getirir. Yenileme bilgisi `sessionStorage`'a yazılır.
 *   3. Yenilemeden sonra da başarısızsa hata yukarı verilir — hata sınırı
 *      devreye girer. Sonsuz yenileme döngüsü bu bayrak sayesinde oluşmaz;
 *      bu, bu desende en sık yapılan hatadır.
 *
 * NOT: `import()` sonucu tarayıcı tarafından önbelleğe alındığı için ikinci
 * denemede aynı hata dönebilir. Bu yüzden ikinci kademe yeniden deneme
 * değil, sayfa yenilemedir.
 */

const RELOAD_FLAG = 'astrohub:chunk-reloaded';

/** Yeniden yükleme bayrağını okur/yazar; depolama yoksa sessizce false döner. */
function alreadyReloaded(): boolean {
  try {
    return sessionStorage.getItem(RELOAD_FLAG) === '1';
  } catch {
    return false;
  }
}

function markReloaded(): void {
  try {
    sessionStorage.setItem(RELOAD_FLAG, '1');
  } catch {
    // Depolama yoksa yenileme yine yapılır; en kötü ihtimalle iki kez.
  }
}

/**
 * Başarılı yüklemeden sonra bayrağı temizler.
 *
 * Temizlenmezse, oturum boyunca **ilk** chunk hatasında yenileme yapılmaz ve
 * kullanıcı gereksiz yere hata ekranı görür.
 */
function clearReloadFlag(): void {
  try {
    sessionStorage.removeItem(RELOAD_FLAG);
  } catch {
    // yoksay
  }
}

export type ModuleLoader<T> = () => Promise<T>;

/**
 * Modül yükleyiciyi yeniden deneme davranışıyla sarar.
 *
 * `lazy()` dışında da kullanılabilir (ör. tembel yüklenen bir servis).
 */
export function retryImport<T>(loader: ModuleLoader<T>): Promise<T> {
  return loader().catch((error: unknown) => {
    // 1. kademe: bir kez daha dene.
    return loader().catch((secondError: unknown) => {
      // 2. kademe: sayfayı bir kez yenile.
      if (!alreadyReloaded() && typeof location !== 'undefined') {
        markReloaded();
        location.reload();
        // Yenileme asenkron; bekleyen söz asla çözülmesin ki arada hata
        // ekranı yanıp sönmesin.
        return new Promise<T>(() => {});
      }

      // 3. kademe: pes et, hata sınırı devralsın.
      throw secondError ?? error;
    });
  });
}

/**
 * `React.lazy` ile aynı imza; yükleme hatalarında yeniden dener.
 *
 * Tip parametresi `ComponentType<any>` üzerinden geniş tutuldu: çağıranlar
 * prop tipleri farklı bileşenler geçiriyor ve `ComponentType<unknown>`
 * bunları kabul etmiyor (props konumu çelişkili/contravariant).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  loader: ModuleLoader<{ default: T }>
) {
  return lazy(() =>
    retryImport(loader).then((module) => {
      clearReloadFlag();
      return module;
    })
  );
}

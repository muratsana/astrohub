import { beforeEach, describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  notifyPreferenceChange,
  setPreferenceAdapter,
} from '@/components/ui/preferenceStore';
import { useDefaultEquipmentVisibility } from './equipmentVisibility';

beforeEach(() => {
  setPreferenceAdapter(null);
});

describe('varsayılan ekipman görünürlüğü', () => {
  /*
   * 0133 varsayılanı "profilde" yaptı; tercih ekranı gelince bu
   * varsayılanın sessizce değişmediğini bu sınav garanti ediyor.
   */
  it('seçim yokken profilde', () => {
    const { result } = renderHook(() => useDefaultEquipmentVisibility());
    expect(result.current[0]).toBe('profilde');
  });

  it('yazılan değer okunuyor', () => {
    const store = new Map<string, string>();
    setPreferenceAdapter({
      get: (k) => store.get(k) ?? null,
      /* Aboneleri uyandırmak ADAPTÖRÜN işi — `UiPreferencesProvider` de
         aynısını yapıyor. Sınavın gerçek adaptörden farklı davranması,
         sınanan şeyin gerçekte olmayan bir sözleşme olması demekti. */
      set: (k, v) => {
        store.set(k, v);
        notifyPreferenceChange();
      },
    });

    const { result } = renderHook(() => useDefaultEquipmentVisibility());
    act(() => result.current[1]('ozel'));
    expect(result.current[0]).toBe('ozel');
  });

  /*
   * Defterdeki değer elle bozulabilir (başka bir sürüm, elle düzenlenmiş
   * satır). Geçersiz değeri olduğu gibi döndürseydik `SetupBuilder`
   * seçicisi hiçbir seçeneğe uymayan bir değerle açılır ve ilk kayıtta
   * şema hatası verirdi.
   */
  it('geçersiz değer varsayılana düşüyor', () => {
    const store = new Map<string, string>([
      ['ekipman-varsayilan-gorunurluk', 'saçma'],
    ]);
    setPreferenceAdapter({
      get: (k) => store.get(k) ?? null,
      set: (k, v) => void store.set(k, v),
    });

    const { result } = renderHook(() => useDefaultEquipmentVisibility());
    expect(result.current[0]).toBe('profilde');
  });
});

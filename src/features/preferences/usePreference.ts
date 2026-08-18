import { useCallback, useSyncExternalStore } from 'react';
import {
  readPreference,
  subscribePreferences,
  writePreference,
} from '@/components/ui/preferenceStore';

/**
 * TEK BİR TERCİHİ OKUYUP YAZAN KANCA.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN GEREKLİ
 *
 * `ui_preferences` tablosu çalışıyordu ama tek bir şey için: liste/ızgara
 * görünümü (`useViewMode`). Tercih altyapısı hazır olmasına rağmen
 * kullanıcının değiştirebileceği başka bir ayar yoktu ve tercihlerin
 * TOPLU olarak görüldüğü bir ekran hiç yoktu — kullanıcı hangi
 * ayarlarının hesabında saklandığını bilmiyordu.
 *
 * Bu kanca `useViewMode`un tek amaçlı sürümünü genelleştiriyor: aynı
 * defteri kullanıyor, dolayısıyla oturum açıkken hesaba yazılıyor,
 * kapalıyken bellekte kalıyor.
 *
 * `useSyncExternalStore`: defter React dışında yaşıyor ve iki ekran aynı
 * tercihi gösterdiğinde ikisi de aynı anda güncellenmeli.
 */
export function usePreference<T extends string>(
  key: string,
  fallback: T,
  isValid: (value: string) => value is T
): [T, (value: T) => void] {
  const value = useSyncExternalStore(
    subscribePreferences,
    () => readPreference(key),
    /* Sunucu render'ında defter boş: prerender edilen HTML herkes için
       aynı olmalı, kullanıcıya özel bir değerle çizilmemeli. */
    () => null
  );

  const set = useCallback((next: T) => writePreference(key, next), [key]);

  return [value && isValid(value) ? value : fallback, set];
}

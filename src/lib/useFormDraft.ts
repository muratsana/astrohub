import { useEffect } from 'react';
import type { FieldValues, UseFormReset, UseFormWatch } from 'react-hook-form';
import {
  gizliAlanlariAyikla,
  taslakOku,
  taslakSil,
  taslakYaz,
} from './formDraft';

/**
 * FORM TASLAĞI / OTOMATİK KAYIT STANDARDI (X07).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN BİR HOOK
 *
 * "Yasal metne gidip dönenin formu boş kalmasın" davranışı önce kayıt
 * formunda elle yazılmıştı: mount'ta taslağı oku + reset, değişimde
 * taslağa yaz, gönderimde sil. Aynı üçlü uzun formların hepsinde gerekli
 * ve elle kopyalandığında biri kaçıyor (biri gizli alanı ayıklamayı
 * unutur, biri temizlemeyi). Tek hook, standardı yapısal kılıyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * GİZLİ ALANLAR TASLAĞA YAZILMAZ
 *
 * `exclude` ile verilen alanlar (şifre gibi) `sessionStorage`a hiç
 * girmiyor — depo aynı kaynaktaki her betiğe açık. Ayıklama hook'un
 * içinde; çağıran tarafın unutması mümkün değil.
 */
export function useFormDraft<T extends FieldValues>({
  key,
  watch,
  reset,
  exclude = [],
}: {
  /** sessionStorage anahtarı — form başına benzersiz. */
  key: string;
  watch: UseFormWatch<T>;
  reset: UseFormReset<T>;
  /** Taslağa yazılmayacak hassas alanlar (ör. ['password']). */
  exclude?: string[];
}): { clear: () => void } {
  // Mount'ta taslağı yükle. Varsayılanlar korunuyor ki taslakta olmayan
  // alanlar sıfırlanmasın.
  useEffect(() => {
    const taslak = taslakOku<T>(key);
    if (taslak) reset(taslak as T, { keepDefaultValues: true });
    // Yalnızca mount'ta: anahtar değişimi ayrı bir form demek.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Değişimde otomatik kaydet; gizli alanlar ayıklanıyor.
  useEffect(() => {
    const abone = watch((degerler) => {
      taslakYaz(key, gizliAlanlariAyikla(degerler as Record<string, unknown>, exclude));
    });
    return () => abone.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, watch]);

  return { clear: () => taslakSil(key) };
}

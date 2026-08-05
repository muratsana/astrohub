import { useEffect, useRef } from 'react';
import { useActiveSetup } from './ActiveSetupContext';
import type { SlotId } from '@/domain/setup/types';

/**
 * AKTİF SETUP'I ARACIN GİRDİLERİNE DOLDURUR.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN AYRI BİR KANCA
 *
 * Simülatör, mozaik planlayıcı ve poz planlayıcı aynı üç yuvayı
 * (montür · optik · kamera) kendi `useState`leriyle tutuyor. Doldurma
 * mantığını üç yere kopyalasaydık biri değişip diğerleri değişmediğinde
 * araçlar aynı setup'tan farklı sonuç üretirdi — ve bu, en zor fark
 * edilen hata türü.
 *
 * ══════════════════════════════════════════════════════════════════════
 * KULLANICININ ELLE GİRDİĞİNİ EZMİYOR
 *
 * Doldurma yalnızca SETUP DEĞİŞTİĞİNDE çalışıyor, her boyamada değil.
 * Aksi hâlde kullanıcı kutuyu elle değiştirir, bir sonraki render
 * değeri geri alırdı — araç kullanılamaz hâle gelirdi.
 *
 * `null` setup (seçim temizlendi) hiçbir şey yapmıyor: kutular kullanıcının
 * bıraktığı gibi kalıyor. Temizlemek "her şeyi sıfırla" demek değil.
 */
export function useSetupPrefill(
  apply: (slots: Partial<Record<SlotId, string>>) => void
): void {
  const { setup } = useActiveSetup();
  const sonUygulanan = useRef<string | null>(null);
  /* `apply` her boyamada yeni bir kapanış; ref'te tutulmazsa effect
     bağımlılığı sürekli değişir ve doldurma her karede tekrarlanır. */
  const applyRef = useRef(apply);
  applyRef.current = apply;

  useEffect(() => {
    if (!setup) return;
    /* Aynı setup'ı iki kez uygulamıyoruz; `updatedAt` de anahtara giriyor
       ki kullanıcı setup'ı düzenlediğinde araç yeni hâlini alsın. */
    const anahtar = `${setup.id}:${setup.updatedAt}`;
    if (sonUygulanan.current === anahtar) return;
    sonUygulanan.current = anahtar;
    applyRef.current(setup.draft.slots);
  }, [setup]);
}

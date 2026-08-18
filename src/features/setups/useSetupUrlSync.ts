import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { SETUP_PARAM } from '@/features/targets/useActiveTarget';
import { useActiveSetup } from './ActiveSetupContext';

/**
 * AKTİF EKİPMANI ADRESLE EŞİTLER.
 *
 * ══════════════════════════════════════════════════════════════════════
 * PARAMETRE YAZILIYORDU AMA OKUNMUYORDU
 *
 * `toolLink` adrese `?ekipman=<id>` yazabiliyordu ve "Mozaik planlayıcıya
 * aktar" gibi devretme bağlantıları onu taşıyordu — ama hiçbir araç o
 * parametreyi OKUMUYORDU. Sonuç: paylaşılan bir bağlantı hedefi taşıyor,
 * ekipmanı taşımıyordu. Alıcı kadrajı açıyor, hedefi doğru görüyor,
 * ekipmanı kendi son seçimi olarak buluyordu — yani gönderenin gördüğü
 * kadraj değil.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN BAĞLAMDA DEĞİL, BURADA
 *
 * `ActiveSetupProvider` router'ın DIŞINDA duruyor (bkz. `main.tsx`):
 * rota değiştiğinde seçim sıfırlanmasın diye. Dolayısıyla orada
 * `useSearchParams` çağrılamaz. Bu kanca, aracın kendi ağacından —
 * yani router'ın içinden — aynı işi yapıyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ADRES BİR KEZ KAZANIYOR, SONRA SEÇİM KAZANIYOR
 *
 * İlk yüklemede adres bağlamı eziyor: paylaşılan bağlantı, alıcının
 * kendi son seçimiyle ezilmemeli. Ondan sonra kullanıcının araçta
 * yaptığı her değişiklik adrese yazılıyor, böylece kopyaladığı adres
 * ekranda gördüğü şeyi taşıyor.
 */
export function useSetupUrlSync(): void {
  const { setup, setActiveId, options, syncing } = useActiveSetup();
  const [params, setParams] = useSearchParams();
  const fromUrl = params.get(SETUP_PARAM);

  /* Adres → bağlam. Kayıtlar hâlâ eşitleniyorken çalışmıyor: liste
     dolmadan "böyle bir kayıt yok" diye seçimi düşürürdü. */
  useEffect(() => {
    if (!fromUrl || syncing) return;
    if (setup?.id === fromUrl) return;
    if (!options.some((option) => option.id === fromUrl)) return;
    setActiveId(fromUrl);
  }, [fromUrl, syncing, setup?.id, options, setActiveId]);

  /* Bağlam → adres. */
  useEffect(() => {
    if (!setup) return;
    if (fromUrl === setup.id) return;
    setParams(
      (mevcut) => {
        const next = new URLSearchParams(mevcut);
        next.set(SETUP_PARAM, setup.id);
        return next;
      },
      { replace: true }
    );
  }, [setup, fromUrl, setParams]);
}

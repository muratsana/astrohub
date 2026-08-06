import { Link } from 'react-router';
import { Select } from '@/components/ui/Input';
import { useActiveSetup } from './ActiveSetupContext';
import { useEquipmentCatalog } from '@/services/content/equipment';
import { SLOT_LABELS, type SlotId } from '@/domain/setup/types';

/**
 * ARAÇ SAYFALARININ ÜSTÜNDEKİ AKTİF SETUP ŞERİDİ.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BİR SEÇİM, BÜTÜN ARAÇLAR
 *
 * Kadraj, poz planı ve gece planı aynı setup'ı okuyor. Bu şerit o seçimi
 * her araçta AYNI YERDE, aynı biçimde gösteriyor — kullanıcı hangi
 * ekipmanla hesap yaptığını görmek için sayfayı kaydırmak zorunda
 * kalmasın.
 *
 * ══════════════════════════════════════════════════════════════════════
 * HİÇ SETUP YOKSA REKLAM DEĞİL, YÖNLENDİRME
 *
 * Boş durumda "setup kaydet" diye bir pazarlama kutusu çıkmıyor; tek
 * satırlık bir bağlantı duruyor. Araçlar setup olmadan da çalışıyor
 * (değerler elle girilebiliyor) ve kullanıcıyı çalışmadan önce kayıt
 * yapmaya zorlamak, aracı kullanılamaz hâle getirirdi.
 */
export function ActiveSetupBar({ className }: { className?: string }) {
  const { setup, setActiveId, options, syncing } = useActiveSetup();
  const catalog = useEquipmentCatalog();

  /* Şeritte üç ana parça görünüyor; gerisi setup sayfasında. Optik
     zincirin tamamını buraya sığdırmak, şeridi ikinci bir panele
     çevirirdi. */
  const ozet = (['montur', 'optik', 'kamera'] as SlotId[])
    .map((slot) => {
      const slug = setup?.draft.slots[slot];
      if (!slug) return null;
      const model = catalog.items.find((item) => item.slug === slug);
      return {
        slot,
        label: model ? `${model.brand} ${model.model}` : slug,
      };
    })
    .filter((entry): entry is { slot: SlotId; label: string } => entry !== null);

  if (options.length === 0) {
    return (
      <p
        className={`text-meta leading-relaxed text-muted-foreground ${className ?? ''}`}
      >
        Değerleri elle girebilir ya da{' '}
        <Link to="/ekipman" className="text-primary hover:underline">
          bir setup kurup kaydedebilirsiniz
        </Link>{' '}
        — kaydedilen setup bütün araçlarda hazır gelir.
      </p>
    );
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-border py-2.5 ${className ?? ''}`}
    >
      <label className="flex items-center gap-2">
        <span className="label shrink-0 text-faint">Aktif setup</span>
        <Select
          value={setup?.id ?? ''}
          onChange={(event) => setActiveId(event.target.value || null)}
          width="auto"
          className="h-8 min-w-[12rem] text-meta"
          aria-label="Araçlarda kullanılacak setup"
        >
          <option value="">Seçilmedi — elle gir</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
              {option.isDefault ? ' (öntanımlı)' : ''}
            </option>
          ))}
        </Select>
      </label>

      {ozet.length > 0 && (
        <ul className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          {ozet.map((entry) => (
            <li key={entry.slot} className="text-meta text-muted-foreground">
              <span className="text-faint">{SLOT_LABELS[entry.slot]}:</span>{' '}
              <span className="text-foreground">{entry.label}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Eşitleme sürüyorsa söyleniyor: liste bir an eksik görünebilir ve
          "setup'ım kayboldu" diye okunmasın. */}
      {syncing && <span className="text-meta text-faint">eşitleniyor…</span>}

      <Link
        to="/ekipman?sekme=setuplarim"
        className="ml-auto shrink-0 text-meta text-muted-foreground transition-colors hover:text-primary"
      >
        Setup&apos;ları yönet →
      </Link>
    </div>
  );
}

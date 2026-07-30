import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { useEquipmentCatalog } from '@/services/content/equipment';
import type { SavedSetup } from '@/features/setups/store';
import { useSetups } from '@/features/setups/useSetups';
import {
  computeEffectiveFRatio,
  computeEffectiveFocal,
  computePixelScale,
} from '@/domain/setup/engine';
import type { ResolvedSetup, SlotId } from '@/domain/setup/types';
import type { EquipmentModel } from '@/features/equipment/data';

/**
 * KAYITLI SETUP SEÇİMİ — fotoğraf yükleme akışında.
 *
 * Kullanıcı setup'ını bir kez kuruyor, her fotoğrafta yeniden yazmıyor.
 * Seçim, künye alanlarını dolduruyor ama **kilitlemiyor**: aynı gece
 * ara halkayı değiştirmiş ya da farklı bir filtre kullanmış olabilir.
 *
 * KÜNYE KOPYALANIYOR, BAĞ KURULMUYOR — ikisi birden yapılıyor aslında:
 * fotoğraf setup'a `setup_id` ile bağlanıyor ama künye alanları da
 * fotoğrafın kendi kaydına yazılıyor. Sebebi basit: kullanıcı setup'ını
 * altı ay sonra değiştirdiğinde eski fotoğrafın künyesi değişmemeli.
 * Yalnızca bağ kursaydık, geçmiş fotoğrafların künyesi sessizce
 * bozulurdu.
 *
 * ORİJİNAL DOSYA METADATASINA DOKUNULMUYOR. EXIF/FITS/XISF olduğu gibi
 * kalıyor; setup bilgisi Astrohub'ın kendi alanlarına yazılıyor.
 */

export interface SetupFill {
  setupId: string;
  opticSlug?: string;
  optic: string;
  cameraSlug?: string;
  camera: string;
  mountSlug?: string;
  mount: string;
  filter?: string;
  guide?: string;
  /** Hesaplanan değerler — künyede saklanır. */
  effectiveFocalMm: number | null;
  effectiveFRatio: number | null;
  pixelScaleArcsec: number | null;
}

function label(model: EquipmentModel | undefined): string {
  return model ? `${model.brand} ${model.model}` : '';
}

export function SetupSelect({ onApply }: { onApply: (fill: SetupFill) => void }) {
  const catalog = useEquipmentCatalog();
  const { setups } = useSetups();
  const [selected, setSelected] = useState<string>('');

  /* Varsayılan setup senkronizasyon bittikten sonra gelebiliyor; seçim
     bir kez, liste ilk dolduğunda kuruluyor. Her değişimde yeniden
     kursaydık kullanıcının elle yaptığı seçimi ezerdik. */
  useEffect(() => {
    if (selected) return;
    const fallback = setups.find((s) => s.isDefault);
    if (fallback) setSelected(fallback.id);
  }, [setups, selected]);
  const [applied, setApplied] = useState(false);

  const setup = setups.find((s) => s.id === selected);

  const resolved: ResolvedSetup | null = useMemo(() => {
    if (!setup) return null;
    const models: Partial<Record<SlotId, EquipmentModel>> = {};
    for (const [slot, slug] of Object.entries(setup.draft.slots) as [
      SlotId,
      string,
    ][]) {
      const model = catalog.items.find((m) => m.slug === slug);
      if (model) models[slot] = model;
    }
    return {
      models,
      spacerMm: setup.draft.spacerMm,
      extraWeightKg: setup.draft.extraWeightKg,
      seeingArcsec: setup.draft.seeingArcsec,
    };
  }, [setup, catalog.items]);

  if (setups.length === 0) {
    return (
      <div className="rounded-card border border-border bg-surface-2 px-3 py-2.5">
        <p className="text-[11.5px] leading-relaxed text-muted-foreground">
          Kayıtlı setup’ınız yok.{' '}
          <Link to="/ekipman" className="text-primary hover:underline">
            Ekipman modülünden
          </Link>{' '}
          bir setup kurup kaydederseniz, sonraki yüklemelerde künye tek
          seçimle dolar.
        </p>
      </div>
    );
  }

  function apply(source: SavedSetup, r: ResolvedSetup) {
    const focal = computeEffectiveFocal(r);
    const fRatio = computeEffectiveFRatio(r);
    const scale = computePixelScale(r);

    onApply({
      setupId: source.id,
      opticSlug: r.models.optik?.slug,
      optic: label(r.models.optik),
      cameraSlug: r.models.kamera?.slug,
      camera: label(r.models.kamera),
      mountSlug: r.models.montur?.slug,
      mount: label(r.models.montur),
      filter: label(r.models.filtre) || undefined,
      guide:
        [label(r.models['guide-scope']), label(r.models['guide-kamera'])]
          .filter(Boolean)
          .join(' + ') || undefined,
      effectiveFocalMm: focal.value,
      effectiveFRatio: fRatio.value,
      pixelScaleArcsec: scale.value,
    });
    setApplied(true);
  }

  return (
    <div className="rounded-card border border-border bg-surface-2 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="setup-select" className="label mb-1 block">
            Kayıtlı setup
          </label>
          <Select
            id="setup-select"
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setApplied(false);
            }}
            className="h-10 text-[13px]"
          >
            <option value="">Setup seçin</option>
            {setups.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.isDefault ? ' (varsayılan)' : ''}
              </option>
            ))}
          </Select>
        </div>
        <Button
          size="sm"
          disabled={!setup || !resolved}
          onClick={() => setup && resolved && apply(setup, resolved)}
        >
          Künyeye uygula
        </Button>
      </div>

      {setup && resolved && (
        <div className="mt-2.5">
          <ul className="flex flex-wrap gap-1.5">
            {(
              [
                ['Optik', resolved.models.optik],
                ['Kamera', resolved.models.kamera],
                ['Montür', resolved.models.montur],
                ['Filtre', resolved.models.filtre],
              ] as const
            )
              .filter(([, model]) => model)
              .map(([slot, model]) => (
                <li key={slot}>
                  <Badge tone="muted">
                    {slot}: {label(model)}
                  </Badge>
                </li>
              ))}
          </ul>
          <p className="mt-1.5 text-[10px] leading-snug text-faint">
            Uygulanan değerleri bu fotoğraf için tek tek değiştirebilirsiniz;
            setup’ınız etkilenmez. Fotoğrafın orijinal EXIF/FITS verisine
            dokunulmaz.
          </p>
        </div>
      )}

      {applied && (
        <p role="status" className="mt-1.5 text-[11.5px] text-success">
          Künye setup’tan dolduruldu.
        </p>
      )}
    </div>
  );
}

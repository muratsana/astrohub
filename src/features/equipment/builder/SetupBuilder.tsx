import { useMemo, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { useEquipmentCatalog } from '@/services/content/equipment';
import { CatalogSourceNote } from '@/components/ui/CatalogSourceNote';
import {
  analyzeSetup,
  buildBackfocusChain,
} from '@/domain/setup/engine';
import {
  REQUIRED_SLOTS,
  SLOT_CATEGORIES,
  SLOT_LABELS,
  type ResolvedSetup,
  type SetupDraft,
  type SlotId,
} from '@/domain/setup/types';
import { ModelPicker } from './ModelPicker';
import { AnalysisPanel } from './AnalysisPanel';
import type { EquipmentModel } from '../data';
import { visibilityLabels, type SetupVisibility } from '@/features/setups/store';

/**
 * SETUP BUILDER.
 *
 * Sol kolon zinciri kurar, sağ kolon canlı analiz gösterir ve masaüstünde
 * yapışkan kalır. Sıralama ışığın izlediği yolu takip ediyor: montür →
 * optik → düzeltici → filtre yolu → kamera → guide. Bu sıra keyfi değil,
 * backfocus zinciriyle aynı — kullanıcı ekranda gördüğü sırayla parçaları
 * fiziksel olarak da takıyor.
 *
 * ZORUNLU ÜÇ PARÇA en üstte ve işaretli: montür, optik, kamera. Bunlarsız
 * hiçbir hesap yapılamıyor ve arayüz bunu baştan söylüyor — kullanıcı on
 * yuvayı doldurup sonuç alamamakla karşılaşmıyor.
 */

/** Yuvaların gösterim sırası ve gruplanması. */
const GROUPS: { title: string; slots: SlotId[] }[] = [
  { title: 'Temel bileşenler', slots: ['montur', 'optik', 'kamera'] },
  { title: 'Optik zincir', slots: ['reducer', 'barlow', 'filtre-carki', 'filtre', 'rotator'] },
  { title: 'Guiding', slots: ['oag', 'guide-scope', 'guide-kamera'] },
  { title: 'Mekanik ve kontrol', slots: ['odaklayici', 'kontrol'] },
];

export interface SetupBuilderProps {
  draft: SetupDraft;
  onChange: (next: SetupDraft) => void;
  /** Kaydetme akışı — kaydedilecek yer builder'ın işi değil. */
  onSave?: (meta: {
    name: string;
    description: string;
    purpose: string;
    visibility: SetupVisibility;
  }) => void;
  saveLabel?: string;
  initialName?: string;
}

export function SetupBuilder({
  draft,
  onChange,
  onSave,
  saveLabel = 'Setup’ı kaydet',
  initialName = '',
}: SetupBuilderProps) {
  const catalog = useEquipmentCatalog();

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState('');
  const [purpose, setPurpose] = useState('');
  const [visibility, setVisibility] = useState<SetupVisibility>('ozel');
  const [saved, setSaved] = useState(false);

  const bySlug = useMemo(
    () => new Map(catalog.items.map((m) => [m.slug, m])),
    [catalog.items]
  );

  const resolved: ResolvedSetup = useMemo(() => {
    const models: Partial<Record<SlotId, EquipmentModel>> = {};
    for (const [slot, slug] of Object.entries(draft.slots) as [SlotId, string][]) {
      const model = bySlug.get(slug);
      if (model) models[slot] = model;
    }
    return {
      models,
      spacerMm: draft.spacerMm,
      extraWeightKg: draft.extraWeightKg,
      seeingArcsec: draft.seeingArcsec,
    };
  }, [draft, bySlug]);

  const report = useMemo(() => analyzeSetup(resolved), [resolved]);
  const segments = useMemo(() => buildBackfocusChain(resolved), [resolved]);

  const requiredBackfocus =
    resolved.models.reducer?.optics?.requiredBackfocusMm ??
    resolved.models.optik?.optics?.requiredBackfocusMm ??
    null;

  function setSlot(slot: SlotId, model: EquipmentModel | undefined) {
    const slots = { ...draft.slots };
    if (model) slots[slot] = model.slug;
    else delete slots[slot];
    onChange({ ...draft, slots });
    setSaved(false);
  }

  const filled = Object.keys(draft.slots).length;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
      {/* ══════════ Sol: bileşenler ══════════ */}
      <div className="space-y-3">
        <CatalogSourceNote selection={catalog} />

        {GROUPS.map((group) => (
          <Panel
            key={group.title}
            title={group.title}
            status={
              group.title === 'Temel bileşenler'
                ? `${REQUIRED_SLOTS.filter((s) => draft.slots[s]).length}/3`
                : undefined
            }
          >
            <ul className="space-y-2.5">
              {group.slots.map((slot) => (
                <li key={slot}>
                  <div className="mb-1 flex items-baseline gap-2">
                    <span className="label">{SLOT_LABELS[slot]}</span>
                    {REQUIRED_SLOTS.includes(slot) && !draft.slots[slot] && (
                      <Badge tone="warning">gerekli</Badge>
                    )}
                  </div>
                  <ModelPicker
                    label={SLOT_LABELS[slot]}
                    categories={SLOT_CATEGORIES[slot]}
                    catalog={catalog.items}
                    value={resolved.models[slot]}
                    onChange={(model) => setSlot(slot, model)}
                  />
                </li>
              ))}
            </ul>
          </Panel>
        ))}

        <Panel title="Kullanıcı değerleri">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field
              label="Ara halka toplamı"
              htmlFor="sb-spacer"
              hint="mm — backfocus zincirine eklenir"
            >
              <Input
                id="sb-spacer"
                type="number"
                min={0}
                step={0.1}
                value={draft.spacerMm}
                onChange={(e) =>
                  onChange({ ...draft, spacerMm: Number(e.target.value) || 0 })
                }
                className="h-10 text-body-sm"
              />
            </Field>
            <Field
              label="Ek ağırlık"
              htmlFor="sb-weight"
              hint="kg — katalogda olmayan parçalar"
            >
              <Input
                id="sb-weight"
                type="number"
                min={0}
                step={0.1}
                value={draft.extraWeightKg}
                onChange={(e) =>
                  onChange({ ...draft, extraWeightKg: Number(e.target.value) || 0 })
                }
                className="h-10 text-body-sm"
              />
            </Field>
            <Field
              label="Saha seeing değeri"
              htmlFor="sb-seeing"
              hint="arcsaniye — örnekleme kararının girdisi"
            >
              <Input
                id="sb-seeing"
                type="number"
                min={0.5}
                max={8}
                step={0.5}
                value={draft.seeingArcsec}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    seeingArcsec: Number(e.target.value) || 3,
                  })
                }
                className="h-10 text-body-sm"
              />
            </Field>
          </div>
          <p className="mt-2 text-meta leading-snug text-faint">
            Seeing değeri örnekleme kontrolünü doğrudan etkiler: 4″ seeing’de
            uygun olan piksel ölçeği 1.5″ seeing’de aşırı örnekleme sayılır.
            Sahanızın tipik değerini girin.
          </p>
        </Panel>

        {onSave && (
          <Panel title="Setup’ı kaydet">
            <div className="space-y-3">
              <Field label="Setup adı" htmlFor="sb-name">
                <Input
                  id="sb-name"
                  placeholder="ör. Yayla Geniş Alan Setup"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSaved(false);
                  }}
                  className="h-10 text-body-sm"
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Kullanım amacı" htmlFor="sb-purpose">
                  <Input
                    id="sb-purpose"
                    placeholder="Geniş alan / galaksi / gezegen"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="h-10 text-body-sm"
                  />
                </Field>
                <Field label="Görünürlük" htmlFor="sb-visibility">
                  <Select
                    id="sb-visibility"
                    value={visibility}
                    onChange={(e) =>
                      setVisibility(e.target.value as SetupVisibility)
                    }
                    className="h-10 text-body-sm"
                  >
                    {Object.entries(visibilityLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Açıklama" htmlFor="sb-desc">
                <Input
                  id="sb-desc"
                  placeholder="Bu setupla ne çekiyorsunuz?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-10 text-body-sm"
                />
              </Field>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  disabled={filled === 0 || name.trim().length === 0}
                  onClick={() => {
                    onSave({ name, description, purpose, visibility });
                    setSaved(true);
                  }}
                >
                  {saveLabel}
                </Button>
                {saved && (
                  <span role="status" className="text-body-sm text-success">
                    Kaydedildi — “Setup’larım” sekmesinde.
                  </span>
                )}
                {name.trim().length === 0 && filled > 0 && (
                  <span className="text-meta text-muted-foreground">
                    Kaydetmek için bir ad girin.
                  </span>
                )}
              </div>

              <p className="text-meta leading-snug text-faint">
                Setup, ekipmanın kendisini değil katalog referansını saklar:
                bir modelin teknik verisi düzeltildiğinde kayıtlı setup’ın
                hesabı da düzelir.
              </p>
            </div>
          </Panel>
        )}
      </div>

      {/* ══════════ Sağ: canlı analiz ══════════ */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <AnalysisPanel
          report={report}
          segments={segments}
          requiredBackfocusMm={requiredBackfocus}
        />
      </div>
    </div>
  );
}

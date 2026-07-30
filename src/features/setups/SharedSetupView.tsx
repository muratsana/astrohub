import { useMemo } from 'react';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel, SpecList, SpecRow } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { PageMeta } from '@/components/seo/PageMeta';
import { AnalysisPanel } from '@/features/equipment/builder/AnalysisPanel';
import { useEquipmentCatalog } from '@/services/content/equipment';
import { equipmentPath, type EquipmentModel } from '@/features/equipment/data';
import { analyzeSetup, buildBackfocusChain } from '@/domain/setup/engine';
import {
  SLOT_LABELS,
  type ResolvedSetup,
  type SlotId,
} from '@/domain/setup/types';
import { visibilityLabels, type SavedSetup } from './store';

/**
 * PAYLAŞILAN SETUP GÖRÜNÜMÜ.
 *
 * Setup'lar artık veritabanında; `/setup/<uuid>` bağlantısı başkasının
 * tarayıcısında da açılıyor. Önceki çözüm bütün setup'ı adresin içine
 * kodluyordu (`?d=…`) — bağlantı devasa oluyordu ve kodlanmış yükteki
 * değerler katalogdan koptuğu için model verisi düzeltildiğinde
 * paylaşılan rapor eski değerle donuyordu.
 *
 * Şimdi bağlantı yalnızca kimliği taşıyor, değerler her açılışta
 * katalogdan çözülüyor. Görünürlüğü RLS uyguluyor: özel bir setup'ın
 * bağlantısı karşı tarafta hiçbir satır döndürmüyor.
 *
 * SALT OKUNUR. Ziyaretçi başkasının setup'ını değiştiremez; "kendi
 * setup'ımı kur" bağlantısı builder'a gönderiyor.
 */
export function SharedSetupView({ setup }: { setup: SavedSetup }) {
  const catalog = useEquipmentCatalog();

  const resolved: ResolvedSetup = useMemo(() => {
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

  const report = useMemo(() => analyzeSetup(resolved), [resolved]);
  const segments = useMemo(() => buildBackfocusChain(resolved), [resolved]);

  const requiredBackfocus =
    resolved.models.reducer?.optics?.requiredBackfocusMm ??
    resolved.models.optik?.optics?.requiredBackfocusMm ??
    null;

  const parts = (Object.entries(setup.draft.slots) as [SlotId, string][])
    .map(([slot, slug]) => {
      const model = catalog.items.find((m) => m.slug === slug);
      return model ? { slot, model } : null;
    })
    .filter((p): p is { slot: SlotId; model: EquipmentModel } => p !== null);

  /* Katalogda karşılığı bulunamayan yuvalar sessizce düşmüyor: kayıt
     kurulduktan sonra bir model katalogdan kaldırılmış olabilir ve
     eksik parça raporu sessizce değiştirir. */
  const missing = Object.keys(setup.draft.slots).length - parts.length;

  return (
    <>
      <PageMeta
        title={`${setup.name} — Setup`}
        description={
          setup.description ||
          `${parts.length} bileşenli setup: uyumluluk, örnekleme ve backfocus raporu.`
        }
        noIndex={setup.visibility !== 'herkese-acik'}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Ekipman', to: '/ekipman' },
            { label: setup.name },
          ]}
          title={setup.name}
          description={setup.description}
          meta={setup.purpose}
          actions={
            <>
              <Badge tone="muted">{visibilityLabels[setup.visibility]}</Badge>
              <ButtonLink to="/ekipman" size="sm" variant="secondary">
                Kendi setup’ımı kur
              </ButtonLink>
            </>
          }
        />

        {missing > 0 && (
          <p className="mb-3 rounded-card border border-warning/40 bg-surface-1 px-3 py-2 text-body-sm text-muted-foreground">
            Bu setup’taki {missing} bileşen ekipman veritabanında
            bulunamadı; rapor eksik zincirle hesaplandı.
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <Panel title="Bileşenler" status={`${parts.length} parça`}>
            <SpecList>
              {parts.map(({ slot, model }) => (
                <SpecRow
                  key={slot}
                  label={SLOT_LABELS[slot]}
                  value={
                    <a
                      href={equipmentPath(model)}
                      className="text-foreground hover:text-primary"
                    >
                      {model.brand} {model.model}
                    </a>
                  }
                />
              ))}
              <SpecRow
                label="Ara halka"
                value={`${setup.draft.spacerMm} mm`}
                tone="muted"
              />
              <SpecRow
                label="Ek ağırlık"
                value={`${setup.draft.extraWeightKg} kg`}
                tone="muted"
              />
              <SpecRow
                label="Saha seeing"
                value={`${setup.draft.seeingArcsec}″`}
                tone="muted"
              />
            </SpecList>
          </Panel>

          <AnalysisPanel
            report={report}
            segments={segments}
            requiredBackfocusMm={requiredBackfocus}
          />
        </div>
      </Container>
    </>
  );
}

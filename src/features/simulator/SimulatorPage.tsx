import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Field } from '@/components/ui/Field';
import { Input, Select } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { FramingViews } from './FramingViews';
import { Panel, SpecList, SpecRow } from '@/components/ui/Panel';
import { Readout } from '@/components/ui/Readout';
import { PageMeta } from '@/components/seo/PageMeta';
import { ActiveSetupBar } from '@/features/setups/ActiveSetupBar';
import { useSetupPrefill } from '@/features/setups/useSetupPrefill';
import { computeOptics } from '@/domain/astronomy/optics';
import { parseAngularSizeArcmin } from '@/domain/astronomy/mosaic';
import { fixedTargets, targets } from '@/features/targets/data';
import { breadcrumbJsonLd } from '@/lib/seo';
import { PresetSelect } from '@/features/calculators/PresetSelect';
import { useCalculatorPresets } from '@/features/calculators/presets';
import {
  loadArchivePlans,
  saveArchivePlans,
  type ArchivePlan,
} from './bridge';

const framedTargets = fixedTargets
  .map((target) => ({ target, size: parseAngularSizeArcmin(target.angularSize) }))
  .filter(
    (entry): entry is {
      target: (typeof targets)[number];
      size: { widthArcmin: number; heightArcmin: number };
    } => entry.size !== null
  );

export function SimulatorPage() {
  const presets = useCalculatorPresets();
  const [opticSlug, setOpticSlug] = useState('');
  const [cameraSlug, setCameraSlug] = useState('');
  const [mountSlug, setMountSlug] = useState('');
  const [guideSlug, setGuideSlug] = useState('');
  const [focalLength, setFocalLength] = useState(530);
  const [aperture, setAperture] = useState(73);
  const [reducer, setReducer] = useState(1);
  const [pixelSize, setPixelSize] = useState(3.76);
  const [sensorWidth, setSensorWidth] = useState(23.5);
  const [sensorHeight, setSensorHeight] = useState(15.7);
  const [seeingArcsec, setSeeingArcsec] = useState(3);
  const [guideFocalLength, setGuideFocalLength] = useState(120);
  const [guidePixelSize, setGuidePixelSize] = useState(3.75);
  /*
    AKTİF SETUP'TAN DOLDURMA. Ekipman modülünde kurulan setup buraya
    kendiliğinden geliyor — kullanıcı aynı üç seçimi ikinci kez yapmıyor.
    Elle değiştirdiği değer korunuyor; ayrıntı `useSetupPrefill` başlığında.
  */
  useSetupPrefill((slots) => {
    if (slots.montur) setMountSlug(slots.montur);
    if (slots.optik) setOpticSlug(slots.optik);
    if (slots.kamera) setCameraSlug(slots.kamera);
    if (slots['guide-scope']) setGuideSlug(slots['guide-scope']);
  });

  const [targetSlug, setTargetSlug] = useState(
    framedTargets.find((entry) => entry.target.slug === 'm31-andromeda')?.target
      .slug ?? framedTargets[0]?.target.slug ?? ''
  );
  const [plannedHours, setPlannedHours] = useState(12);
  const [completedHours, setCompletedHours] = useState(0);
  const [plans, setPlans] = useState<ArchivePlan[]>(() => loadArchivePlans());

  const selected = framedTargets.find((entry) => entry.target.slug === targetSlug);
  const valid =
    focalLength > 0 &&
    aperture > 0 &&
    pixelSize > 0 &&
    sensorWidth > 0 &&
    sensorHeight > 0 &&
    seeingArcsec > 0;
  const result = useMemo(
    () =>
      valid
        ? computeOptics(
            { focalLength, aperture },
            { pixelSize, sensorWidth, sensorHeight },
            reducer
          )
        : null,
    [aperture, focalLength, pixelSize, reducer, sensorHeight, sensorWidth, valid]
  );
  /*
    UYUMLULUK HESABI BURADAN KALKTI — Ekipman modülünde yaşıyor.
    Kadraj sayfası artık yalnızca optik hesabı yapıyor: görüş alanı,
    pixel scale, örnekleme ve hedefin kadraja sığıp sığmadığı.
  */






  function savePlan() {
    if (!selected) return;
    const now = new Date().toISOString();
    const equipment = `${Math.round(focalLength * reducer)} mm · ${sensorWidth}×${sensorHeight} mm · ${pixelSize} µm`;
    const next: ArchivePlan = {
      id: crypto.randomUUID(),
      targetSlug: selected.target.slug,
      targetName: selected.target.name,
      targetCatalog: selected.target.catalog,
      plannedHours,
      completedHours,
      equipment,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [next, ...plans].slice(0, 24);
    setPlans(updated);
    saveArchivePlans(updated);
  }

  const fovWidth = result?.fov.widthArcmin ?? 1;
  const fovHeight = result?.fov.heightArcmin ?? 1;
  const targetWidth = selected
    ? Math.max(7, Math.min(92, (selected.size.widthArcmin / fovWidth) * 86))
    : 20;
  const targetHeight = selected
    ? Math.max(7, Math.min(92, (selected.size.heightArcmin / fovHeight) * 86))
    : 20;
  const targetFits =
    !!selected &&
    selected.size.widthArcmin <= fovWidth &&
    selected.size.heightArcmin <= fovHeight;

  return (
    <>
      <PageMeta
        title="Simülatör"
        description="Görüş alanı, pixel scale ve kadraj önizlemesi — hedefin setup\u2019ına sığıp sığmadığını gösterir."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Simülatör', path: '/araclar/kadraj' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Araçlar', to: '/araclar' },
            { label: 'Kadraj' },
          ]}
          title="Kadraj ve Pixel Scale"
          description="Hedef bu setup\u2019a sığıyor mu? Görüş alanı, örnekleme ve kadraj önizlemesi. Uyumluluk kontrolü Ekipman modülünde, montür bağlantısı Mount Bridge sayfasında."
          actions={
            <ButtonLink to="/arsivim" size="sm" variant="secondary">
              Arşivim
            </ButtonLink>
          }
        />

        <FramingViews />

        <ActiveSetupBar className="mb-4" />

        <div className="mb-4 flex flex-wrap gap-2">
          {result && <Badge tone="cold">{result.pixelScale.toFixed(2)}″/px</Badge>}
        </div>

        <div className="grid gap-4 2xl:grid-cols-[330px_minmax(0,1fr)_380px]">
          <aside className="space-y-4">
            <Panel title="Setup ve hedef" status={`${presets.catalogSize} model`}>
              <div className="space-y-4">
                <PresetSelect
                  label="Montür"
                  options={presets.mount}
                  value={mountSlug}
                  onSelect={(p) => {
                    setMountSlug(p?.slug ?? '');
                  }}
                />
                <PresetSelect
                  label="Hazır teleskop"
                  options={presets.optic}
                  value={opticSlug}
                  onSelect={(p) => {
                    setOpticSlug(p?.slug ?? '');
                    if (!p) return;
                    setFocalLength(p.focalLength);
                    setAperture(p.aperture);
                  }}
                />
                <PresetSelect
                  label="Hazır kamera"
                  options={presets.camera}
                  value={cameraSlug}
                  onSelect={(p) => {
                    setCameraSlug(p?.slug ?? '');
                    if (!p) return;
                    setPixelSize(p.pixelSize);
                    setSensorWidth(p.sensorWidth);
                    setSensorHeight(p.sensorHeight);
                  }}
                />
                <Field label="Katalog hedefi" htmlFor="sim-target">
                  <Select
                    id="sim-target"
                    value={targetSlug}
                    onChange={(event) => setTargetSlug(event.target.value)}
                  >
                    {framedTargets.map((entry) => (
                      <option key={entry.target.slug} value={entry.target.slug}>
                        {entry.target.catalog} · {entry.target.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Reducer / Barlow" htmlFor="sim-reducer">
                  <Select
                    id="sim-reducer"
                    value={reducer}
                    onChange={(event) => setReducer(Number(event.target.value))}
                  >
                    {presets.reducer.map((entry) => (
                      <option key={entry.label} value={entry.factor}>
                        {entry.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <PresetSelect
                  label="Guide seti"
                  options={presets.guide}
                  value={guideSlug}
                  onSelect={(p) => {
                    setGuideSlug(p?.slug ?? '');
                    if (!p) return;
                    setGuideFocalLength(p.focalLength < 0 ? focalLength * reducer : p.focalLength);
                    setGuidePixelSize(p.pixelSize);
                  }}
                  placeholder="Guide yok veya elle gir…"
                />
              </div>
            </Panel>

            <Panel title="Optik değerler">
              <div className="grid grid-cols-2 gap-3">
                <NumberField id="sim-focal" label="Odak" value={focalLength} unit="mm" onChange={setFocalLength} />
                <NumberField id="sim-aperture" label="Açıklık" value={aperture} unit="mm" onChange={setAperture} />
                <NumberField id="sim-pixel" label="Piksel" value={pixelSize} unit="µm" step={0.01} onChange={setPixelSize} />
                <NumberField id="seeing" label="Seeing" value={seeingArcsec} unit="″" step={0.1} onChange={setSeeingArcsec} />
                <NumberField id="sim-sensor-w" label="Sensör G" value={sensorWidth} unit="mm" step={0.1} onChange={setSensorWidth} />
                <NumberField id="sim-sensor-h" label="Sensör Y" value={sensorHeight} unit="mm" step={0.1} onChange={setSensorHeight} />
                <NumberField id="guide-focal" label="Guide odak" value={guideFocalLength} unit="mm" onChange={setGuideFocalLength} />
                <NumberField id="guide-pixel" label="Guide piksel" value={guidePixelSize} unit="µm" step={0.01} onChange={setGuidePixelSize} />
              </div>
            </Panel>

            {/*
              MEKANİK UYUMLULUK PANELİ BURADAN KALKTI.

              Montür kapasitesi, parça ağırlıkları, backfocus zinciri ve
              ara halka — hiçbiri kadrajla ilgili değil; hepsi "elimdekiler
              birlikte çalışır mı" sorusunun parçası ve o soru Ekipman
              modülünde cevaplanıyor. Burada durmaları, aynı hesabın iki
              yerde yaşaması demekti: ikisi ayrıştığında hangisinin doğru
              olduğu bilinemezdi.

              Girdiler kaldırılırken PANELİN KENDİSİ de gitti — daha
              kötüsü olurdu: bir süre girdiler durup sonuçları
              gösterilmiyordu, yani kullanıcı backfocus'u bozup hiçbir
              uyarı görmüyordu (CI bunu yakaladı).
            */}
          </aside>

          <main className="space-y-4">
            <Panel
              title="Canlı FoV"
              status={selected ? `${selected.target.catalog} · ${selected.target.ra}` : 'hedef yok'}
              bodyClassName="p-0"
            >
              <div className="relative min-h-[540px] overflow-hidden bg-[radial-gradient(circle_at_46%_38%,rgba(103,201,255,0.32),transparent_11%),radial-gradient(circle_at_54%_46%,rgba(188,167,255,0.22),transparent_14%),radial-gradient(circle_at_33%_63%,rgba(255,159,36,0.13),transparent_17%),#071015]">
                <div className="absolute inset-0 opacity-55 [background-image:radial-gradient(circle,rgba(255,255,255,0.75)_1px,transparent_1.2px)] [background-size:39px_39px]" />
                <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle,rgba(255,255,255,0.8)_1px,transparent_1.2px)] [background-size:71px_71px] [transform:rotate(9deg)_scale(1.2)]" />
                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  <Badge tone={targetFits ? 'success' : 'warning'}>
                    {targetFits ? 'hedef kadrajda' : 'hedef taşabilir'}
                  </Badge>
                </div>
                {selected && (
                  <div className="absolute inset-12 flex items-center justify-center">
                    <div
                      className="rounded-full border border-cold/70 bg-cold/10 ring-1 ring-cold/20"
                      style={{ width: `${targetWidth}%`, height: `${targetHeight}%` }}
                    />
                  </div>
                )}
                <div className="absolute inset-x-[18%] inset-y-[18%] rotate-[-7deg] border-2 border-primary/90 bg-primary/5" />
                <div className="absolute inset-x-[31%] inset-y-[31%] rotate-[-7deg] border border-dashed border-cold/80" />
                <div className="absolute right-4 top-4 w-72 max-w-[calc(100%-2rem)] border border-border bg-background/85 p-3 backdrop-blur">
                  <p className="label text-muted-foreground">Anlık kadraj</p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <MiniMetric label="FoV" value={result ? `${result.fov.widthDeg.toFixed(2)}°` : '—'} />
                    <MiniMetric label="Scale" value={result ? `${result.pixelScale.toFixed(2)}″` : '—'} />
                    <MiniMetric label="Rotasyon" value="18°" />
                  </div>
                  <div className="mt-3 space-y-2">
                    <InlineCheck label="Hedef / FoV" ok={targetFits} value={targetFits ? 'uygun' : 'dar'} />
                    <InlineCheck label="Sampling" ok={result?.sampling.category === 'optimal'} value={result?.sampling.label ?? '—'} />
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-end justify-between gap-3 border border-border bg-background/85 p-3 backdrop-blur">
                  <div>
                    <p className="label text-primary">Seçili hedef</p>
                    <h2 className="mt-1 font-display text-readout-sm font-bold text-foreground">
                      {selected
                        ? `${selected.target.catalog} · ${selected.target.name}`
                        : 'Hedef seçilmedi'}
                    </h2>
                    {selected && (
                      <p className="mt-1 text-meta text-muted-foreground">
                        {selected.target.constellation} · {selected.target.angularSize} ·{' '}
                        {selected.target.bestMonths}
                      </p>
                    )}
                  </div>
                  <ButtonLink
                    to={
                      selected
                        ? `/araclar/gokyuzu-katalogu?q=${encodeURIComponent(
                            selected.target.catalog
                          )}`
                        : '/araclar/gokyuzu-katalogu'
                    }
                    size="sm"
                    variant="secondary"
                  >
                    Katalogda aç
                  </ButtonLink>
                </div>
              </div>
            </Panel>

            {/* RA/DEC göstergeleri buradaydı ve ASCOM köprüsünden
                besleniyordu; köprü kurmamış ziyaretçide — yani neredeyse
                herkeste — iki gösterge kalıcı olarak "—" gösteriyordu.
                Köprü kendi sayfasına taşındı (/ekipman/bridge); yerlerini
                kadrajın kendi sayıları aldı. */}
            <div className="grid gap-4 md:grid-cols-3">
              <Readout label="Pixel scale" value={result ? result.pixelScale.toFixed(2) : '—'} unit="″/px" />
              <Readout label="Görüş alanı" value={result ? `${result.fov.widthDeg.toFixed(2)}×${result.fov.heightDeg.toFixed(2)}` : '—'} unit="°" />
              <Readout label="Efektif odak" value={result ? result.effectiveFocalLength.toFixed(0) : '—'} unit="mm" />
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <Panel title="Gece planı" status="Arşivim">
                <div className="space-y-3">
                  <div className="h-20 border border-border bg-[linear-gradient(90deg,transparent_0_12%,rgba(103,201,255,0.18)_12%_24%,transparent_24%_35%,rgba(255,159,36,0.22)_35%_78%,transparent_78%),var(--color-surface-2)]" />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <MiniMetric label="Başlangıç" value="22:14" />
                    <MiniMetric label="Meridyen" value="01:42" />
                    <MiniMetric label="Bitiş" value="04:36" />
                  </div>
                </div>
              </Panel>
              <Panel title="Hesap özeti">
                <div className="grid gap-3">
                  <SpecList>
                    <SpecRow label="Çözünürlük" value={result ? `${result.resolutionX}×${result.resolutionY}` : '—'} />
                    <SpecRow label="Efektif odak" value={result ? `${result.effectiveFocalLength.toFixed(0)} mm` : '—'} />
                    <SpecRow label="Odak oranı" value={result?.fRatio ? `f/${result.fRatio.toFixed(1)}` : '—'} />
                    <SpecRow label="Kapsama" value={targetFits ? 'Uygun' : 'Taşabilir'} tone={targetFits ? 'cold' : 'primary'} />
                  </SpecList>
                </div>
              </Panel>
            </div>
          </main>

          <aside className="space-y-4">

            <Panel title="Arşive ekle">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <NumberField id="planned-hours" label="Plan" value={plannedHours} unit="sa" step={0.5} onChange={setPlannedHours} />
                  <NumberField id="completed-hours" label="Tamam" value={completedHours} unit="sa" step={0.5} onChange={setCompletedHours} />
                </div>
                <Button type="button" className="w-full" onClick={savePlan}>
                  Hedefi arşivime ekle
                </Button>
                <ButtonLink to="/arsivim" className="w-full" variant="secondary">
                  Arşivimi aç
                </ButtonLink>
              </div>
            </Panel>

            <Panel title="Son arşiv kayıtları">
              <ul className="space-y-2">
                {plans.slice(0, 3).map((plan) => (
                  <li key={plan.id} className="border border-border bg-surface-2 p-3">
                    <Link to="/arsivim" className="font-medium text-foreground hover:text-primary">
                      {plan.targetCatalog} · {plan.targetName}
                    </Link>
                    <ProgressBar value={(plan.completedHours / Math.max(1, plan.plannedHours)) * 100} className="mt-2" />
                  </li>
                ))}
                {plans.length === 0 && (
                  <li className="text-meta text-muted-foreground">Henüz kayıt yok.</li>
                )}
              </ul>
            </Panel>
          </aside>
        </div>
      </Container>
    </>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  unit,
  step = 1,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit: string;
  step?: number;
}) {
  return (
    <Field label={label} htmlFor={id}>
      <div className="relative">
        <Input
          id={id}
          type="number"
          min={0}
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => onChange(Number(event.target.value))}
          className="pr-11"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-meta text-faint">
          {unit}
        </span>
      </div>
    </Field>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-surface-1 p-2">
      <p className="label">{label}</p>
      <p className="tabular mt-1 text-body-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function InlineCheck({
  label,
  ok,
  value,
}: {
  label: string;
  ok: boolean;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-meta">
      <span className="text-muted-foreground">
        <span className={ok ? 'text-success' : 'text-warning'}>●</span> {label}
      </span>
      <span className={ok ? 'text-success' : 'text-warning'}>{value}</span>
    </div>
  );
}

function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={className}>
      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full bg-primary"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}






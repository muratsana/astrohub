import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Field } from '@/components/ui/Field';
import { Input, Select } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel, SpecList, SpecRow } from '@/components/ui/Panel';
import { Readout } from '@/components/ui/Readout';
import { PageMeta } from '@/components/seo/PageMeta';
import { computeOptics } from '@/domain/astronomy/optics';
import { parseAngularSizeArcmin } from '@/domain/astronomy/mosaic';
import { fixedTargets, targets } from '@/features/targets/data';
import { breadcrumbJsonLd } from '@/lib/seo';
import { PresetSelect } from '@/features/calculators/PresetSelect';
import { useCalculatorPresets } from '@/features/calculators/presets';
import {
  DEFAULT_BRIDGE_URL,
  connectMountBridge,
  disconnectMountBridge,
  fetchMountBridgeStatus,
  loadArchivePlans,
  saveArchivePlans,
  type ArchivePlan,
  type MountBridgeStatus,
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
  const [bridgeUrl, setBridgeUrl] = useState(DEFAULT_BRIDGE_URL);
  const [driverId, setDriverId] = useState('ASCOM.Simulator.Telescope');
  const [status, setStatus] = useState<MountBridgeStatus | null>(null);
  const [bridgeBusy, setBridgeBusy] = useState(false);
  const [polling, setPolling] = useState(false);
  const [opticSlug, setOpticSlug] = useState('');
  const [cameraSlug, setCameraSlug] = useState('');
  const [focalLength, setFocalLength] = useState(530);
  const [aperture, setAperture] = useState(73);
  const [reducer, setReducer] = useState(1);
  const [pixelSize, setPixelSize] = useState(3.76);
  const [sensorWidth, setSensorWidth] = useState(23.5);
  const [sensorHeight, setSensorHeight] = useState(15.7);
  const [targetSlug, setTargetSlug] = useState(
    framedTargets.find((entry) => entry.target.slug === 'm31-andromeda')?.target
      .slug ?? framedTargets[0]?.target.slug ?? ''
  );
  const [plannedHours, setPlannedHours] = useState(12);
  const [completedHours, setCompletedHours] = useState(0);
  const [plans, setPlans] = useState<ArchivePlan[]>(() => loadArchivePlans());

  const selected = framedTargets.find((entry) => entry.target.slug === targetSlug);
  const valid =
    focalLength > 0 && pixelSize > 0 && sensorWidth > 0 && sensorHeight > 0;
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

  const refreshBridge = useCallback(async () => {
    setStatus(await fetchMountBridgeStatus(bridgeUrl));
  }, [bridgeUrl]);

  async function connectBridge() {
    setBridgeBusy(true);
    try {
      setStatus(await connectMountBridge(bridgeUrl, driverId.trim()));
      setPolling(true);
    } finally {
      setBridgeBusy(false);
    }
  }

  async function disconnectBridge() {
    setBridgeBusy(true);
    try {
      setStatus(await disconnectMountBridge(bridgeUrl));
      setPolling(false);
    } finally {
      setBridgeBusy(false);
    }
  }

  useEffect(() => {
    if (!polling) return;
    refreshBridge();
    const timer = window.setInterval(refreshBridge, 2000);
    return () => window.clearInterval(timer);
  }, [polling, refreshBridge]);

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

  return (
    <>
      <PageMeta
        title="Simülatör"
        description="ASCOM montür bridge bağlantısı, canlı RA/DEC okuması, ekipman FOV hesabı ve kişisel hedef arşivi."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Simülatör', path: '/simulator' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Simülatör' },
          ]}
          title="Simülatör"
          description="Montürden gelen canlı koordinatı, seçili ekipman FOV hesabı ve hedef planı aynı ekranda. ASCOM bağlantısı yerel Astrohub Mount Bridge üzerinden okunur."
          actions={
            <>
              <ButtonLink to="/arsivim" size="sm" variant="secondary">
                Arşivim
              </ButtonLink>
              <ButtonLink to="/araclar/fov" size="sm" variant="secondary">
                FOV aracı
              </ButtonLink>
            </>
          }
        />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <Panel
              title="Canlı FOV"
              status={selected ? `${selected.target.catalog} · ${selected.target.ra}` : 'hedef yok'}
              bodyClassName="p-0"
            >
              <div className="relative min-h-[420px] overflow-hidden bg-[radial-gradient(circle_at_40%_35%,rgba(68,127,153,0.35),transparent_24%),radial-gradient(circle_at_68%_60%,rgba(255,161,38,0.18),transparent_22%),#071015]">
                <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(circle,rgba(255,255,255,0.7)_1px,transparent_1.2px)] [background-size:37px_37px]" />
                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  <Badge tone={status?.connected ? 'success' : 'warning'}>
                    {status?.connected ? 'montür canlı' : 'bridge bekleniyor'}
                  </Badge>
                  {status?.name && <Badge tone="cold">{status.name}</Badge>}
                </div>
                {selected && (
                  <div className="absolute inset-12 flex items-center justify-center">
                    <div
                      className="rounded-full border border-cold/70 bg-cold/10"
                      style={{ width: `${targetWidth}%`, height: `${targetHeight}%` }}
                    />
                  </div>
                )}
                <div className="absolute inset-8 border border-primary/80" />
                <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-end justify-between gap-3 rounded-card border border-border bg-background/80 p-3 backdrop-blur">
                  <div>
                    <p className="label text-primary">Hedef</p>
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
                  {result && (
                    <p className="tabular text-meta text-muted-foreground">
                      FOV {result.fov.widthDeg.toFixed(2)}° ×{' '}
                      {result.fov.heightDeg.toFixed(2)}° ·{' '}
                      {result.pixelScale.toFixed(2)}″/px
                    </p>
                  )}
                </div>
              </div>
            </Panel>

            <div className="grid gap-4 lg:grid-cols-3">
              <Readout
                label="RA"
                value={formatRa(status?.rightAscensionHours)}
                tone={status?.connected ? 'cold' : 'muted'}
              />
              <Readout
                label="DEC"
                value={formatDeg(status?.declinationDeg)}
                tone={status?.connected ? 'cold' : 'muted'}
              />
              <Readout
                label="Pixel scale"
                value={result ? result.pixelScale.toFixed(2) : '—'}
                unit="″/px"
              />
            </div>

            <Panel title="Ekipman ve hedef">
              <div className="grid gap-4 lg:grid-cols-2">
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
                <Field label="Hedef kataloğu" htmlFor="sim-target">
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
                <NumberField
                  id="sim-focal"
                  label="Odak uzaklığı"
                  value={focalLength}
                  unit="mm"
                  onChange={setFocalLength}
                />
                <NumberField
                  id="sim-aperture"
                  label="Açıklık"
                  value={aperture}
                  unit="mm"
                  onChange={setAperture}
                />
                <NumberField
                  id="sim-pixel"
                  label="Piksel boyutu"
                  value={pixelSize}
                  unit="µm"
                  step={0.01}
                  onChange={setPixelSize}
                />
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    id="sim-sensor-w"
                    label="Sensör G"
                    value={sensorWidth}
                    unit="mm"
                    step={0.1}
                    onChange={setSensorWidth}
                  />
                  <NumberField
                    id="sim-sensor-h"
                    label="Sensör Y"
                    value={sensorHeight}
                    unit="mm"
                    step={0.1}
                    onChange={setSensorHeight}
                  />
                </div>
              </div>
            </Panel>
          </div>

          <aside className="space-y-4">
            <Panel
              title="Mount Bridge"
              status={status?.connected ? 'bağlı' : status?.ok ? 'açık' : 'kapalı'}
            >
              <div className="space-y-3">
                <Field label="Bridge adresi" htmlFor="bridge-url">
                  <Input
                    id="bridge-url"
                    value={bridgeUrl}
                    onChange={(event) => setBridgeUrl(event.target.value)}
                    spellCheck={false}
                  />
                </Field>
                <Field label="ASCOM DriverId" htmlFor="bridge-driver">
                  <Input
                    id="bridge-driver"
                    value={driverId}
                    onChange={(event) => setDriverId(event.target.value)}
                    spellCheck={false}
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={connectBridge}
                    disabled={bridgeBusy || !driverId.trim()}
                  >
                    Bağlan
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={disconnectBridge}
                    disabled={bridgeBusy}
                  >
                    Kes
                  </Button>
                  <Button type="button" size="sm" onClick={refreshBridge}>
                    Tara
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={polling ? 'secondary' : 'primary'}
                    onClick={() => setPolling((value) => !value)}
                  >
                    {polling ? 'Durdur' : 'Canlı izle'}
                  </Button>
                </div>
                {status?.error && (
                  <p className="text-meta leading-relaxed text-warning">
                    {status.error}. Windows’ta bridge’i başlatın: tools/mount-bridge.
                  </p>
                )}
                <SpecList>
                  <SpecRow label="Sürücü" value={status?.driverId ?? '—'} />
                  <SpecRow label="Model" value={status?.name ?? '—'} />
                  <SpecRow label="Takip" value={yesNo(status?.tracking)} />
                  <SpecRow label="Slew" value={yesNo(status?.slewing)} />
                  <SpecRow label="Alt / Az" value={`${formatDeg(status?.altitudeDeg)} / ${formatDeg(status?.azimuthDeg)}`} />
                  <SpecRow
                    label="Konum"
                    value={`${formatDeg(status?.siteLatitudeDeg)} / ${formatDeg(status?.siteLongitudeDeg)}`}
                  />
                </SpecList>
              </div>
            </Panel>

            <Panel title="Arşive ekle">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    id="planned-hours"
                    label="Plan"
                    value={plannedHours}
                    unit="sa"
                    step={0.5}
                    onChange={setPlannedHours}
                  />
                  <NumberField
                    id="completed-hours"
                    label="Tamam"
                    value={completedHours}
                    unit="sa"
                    step={0.5}
                    onChange={setCompletedHours}
                  />
                </div>
                <Button type="button" className="w-full" onClick={savePlan}>
                  Hedefi arşivime ekle
                </Button>
                <ButtonLink to="/arsivim" className="w-full" variant="secondary">
                  Arşivimi aç
                </ButtonLink>
              </div>
            </Panel>

            <Panel title="Capture akışı">
              {status?.capture ? (
                <SpecList>
                  <SpecRow label="Uygulama" value={status.capture.app ?? '—'} />
                  <SpecRow label="Durum" value={status.capture.state ?? '—'} />
                  <SpecRow label="Sequence" value={status.capture.sequenceName ?? '—'} />
                  <SpecRow label="Hedef" value={status.capture.target ?? '—'} />
                  <SpecRow
                    label="İlerleme"
                    value={`${status.capture.completedFrames ?? 0}/${status.capture.totalFrames ?? 0}`}
                  />
                  <SpecRow
                    label="Guiding RMS"
                    value={
                      status.capture.rmsArcsec === undefined
                        ? '—'
                        : `${status.capture.rmsArcsec.toFixed(2)}″`
                    }
                  />
                </SpecList>
              ) : (
                <p className="text-meta leading-relaxed text-muted-foreground">
                  PHD2, SGP, TheSkyX ve ZWO AIR adaptörleri aynı bridge JSON alanına
                  veri yazacak şekilde bağlanacak. Web tarafı hazır.
                </p>
              )}
            </Panel>

            <Panel title="Son arşiv kayıtları">
              <ul className="space-y-2">
                {plans.slice(0, 4).map((plan) => (
                  <li
                    key={plan.id}
                    className="rounded-card border border-border bg-surface-2 p-3"
                  >
                    <Link to="/arsivim" className="font-medium text-foreground hover:text-primary">
                      {plan.targetCatalog} · {plan.targetName}
                    </Link>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full bg-primary"
                        style={{
                          width: `${Math.min(100, (plan.completedHours / Math.max(1, plan.plannedHours)) * 100)}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
                {plans.length === 0 && (
                  <li className="text-meta text-muted-foreground">
                    Henüz kayıt yok.
                  </li>
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
          value={value}
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

function formatRa(value?: number): string {
  if (value === undefined) return '—';
  const hours = Math.floor(value);
  const minutes = Math.floor((value - hours) * 60);
  const seconds = Math.round(((value - hours) * 60 - minutes) * 60);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function formatDeg(value?: number): string {
  return value === undefined ? '—' : `${value.toFixed(2)}°`;
}

function yesNo(value?: boolean): string {
  if (value === undefined) return '—';
  return value ? 'Açık' : 'Kapalı';
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

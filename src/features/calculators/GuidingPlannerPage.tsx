import { useEffect, useMemo, useRef, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { ActiveSetupBar } from '@/features/setups/ActiveSetupBar';
import { useActiveSetup } from '@/features/setups/ActiveSetupContext';
import { Panel } from '@/components/ui/Panel';
import { Readout } from '@/components/ui/Readout';
import { FilterCell } from '@/components/ui/FilterBar';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { computeGuiding } from '@/domain/astronomy/guiding';
import { useCalculatorPresets, type GuidePreset } from './presets';
import { PresetSelect } from './PresetSelect';

const DEFAULTS = {
  mainFocalLength: 910,
  mainPixelSize: 3.76,
  guideFocalLength: 245,
  guidePixelSize: 2.75,
  reducerFactor: 1,
  seeingArcsec: 4.1,
};

export function GuidingPlannerPage() {
  const presets = useCalculatorPresets();
  const { setup } = useActiveSetup();
  const appliedSetupKey = useRef<string | null>(null);

  const [opticSlug, setOpticSlug] = useState('');
  const [cameraSlug, setCameraSlug] = useState('');
  const [guideSlug, setGuideSlug] = useState('');
  const [mainFocalLength, setMainFocalLength] = useState(
    DEFAULTS.mainFocalLength
  );
  const [mainPixelSize, setMainPixelSize] = useState(DEFAULTS.mainPixelSize);
  const [guideFocalLength, setGuideFocalLength] = useState(
    DEFAULTS.guideFocalLength
  );
  const [guidePixelSize, setGuidePixelSize] = useState(
    DEFAULTS.guidePixelSize
  );
  const [reducerFactor, setReducerFactor] = useState(DEFAULTS.reducerFactor);
  const [seeingArcsec, setSeeingArcsec] = useState(DEFAULTS.seeingArcsec);

  useEffect(() => {
    if (!setup) return;
    const key = [
      setup.id,
      setup.updatedAt,
      presets.optic.length,
      presets.camera.length,
      presets.guide.length,
    ].join(':');
    if (appliedSetupKey.current === key) return;
    appliedSetupKey.current = key;

    const slots = setup.draft.slots;
    if (slots.optik) {
      const optic = presets.optic.find((item) => item.slug === slots.optik);
      if (optic) {
        setOpticSlug(optic.slug);
        setMainFocalLength(optic.focalLength);
      }
    }
    if (slots.kamera) {
      const camera = presets.camera.find((item) => item.slug === slots.kamera);
      if (camera) {
        setCameraSlug(camera.slug);
        setMainPixelSize(camera.pixelSize);
      }
    }
    if (slots.reducer) {
      const reducer = presets.reducer.find((item) =>
        item.label.toLocaleLowerCase('tr-TR').includes(slots.reducer!)
      );
      if (reducer) setReducerFactor(reducer.factor);
    }
    if (slots['guide-scope'] && slots['guide-kamera']) {
      const guide = presets.guide.find(
        (item) =>
          item.slug === `${slots['guide-scope']}+${slots['guide-kamera']}`
      );
      if (guide) applyGuidePreset(guide);
    } else if (slots.oag) {
      const oag = presets.guide.find((item) => item.slug === 'oag');
      if (oag) applyGuidePreset(oag);
    }
    setSeeingArcsec(setup.draft.seeingArcsec || DEFAULTS.seeingArcsec);
  }, [setup, presets]);

  const effectiveGuideFocalLength =
    guideSlug === 'oag' ? mainFocalLength * reducerFactor : guideFocalLength;

  const result = useMemo(
    () =>
      computeGuiding({
        mainFocalLength: Math.max(1, mainFocalLength),
        mainPixelSize: Math.max(0.1, mainPixelSize),
        guideFocalLength: Math.max(1, effectiveGuideFocalLength),
        guidePixelSize: Math.max(0.1, guidePixelSize),
        reducerFactor,
        seeingArcsec: Math.max(0.1, seeingArcsec),
      }),
    [
      mainFocalLength,
      mainPixelSize,
      effectiveGuideFocalLength,
      guidePixelSize,
      reducerFactor,
      seeingArcsec,
    ]
  );

  function applyOptic(slug: string) {
    const optic = presets.optic.find((item) => item.slug === slug);
    setOpticSlug(slug);
    if (!optic) return;
    setMainFocalLength(optic.focalLength);
  }

  function applyCamera(slug: string) {
    const camera = presets.camera.find((item) => item.slug === slug);
    setCameraSlug(slug);
    if (!camera) return;
    setMainPixelSize(camera.pixelSize);
  }

  function applyGuidePreset(guide: GuidePreset | null) {
    setGuideSlug(guide?.slug ?? '');
    if (!guide) return;
    if (guide.focalLength > 0) setGuideFocalLength(guide.focalLength);
    setGuidePixelSize(guide.pixelSize);
  }

  const verdictTone = {
    ok: 'success',
    warning: 'warning',
    error: 'danger',
  }[result.verdict.tone] as 'success' | 'warning' | 'danger';

  return (
    <>
      <PageMeta
        title="Rehber Kurulumu Hesaplayıcı"
        description="Ana kamera ve rehber sisteminin piksel ölçeğini karşılaştırın; guide scope, OAG ve hazır ekipman modelleriyle guiding uyumunu kontrol edin."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Araçlar', path: '/araclar' },
          { name: 'Rehber Kurulumu', path: '/araclar/rehber-kurulumu' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          title="Rehber Kurulumu"
          description="Ana kamera ile guide sisteminin piksel ölçeğini karşılaştırın. Kayıtlı setup'lar, katalogdaki optik ve kamera modelleriyle birlikte çalışır."
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Araçlar', to: '/araclar' },
            { label: 'Rehber Kurulumu' },
          ]}
          meta={`${presets.catalogSize.toLocaleString('tr-TR')} ekipman modeli`}
          actions={<Badge tone={verdictTone}>{result.verdict.label}</Badge>}
        />

        <ActiveSetupBar className="mb-4" />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <Panel
            title="Kurulum girdileri"
            status="katalog + manuel"
            bodyClassName="space-y-4"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <PresetSelect
                label="Ana optik"
                options={presets.optic}
                value={opticSlug}
                onSelect={(option) => applyOptic(option?.slug ?? '')}
                placeholder="Teleskop/lens seç"
              />
              <PresetSelect
                label="Ana kamera"
                options={presets.camera}
                value={cameraSlug}
                onSelect={(option) => applyCamera(option?.slug ?? '')}
                placeholder="Kamera seç"
              />
              <NumberField
                label="Ana odak"
                value={mainFocalLength}
                unit="mm"
                step={1}
                onChange={setMainFocalLength}
              />
              <NumberField
                label="Ana piksel"
                value={mainPixelSize}
                unit="µm"
                step={0.01}
                onChange={setMainPixelSize}
              />
              <FilterCell label="Reducer / Barlow">
                <Select
                  value={String(reducerFactor)}
                  className="h-9 text-caption"
                  onChange={(event) =>
                    setReducerFactor(Number(event.target.value) || 1)
                  }
                >
                  {presets.reducer.map((item) => (
                    <option key={`${item.label}-${item.factor}`} value={item.factor}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </FilterCell>
              <NumberField
                label="Seeing"
                value={seeingArcsec}
                unit="yay sn"
                step={0.1}
                onChange={setSeeingArcsec}
              />
            </div>

            <div className="border-t border-border pt-4">
              <PresetSelect
                label="Guide scope + kamera"
                options={presets.guide}
                value={guideSlug}
                onSelect={applyGuidePreset}
                placeholder="Guide seti seç veya elle gir"
                emptyHint="Katalogda odak ve piksel bilgisi olan guide seti bulunamadı."
              />
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <NumberField
                  label="Rehber odak"
                  value={effectiveGuideFocalLength}
                  unit="mm"
                  step={1}
                  disabled={guideSlug === 'oag'}
                  onChange={setGuideFocalLength}
                />
                <NumberField
                  label="Rehber piksel"
                  value={guidePixelSize}
                  unit="µm"
                  step={0.01}
                  onChange={setGuidePixelSize}
                />
              </div>
            </div>
          </Panel>

          <Panel
            title="Ölçek karşılaştırması"
            status={result.verdict.label}
            bodyClassName="space-y-4"
          >
            <ScopeComparisonVisual
              ratio={result.scaleRatio}
              guideStarPx={result.guideStarFwhmPx}
              tone={result.verdict.tone}
            />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Readout
                label="Ana ölçek"
                value={formatNumber(result.mainPixelScale, 2)}
                unit="″/px"
                tone="cold"
                hint={`${formatNumber(result.effectiveMainFocalLength, 0)} mm efektif odak`}
              />
              <Readout
                label="Rehber ölçeği"
                value={formatNumber(result.guidePixelScale, 2)}
                unit="″/px"
                tone="primary"
                hint={`${formatNumber(effectiveGuideFocalLength, 0)} mm rehber odak`}
              />
              <Readout
                label="Oran"
                value={`×${formatNumber(result.scaleRatio, 1)}`}
                tone={result.verdict.tone === 'ok' ? 'plain' : 'primary'}
                hint="rehber / ana ölçek"
              />
              <Readout
                label="Rehber yıldızı"
                value={formatNumber(result.guideStarFwhmPx, 1)}
                unit="px FWHM"
                tone="plain"
                hint="merkez bulma aralığı"
              />
            </div>
            <p className="rounded-card border border-border bg-background px-3 py-3 text-caption leading-relaxed text-muted-foreground">
              <strong className="text-foreground">
                {result.verdict.label}:
              </strong>{' '}
              {result.verdict.summary}
            </p>
          </Panel>
        </div>
      </Container>
    </>
  );
}

function NumberField({
  label,
  value,
  unit,
  step,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  step: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <FilterCell label={label}>
      <div className="relative">
        <Input
          type="number"
          min={0}
          step={step}
          disabled={disabled}
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => onChange(Number(event.target.value) || 0)}
          className="h-9 pr-16 text-caption disabled:opacity-60"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-meta text-faint">
          {unit}
        </span>
      </div>
    </FilterCell>
  );
}

function ScopeComparisonVisual({
  ratio,
  guideStarPx,
  tone,
}: {
  ratio: number;
  guideStarPx: number;
  tone: 'ok' | 'warning' | 'error';
}) {
  const guideWidth = Math.max(16, Math.min(54, 58 - ratio * 6));
  const starSize = Math.max(18, Math.min(76, guideStarPx * 18));
  const toneClass = {
    ok: 'border-success text-success',
    warning: 'border-warning text-warning',
    error: 'border-danger text-danger',
  }[tone];

  return (
    <div className="overflow-hidden rounded-card border border-border bg-background">
      <div className="grid min-h-[18rem] gap-px bg-border lg:grid-cols-[1.08fr_0.92fr]">
        <div className="relative bg-surface-1 p-5">
          <div className="absolute inset-0 opacity-55 [background-image:radial-gradient(circle_at_18%_22%,rgba(255,255,255,0.28)_0_1px,transparent_1.5px),radial-gradient(circle_at_72%_30%,rgba(125,211,252,0.22)_0_1px,transparent_1.5px),radial-gradient(circle_at_56%_78%,rgba(255,170,70,0.24)_0_1px,transparent_1.5px)] [background-size:84px_74px,118px_91px,148px_112px]" />
          <div className="relative flex h-full min-h-[15rem] flex-col justify-end">
            <p className="label mb-auto text-faint">Ana scope / guide scope</p>
            <div className="mb-6 ml-[18%] h-4 w-[64%] rounded-full border border-cold/45 bg-cold/10 shadow-[0_0_22px_rgba(125,211,252,0.12)]" />
            <div
              className="mb-4 ml-[32%] h-2.5 rounded-full border border-primary/55 bg-primary/15"
              style={{ width: `${guideWidth}%` }}
            />
            <div className="relative h-11">
              <div className="absolute left-[14%] top-2 h-5 w-[72%] rounded-full border border-border-strong bg-surface-2" />
              <div className="absolute left-[12%] top-0 h-9 w-9 rounded-full border border-border-strong bg-background" />
              <div className="absolute right-[12%] top-0 h-9 w-9 rounded-full border border-border-strong bg-background" />
              <div className="absolute left-1/2 top-8 h-12 w-px bg-border-strong" />
              <div className="absolute left-[42%] top-[4.65rem] h-px w-[16%] bg-border-strong" />
            </div>
          </div>
        </div>

        <div className="bg-surface-1 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="label text-faint">Yıldız örneklemesi</p>
              <p className="mt-1 text-caption text-muted-foreground">
                Rehber yıldızın piksellere yayılımı
              </p>
            </div>
            <Badge className={cn('shrink-0', toneClass)}>
              {formatNumber(guideStarPx, 1)} px
            </Badge>
          </div>
          <div className="relative grid aspect-[16/10] place-items-center overflow-hidden rounded-card border border-border bg-background [background-image:linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:24px_24px]">
            <span
              className="rounded-full border border-foreground/25 bg-foreground/35 shadow-[0_0_34px_rgba(255,255,255,0.22)]"
              style={{ width: starSize, height: starSize }}
            />
            <span
              className="absolute rounded-full border border-cold/25"
              style={{ width: starSize * 1.9, height: starSize * 1.9 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function formatNumber(value: number, digits: number): string {
  return value.toLocaleString('tr-TR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

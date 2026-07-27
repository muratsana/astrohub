import { useMemo, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { computeOptics } from '@/domain/astronomy/optics';
import type { SamplingCategory } from '@/domain/astronomy/optics';
import { opticPresets, cameraPresets, reducerPresets } from './presets';
import { cn } from '@/lib/cn';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';

const selectClass =
  'h-11 w-full rounded-xl border border-border bg-surface-1 px-3 text-sm text-foreground focus:border-primary/60';

const samplingTone: Record<SamplingCategory, string> = {
  oversampled: 'border-accent-blue/40 text-accent-blue',
  optimal: 'border-success/40 text-success',
  undersampled: 'border-warning/40 text-warning',
};

export function FovCalculatorPage() {
  const [focalLength, setFocalLength] = useState(530);
  const [aperture, setAperture] = useState(73);
  const [reducer, setReducer] = useState(1);
  const [pixelSize, setPixelSize] = useState(3.76);
  const [sensorWidth, setSensorWidth] = useState(23.5);
  const [sensorHeight, setSensorHeight] = useState(15.7);

  const valid =
    focalLength > 0 && pixelSize > 0 && sensorWidth > 0 && sensorHeight > 0;

  const result = useMemo(() => {
    if (!valid) return null;
    return computeOptics(
      { focalLength, aperture },
      { pixelSize, sensorWidth, sensorHeight },
      reducer
    );
  }, [
    focalLength,
    aperture,
    reducer,
    pixelSize,
    sensorWidth,
    sensorHeight,
    valid,
  ]);

  return (
    <>
      <PageMeta
        title="FOV ve Pixel Scale Hesaplayıcı"
        description="Teleskop ve kamera kombinasyonunuz için görüş alanı, pixel scale ve örnekleme değerlerini hesaplayın; hedefin kadraja sığıp sığmadığını görün."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Araçlar', path: '/araclar' },
          { name: 'FOV Hesaplayıcı', path: '/araclar/fov' },
        ])}
      />
      <Container className="py-10 sm:py-14">
        <header className="mb-8 max-w-2xl">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            FOV & Pixel Scale Hesaplayıcı
          </h1>
          <p className="mt-2 text-muted-foreground">
            Teleskop ve kamera kombinasyonunun görüş alanını, piksel ölçeğini ve
            örnekleme durumunu hesapla. Tüm hesaplar cihazında yerel yapılır.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          {/* Girdiler */}
          <section className="rounded-2xl border border-border bg-surface-1 p-5 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Optik
            </h2>
            <div className="space-y-4">
              <Field label="Hazır teleskop" htmlFor="optic-preset">
                <select
                  id="optic-preset"
                  className={selectClass}
                  defaultValue=""
                  onChange={(e) => {
                    const p = opticPresets[Number(e.target.value)];
                    if (p) {
                      setFocalLength(p.focalLength);
                      setAperture(p.aperture);
                    }
                  }}
                >
                  <option value="" disabled>
                    Seç veya elle gir…
                  </option>
                  {opticPresets.map((p, i) => (
                    <option key={p.label} value={i}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Odak uzaklığı (mm)" htmlFor="fl">
                  <Input
                    id="fl"
                    type="number"
                    min={1}
                    value={focalLength}
                    onChange={(e) => setFocalLength(Number(e.target.value))}
                  />
                </Field>
                <Field label="Açıklık (mm)" htmlFor="ap">
                  <Input
                    id="ap"
                    type="number"
                    min={1}
                    value={aperture}
                    onChange={(e) => setAperture(Number(e.target.value))}
                  />
                </Field>
              </div>

              <Field label="Reducer / Barlow" htmlFor="reducer">
                <select
                  id="reducer"
                  className={selectClass}
                  value={reducer}
                  onChange={(e) => setReducer(Number(e.target.value))}
                >
                  {reducerPresets.map((r) => (
                    <option key={r.label} value={r.factor}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <h2 className="mb-4 mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Kamera
            </h2>
            <div className="space-y-4">
              <Field label="Hazır kamera" htmlFor="camera-preset">
                <select
                  id="camera-preset"
                  className={selectClass}
                  defaultValue=""
                  onChange={(e) => {
                    const p = cameraPresets[Number(e.target.value)];
                    if (p) {
                      setPixelSize(p.pixelSize);
                      setSensorWidth(p.sensorWidth);
                      setSensorHeight(p.sensorHeight);
                    }
                  }}
                >
                  <option value="" disabled>
                    Seç veya elle gir…
                  </option>
                  {cameraPresets.map((p, i) => (
                    <option key={p.label} value={i}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Piksel (µm)" htmlFor="px">
                  <Input
                    id="px"
                    type="number"
                    step="0.01"
                    min={0.1}
                    value={pixelSize}
                    onChange={(e) => setPixelSize(Number(e.target.value))}
                  />
                </Field>
                <Field label="Sensör G (mm)" htmlFor="sw">
                  <Input
                    id="sw"
                    type="number"
                    step="0.1"
                    min={1}
                    value={sensorWidth}
                    onChange={(e) => setSensorWidth(Number(e.target.value))}
                  />
                </Field>
                <Field label="Sensör Y (mm)" htmlFor="sh">
                  <Input
                    id="sh"
                    type="number"
                    step="0.1"
                    min={1}
                    value={sensorHeight}
                    onChange={(e) => setSensorHeight(Number(e.target.value))}
                  />
                </Field>
              </div>
            </div>
          </section>

          {/* Sonuçlar */}
          <section className="rounded-2xl border border-border bg-surface-1 p-5 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Sonuç
            </h2>

            {!result ? (
              <p className="text-sm text-muted-foreground">
                Geçerli değerler girin (pozitif odak, piksel ve sensör boyutu).
              </p>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <Stat
                    label="Piksel ölçeği"
                    value={`${result.pixelScale.toFixed(2)}″/px`}
                    emphasis
                  />
                  <div className="flex items-center">
                    <span
                      className={cn(
                        'rounded-full border px-3 py-1 text-sm font-medium',
                        samplingTone[result.sampling.category]
                      )}
                    >
                      {result.sampling.label}
                    </span>
                  </div>
                </div>

                <p className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-xs text-muted-foreground">
                  {result.sampling.hint}
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <Stat
                    label="Efektif odak"
                    value={`${result.effectiveFocalLength.toFixed(0)} mm`}
                  />
                  <Stat
                    label="Odak oranı"
                    value={
                      result.fRatio ? `f/${result.fRatio.toFixed(1)}` : '—'
                    }
                  />
                  <Stat
                    label="Görüş alanı (derece)"
                    value={`${result.fov.widthDeg.toFixed(2)}° × ${result.fov.heightDeg.toFixed(2)}°`}
                  />
                  <Stat
                    label="Görüş alanı (arcmin)"
                    value={`${result.fov.widthArcmin.toFixed(0)}′ × ${result.fov.heightArcmin.toFixed(0)}′`}
                  />
                  <Stat
                    label="Çözünürlük"
                    value={`${result.resolutionX} × ${result.resolutionY} px`}
                  />
                </div>

                <p className="text-xs text-muted-foreground/70">
                  Not: örnekleme değerlendirmesi tipik gökyüzü koşullarına
                  (seeing ~2–4″) göredir; kesin ideal aralık gökyüzü kalitesine
                  bağlıdır.
                </p>
              </div>
            )}
          </section>
        </div>
      </Container>
    </>
  );
}

function Stat({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'tabular mt-0.5 font-semibold text-foreground',
          emphasis ? 'text-2xl text-primary' : 'text-base'
        )}
      >
        {value}
      </p>
    </div>
  );
}

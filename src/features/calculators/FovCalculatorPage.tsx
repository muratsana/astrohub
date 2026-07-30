import { useMemo, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { Input, Select } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel, SpecList, SpecRow } from '@/components/ui/Panel';
import { Readout } from '@/components/ui/Readout';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import {
  FilterBar,
  FilterCell,
  filterControlClass,
} from '@/components/ui/FilterBar';
import { computeOptics } from '@/domain/astronomy/optics';
import type { SamplingCategory } from '@/domain/astronomy/optics';
import { parseAngularSizeArcmin } from '@/domain/astronomy/mosaic';
import { targets } from '@/features/targets/data';
import { useCalculatorPresets } from './presets';
import { PresetSelect } from './PresetSelect';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { cn } from '@/lib/cn';

/**
 * FOV VE PIXEL SCALE HESAPLAYICI (§7.12).
 *
 * Tasarım, mozaik ve uyumluluk araçlarıyla hizalandı: aynı şerit, aynı
 * ölçüm kutuları, aynı künye satırları. Üç araç aynı işi yapıyor (ekipman
 * girdisinden sayı üretmek); üçünün üç ayrı yerleşimi olması, kullanıcıyı
 * her seferinde yeniden yönlendiriyordu.
 *
 * KADRAJ ÖNİZLEMESİ eklendi: hedefin açısal boyutu kadraja oranlanarak
 * çizilir. "3.9° × 2.6° görüş alanı" bir sayıdır; hedefin sığıp sığmadığı
 * ise asıl sorudur ve gözle bir bakışta cevaplanır.
 */

const samplingTone: Record<SamplingCategory, string> = {
  oversampled: 'cold',
  optimal: 'success',
  undersampled: 'warning',
} as const satisfies Record<SamplingCategory, string>;

/** Açısal boyutu ayrıştırılabilen katalog hedefleri. */
const framedTargets = targets
  .map((target) => ({ target, size: parseAngularSizeArcmin(target.angularSize) }))
  .filter(
    (entry): entry is {
      target: (typeof targets)[number];
      size: { widthArcmin: number; heightArcmin: number };
    } => entry.size !== null
  );

export function FovCalculatorPage() {
  const presets = useCalculatorPresets();

  /* Seçim slug ile tutuluyor: liste tohum veriyle çizilip veritabanı
     yanıtıyla değiştiği için dizin kalıcı bir kimlik değil. */
  const [opticSlug, setOpticSlug] = useState('');
  const [cameraSlug, setCameraSlug] = useState('');

  const [focalLength, setFocalLength] = useState(530);
  const [aperture, setAperture] = useState(73);
  const [reducer, setReducer] = useState(1);
  const [pixelSize, setPixelSize] = useState(3.76);
  const [sensorWidth, setSensorWidth] = useState(23.5);
  const [sensorHeight, setSensorHeight] = useState(15.7);
  const [targetSlug, setTargetSlug] = useState(framedTargets[0]?.target.slug ?? '');

  const valid =
    focalLength > 0 && pixelSize > 0 && sensorWidth > 0 && sensorHeight > 0;

  const result = useMemo(() => {
    if (!valid) return null;
    return computeOptics(
      { focalLength, aperture },
      { pixelSize, sensorWidth, sensorHeight },
      reducer
    );
  }, [focalLength, aperture, reducer, pixelSize, sensorWidth, sensorHeight, valid]);

  const framed = framedTargets.find((entry) => entry.target.slug === targetSlug);

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

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Araçlar', to: '/araclar' },
            { label: 'FOV Hesaplayıcı' },
          ]}
          title="FOV ve Pixel Scale"
          description="Teleskop–kamera kombinasyonunun görüş alanı, piksel ölçeği ve örnekleme durumu. Tüm hesaplar cihazınızda yerel yapılır."
          actions={
            <>
              <ButtonLink to="/araclar/mosaic" size="sm" variant="secondary">
                Mozaik Planlayıcı
              </ButtonLink>
              <ButtonLink
                to="/araclar/setup-uyumluluk"
                size="sm"
                variant="secondary"
              >
                Uyumluluk
              </ButtonLink>
            </>
          }
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          {/* ───────── Girdiler ───────── */}
          <div className="space-y-4">
            <Panel title="Optik">
              <FilterBar columns={2} className="mb-0">
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
                <FilterCell label="Reducer / Barlow" htmlFor="reducer">
                  <Select
                    id="reducer"
                    value={reducer}
                    className={filterControlClass}
                    onChange={(e) => setReducer(Number(e.target.value))}
                  >
                    {presets.reducer.map((r) => (
                      <option key={r.label} value={r.factor}>
                        {r.label}
                      </option>
                    ))}
                  </Select>
                </FilterCell>
                <FilterCell label="Odak uzaklığı (mm)" htmlFor="fl">
                  <Input
                    id="fl"
                    type="number"
                    min={1}
                    value={focalLength}
                    onChange={(e) => setFocalLength(Number(e.target.value))}
                    className={filterControlClass}
                  />
                </FilterCell>
                <FilterCell label="Açıklık (mm)" htmlFor="ap">
                  <Input
                    id="ap"
                    type="number"
                    min={1}
                    value={aperture}
                    onChange={(e) => setAperture(Number(e.target.value))}
                    className={filterControlClass}
                  />
                </FilterCell>
              </FilterBar>
            </Panel>

            <Panel title="Kamera">
              <FilterBar columns={2} className="mb-0">
                <PresetSelect
                  label="Hazır kamera"
                  options={presets.camera}
                  value={cameraSlug}
                  className="sm:col-span-2"
                  onSelect={(p) => {
                    setCameraSlug(p?.slug ?? '');
                    if (!p) return;
                    setPixelSize(p.pixelSize);
                    setSensorWidth(p.sensorWidth);
                    setSensorHeight(p.sensorHeight);
                  }}
                />
                <FilterCell label="Piksel (µm)" htmlFor="px">
                  <Input
                    id="px"
                    type="number"
                    step="0.01"
                    min={0.1}
                    value={pixelSize}
                    onChange={(e) => setPixelSize(Number(e.target.value))}
                    className={filterControlClass}
                  />
                </FilterCell>
                <FilterCell label="Sensör G (mm)" htmlFor="sw">
                  <Input
                    id="sw"
                    type="number"
                    step="0.1"
                    min={1}
                    value={sensorWidth}
                    onChange={(e) => setSensorWidth(Number(e.target.value))}
                    className={filterControlClass}
                  />
                </FilterCell>
                <FilterCell label="Sensör Y (mm)" htmlFor="sh">
                  <Input
                    id="sh"
                    type="number"
                    step="0.1"
                    min={1}
                    value={sensorHeight}
                    onChange={(e) => setSensorHeight(Number(e.target.value))}
                    className={filterControlClass}
                  />
                </FilterCell>
              </FilterBar>
            </Panel>

            <Panel title="Kadrajda hedef">
              <FilterBar columns={2} className="mb-0">
                <FilterCell
                  label="Hedef seç"
                  htmlFor="fov-target"
                  className="sm:col-span-2"
                >
                  <Select
                    id="fov-target"
                    value={targetSlug}
                    className={filterControlClass}
                    onChange={(e) => setTargetSlug(e.target.value)}
                  >
                    {framedTargets.map((entry) => (
                      <option key={entry.target.slug} value={entry.target.slug}>
                        {entry.target.catalog} — {entry.target.name} (
                        {entry.target.angularSize})
                      </option>
                    ))}
                  </Select>
                </FilterCell>
              </FilterBar>
            </Panel>
          </div>

          {/* ───────── Sonuç ───────── */}
          <div className="space-y-4">
            {!result ? (
              <Panel title="Sonuç">
                <p className="text-[12px] text-muted-foreground">
                  Geçerli değerler girin: odak uzaklığı, piksel ve sensör
                  boyutu pozitif olmalı.
                </p>
              </Panel>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Readout
                    label="Piksel ölçeği"
                    value={result.pixelScale.toFixed(2)}
                    unit="″/px"
                  />
                  <Readout
                    label="Efektif odak"
                    value={result.effectiveFocalLength.toFixed(0)}
                    unit="mm"
                    tone="cold"
                  />
                  <Readout
                    label="Odak oranı"
                    value={result.fRatio ? `f/${result.fRatio.toFixed(1)}` : '—'}
                    tone="plain"
                  />
                  <Readout
                    label="Görüş alanı"
                    value={`${result.fov.widthDeg.toFixed(2)}°`}
                    unit={`× ${result.fov.heightDeg.toFixed(2)}°`}
                    tone="plain"
                  />
                </div>

                <Panel
                  title="Örnekleme"
                  status={
                    <Badge
                      tone={
                        samplingTone[result.sampling.category] as
                          | 'cold'
                          | 'success'
                          | 'warning'
                      }
                    >
                      {result.sampling.label}
                    </Badge>
                  }
                >
                  <p className="text-[12px] leading-relaxed text-muted-foreground">
                    {result.sampling.hint}
                  </p>
                  <p className="mt-2 text-[10px] leading-snug text-faint">
                    Bu değerlendirme tipik gökyüzü koşullarına (seeing ~2–4″)
                    göre sabit eşiklidir. Sahanızın seeing değerine bağlı
                    kararı{' '}
                    <span className="text-muted-foreground">
                      Setup Uyumluluk
                    </span>{' '}
                    aracı verir.
                  </p>
                </Panel>

                {framed && (
                  <Panel
                    title="Kadraj önizlemesi"
                    status={`${framed.target.catalog} · ${framed.target.angularSize}`}
                  >
                    <FramePreview
                      frameWidth={result.fov.widthArcmin}
                      frameHeight={result.fov.heightArcmin}
                      targetWidth={framed.size.widthArcmin}
                      targetHeight={framed.size.heightArcmin}
                      targetName={framed.target.name}
                    />
                  </Panel>
                )}

                <Panel title="Ayrıntı">
                  <SpecList>
                    <SpecRow
                      label="Görüş alanı (arcmin)"
                      value={`${result.fov.widthArcmin.toFixed(0)}′ × ${result.fov.heightArcmin.toFixed(0)}′`}
                      tone="cold"
                    />
                    <SpecRow
                      label="Çözünürlük"
                      value={`${result.resolutionX} × ${result.resolutionY} px`}
                    />
                    <SpecRow
                      label="Kadraj alanı"
                      value={`${(result.fov.widthDeg * result.fov.heightDeg).toFixed(2)} derece²`}
                      tone="muted"
                    />
                  </SpecList>
                </Panel>
              </>
            )}
          </div>
        </div>
      </Container>
    </>
  );
}

/**
 * KADRAJ ÖNİZLEMESİ.
 *
 * Kadraj sabit genişlikte çizilir; hedef ona oranlanır. Hedef kadrajdan
 * büyükse taşan kısım görünür kalır (kırpılmaz) — "sığmıyor" bilgisi asıl
 * anlatılmak istenen şey ve kırpmak onu gizlerdi.
 */
function FramePreview({
  frameWidth,
  frameHeight,
  targetWidth,
  targetHeight,
  targetName,
}: {
  frameWidth: number;
  frameHeight: number;
  targetWidth: number;
  targetHeight: number;
  targetName: string;
}) {
  const fits = targetWidth <= frameWidth && targetHeight <= frameHeight;
  const scaleX = (targetWidth / frameWidth) * 100;
  const scaleY = (targetHeight / frameHeight) * 100;

  // Taşan hedefte önizleme küçültülür ki kadrajın dışı da görünsün.
  const zoom = Math.min(1, 1 / Math.max(scaleX / 100, scaleY / 100, 1));

  return (
    <div>
      <div
        className="relative mx-auto flex items-center justify-center overflow-hidden"
        style={{ aspectRatio: `${frameWidth} / ${frameHeight}`, maxWidth: '100%' }}
      >
        {/* Kadraj */}
        <div
          className="absolute border border-primary/70"
          style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}
        />
        {/* Hedef */}
        <div
          role="img"
          aria-label={`${targetName} kadraja ${fits ? 'sığıyor' : 'sığmıyor'}`}
          className="rounded-full border border-cold/70 bg-cold/15"
          style={{
            width: `${scaleX * zoom}%`,
            height: `${scaleY * zoom}%`,
          }}
        />
      </div>

      <p
        className={cn(
          'mt-3 text-center text-[12px]',
          fits ? 'text-success' : 'text-warning'
        )}
      >
        {fits
          ? `${targetName} kadraja sığıyor.`
          : `${targetName} kadraja sığmıyor — mozaik planlayıcı gerekebilir.`}
      </p>
      <p className="mt-1 text-center text-[10px] text-faint">
        Kadraj {frameWidth.toFixed(0)}′ × {frameHeight.toFixed(0)}′ · hedef{' '}
        {targetWidth.toFixed(0)}′ × {targetHeight.toFixed(0)}′
      </p>
    </div>
  );
}

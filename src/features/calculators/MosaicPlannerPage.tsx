import { useMemo, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { Input, Select } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel, SpecList, SpecRow } from '@/components/ui/Panel';
import { Readout } from '@/components/ui/Readout';
import { Badge } from '@/components/ui/Badge';
import {
  FilterBar,
  FilterCell,
  FilterToggle,
  filterControlClass,
} from '@/components/ui/FilterBar';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { computeOptics } from '@/domain/astronomy/optics';
import {
  planMosaic,
  planMosaicBestOrientation,
  mosaicTime,
  nightsNeeded,
  parseAngularSizeArcmin,
} from '@/domain/astronomy/mosaic';
import { targets } from '@/features/targets/data';
import { useCalculatorPresets } from './presets';
import { PresetSelect } from './PresetSelect';
import { cn } from '@/lib/cn';

/**
 * MOZAİK PLANLAYICI (§7.12).
 *
 * Kadraja sığmayan hedefler için panel düzeni, adım aralığı ve toplam süre.
 * Hesabın tamamı `domain/astronomy/mosaic` içinde; bu dosya yalnızca girdi
 * toplar ve sonucu çizer.
 *
 * PANEL ÖNİZLEMESİ neden CSS grid ile çiziliyor: paneller eşit adımlı bir
 * dikdörtgen ızgara olduğu için canvas/SVG'ye gerek yok. Örtüşme, hücreleri
 * negatif boşlukla üst üste bindirmek yerine ayrı bir "örtüşme şeridi"
 * rozetiyle anlatılıyor — üst üste binen yarı saydam kutular ekranda
 * okunaklı bir şey üretmiyor, sayı üretiyor.
 */

type Orientation = 'auto' | 'yatay' | 'dikey';

/** Katalogdan seçilebilen, açısal boyutu ayrıştırılabilen hedefler. */
const catalogTargets = targets
  .map((t) => ({ target: t, size: parseAngularSizeArcmin(t.angularSize) }))
  .filter((entry): entry is { target: (typeof targets)[number]; size: NonNullable<ReturnType<typeof parseAngularSizeArcmin>> } =>
    entry.size !== null
  );

export function MosaicPlannerPage() {
  // Optik + kamera
  const presets = useCalculatorPresets();

  /* Seçim slug ile tutuluyor — liste veritabanı yanıtıyla değiştiğinde
     dizin bambaşka bir modeli işaret ederdi. */
  const [opticSlug, setOpticSlug] = useState('');
  const [cameraSlug, setCameraSlug] = useState('');

  const [focalLength, setFocalLength] = useState(250);
  const [aperture, setAperture] = useState(51);
  const [reducer, setReducer] = useState(1);
  const [pixelSize, setPixelSize] = useState(3.76);
  const [sensorWidth, setSensorWidth] = useState(23.5);
  const [sensorHeight, setSensorHeight] = useState(15.7);

  // Hedef
  const [targetWidth, setTargetWidth] = useState(178);
  const [targetHeight, setTargetHeight] = useState(63);
  const [overlapPercent, setOverlapPercent] = useState(15);
  const [orientation, setOrientation] = useState<Orientation>('auto');
  const [showMargin, setShowMargin] = useState(true);

  // Süre
  const [subExposure, setSubExposure] = useState(300);
  const [subsPerPanel, setSubsPerPanel] = useState(12);
  const [usableHours, setUsableHours] = useState(6);

  const optics = useMemo(() => {
    if (focalLength <= 0 || pixelSize <= 0 || sensorWidth <= 0 || sensorHeight <= 0) {
      return null;
    }
    return computeOptics(
      { focalLength, aperture },
      { pixelSize, sensorWidth, sensorHeight },
      reducer
    );
  }, [focalLength, aperture, reducer, pixelSize, sensorWidth, sensorHeight]);

  const plan = useMemo(() => {
    if (!optics || targetWidth <= 0 || targetHeight <= 0) return null;

    const input = {
      targetWidthArcmin: targetWidth,
      targetHeightArcmin: targetHeight,
      frameWidthArcmin: optics.fov.widthArcmin,
      frameHeightArcmin: optics.fov.heightArcmin,
      overlap: overlapPercent / 100,
    };

    return orientation === 'auto'
      ? planMosaicBestOrientation(input)
      : planMosaic({ ...input, rotate90: orientation === 'dikey' });
  }, [optics, targetWidth, targetHeight, overlapPercent, orientation]);

  const time = useMemo(() => {
    if (!plan) return null;
    return mosaicTime({
      panels: plan.panels,
      subExposureSec: subExposure,
      subsPerPanel,
    });
  }, [plan, subExposure, subsPerPanel]);

  const nights = time ? nightsNeeded(time.totalHours, usableHours) : null;

  return (
    <>
      <PageMeta
        title="Mozaik Planlayıcı"
        description="Kadraja sığmayan hedefler için panel sayısı, örtüşme adımı ve toplam çekim süresi hesabı. Teleskop ve kamera kombinasyonuna göre mozaik planı çıkarın."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Araçlar', path: '/araclar' },
          { name: 'Mozaik Planlayıcı', path: '/araclar/mosaic' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Araçlar', to: '/araclar' },
            { label: 'Mozaik Planlayıcı' },
          ]}
          title="Mozaik Planlayıcı"
          description="Hedef tek kadraja sığmıyorsa kaç panele bölüneceğini, panellerin adım aralığını ve toplam gece sayısını hesaplar. Hesaplar cihazınızda yerel yapılır."
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          {/* ───────── Girdiler ───────── */}
          <div className="space-y-4">
            <Panel title="Hedef">
              <FilterBar columns={2} className="mb-3">
                <FilterCell label="Katalogdan seç" htmlFor="mosaic-target">
                  <Select
                    id="mosaic-target"
                    defaultValue=""
                    className={filterControlClass}
                    onChange={(e) => {
                      const entry = catalogTargets[Number(e.target.value)];
                      if (!entry) return;
                      setTargetWidth(Number(entry.size.widthArcmin.toFixed(1)));
                      setTargetHeight(Number(entry.size.heightArcmin.toFixed(1)));
                    }}
                  >
                    <option value="" disabled>
                      Hedef seç…
                    </option>
                    {catalogTargets.map((entry, i) => (
                      <option key={entry.target.slug} value={i}>
                        {entry.target.catalog} — {entry.target.name} (
                        {entry.target.angularSize})
                      </option>
                    ))}
                  </Select>
                </FilterCell>
                <FilterCell label="Örtüşme (%)" htmlFor="mosaic-overlap">
                  <Input
                    id="mosaic-overlap"
                    type="number"
                    min={0}
                    max={50}
                    value={overlapPercent}
                    onChange={(e) => setOverlapPercent(Number(e.target.value))}
                    className={filterControlClass}
                  />
                </FilterCell>
                <FilterCell label="Hedef genişlik (′)" htmlFor="mosaic-tw">
                  <Input
                    id="mosaic-tw"
                    type="number"
                    min={0.1}
                    step="0.1"
                    value={targetWidth}
                    onChange={(e) => setTargetWidth(Number(e.target.value))}
                    className={filterControlClass}
                  />
                </FilterCell>
                <FilterCell label="Hedef yükseklik (′)" htmlFor="mosaic-th">
                  <Input
                    id="mosaic-th"
                    type="number"
                    min={0.1}
                    step="0.1"
                    value={targetHeight}
                    onChange={(e) => setTargetHeight(Number(e.target.value))}
                    className={filterControlClass}
                  />
                </FilterCell>
              </FilterBar>

              <FilterBar columns={2} className="mb-0">
                <FilterCell label="Kadraj yönü" htmlFor="mosaic-orientation">
                  <Select
                    id="mosaic-orientation"
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value as Orientation)}
                    className={filterControlClass}
                  >
                    <option value="auto">Otomatik (az panelli)</option>
                    <option value="yatay">Yatay</option>
                    <option value="dikey">Dikey (90° çevrik)</option>
                  </Select>
                </FilterCell>
                <FilterToggle
                  id="mosaic-margin"
                  label="Kenar payını göster"
                  checked={showMargin}
                  onChange={setShowMargin}
                />
              </FilterBar>
              <p className="mt-2 text-[10px] leading-snug text-faint">
                Otomatik seçim iki yönelimi de dener ve az panelli olanı
                kullanır; eşitlikte kadraj çevrilmez.
              </p>
            </Panel>

            <Panel title="Optik ve kamera">
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
                <FilterCell label="Odak (mm)" htmlFor="mosaic-fl">
                  <Input
                    id="mosaic-fl"
                    type="number"
                    min={1}
                    value={focalLength}
                    onChange={(e) => setFocalLength(Number(e.target.value))}
                    className={filterControlClass}
                  />
                </FilterCell>
                <FilterCell label="Açıklık (mm)" htmlFor="mosaic-ap">
                  <Input
                    id="mosaic-ap"
                    type="number"
                    min={1}
                    value={aperture}
                    onChange={(e) => setAperture(Number(e.target.value))}
                    className={filterControlClass}
                  />
                </FilterCell>
                <FilterCell label="Reducer / Barlow" htmlFor="mosaic-reducer">
                  <Select
                    id="mosaic-reducer"
                    value={reducer}
                    onChange={(e) => setReducer(Number(e.target.value))}
                    className={filterControlClass}
                  >
                    {presets.reducer.map((r) => (
                      <option key={r.label} value={r.factor}>
                        {r.label}
                      </option>
                    ))}
                  </Select>
                </FilterCell>
                <FilterCell label="Piksel (µm)" htmlFor="mosaic-px">
                  <Input
                    id="mosaic-px"
                    type="number"
                    step="0.01"
                    min={0.1}
                    value={pixelSize}
                    onChange={(e) => setPixelSize(Number(e.target.value))}
                    className={filterControlClass}
                  />
                </FilterCell>
                <FilterCell label="Sensör G (mm)" htmlFor="mosaic-sw">
                  <Input
                    id="mosaic-sw"
                    type="number"
                    step="0.1"
                    min={1}
                    value={sensorWidth}
                    onChange={(e) => setSensorWidth(Number(e.target.value))}
                    className={filterControlClass}
                  />
                </FilterCell>
                <FilterCell label="Sensör Y (mm)" htmlFor="mosaic-sh">
                  <Input
                    id="mosaic-sh"
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

            <Panel title="Çekim">
              <FilterBar columns={3} className="mb-0">
                <FilterCell label="Poz (sn)" htmlFor="mosaic-sub">
                  <Input
                    id="mosaic-sub"
                    type="number"
                    min={1}
                    value={subExposure}
                    onChange={(e) => setSubExposure(Number(e.target.value))}
                    className={filterControlClass}
                  />
                </FilterCell>
                <FilterCell label="Panel başına poz" htmlFor="mosaic-subs">
                  <Input
                    id="mosaic-subs"
                    type="number"
                    min={1}
                    value={subsPerPanel}
                    onChange={(e) => setSubsPerPanel(Number(e.target.value))}
                    className={filterControlClass}
                  />
                </FilterCell>
                <FilterCell label="Gece başına saat" htmlFor="mosaic-hours">
                  <Input
                    id="mosaic-hours"
                    type="number"
                    min={0.5}
                    step="0.5"
                    value={usableHours}
                    onChange={(e) => setUsableHours(Number(e.target.value))}
                    className={filterControlClass}
                  />
                </FilterCell>
              </FilterBar>
            </Panel>
          </div>

          {/* ───────── Sonuç ───────── */}
          <div className="space-y-4">
            {!plan || !optics || !time ? (
              <Panel title="Sonuç">
                <p className="text-[12px] text-muted-foreground">
                  Geçerli değerler girin: odak uzaklığı, piksel ve sensör
                  boyutu ile hedef ölçüleri pozitif olmalı.
                </p>
              </Panel>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Readout
                    label="Panel"
                    value={plan.panels}
                    hint={`${plan.columns} × ${plan.rows}`}
                  />
                  <Readout
                    label="Tek kare"
                    value={`${optics.fov.widthArcmin.toFixed(0)}′`}
                    unit={`× ${optics.fov.heightArcmin.toFixed(0)}′`}
                    tone="cold"
                  />
                  <Readout
                    label="Toplam süre"
                    value={time.totalHours.toFixed(1)}
                    unit="sa"
                    tone="plain"
                  />
                  <Readout
                    label="Gece"
                    value={Number.isFinite(nights ?? Infinity) ? nights! : '—'}
                    hint={`${usableHours} sa/gece`}
                    tone="plain"
                  />
                </div>

                {plan.fitsInSingleFrame && (
                  <p className="rounded-card border border-success/40 bg-surface-1 px-3 py-2.5 text-[11.5px] leading-relaxed text-success">
                    Hedef tek kadraja sığıyor — mozaiğe gerek yok. Kenar payı{' '}
                    {plan.marginWidthArcmin.toFixed(0)}′ ×{' '}
                    {plan.marginHeightArcmin.toFixed(0)}′.
                  </p>
                )}

                <Panel
                  title="Panel düzeni"
                  status={`${plan.columns} sütun × ${plan.rows} satır`}
                >
                  <PanelGrid columns={plan.columns} rows={plan.rows} />
                  <p className="mt-3 text-[10px] leading-snug text-faint">
                    Paneller %{overlapPercent} örtüşecek şekilde{' '}
                    {plan.stepWidthArcmin.toFixed(1)}′ yatay,{' '}
                    {plan.stepHeightArcmin.toFixed(1)}′ dikey adımlarla
                    çekilir. Numaralar önerilen çekim sırasıdır — satır satır
                    ilerlemek, panel geçişlerinde slew mesafesini kısa tutar.
                  </p>
                </Panel>

                <Panel title="Ayrıntı">
                  <SpecList>
                    <SpecRow
                      label="Kadraj yönü"
                      value={
                        plan.effectiveFrameWidthArcmin === optics.fov.widthArcmin
                          ? 'Yatay (çevrilmedi)'
                          : 'Dikey (90° çevrildi)'
                      }
                    />
                    <SpecRow
                      label="Adım (yatay × dikey)"
                      value={`${plan.stepWidthArcmin.toFixed(1)}′ × ${plan.stepHeightArcmin.toFixed(1)}′`}
                    />
                    <SpecRow
                      label="Kapsanan alan"
                      value={`${plan.coveredWidthArcmin.toFixed(0)}′ × ${plan.coveredHeightArcmin.toFixed(0)}′`}
                    />
                    {showMargin && (
                      <SpecRow
                        label="Kenar payı"
                        value={`${plan.marginWidthArcmin.toFixed(1)}′ × ${plan.marginHeightArcmin.toFixed(1)}′`}
                        tone="muted"
                      />
                    )}
                    <SpecRow
                      label="Piksel ölçeği"
                      value={`${optics.pixelScale.toFixed(2)}″/px`}
                      tone="cold"
                    />
                    <SpecRow
                      label="Panel başına net poz"
                      value={`${(time.integrationPerPanelSec / 3600).toFixed(2)} sa`}
                    />
                    <SpecRow
                      label="Panel başına toplam"
                      value={`${(time.perPanelSec / 3600).toFixed(2)} sa`}
                    />
                    <SpecRow
                      label="Verim (net / toplam)"
                      value={`%${(time.efficiency * 100).toFixed(0)}`}
                      tone={time.efficiency < 0.7 ? 'primary' : 'plain'}
                    />
                    <SpecRow
                      label="Toplam çözünürlük"
                      value={`≈ ${((optics.resolutionX * plan.columns) / 1000).toFixed(1)}k × ${((optics.resolutionY * plan.rows) / 1000).toFixed(1)}k px`}
                      tone="muted"
                    />
                  </SpecList>

                  <p className="mt-3 text-[10px] leading-snug text-faint">
                    Süre hesabına poz başına 12 sn (dither + indirme) ve panel
                    başına 90 sn (slew + plate solve) ek yük dâhildir. Ek yük
                    tahmini bir paydır; ekipmana göre değişir.
                  </p>
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
 * Panel ızgarası önizlemesi.
 *
 * Çok panelli planlarda (10×10 gibi) her hücreye numara yazmak okunmaz bir
 * duvar üretir; bu yüzden 36 panelden sonra numaralar gizlenir ve yalnızca
 * düzen gösterilir.
 */
function PanelGrid({ columns, rows }: { columns: number; rows: number }) {
  const showNumbers = columns * rows <= 36;
  const cells = Array.from({ length: columns * rows }, (_, i) => i + 1);

  return (
    <div
      role="img"
      aria-label={`${columns} sütun ${rows} satırlık mozaik düzeni`}
      className="grid gap-px bg-border"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {cells.map((n) => (
        <div
          key={n}
          className={cn(
            'flex aspect-[3/2] items-center justify-center bg-surface-2',
            showNumbers ? 'text-[11px]' : 'text-[0px]'
          )}
        >
          <span className="tabular text-muted-foreground">
            {showNumbers ? n : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Panel sayısına göre kısa bir zorluk rozeti — kart görünümlerinde kullanılır. */
export function MosaicScaleBadge({ panels }: { panels: number }) {
  if (panels <= 1) return <Badge tone="success">Tek kare</Badge>;
  if (panels <= 4) return <Badge tone="primary">{panels} panel</Badge>;
  if (panels <= 12) return <Badge tone="warning">{panels} panel</Badge>;
  return <Badge tone="danger">{panels} panel</Badge>;
}

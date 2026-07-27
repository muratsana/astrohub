import { useCallback, useMemo, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { useNavigate } from 'react-router-dom';
import { Input, Select } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel, SpecList, SpecRow } from '@/components/ui/Panel';
import { Readout } from '@/components/ui/Readout';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import {
  FilterBar,
  FilterCell,
  filterControlClass,
} from '@/components/ui/FilterBar';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { checkSetup } from '@/domain/equipment/compatibility';
import type { CheckSeverity, SetupInput } from '@/domain/equipment/compatibility';
import {
  mountPresets,
  opticMechanicalPresets,
  cameraMechanicalPresets,
  guidePresets,
  filterThicknessPresets,
  reducerPresets,
} from './presets';
import { saveSetup } from '@/features/setups/storage';
import { cn } from '@/lib/cn';

/**
 * SETUP UYUMLULUK KONTROLÜ (§7.12).
 *
 * "Bu ekipmanlar birlikte çalışır mı?" sorusunun sayıya dayanan cevabı.
 * Kuralların tamamı `domain/equipment/compatibility` içinde; burada yalnızca
 * girdi toplanır ve rapor çizilir.
 *
 * Sonuç üç kademeli: sorun yok / ödün var / kurulamaz. İkinci kademe önemli —
 * astrofotoğrafta çoğu karar bir ödündür ve kullanıcı bunu bilerek seçebilmeli.
 * Bu yüzden uyarılar gizlenmez, ama hata gibi de gösterilmez.
 */

const severityTone: Record<CheckSeverity, string> = {
  ok: 'border-success/40 text-success',
  warning: 'border-warning/40 text-warning',
  error: 'border-danger/40 text-danger',
};

const severityLabel: Record<CheckSeverity, string> = {
  ok: 'Uygun',
  warning: 'Ödün var',
  error: 'Kurulamaz',
};

const verdictSummary: Record<CheckSeverity, string> = {
  ok: 'Zincir uyumlu. Kontrollerin hepsi güvenli aralıkta.',
  warning:
    'Setup çalışır ama en az bir başlıkta ödün veriyorsunuz. Ayrıntıları okuyup bilinçli karar verin.',
  error:
    'En az bir başlıkta setup fiziksel olarak kurulamaz ya da sonuç kullanılamaz. Aşağıdaki kırmızı satırı çözmeden çekime çıkmayın.',
};

export function SetupCompatibilityPage() {
  const navigate = useNavigate();
  const [setupName, setSetupName] = useState('');
  const [mountIndex, setMountIndex] = useState(3); // EQ6-R Pro
  const [payloadCapacity, setPayloadCapacity] = useState(20);

  const [opticIndex, setOpticIndex] = useState(3); // Esprit 100
  const [focalLength, setFocalLength] = useState(550);
  const [aperture, setAperture] = useState(100);
  const [opticWeight, setOpticWeight] = useState(6.4);
  const [requiredBackfocus, setRequiredBackfocus] = useState(55);

  const [cameraIndex, setCameraIndex] = useState(0);
  const [pixelSize, setPixelSize] = useState(3.76);
  const [sensorWidth, setSensorWidth] = useState(23.5);
  const [sensorHeight, setSensorHeight] = useState(15.7);
  const [cameraWeight, setCameraWeight] = useState(0.7);
  const [cameraBackfocus, setCameraBackfocus] = useState(17.5);

  const [spacer, setSpacer] = useState(37.5);
  const [filterThickness, setFilterThickness] = useState(0);
  const [accessories, setAccessories] = useState(1.5);
  const [reducer, setReducer] = useState(1);
  const [seeing, setSeeing] = useState(3);
  const [guideIndex, setGuideIndex] = useState(1);

  /*
   * Girdi nesnesi tek yerde kuruluyor: hem rapor hem "kaydet" aynı değerleri
   * kullanmalı. İki ayrı yerde kurulsaydı, kaydedilen setup ile ekranda
   * görülen rapor zamanla birbirinden ayrılırdı.
   */
  const buildInput = useCallback((): SetupInput => {
    const guidePreset = guidePresets[guideIndex];
    // OAG ana optikle aynı odağı kullanır (focalLength: -1 işareti).
    const guide =
      guidePreset && guidePreset.focalLength !== 0
        ? {
            name: guidePreset.label,
            focalLength:
              guidePreset.focalLength === -1
                ? focalLength * reducer
                : guidePreset.focalLength,
            pixelSize: guidePreset.pixelSize,
          }
        : undefined;

    return {
      mount: {
        name: mountPresets[mountIndex]?.label ?? 'Montür',
        payloadCapacityKg: payloadCapacity,
      },
      optic: {
        name: opticMechanicalPresets[opticIndex]?.label ?? 'Optik',
        focalLength,
        aperture,
        weightKg: opticWeight,
        requiredBackfocusMm: requiredBackfocus,
      },
      camera: {
        name: cameraMechanicalPresets[cameraIndex]?.label ?? 'Kamera',
        pixelSize,
        sensorWidth,
        sensorHeight,
        weightKg: cameraWeight,
        backfocusMm: cameraBackfocus,
      },
      spacerMm: spacer,
      filterThicknessMm: filterThickness,
      accessoriesKg: accessories,
      reducerFactor: reducer,
      seeingArcsec: seeing,
      guide,
    };
  }, [
    mountIndex,
    opticIndex,
    cameraIndex,
    payloadCapacity,
    focalLength,
    aperture,
    opticWeight,
    requiredBackfocus,
    pixelSize,
    sensorWidth,
    sensorHeight,
    cameraWeight,
    cameraBackfocus,
    spacer,
    filterThickness,
    accessories,
    reducer,
    seeing,
    guideIndex,
  ]);

  const report = useMemo(() => {
    if (focalLength <= 0 || aperture <= 0 || pixelSize <= 0) return null;
    if (sensorWidth <= 0 || sensorHeight <= 0 || payloadCapacity <= 0) return null;
    return checkSetup(buildInput());
  }, [
    buildInput,
    focalLength,
    aperture,
    pixelSize,
    sensorWidth,
    sensorHeight,
    payloadCapacity,
  ]);

  return (
    <>
      <PageMeta
        title="Setup Uyumluluk Kontrolü"
        description="Montür yük kapasitesi, backfocus mesafesi, örnekleme ve guide uyumu — astrofotoğraf zincirinizin birlikte çalışıp çalışmadığını hesaplayın."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Araçlar', path: '/araclar' },
          { name: 'Setup Uyumluluk', path: '/araclar/setup-uyumluluk' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Araçlar', to: '/araclar' },
            { label: 'Setup Uyumluluk' },
          ]}
          title="Setup Uyumluluk Kontrolü"
          description="Montür yükü, backfocus, örnekleme ve guide uyumu tek ekranda. Her kontrol sayıya dayanır; ölçüsü olmayan hiçbir yargı burada yer almaz."
          actions={
            <ButtonLink to="/araclar/fov" size="sm" variant="secondary">
              FOV Hesaplayıcı
            </ButtonLink>
          }
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          {/* ───────── Girdiler ───────── */}
          <div className="space-y-4">
            <Panel title="Montür">
              <FilterBar columns={2} className="mb-0">
                <FilterCell label="Hazır montür" htmlFor="setup-mount">
                  <Select
                    id="setup-mount"
                    value={mountIndex}
                    className={filterControlClass}
                    onChange={(e) => {
                      const i = Number(e.target.value);
                      setMountIndex(i);
                      const p = mountPresets[i];
                      if (p) setPayloadCapacity(p.payloadCapacityKg);
                    }}
                  >
                    {mountPresets.map((p, i) => (
                      <option key={p.label} value={i}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                </FilterCell>
                <FilterCell label="Yük kapasitesi (kg)" htmlFor="setup-payload">
                  <Input
                    id="setup-payload"
                    type="number"
                    min={1}
                    step="0.1"
                    value={payloadCapacity}
                    onChange={(e) => setPayloadCapacity(Number(e.target.value))}
                    className={filterControlClass}
                  />
                </FilterCell>
              </FilterBar>
            </Panel>

            <Panel title="Optik">
              <FilterBar columns={2} className="mb-0">
                <FilterCell label="Hazır optik" htmlFor="setup-optic">
                  <Select
                    id="setup-optic"
                    value={opticIndex}
                    className={filterControlClass}
                    onChange={(e) => {
                      const i = Number(e.target.value);
                      setOpticIndex(i);
                      const p = opticMechanicalPresets[i];
                      if (!p) return;
                      setFocalLength(p.focalLength);
                      setAperture(p.aperture);
                      setOpticWeight(p.weightKg);
                      setRequiredBackfocus(p.requiredBackfocusMm);
                    }}
                  >
                    {opticMechanicalPresets.map((p, i) => (
                      <option key={p.label} value={i}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                </FilterCell>
                <FilterCell label="Reducer / Barlow" htmlFor="setup-reducer">
                  <Select
                    id="setup-reducer"
                    value={reducer}
                    className={filterControlClass}
                    onChange={(e) => setReducer(Number(e.target.value))}
                  >
                    {reducerPresets.map((r) => (
                      <option key={r.label} value={r.factor}>
                        {r.label}
                      </option>
                    ))}
                  </Select>
                </FilterCell>
                <FilterCell label="Odak (mm)" htmlFor="setup-fl">
                  <Input
                    id="setup-fl"
                    type="number"
                    min={1}
                    value={focalLength}
                    onChange={(e) => setFocalLength(Number(e.target.value))}
                    className={filterControlClass}
                  />
                </FilterCell>
                <FilterCell label="Açıklık (mm)" htmlFor="setup-ap">
                  <Input
                    id="setup-ap"
                    type="number"
                    min={1}
                    value={aperture}
                    onChange={(e) => setAperture(Number(e.target.value))}
                    className={filterControlClass}
                  />
                </FilterCell>
                <FilterCell label="Optik ağırlığı (kg)" htmlFor="setup-ow">
                  <Input
                    id="setup-ow"
                    type="number"
                    min={0.1}
                    step="0.1"
                    value={opticWeight}
                    onChange={(e) => setOpticWeight(Number(e.target.value))}
                    className={filterControlClass}
                  />
                </FilterCell>
                <FilterCell label="Gereken backfocus (mm)" htmlFor="setup-bf">
                  <Input
                    id="setup-bf"
                    type="number"
                    min={0}
                    step="0.5"
                    value={requiredBackfocus}
                    onChange={(e) => setRequiredBackfocus(Number(e.target.value))}
                    className={filterControlClass}
                  />
                </FilterCell>
              </FilterBar>
            </Panel>

            <Panel title="Kamera ve optik yol">
              <FilterBar columns={2} className="mb-0">
                <FilterCell label="Hazır kamera" htmlFor="setup-camera">
                  <Select
                    id="setup-camera"
                    value={cameraIndex}
                    className={filterControlClass}
                    onChange={(e) => {
                      const i = Number(e.target.value);
                      setCameraIndex(i);
                      const p = cameraMechanicalPresets[i];
                      if (!p) return;
                      setPixelSize(p.pixelSize);
                      setSensorWidth(p.sensorWidth);
                      setSensorHeight(p.sensorHeight);
                      setCameraWeight(p.weightKg);
                      setCameraBackfocus(p.backfocusMm);
                    }}
                  >
                    {cameraMechanicalPresets.map((p, i) => (
                      <option key={p.label} value={i}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                </FilterCell>
                <FilterCell label="Filtre kalınlığı" htmlFor="setup-filter">
                  <Select
                    id="setup-filter"
                    value={filterThickness}
                    className={filterControlClass}
                    onChange={(e) => setFilterThickness(Number(e.target.value))}
                  >
                    {filterThicknessPresets.map((f) => (
                      <option key={f.label} value={f.mm}>
                        {f.label}
                      </option>
                    ))}
                  </Select>
                </FilterCell>
                <FilterCell label="Kamera backfocus (mm)" htmlFor="setup-cbf">
                  <Input
                    id="setup-cbf"
                    type="number"
                    min={0}
                    step="0.1"
                    value={cameraBackfocus}
                    onChange={(e) => setCameraBackfocus(Number(e.target.value))}
                    className={filterControlClass}
                  />
                </FilterCell>
                <FilterCell label="Ara halka toplamı (mm)" htmlFor="setup-spacer">
                  <Input
                    id="setup-spacer"
                    type="number"
                    min={0}
                    step="0.1"
                    value={spacer}
                    onChange={(e) => setSpacer(Number(e.target.value))}
                    className={filterControlClass}
                  />
                </FilterCell>
                <FilterCell label="Piksel (µm)" htmlFor="setup-px">
                  <Input
                    id="setup-px"
                    type="number"
                    min={0.1}
                    step="0.01"
                    value={pixelSize}
                    onChange={(e) => setPixelSize(Number(e.target.value))}
                    className={filterControlClass}
                  />
                </FilterCell>
                <FilterCell label="Kamera ağırlığı (kg)" htmlFor="setup-cw">
                  <Input
                    id="setup-cw"
                    type="number"
                    min={0.05}
                    step="0.05"
                    value={cameraWeight}
                    onChange={(e) => setCameraWeight(Number(e.target.value))}
                    className={filterControlClass}
                  />
                </FilterCell>
                <FilterCell label="Sensör G (mm)" htmlFor="setup-sw">
                  <Input
                    id="setup-sw"
                    type="number"
                    min={1}
                    step="0.1"
                    value={sensorWidth}
                    onChange={(e) => setSensorWidth(Number(e.target.value))}
                    className={filterControlClass}
                  />
                </FilterCell>
                <FilterCell label="Sensör Y (mm)" htmlFor="setup-sh">
                  <Input
                    id="setup-sh"
                    type="number"
                    min={1}
                    step="0.1"
                    value={sensorHeight}
                    onChange={(e) => setSensorHeight(Number(e.target.value))}
                    className={filterControlClass}
                  />
                </FilterCell>
              </FilterBar>
            </Panel>

            <Panel title="Guide ve saha">
              <FilterBar columns={3} className="mb-0">
                <FilterCell label="Guide sistemi" htmlFor="setup-guide">
                  <Select
                    id="setup-guide"
                    value={guideIndex}
                    className={filterControlClass}
                    onChange={(e) => setGuideIndex(Number(e.target.value))}
                  >
                    {guidePresets.map((g, i) => (
                      <option key={g.label} value={i}>
                        {g.label}
                      </option>
                    ))}
                  </Select>
                </FilterCell>
                <FilterCell label="Aksesuar ağırlığı (kg)" htmlFor="setup-acc">
                  <Input
                    id="setup-acc"
                    type="number"
                    min={0}
                    step="0.1"
                    value={accessories}
                    onChange={(e) => setAccessories(Number(e.target.value))}
                    className={filterControlClass}
                  />
                </FilterCell>
                <FilterCell label="Saha seeing (″)" htmlFor="setup-seeing">
                  <Input
                    id="setup-seeing"
                    type="number"
                    min={0.5}
                    step="0.1"
                    value={seeing}
                    onChange={(e) => setSeeing(Number(e.target.value))}
                    className={filterControlClass}
                  />
                </FilterCell>
              </FilterBar>
              <p className="mt-2 text-[10px] leading-snug text-faint">
                Seeing değeri örnekleme kararını doğrudan etkiler: Türkiye'de
                iyi bir yayla gecesi 2–2.5″, şehir içi 4″ ve üzeridir.
              </p>
            </Panel>
          </div>

          {/* ───────── Rapor ───────── */}
          <div className="space-y-4">
            {!report ? (
              <Panel title="Rapor">
                <p className="text-[12px] text-muted-foreground">
                  Geçerli değerler girin: odak, açıklık, piksel, sensör ölçüleri
                  ve yük kapasitesi pozitif olmalı.
                </p>
              </Panel>
            ) : (
              <>
                <div
                  className={cn(
                    'rounded-card border bg-surface-1 px-4 py-3',
                    severityTone[report.verdict]
                  )}
                  role="status"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      tone={
                        report.verdict === 'ok'
                          ? 'success'
                          : report.verdict === 'warning'
                            ? 'warning'
                            : 'danger'
                      }
                    >
                      {severityLabel[report.verdict]}
                    </Badge>
                    <span className="tabular text-[11px] text-muted-foreground">
                      {report.checks.filter((c) => c.severity === 'ok').length} /{' '}
                      {report.checks.length} kontrol temiz
                    </span>
                  </div>
                  <p className="mt-2 text-[12px] leading-relaxed text-foreground">
                    {verdictSummary[report.verdict]}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Readout
                    label="Toplam yük"
                    value={report.totalWeightKg.toFixed(1)}
                    unit="kg"
                    hint={`pay ${report.usablePayloadKg.toFixed(1)} kg`}
                    tone={
                      report.totalWeightKg > report.usablePayloadKg
                        ? 'primary'
                        : 'plain'
                    }
                  />
                  <Readout
                    label="Optik yol"
                    value={report.achievedBackfocusMm.toFixed(1)}
                    unit="mm"
                    hint={`hedef ${requiredBackfocus} mm`}
                    tone="cold"
                  />
                  <Readout
                    label="Piksel ölçeği"
                    value={report.optics.pixelScale.toFixed(2)}
                    unit="″/px"
                  />
                  <Readout
                    label="Odak oranı"
                    value={
                      report.optics.fRatio
                        ? `f/${report.optics.fRatio.toFixed(1)}`
                        : '—'
                    }
                    tone="plain"
                  />
                </div>

                <Panel title="Kontroller" status={`${report.checks.length} başlık`}>
                  <ul className="space-y-px">
                    {report.checks.map((check) => (
                      <li
                        key={check.id}
                        className="border-b border-border pb-2.5 pt-2.5 first:pt-0 last:border-0 last:pb-0"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <span className="flex items-center gap-2">
                            <span
                              aria-hidden
                              className={cn(
                                'inline-block h-1.5 w-1.5 rounded-full',
                                check.severity === 'ok'
                                  ? 'bg-success'
                                  : check.severity === 'warning'
                                    ? 'bg-warning'
                                    : 'bg-danger'
                              )}
                            />
                            <span className="text-[12.5px] font-medium text-foreground">
                              {check.title}
                            </span>
                            <span className="sr-only">
                              {severityLabel[check.severity]}
                            </span>
                          </span>
                          <span className="tabular text-[11.5px] text-muted-foreground">
                            {check.value}
                          </span>
                        </div>
                        <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                          {check.detail}
                        </p>
                      </li>
                    ))}
                  </ul>
                </Panel>

                <Panel title="Setup'u kaydet">
                  <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                    Kayıt tarayıcınızda saklanır (hesap sistemi gelene kadar).
                    Kaydettikten sonra oluşan bağlantı, setup değerlerini
                    kendi içinde taşıdığı için başka cihazda da açılır.
                  </p>
                  <form
                    className="mt-3 flex flex-wrap items-center gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const saved = saveSetup(setupName, buildInput());
                      navigate(`/setup/${saved.id}`);
                    }}
                  >
                    <label htmlFor="setup-name" className="sr-only">
                      Setup adı
                    </label>
                    <Input
                      id="setup-name"
                      value={setupName}
                      onChange={(e) => setSetupName(e.target.value)}
                      placeholder="Setup adı (ör. Yayla kurulumu)"
                      maxLength={60}
                      className="h-9 min-w-0 flex-1 text-[12px]"
                    />
                    <Button type="submit" size="sm">
                      Kaydet
                    </Button>
                  </form>
                </Panel>

                <Panel title="Zincir künyesi">
                  <SpecList>
                    <SpecRow
                      label="Efektif odak"
                      value={`${report.optics.effectiveFocalLength.toFixed(0)} mm`}
                    />
                    <SpecRow
                      label="Görüş alanı"
                      value={`${report.optics.fov.widthDeg.toFixed(2)}° × ${report.optics.fov.heightDeg.toFixed(2)}°`}
                    />
                    <SpecRow
                      label="Çözünürlük"
                      value={`${report.optics.resolutionX} × ${report.optics.resolutionY} px`}
                      tone="muted"
                    />
                    <SpecRow
                      label="Örnekleme (sabit eşik)"
                      value={report.optics.sampling.label}
                      tone="muted"
                    />
                  </SpecList>
                  <p className="mt-3 text-[10px] leading-snug text-faint">
                    Yük payı üreticinin nominal kapasitesinin %60'ıdır —
                    astrofotoğrafta yerleşik emniyet payı. Backfocus toleransı
                    ±0.5 mm; filtre, kalınlığının 1/3'ü kadar optik yol ekler.
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

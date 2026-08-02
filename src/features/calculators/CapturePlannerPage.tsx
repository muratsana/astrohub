import { useMemo, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Field } from '@/components/ui/Field';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { PageMeta } from '@/components/seo/PageMeta';
import { formatIntegration } from '@/domain/photography/integration';
import {
  ditherAdvice,
  estimateStorage,
  formatBytes,
  planCapture,
  type FilterPlanInput,
} from '@/domain/photography/capturePlan';
import {
  continuumRejection,
  filterClassLabels,
  moonImpact,
  planFilters,
  type Fit,
} from '@/domain/photography/filterPlan';
import {
  calibrationPlan,
  rangeGain,
  type SensorKind,
} from '@/domain/photography/calibration';
import { targetKindLabels, type TargetKind } from '@/domain/targets/derive';
import { Badge } from '@/components/ui/Badge';

/**
 * POZ, ENTEGRASYON VE DEPOLAMA PLANI (§14.2).
 *
 * ══════════════════════════════════════════════════════════════════════
 * ALT POZ SÜRESİ SORULUYOR, ÖNERİLMİYOR
 *
 * §14.2 "bilimsel sonucu belirsiz alanlarda kesinlik iddiası kullanma"
 * diyor. "Optimum poz süresi" tam da öyle bir alan: gökyüzü
 * parlaklığına, okuma gürültüsüne, f oranına ve montaj takibine bağlı ve
 * tek bir doğru sayı yok. Araç kullanıcının süresini ALIYOR; bir sayı
 * uydurup "hesaplandı" demiyor. Sayfada da bu yazıyor — aracın neyi
 * yapmadığını söylemek, yaptığını söylemek kadar önemli.
 *
 * ══════════════════════════════════════════════════════════════════════
 * HESAP DOMAIN KATMANINDA
 *
 * Bütün matematik `domain/photography/capturePlan.ts`te ve elle
 * hesaplanmış sayılarla test edilmiş (§14.2'nin birinci kuralı). Bu
 * dosya yalnızca girdi topluyor ve sonucu çiziyor.
 */

interface FilterRow extends FilterPlanInput {
  id: string;
}

/** LRGB ve SHO — en yaygın iki başlangıç. Kural değil, başlangıç. */
const PRESETS: Record<string, FilterRow[]> = {
  lrgb: [
    { id: 'l', filter: 'L', weight: 4, subSeconds: 120 },
    { id: 'r', filter: 'R', weight: 1, subSeconds: 180 },
    { id: 'g', filter: 'G', weight: 1, subSeconds: 180 },
    { id: 'b', filter: 'B', weight: 1, subSeconds: 180 },
  ],
  sho: [
    { id: 'ha', filter: 'Ha', weight: 1, subSeconds: 300 },
    { id: 'oiii', filter: 'OIII', weight: 1, subSeconds: 300 },
    { id: 'sii', filter: 'SII', weight: 1, subSeconds: 300 },
  ],
  tek: [{ id: 'osc', filter: 'OSC / filtresiz', weight: 1, subSeconds: 120 }],
};

export function CapturePlannerPage() {
  const [hedefSaat, setHedefSaat] = useState(10);
  const [geceSaat, setGeceSaat] = useState(5);
  const [rows, setRows] = useState<FilterRow[]>(PRESETS.lrgb!);

  const [genislik, setGenislik] = useState(6248);
  const [yukseklik, setYukseklik] = useState(4176);
  const [bit, setBit] = useState(16);
  const [kalibrasyon, setKalibrasyon] = useState(60);

  /* Filtre–hedef uyumu ve gökyüzü koşulları (§14.2). */
  const [tur, setTur] = useState<TargetKind>('emisyon-bulutsusu');
  const [ayOran, setAyOran] = useState(30);
  const [ayVar, setAyVar] = useState(true);
  const [ayUzaklik, setAyUzaklik] = useState(60);
  const [bortle, setBortle] = useState(5);
  const [bant, setBant] = useState(7);

  /* Kalibrasyon rehberi (§14.2). */
  const [sensor, setSensor] = useState<SensorKind>('cmos');
  const [darkFlat, setDarkFlat] = useState(true);

  const gokyuzu = useMemo(
    () => ({
      moonIllumination: ayOran / 100,
      moonSeparationDeg: ayVar ? ayUzaklik : null,
      bortle,
    }),
    [ayOran, ayVar, ayUzaklik, bortle]
  );

  const filtreler = useMemo(() => planFilters(tur, gokyuzu), [tur, gokyuzu]);
  const ayEtkisi = moonImpact(gokyuzu);
  const kalibrasyonAdimlari = useMemo(
    () => calibrationPlan({ sensor, useDarkFlats: darkFlat }),
    [sensor, darkFlat]
  );

  const plan = useMemo(() => {
    try {
      return planCapture(hedefSaat, rows, { usableHoursPerNight: geceSaat });
    } catch {
      return null;
    }
  }, [hedefSaat, rows, geceSaat]);

  const depolama = useMemo(() => {
    if (!plan) return null;
    try {
      return estimateStorage(
        { width: genislik, height: yukseklik, bitDepth: bit },
        plan.totalFrames,
        kalibrasyon
      );
    } catch {
      return null;
    }
  }, [plan, genislik, yukseklik, bit, kalibrasyon]);

  /* Dither önerisi en kısa alt poza göre: gecenin ritmini o belirliyor. */
  const enKisaPoz = rows.reduce(
    (min, r) => (r.subSeconds > 0 && r.subSeconds < min ? r.subSeconds : min),
    Infinity
  );
  const dither = Number.isFinite(enKisaPoz) ? ditherAdvice(enKisaPoz) : null;

  const yaz = (id: string, patch: Partial<FilterRow>) =>
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  return (
    <>
      <PageMeta
        title="Poz ve Entegrasyon Planlayıcı"
        description="Hedef entegrasyon süresine göre filtre başına kare sayısı, gerekli gece sayısı ve ham depolama ihtiyacı."
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Araçlar', to: '/araclar' },
            { label: 'Poz ve Entegrasyon' },
          ]}
          title="Poz ve Entegrasyon Planlayıcı"
          description="Hedeflediğin toplam süreyi filtrelere paylaştırır, kare sayısına çevirir ve kaç gece gerektiğini söyler."
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
          <div className="space-y-4">
            <Panel title="Hedef">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Toplam entegrasyon (saat)" htmlFor="p-hedef">
                  <Input
                    id="p-hedef"
                    type="number"
                    min={0}
                    step={0.5}
                    value={hedefSaat}
                    onChange={(e) => setHedefSaat(Number(e.target.value))}
                  />
                </Field>
                <Field
                  label="Gecede kullanılabilir (saat)"
                  htmlFor="p-gece"
                  hint="Astronomik karanlık süresinden, hedefin ufuk üstünde kaldığı kadarı."
                >
                  <Input
                    id="p-gece"
                    type="number"
                    min={0}
                    step={0.5}
                    value={geceSaat}
                    onChange={(e) => setGeceSaat(Number(e.target.value))}
                  />
                </Field>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {(
                  [
                    ['lrgb', 'LRGB 4:1:1:1'],
                    ['sho', 'SHO 1:1:1'],
                    ['tek', 'Tek filtre / OSC'],
                  ] as const
                ).map(([key, label]) => (
                  <Button
                    key={key}
                    size="sm"
                    variant="secondary"
                    onClick={() => setRows(PRESETS[key]!)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </Panel>

            <Panel title="Filtreler">
              <div className="space-y-2">
                {rows.map((row) => (
                  <div key={row.id} className="grid grid-cols-3 gap-2">
                    <Field label="Filtre" htmlFor={`f-${row.id}`}>
                      <Input
                        id={`f-${row.id}`}
                        value={row.filter}
                        onChange={(e) => yaz(row.id, { filter: e.target.value })}
                      />
                    </Field>
                    <Field label="Pay" htmlFor={`w-${row.id}`}>
                      <Input
                        id={`w-${row.id}`}
                        type="number"
                        min={0}
                        value={row.weight}
                        onChange={(e) =>
                          yaz(row.id, { weight: Number(e.target.value) })
                        }
                      />
                    </Field>
                    <Field label="Alt poz (sn)" htmlFor={`s-${row.id}`}>
                      <Input
                        id={`s-${row.id}`}
                        type="number"
                        min={1}
                        value={row.subSeconds}
                        onChange={(e) =>
                          yaz(row.id, { subSeconds: Number(e.target.value) })
                        }
                      />
                    </Field>
                  </div>
                ))}
              </div>

              {/*
                ARACIN NE YAPMADIĞINI SÖYLEMEK, YAPTIĞINI SÖYLEMEK KADAR
                ÖNEMLİ (§14.2 kesinlik yasağı). Kullanıcı buraya bir sayı
                girerken "acaba doğru mu" diye düşünüyor; aracın ona bir
                sayı ÖNERMEDİĞİNİ bilmesi gerekiyor.
              */}
              <Alert tone="info" variant="text" className="mt-3">
                Alt poz süresini araç ÖNERMİYOR. Optimum süre gökyüzü
                parlaklığına, kameranın okuma gürültüsüne ve montaj takibine
                bağlı; tek bir doğru değeri yok. Kendi ölçümünü gir.
              </Alert>
            </Panel>

            <Panel title="Depolama">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Sensör genişliği (px)" htmlFor="d-w">
                  <Input
                    id="d-w"
                    type="number"
                    min={1}
                    value={genislik}
                    onChange={(e) => setGenislik(Number(e.target.value))}
                  />
                </Field>
                <Field label="Sensör yüksekliği (px)" htmlFor="d-h">
                  <Input
                    id="d-h"
                    type="number"
                    min={1}
                    value={yukseklik}
                    onChange={(e) => setYukseklik(Number(e.target.value))}
                  />
                </Field>
                <Field label="Bit derinliği" htmlFor="d-bit">
                  <Select
                    id="d-bit"
                    value={String(bit)}
                    onChange={(e) => setBit(Number(e.target.value))}
                  >
                    <option value="12">12 bit</option>
                    <option value="14">14 bit</option>
                    <option value="16">16 bit</option>
                  </Select>
                </Field>
                <Field
                  label="Kalibrasyon karesi"
                  htmlFor="d-kal"
                  hint="Dark + flat + bias toplamı."
                >
                  <Input
                    id="d-kal"
                    type="number"
                    min={0}
                    value={kalibrasyon}
                    onChange={(e) => setKalibrasyon(Number(e.target.value))}
                  />
                </Field>
              </div>
            </Panel>

            {/*
              FİLTRE–HEDEF UYUMU (§14.2) BURADA, AYRI BİR SAYFADA DEĞİL.

              Girdilerin çoğu ortak: hangi hedef, hangi filtreler, kaç
              gece. Ayrı bir araç açsaydık kullanıcı aynı bilgileri iki
              kez girer, iki ayrı sonucu kendi birleştirirdi. Fazın
              açılış kuralı da bunu söylüyor: çakışan modülleri birleştir.
            */}
            <Panel title="Hedef ve gökyüzü">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                <Field label="Hedef türü" htmlFor="p-tur">
                  <Select
                    id="p-tur"
                    value={tur}
                    onChange={(e) => setTur(e.target.value as TargetKind)}
                  >
                    {(Object.keys(targetKindLabels) as TargetKind[]).map((k) => (
                      <option key={k} value={k}>
                        {targetKindLabels[k]}
                      </option>
                    ))}
                  </Select>
                </Field>
                </div>

                <Field label="Gökyüzü (Bortle)" htmlFor="p-bortle">
                  <Input
                    id="p-bortle"
                    type="number"
                    min={1}
                    max={9}
                    value={bortle}
                    onChange={(e) => setBortle(Number(e.target.value))}
                  />
                </Field>
                <Field label="Ay aydınlanması (%)" htmlFor="p-ay">
                  <Input
                    id="p-ay"
                    type="number"
                    min={0}
                    max={100}
                    value={ayOran}
                    onChange={(e) => setAyOran(Number(e.target.value))}
                  />
                </Field>

                <div className="col-span-2 flex flex-wrap items-end gap-3">
                  <label className="flex items-center gap-2 text-body-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={ayVar}
                      onChange={(e) => setAyVar(e.target.checked)}
                    />
                    Ay ufkun üstünde
                  </label>
                  {ayVar && (
                    <div className="flex-1">
                    <Field label="Hedefe uzaklığı (°)" htmlFor="p-ay-uzaklik">
                      <Input
                        id="p-ay-uzaklik"
                        type="number"
                        min={0}
                        max={180}
                        value={ayUzaklik}
                        onChange={(e) => setAyUzaklik(Number(e.target.value))}
                      />
                    </Field>
                    </div>
                  )}
                </div>
              </div>

              <p className="mt-2 text-meta leading-relaxed text-faint">
                Ay etkisi bir BANT olarak veriliyor (“{ayEtkisi}”), magnitüd
                olarak değil: sayısal modeli ayın yüksekliğini ve hava
                kütlesini ister, bu araçta o girdiler yok.
              </p>
            </Panel>

            <Panel title="Kalibrasyon">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Sensör" htmlFor="p-sensor">
                  <Select
                    id="p-sensor"
                    value={sensor}
                    onChange={(e) => setSensor(e.target.value as SensorKind)}
                  >
                    <option value="cmos">CMOS</option>
                    <option value="ccd">CCD</option>
                  </Select>
                </Field>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-body-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={darkFlat}
                      onChange={(e) => setDarkFlat(e.target.checked)}
                    />
                    Dark-flat çekiyorum
                  </label>
                </div>
              </div>
            </Panel>
          </div>

          {/* ── Sonuç ── */}
          <div className="space-y-4">
            {!plan ? (
              <Alert tone="warning">
                Girdilerde bir sorun var — alt poz süreleri sıfırdan büyük
                olmalı ve süreler negatif olamaz.
              </Alert>
            ) : (
              <>
                <Panel title="Plan" status={plan.label}>
                  <table className="w-full text-body-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-meta text-muted-foreground">
                        <th className="pb-1.5 font-normal">Filtre</th>
                        <th className="pb-1.5 text-right font-normal">Kare</th>
                        <th className="pb-1.5 text-right font-normal">Alt poz</th>
                        <th className="pb-1.5 text-right font-normal">Süre</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.rows.map((r) => (
                        <tr key={r.filter} className="border-b border-border/60">
                          <td className="py-1.5 text-foreground">{r.filter}</td>
                          <td className="tabular py-1.5 text-right text-foreground">
                            {r.frames}
                          </td>
                          <td className="tabular py-1.5 text-right text-muted-foreground">
                            {r.subSeconds} sn
                          </td>
                          <td className="tabular py-1.5 text-right text-muted-foreground">
                            {formatIntegration(r.seconds)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className="pt-2 font-medium text-foreground">Toplam</td>
                        <td className="tabular pt-2 text-right font-medium text-foreground">
                          {plan.totalFrames}
                        </td>
                        <td />
                        <td className="tabular pt-2 text-right font-medium text-foreground">
                          {plan.label}
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Kare sayısı yukarı yuvarlandığı için plan hedefi biraz
                      aşıyor; kullanıcıya "istediğin" değil "çıkan" gösteriliyor
                      ve farkın nereden geldiği söyleniyor. */}
                  <p className="mt-2 text-meta text-faint">
                    Kare sayıları yukarı yuvarlandı — plan hedefin biraz üstüne
                    çıkar, altına inmez.
                  </p>

                  {plan.nights !== null && (
                    <p className="mt-2 text-body-sm text-foreground">
                      Gecede {geceSaat} saat kullanılabilir süreyle{' '}
                      <strong>{plan.nights} gece</strong>.
                    </p>
                  )}
                </Panel>

                {depolama && (
                  <Panel title="Depolama ihtiyacı" status={depolama.label}>
                    <dl className="space-y-1.5 text-body-sm">
                      <Satir
                        ad="Kare başına"
                        deger={formatBytes(depolama.bytesPerFrame)}
                      />
                      <Satir
                        ad={`Işık kareleri (${plan.totalFrames})`}
                        deger={formatBytes(depolama.lightBytes)}
                      />
                      <Satir
                        ad={`Kalibrasyon (${kalibrasyon})`}
                        deger={formatBytes(depolama.calibrationBytes)}
                      />
                    </dl>
                    <p className="mt-2 text-meta text-faint">
                      Sıkıştırılmamış boyut — yani ÜST SINIR. FITS sıkıştırması
                      bunu düşürür ama kazanç hedefin gürültüsüne göre değişir,
                      o yüzden bir çarpan uygulanmadı.
                    </p>
                  </Panel>
                )}

                {dither && (
                  <Panel title="Dither aralığı">
                    <p className="text-body-sm text-foreground">
                      Her <strong>{dither.min}–{dither.max} karede</strong> bir
                      dither.
                    </p>
                    <p className="mt-1.5 text-body-sm leading-relaxed text-muted-foreground">
                      {dither.note}
                    </p>
                    <p className="mt-2 text-meta text-faint">
                      Bu bir formül değil, yerleşik pratik — tek bir doğru sayı
                      yok, aralık veriliyor.
                    </p>
                  </Panel>
                )}
              </>
            )}

            {/*
              FİLTRE UYUMU — yargılar gerekçeleriyle.

              Sıralama modülde yapıldı (uygun → sınırlı → uygun değil);
              burada yalnızca çiziliyor. "Uygun değil" satırları
              GİZLENMİYOR: bir filtrenin neden işe yaramayacağını
              öğrenmek, hangisinin yarayacağını öğrenmek kadar değerli
              ve kullanıcının elinde zaten o filtre olabilir.
            */}
            <Panel
              title="Filtre–hedef uyumu"
              status={targetKindLabels[tur].toLocaleLowerCase('tr')}
            >
              <ul className="space-y-2.5">
                {filtreler.map((v) => (
                  <li
                    key={v.filterClass}
                    className="border-b border-border/60 pb-2.5 last:border-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-body-sm font-medium text-foreground">
                        {filterClassLabels[v.filterClass]}
                      </span>
                      <Badge tone={uyumRengi(v.fit)}>{uyumEtiketi(v.fit)}</Badge>
                    </div>
                    <ul className="mt-1 space-y-0.5">
                      {v.reasons.map((r) => (
                        <li
                          key={r}
                          className="text-meta leading-relaxed text-muted-foreground"
                        >
                          {r}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>

              <div className="mt-3 border-t border-border pt-3">
                <div className="flex flex-wrap items-end gap-3">
                  <Field label="Dar bant genişliği (nm)" htmlFor="p-bant">
                    <Input
                      id="p-bant"
                      type="number"
                      min={1}
                      max={100}
                      value={bant}
                      onChange={(e) => setBant(Number(e.target.value))}
                    />
                  </Field>
                  <p className="flex-1 text-body-sm leading-relaxed text-foreground">
                    Bu genişlik, 300 nm’lik görünür pencerenin{' '}
                    <strong>
                      %{(continuumRejection(Math.max(1, bant)) * 100).toFixed(1)}
                    </strong>
                    ’ini geçirir.
                  </p>
                </div>
                <p className="mt-2 text-meta leading-relaxed text-faint">
                  DÜZ SÜREKLİLİK varsayımıyla, birinci mertebe bir yaklaşım.
                  Gerçek fon tayfı düz değil (lamba ve hava parıltısı
                  çizgileri), filtre geçirgenliği tepede bile %100 değil ve
                  kameranın verimi dalga boyuna göre değişiyor. Bu sayı “ne
                  kadar fon elenir”in kaba ölçüsü — “SNR şu kadar artar”
                  demek DEĞİL.
                </p>
              </div>
            </Panel>

            <Panel
              title="Kalibrasyon rehberi"
              status={`${kalibrasyonAdimlari.length} kare türü`}
            >
              <ul className="space-y-3">
                {kalibrasyonAdimlari.map((s) => (
                  <li
                    key={s.kind}
                    className="border-b border-border/60 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-body-sm font-medium text-foreground">
                        {s.title}
                      </span>
                      <span className="tabular text-meta text-muted-foreground">
                        {s.countRange[0]}–{s.countRange[1]} kare
                      </span>
                    </div>
                    <p className="mt-1 text-meta leading-relaxed text-muted-foreground">
                      {s.removes}
                    </p>
                    <p className="mt-1 text-meta leading-relaxed text-muted-foreground">
                      <span className="text-foreground">Eşleşmesi gereken:</span>{' '}
                      {s.mustMatch.join(' · ')}
                    </p>
                    <p className="mt-1 text-meta leading-relaxed text-faint">
                      {s.pitfall}
                    </p>
                    <p className="mt-1 text-meta text-faint">
                      Aralığın üst ucuna çıkmak gürültüyü yalnızca{' '}
                      <span className="tabular">
                        {rangeGain(s.countRange).toFixed(2)}
                      </span>{' '}
                      kat daha azaltır ({s.countRange[1] / s.countRange[0]} katı
                      emek).
                    </p>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-meta leading-relaxed text-faint">
                Kare sayıları ARALIK, çünkü tek doğru yok: yığınlamada
                rastgele gürültü √N ile azalır, yani kazanç hızla küçülür.
                Formül yalnızca İLİŞKİSİZ gürültü için geçerli — sabit desen,
                amp glow ve ışık sızıntısı yığınlamayla gitmez.
              </p>
            </Panel>
          </div>
        </div>
      </Container>
    </>
  );
}

/** Uygunluk kademesinin rozet rengi — metin tek başına da anlaşılır. */
function uyumRengi(fit: Fit): 'success' | 'warning' | 'muted' {
  return fit === 'uygun' ? 'success' : fit === 'sinirli' ? 'warning' : 'muted';
}

function uyumEtiketi(fit: Fit): string {
  return fit === 'uygun' ? 'Uygun' : fit === 'sinirli' ? 'Sınırlı' : 'Uygun değil';
}

function Satir({ ad, deger }: { ad: string; deger: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/60 pb-1.5">
      <dt className="text-muted-foreground">{ad}</dt>
      <dd className="tabular text-foreground">{deger}</dd>
    </div>
  );
}

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
          </div>
        </div>
      </Container>
    </>
  );
}

function Satir({ ad, deger }: { ad: string; deger: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/60 pb-1.5">
      <dt className="text-muted-foreground">{ad}</dt>
      <dd className="tabular text-foreground">{deger}</dd>
    </div>
  );
}

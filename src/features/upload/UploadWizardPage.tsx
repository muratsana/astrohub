import { useMemo, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import {
  totalIntegrationSeconds,
  formatIntegration,
  type FilterExposure,
} from '@/domain/photography/integration';
import { photoTypeLabels, type PhotoType } from '@/features/photos/types';
import { targets } from '@/features/targets/data';
import { cn } from '@/lib/cn';
import { PageMeta } from '@/components/seo/PageMeta';

const steps = [
  'Dosya',
  'Hedef ve Kategori',
  'Çekim Oturumu',
  'Setup',
  'Pozlama',
  'Yayın',
] as const;

const selectClass =
  'h-11 w-full rounded-card border border-border bg-surface-1 px-3 text-sm text-foreground focus:border-primary/60';

interface WizardState {
  fileName: string;
  targetSlug: string;
  type: PhotoType;
  title: string;
  capturedAt: string;
  locationLabel: string;
  locationVisibility: 'exact' | 'approximate' | 'region' | 'hidden';
  optic: string;
  camera: string;
  mount: string;
  exposures: FilterExposure[];
  software: string;
  aiDeclared: boolean;
  license: string;
  copyrightConfirmed: boolean;
}

const initialState: WizardState = {
  fileName: '',
  targetSlug: '',
  type: 'deep-sky',
  title: '',
  capturedAt: '',
  locationLabel: '',
  locationVisibility: 'approximate',
  optic: '',
  camera: '',
  mount: '',
  exposures: [{ filter: 'L', frames: 0, exposureSeconds: 0 }],
  software: '',
  aiDeclared: false,
  license: 'Tüm hakları saklıdır',
  copyrightConfirmed: false,
};

/**
 * Fotoğraf yükleme sihirbazı (§7.4) — 6 adımlı UI iskeleti.
 * Gerçek dosya yükleme + EXIF okuma + sunucu pipeline'ı Faz 1.2'de bağlanır;
 * bu iskelet form akışını, doğrulamaları ve özet ekranını tanımlar.
 */
export function UploadWizardPage() {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(initialState);

  function patch(p: Partial<WizardState>) {
    setState((s) => ({ ...s, ...p }));
  }

  const total = useMemo(
    () => totalIntegrationSeconds(state.exposures.filter((e) => e.frames > 0)),
    [state.exposures]
  );

  const canNext = useMemo(() => {
    switch (step) {
      case 0:
        return state.fileName.trim().length > 0;
      case 1:
        return state.title.trim().length > 0;
      case 5:
        return state.copyrightConfirmed;
      default:
        return true;
    }
  }, [step, state]);

  return (
    <>
      <PageMeta
        title="Fotoğraf Yükle"
        description="Astrofotoğrafınızı hedef, setup, pozlama ve işleme verisiyle birlikte yayımlayın."
        noIndex
      />
      <Container className="py-8 sm:py-10">
        <header className="mb-8">
          <h1 className="text-[26px] text-foreground sm:text-[30px]">
            Fotoğraf Yükle
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            6 adımda teknik verileriyle birlikte astrofotoğrafını yayımla.
          </p>
        </header>

        {/* Adım göstergesi */}
        <ol
          className="mb-8 flex flex-wrap gap-2"
          aria-label="Sihirbaz adımları"
        >
          {steps.map((label, i) => (
            <li key={label}>
              <button
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                aria-current={i === step ? 'step' : undefined}
                className={cn(
                  'tabular flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  i === step
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : i < step
                      ? 'border-success/40 text-success'
                      : 'border-border text-muted-foreground/60'
                )}
              >
                <span>{i < step ? '✓' : i + 1}</span>
                {label}
              </button>
            </li>
          ))}
        </ol>

        <div className="rounded-card border border-border bg-surface-1 p-4 sm:p-6">
          {step === 0 && (
            <div className="space-y-5">
              <StepTitle
                title="Dosya seç"
                hint="JPEG, PNG, WebP veya AVIF · en fazla 40 MB / 12.000 px (§10.5)"
              />
              <label
                htmlFor="file-name"
                className="flex aspect-[3/1] cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed border-border bg-surface-2/40 text-center transition-colors hover:border-primary/40"
              >
                <p className="text-sm font-medium text-foreground">
                  {state.fileName || 'Dosyayı buraya sürükle veya adını yaz'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Gerçek yükleme ve otomatik EXIF okuma, depolama altyapısı
                  bağlandığında aktifleşecek.
                </p>
              </label>
              <Field label="Dosya adı (demo)" htmlFor="file-name">
                <Input
                  id="file-name"
                  placeholder="ornegin-ic434-sho.tif"
                  value={state.fileName}
                  onChange={(e) => patch({ fileName: e.target.value })}
                />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <StepTitle
                title="Hedef ve kategori"
                hint="Hedef veritabanından seç; katalog alias'ları desteklenir"
              />
              <Field label="Astronomik hedef" htmlFor="w-target">
                <select
                  id="w-target"
                  className={selectClass}
                  value={state.targetSlug}
                  onChange={(e) => patch({ targetSlug: e.target.value })}
                >
                  <option value="">Hedef seç (veya serbest bırak)</option>
                  {targets.map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.catalog} — {t.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Fotoğraf türü" htmlFor="w-type">
                <select
                  id="w-type"
                  className={selectClass}
                  value={state.type}
                  onChange={(e) => patch({ type: e.target.value as PhotoType })}
                >
                  {Object.entries(photoTypeLabels).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Başlık" htmlFor="w-title">
                <Input
                  id="w-title"
                  placeholder="ör. At Başı ve Alev Bulutsusu"
                  value={state.title}
                  onChange={(e) => patch({ title: e.target.value })}
                />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <StepTitle
                title="Çekim oturumu"
                hint="Konum görünürlüğünü sen seçersin; GPS asla otomatik yayımlanmaz (§15.3)"
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Çekim tarihi" htmlFor="w-date">
                  <Input
                    id="w-date"
                    type="date"
                    value={state.capturedAt}
                    onChange={(e) => patch({ capturedAt: e.target.value })}
                  />
                </Field>
                <Field label="Lokasyon (metin)" htmlFor="w-loc">
                  <Input
                    id="w-loc"
                    placeholder="ör. Saklıkent, Antalya"
                    value={state.locationLabel}
                    onChange={(e) => patch({ locationLabel: e.target.value })}
                  />
                </Field>
              </div>
              <Field
                label="Konum görünürlüğü"
                htmlFor="w-vis"
                hint="Tam koordinat yalnızca açık onayınla kamuya açılır."
              >
                <select
                  id="w-vis"
                  className={selectClass}
                  value={state.locationVisibility}
                  onChange={(e) =>
                    patch({
                      locationVisibility: e.target
                        .value as WizardState['locationVisibility'],
                    })
                  }
                >
                  <option value="exact">Tam koordinat</option>
                  <option value="approximate">Yaklaşık (önerilen)</option>
                  <option value="region">İl/ilçe düzeyi</option>
                  <option value="hidden">Gizli</option>
                </select>
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <StepTitle
                title="Setup"
                hint="Kayıtlı setup seçimi hesap sistemiyle gelecek; şimdilik elle gir"
              />
              <Field label="Optik / teleskop" htmlFor="w-optic">
                <Input
                  id="w-optic"
                  placeholder="ör. Esprit 100 + 0.8× reducer"
                  value={state.optic}
                  onChange={(e) => patch({ optic: e.target.value })}
                />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Kamera" htmlFor="w-cam">
                  <Input
                    id="w-cam"
                    placeholder="ör. ASI2600MM Pro"
                    value={state.camera}
                    onChange={(e) => patch({ camera: e.target.value })}
                  />
                </Field>
                <Field label="Montür" htmlFor="w-mount">
                  <Input
                    id="w-mount"
                    placeholder="ör. EQ6-R Pro"
                    value={state.mount}
                    onChange={(e) => patch({ mount: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <StepTitle
                title="Pozlama ve filtreler"
                hint="Toplam entegrasyon otomatik hesaplanır"
              />
              <div className="space-y-3">
                {state.exposures.map((row, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3"
                  >
                    <Field label={i === 0 ? 'Filtre' : ''} htmlFor={`f-${i}`}>
                      <Input
                        id={`f-${i}`}
                        value={row.filter}
                        onChange={(e) => {
                          const next = [...state.exposures];
                          next[i] = { ...row, filter: e.target.value };
                          patch({ exposures: next });
                        }}
                      />
                    </Field>
                    <Field
                      label={i === 0 ? 'Kare sayısı' : ''}
                      htmlFor={`n-${i}`}
                    >
                      <Input
                        id={`n-${i}`}
                        type="number"
                        min={0}
                        value={row.frames}
                        onChange={(e) => {
                          const next = [...state.exposures];
                          next[i] = { ...row, frames: Number(e.target.value) };
                          patch({ exposures: next });
                        }}
                      />
                    </Field>
                    <Field
                      label={i === 0 ? 'Pozlama (sn)' : ''}
                      htmlFor={`s-${i}`}
                    >
                      <Input
                        id={`s-${i}`}
                        type="number"
                        min={0}
                        value={row.exposureSeconds}
                        onChange={(e) => {
                          const next = [...state.exposures];
                          next[i] = {
                            ...row,
                            exposureSeconds: Number(e.target.value),
                          };
                          patch({ exposures: next });
                        }}
                      />
                    </Field>
                    <div className="flex items-end pb-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`${row.filter} satırını sil`}
                        disabled={state.exposures.length === 1}
                        onClick={() =>
                          patch({
                            exposures: state.exposures.filter(
                              (_, j) => j !== i
                            ),
                          })
                        }
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  patch({
                    exposures: [
                      ...state.exposures,
                      { filter: '', frames: 0, exposureSeconds: 0 },
                    ],
                  })
                }
              >
                + Filtre satırı ekle
              </Button>
              <p className="tabular rounded-card border border-border bg-surface-2 px-4 py-3 text-sm">
                Toplam entegrasyon:{' '}
                <span className="font-semibold text-primary">
                  {formatIntegration(total)}
                </span>
              </p>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5">
              <StepTitle
                title="İşleme, lisans ve yayın"
                hint="Önizleme ve onay"
              />
              <Field label="Kullanılan yazılımlar" htmlFor="w-sw">
                <Input
                  id="w-sw"
                  placeholder="ör. PixInsight, Photoshop"
                  value={state.software}
                  onChange={(e) => patch({ software: e.target.value })}
                />
              </Field>
              <Field label="Lisans" htmlFor="w-lic">
                <select
                  id="w-lic"
                  className={selectClass}
                  value={state.license}
                  onChange={(e) => patch({ license: e.target.value })}
                >
                  <option>Tüm hakları saklıdır</option>
                  <option>CC BY 4.0</option>
                  <option>CC BY-NC 4.0</option>
                  <option>CC BY-NC-SA 4.0</option>
                </select>
              </Field>
              <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                  checked={state.aiDeclared}
                  onChange={(e) => patch({ aiDeclared: e.target.checked })}
                />
                İşlemede AI tabanlı araç (denoise, deconvolution, yıldız işleme
                vb.) kullandım — şeffaflık beyanı (§15.5).
              </label>
              <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                  checked={state.copyrightConfirmed}
                  onChange={(e) =>
                    patch({ copyrightConfirmed: e.target.checked })
                  }
                />
                Bu eserin sahibi olduğumu ve paylaşma hakkım bulunduğunu
                onaylıyorum (§15.4).
              </label>

              {/* Özet */}
              <div className="rounded-card border border-border bg-surface-2 p-4">
                <h3 className="mb-2 text-sm font-semibold text-foreground">
                  Özet
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="primary">{state.title || 'Başlıksız'}</Badge>
                  <Badge>{photoTypeLabels[state.type]}</Badge>
                  {state.capturedAt && <Badge>{state.capturedAt}</Badge>}
                  <Badge tone="cold">{formatIntegration(total)}</Badge>
                  <Badge>{state.license}</Badge>
                  {state.aiDeclared && <Badge tone="cold">AI beyanlı</Badge>}
                </div>
              </div>
            </div>
          )}

          {/* Gezinme */}
          <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
            <Button
              variant="secondary"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              ← Geri
            </Button>
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
                İleri →
              </Button>
            ) : (
              <Button
                disabled
                title="Depolama altyapısı bağlandığında aktifleşecek"
              >
                Yayımla (yakında)
              </Button>
            )}
          </div>
        </div>
      </Container>
    </>
  );
}

function StepTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

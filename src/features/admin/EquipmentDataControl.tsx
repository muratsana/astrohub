import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Panel } from '@/components/ui/Panel';
import { Readout } from '@/components/ui/Readout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { useEquipmentCatalog } from '@/services/content/equipment';
import {
  equipmentCategoryLabels,
  equipmentPath,
  type EquipmentCategory,
} from '@/features/equipment/data';
import {
  CONNECTION_OPTIONS,
  coverageSummary,
  missingFieldReport,
  updateEquipment,
  validatePatch,
  type EquipmentPatch,
} from './equipmentAdmin';
import { connectionLabel } from '@/domain/equipment/connections';

/**
 * EKİPMAN VERİTABANI PANELİ.
 *
 * Ana ekran bir liste değil, bir **eksik veri raporu**. Sebebi şu:
 * yöneticinin kataloğa bakma ihtiyacı yok, katalog zaten sitede duruyor.
 * Buraya gelme sebebi "neyi düzeltmem gerekiyor" sorusu ve panel doğrudan
 * onu cevaplıyor.
 *
 * Düzenleme satır içinde açılıyor; ayrı bir sayfaya gitmek, on kaydı
 * düzeltmeyi on kez gezinmeye çeviriyordu.
 */
export function EquipmentDataControl({ canWrite }: { canWrite: boolean }) {
  const catalog = useEquipmentCatalog();
  const [category, setCategory] = useState<EquipmentCategory | ''>('');
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => coverageSummary(catalog.items), [catalog.items]);
  const report = useMemo(
    () =>
      missingFieldReport(catalog.items).filter((r) =>
        category ? r.category === category : true
      ),
    [catalog.items, category]
  );

  return (
    <Panel
      title="Ekipman veritabanı"
      status={`${summary.incomplete} eksik kayıt`}
    >
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Readout label="Toplam model" value={summary.total} />
        <Readout label="Eksiksiz" value={summary.complete} tone="cold" />
        <Readout
          label="Eksik veri"
          value={summary.incomplete}
          tone={summary.incomplete > 0 ? 'primary' : 'muted'}
        />
        <Readout
          label="Kapsama"
          value={`%${Math.round((summary.complete / Math.max(summary.total, 1)) * 100)}`}
          tone="plain"
        />
      </div>

      <p className="mb-3 text-[11.5px] leading-relaxed text-muted-foreground">
        Setup planlayıcısı bir alan boşken o kontrolü hiç yapmıyor,
        “veri yetersiz” diyor. Bu liste hangi kaydın hangi alanının eksik
        olduğunu gösteriyor; en çok eksiği olan kayıt en üstte.
      </p>

      <div className="mb-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setCategory('')}
          className={
            category === ''
              ? 'rounded-card border border-primary/50 bg-surface-2 px-2 py-1 text-[11px] text-foreground'
              : 'rounded-card border border-border px-2 py-1 text-[11px] text-muted-foreground'
          }
        >
          Tümü ({summary.incomplete})
        </button>
        {summary.byCategory.map(({ category: c, missing }) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c as EquipmentCategory)}
            className={
              category === c
                ? 'rounded-card border border-primary/50 bg-surface-2 px-2 py-1 text-[11px] text-foreground'
                : 'rounded-card border border-border px-2 py-1 text-[11px] text-muted-foreground'
            }
          >
            {equipmentCategoryLabels[c as EquipmentCategory]} ({missing})
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mb-2 text-[11.5px] text-danger">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mb-2 text-[11.5px] text-success">
          {message}
        </p>
      )}

      {report.length === 0 ? (
        <p className="py-4 text-center text-[11.5px] text-muted-foreground">
          Bu filtrede eksik veri yok.
        </p>
      ) : (
        <ul className="max-h-[28rem] overflow-auto">
          {report.map((row) => {
            const model = catalog.items.find((m) => m.slug === row.slug);
            return (
              <li
                key={row.slug}
                className="border-b border-border py-2 last:border-0"
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  {model ? (
                    <Link
                      to={equipmentPath(model)}
                      className="text-[12.5px] text-foreground hover:text-primary"
                    >
                      {row.brand} {row.model}
                    </Link>
                  ) : (
                    <span className="text-[12.5px] text-foreground">
                      {row.brand} {row.model}
                    </span>
                  )}
                  <span className="text-[10px] text-faint">
                    {equipmentCategoryLabels[row.category as EquipmentCategory]}
                  </span>
                  <span className="ml-auto flex flex-wrap gap-1">
                    {row.missing.map((field) => (
                      <Badge key={field} tone="warning">
                        {field}
                      </Badge>
                    ))}
                  </span>
                  {canWrite && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setEditing(editing === row.slug ? null : row.slug)
                      }
                    >
                      {editing === row.slug ? 'Kapat' : 'Düzenle'}
                    </Button>
                  )}
                </div>

                {editing === row.slug && (
                  <EditForm
                    slug={row.slug}
                    onDone={(msg) => {
                      setMessage(msg);
                      setError(null);
                      setEditing(null);
                    }}
                    onError={(msg) => {
                      setError(msg);
                      setMessage(null);
                    }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!canWrite && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Düzenleme yönetici yetkisi ister. Rapor yetkisiz de okunabilir —
          eksikleri görmek kimseye zarar vermez.
        </p>
      )}

      <p className="mt-2 text-[10px] leading-snug text-faint">
        Düzenleme doğrudan veritabanına yazılır ve doğrulama tarihi bugüne
        çekilir. Uygulamanın içindeki tohum katalog bir sonraki sürümde
        gelir; senkronizasyon yalnızca eksik kayıtları ekler, elle
        düzeltilmiş alanları ezmez.
      </p>
    </Panel>
  );
}

function EditForm({
  slug,
  onDone,
  onError,
}: {
  slug: string;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [patch, setPatch] = useState<EquipmentPatch>({});
  const [busy, setBusy] = useState(false);

  function num(key: keyof EquipmentPatch, value: string) {
    setPatch((p) => ({
      ...p,
      [key]: value === '' ? null : Number(value),
    }));
  }

  async function submit() {
    const problem = validatePatch(patch);
    if (problem) {
      onError(problem);
      return;
    }
    setBusy(true);
    try {
      await updateEquipment(slug, patch);
      onDone(`${slug} güncellendi.`);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 rounded-card border border-border bg-surface-2 p-2.5">
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Giriş bağlantısı" htmlFor={`in-${slug}`}>
          <Select
            id={`in-${slug}`}
            onChange={(e) =>
              setPatch((p) => ({
                ...p,
                connection_input: e.target.value || null,
              }))
            }
            className="h-9 text-[12px]"
          >
            <option value="">Değiştirme</option>
            {CONNECTION_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {connectionLabel(c)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Çıkış bağlantısı" htmlFor={`out-${slug}`}>
          <Select
            id={`out-${slug}`}
            onChange={(e) =>
              setPatch((p) => ({
                ...p,
                connection_output: e.target.value || null,
              }))
            }
            className="h-9 text-[12px]"
          >
            <option value="">Değiştirme</option>
            {CONNECTION_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {connectionLabel(c)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-4">
        {(
          [
            ['flange_distance_mm', 'Flanş (mm)'],
            ['optic_factor', 'Çarpan'],
            ['required_backfocus_mm', 'Backfocus (mm)'],
            ['optical_length_mm', 'Optik uzunluk (mm)'],
            ['clear_aperture_mm', 'Net açıklık (mm)'],
            ['image_circle_mm', 'Görüntü çemberi (mm)'],
            ['filter_thickness_mm', 'Filtre kalınlığı (mm)'],
            ['prism_size_mm', 'Prizma (mm)'],
          ] as const
        ).map(([key, label]) => (
          <Field key={key} label={label} htmlFor={`${key}-${slug}`}>
            <Input
              id={`${key}-${slug}`}
              type="number"
              step={0.01}
              placeholder="boş = değiştirme"
              onChange={(e) => num(key, e.target.value)}
              className="h-9 text-[12px]"
            />
          </Field>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={busy} onClick={() => void submit()}>
          {busy ? 'Kaydediliyor…' : 'Kaydet'}
        </Button>
        <span className="text-[10px] text-faint">
          Boş bırakılan alanlar değiştirilmez. Kaydetme, doğrulama tarihini
          bugüne çeker.
        </span>
      </div>
    </div>
  );
}

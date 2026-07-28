import { useCallback, useEffect, useState } from 'react';
import { Panel, SpecList, SpecRow } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { equipmentCategoryLabels } from '@/features/equipment/data';
import type { EquipmentCategory } from '@/features/equipment/data';
import {
  approveContribution,
  fetchPendingContributions,
  planSync,
  syncCatalog,
  type PendingContribution,
  type SyncProgress,
} from './catalogSync';

/**
 * KATALOG KONTROL MODÜLÜ.
 *
 * İki iş yapar ve ikisi bilerek aynı panelde: kataloğu uygulamadaki tohum
 * veriyle güncellemek, ve kullanıcı katkılarını onaylamak. İkisi de "bu
 * katalogda ne var" sorusunun cevabını değiştiriyor; ayrı ekranlara
 * bölmek, senkronizasyondan sonra bekleyen katkıları görmemeye yol açardı.
 *
 * Senkronizasyondan önce planı gösteriyoruz: yönetici kaç satırın
 * etkileneceğini bilmeden onaylamamalı.
 */
export function CatalogControl({ canWrite }: { canWrite: boolean }) {
  const plan = planSync();

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [result, setResult] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [pending, setPending] = useState<PendingContribution[] | null>(null);
  const [pendingError, setPendingError] = useState<string | null>(null);

  const loadPending = useCallback(() => {
    if (!canWrite) return;
    setPendingError(null);
    fetchPendingContributions()
      .then(setPending)
      .catch((e: unknown) =>
        setPendingError(e instanceof Error ? e.message : 'Liste okunamadı')
      );
  }, [canWrite]);

  useEffect(loadPending, [loadPending]);

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const outcome = await syncCatalog(setProgress);
      setResult(outcome.written);
      loadPending();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Senkronizasyon başarısız');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function approve(slug: string) {
    setBusy(true);
    try {
      await approveContribution(slug);
      loadPending();
    } catch (e) {
      setPendingError(e instanceof Error ? e.message : 'Onaylanamadı');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Panel
        title="Katalog senkronizasyonu"
        status={`${plan.totalRows} satır`}
      >
        <p className="mb-3 text-[11.5px] leading-relaxed text-muted-foreground">
          Ekipman ve hedef kataloğu uygulamanın içinde tohum veri olarak
          geliyor. Bu düğme onu veritabanına yazar: yeni modeller eklenir,
          değişenler güncellenir.{' '}
          <strong className="font-medium text-foreground">
            Hiçbir kayıt silinmez
          </strong>{' '}
          — tohumda olmayan bir kayıt kullanıcı katkısı olabilir.
        </p>

        <SpecList>
          {plan.steps.map((step) => (
            <SpecRow
              key={step.label}
              label={step.label}
              value={`${step.rows} satır`}
              tone={result?.[step.label] !== undefined ? 'primary' : 'muted'}
            />
          ))}
        </SpecList>

        {progress && (
          <div className="mt-3">
            <div
              role="progressbar"
              aria-valuenow={progress.done}
              aria-valuemin={0}
              aria-valuemax={progress.total}
              aria-label="Senkronizasyon ilerlemesi"
              className="h-1.5 overflow-hidden rounded-full bg-surface-3"
            >
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${Math.round((progress.done / progress.total) * 100)}%`,
                }}
              />
            </div>
            <p className="tabular mt-1.5 text-[11px] text-muted-foreground" role="status">
              {progress.step} · {progress.done} / {progress.total}
            </p>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-card border border-danger/40 bg-surface-1 px-3 py-2 text-[11.5px] text-danger"
          >
            {error}
          </p>
        )}

        {result && !error && (
          <p
            role="status"
            className="mt-3 rounded-card border border-success/40 bg-surface-1 px-3 py-2 text-[11.5px] text-success"
          >
            Katalog güncellendi:{' '}
            {Object.entries(result)
              .map(([label, count]) => `${label} ${count}`)
              .join(' · ')}
          </p>
        )}

        <div className="mt-3 flex items-center gap-2">
          <Button disabled={!canWrite || busy} onClick={() => void run()}>
            {busy ? 'Yazılıyor…' : 'Kataloğu senkronize et'}
          </Button>
          {!canWrite && (
            <span className="text-[11px] text-muted-foreground">
              Yönetici yetkisi gerekir.
            </span>
          )}
        </div>

        <p className="mt-3 text-[10px] leading-snug text-faint">
          Senkronizasyon yalnızca referans kataloğu (ekipman, marka, gök
          cismi, katalog kodu) yazar. Fotoğraf, ilan ve forum içeriği
          kullanıcıya ait ve bu işlemden etkilenmez.
        </p>
      </Panel>

      <Panel
        title="Onay bekleyen katkılar"
        status={pending ? `${pending.length} kayıt` : '—'}
      >
        <p className="mb-3 text-[11.5px] leading-relaxed text-muted-foreground">
          Katalogda modelini bulamayan kullanıcılar kendi kayıtlarını
          ekleyebiliyor. Kayıt onaya kadar yalnızca ekleyene görünür;
          onaylandığında herkese açık kataloğa girer.
        </p>

        {pendingError && (
          <p role="alert" className="mb-2 text-[11.5px] text-danger">
            {pendingError}
          </p>
        )}

        {!canWrite ? (
          <p className="py-4 text-center text-[11.5px] text-muted-foreground">
            Bu liste yönetici yetkisi ister.
          </p>
        ) : pending === null ? (
          <p className="py-4 text-center text-[11.5px] text-muted-foreground">
            Okunuyor…
          </p>
        ) : pending.length === 0 ? (
          <p className="py-4 text-center text-[11.5px] leading-relaxed text-muted-foreground">
            Bekleyen katkı yok. Liste boşsa ya hiç katkı gelmemiştir ya da
            hepsi onaylanmıştır.
          </p>
        ) : (
          <ul>
            {pending.map((item) => (
              <li
                key={item.slug}
                className="flex items-center gap-2 border-b border-border py-2 last:border-0"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] text-foreground">
                    <span className="text-muted-foreground">{item.brand}</span>{' '}
                    {item.model}
                  </span>
                  <span className="tabular block text-[10px] text-faint">
                    {equipmentCategoryLabels[
                      item.category as EquipmentCategory
                    ] ?? item.category}{' '}
                    · {new Date(item.created_at).toLocaleDateString('tr-TR')}
                  </span>
                </span>
                <Badge>onay bekliyor</Badge>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => void approve(item.slug)}
                >
                  Onayla
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

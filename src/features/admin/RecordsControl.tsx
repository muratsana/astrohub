import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import {
  deleteRecord,
  fetchAuditLog,
  fetchRecords,
  setRecordStatus,
  setThreadLocked,
  RECORD_KINDS,
  type AuditRow,
  type RecordKind,
  type RecordRow,
} from './records';
import { cn } from '@/lib/cn';

/**
 * İÇERİK KAYITLARI — beş türün ortak yönetim yüzeyi.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SİLME İKİ ADIM
 *
 * Kalıcı silme geri alınamıyor ve bağlı kayıtları da götürüyor
 * (fotoğrafın beğenileri, yorumları, puanları `on delete cascade`).
 * Tek tıkla silinebilen bir liste, yanlış satıra basıldığında sessiz bir
 * veri kaybı demekti. İkinci tık ayrı bir düğmeye ve açık bir uyarıya
 * basıyor.
 *
 * `confirm()` KULLANILMADI: tarayıcı diyaloğu odağı çalıyor, mobilde
 * kırpılıyor ve neyin silineceğini satırdan kopuk gösteriyor. Onay
 * satırın kendi içinde açılıyor — hangi kaydın silineceği gözden
 * kaybolmuyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * VARSAYILAN EYLEM ARŞİVLEMEK
 *
 * Moderasyon kararları geri alınabilir olmalı. Durum açılır listesi ilk
 * sırada duruyor, silme en sağda ve sönük — sıralama bir tercih beyanı.
 */

const statusTone = (s: string): 'muted' | 'primary' | 'success' | 'danger' | 'warning' => {
  if (s === 'published' || s === 'active') return 'success';
  if (s === 'draft' || s === 'pending') return 'warning';
  if (s === 'rejected' || s === 'cancelled' || s === 'kilitli') return 'danger';
  if (s === 'archived' || s === 'sold' || s === 'expired') return 'muted';
  return 'primary';
};

const KIND_ORDER: RecordKind[] = ['photo', 'listing', 'thread', 'event', 'site'];

export function RecordsControl({
  kinds = KIND_ORDER,
  title = 'İçerik kayıtları',
}: {
  /**
   * Hangi türler gösterilsin.
   *
   * Sekmeli panelde forum kendi bölümüne taşındı; "İçerik" sekmesinin
   * forum konusunu da listelemesi, aynı kaydı iki yerden yönetmek
   * demekti — biri güncellenirken diğeri eski kalırdı.
   */
  kinds?: RecordKind[];
  title?: string;
}) {
  const [kind, setKind] = useState<RecordKind>(kinds[0]);
  const [rows, setRows] = useState<RecordRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback((k: RecordKind) => {
    setRows(null);
    setError(null);
    setConfirming(null);
    fetchRecords(k)
      .then(setRows)
      .catch((e: unknown) => {
        setRows([]);
        setError(e instanceof Error ? e.message : 'Kayıtlar okunamadı');
      });
  }, []);

  useEffect(() => load(kind), [load, kind]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      load(kind);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem uygulanamadı');
    } finally {
      setBusy(false);
    }
  }

  const spec = RECORD_KINDS[kind];

  return (
    <Panel title={title} status={rows ? `${rows.length} kayıt` : 'okunuyor…'}>
      {kinds.length > 1 && (
      <div
        role="tablist"
        aria-label="İçerik türü"
        className="mb-3 flex flex-wrap gap-1.5"
      >
        {kinds.map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={k === kind}
            onClick={() => setKind(k)}
            className={cn(
              'h-8 rounded-card border px-2.5 text-meta font-medium transition-colors',
              k === kind
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
            )}
          >
            {RECORD_KINDS[k].label}
          </button>
        ))}
      </div>
      )}

      {error && <Alert className="mb-3">{error}</Alert>}

      {rows && rows.length === 0 && !error && (
        <p className="py-4 text-center text-body-sm text-muted-foreground">
          {spec.label} listesi boş.
        </p>
      )}

      <ul>
        {(rows ?? []).map((row) => (
          <li
            key={row.id}
            className="border-b border-border py-2 last:border-0"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={statusTone(row.status)}>{row.status}</Badge>

              <span className="min-w-0 flex-1 truncate text-caption text-foreground">
                {row.path ? (
                  <Link to={row.path} className="hover:text-primary">
                    {row.title}
                  </Link>
                ) : (
                  row.title
                )}
                {row.subtitle && (
                  <span className="text-muted-foreground"> · {row.subtitle}</span>
                )}
              </span>

              {row.createdAt && (
                <span className="tabular hidden text-meta text-faint sm:block">
                  {new Date(row.createdAt).toLocaleDateString('tr-TR')}
                </span>
              )}

              {/* Durum değiştirme — türün kendi enum'u. */}
              {spec.statusColumn && (
                <Select
                  aria-label={`${row.title} durumu`}
                  value={row.status}
                  disabled={busy}
                  onChange={(e) =>
                    void run(() =>
                      setRecordStatus(kind, row.id, e.target.value)
                    )
                  }
                  className="h-8 w-auto text-meta"
                >
                  {spec.statuses.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </Select>
              )}

              {/* Foruma özgü: kilit. */}
              {kind === 'thread' && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    void run(() =>
                      setThreadLocked(row.id, row.status !== 'kilitli')
                    )
                  }
                >
                  {row.status === 'kilitli' ? 'Kilidi aç' : 'Kilitle'}
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  setConfirming(confirming === row.id ? null : row.id)
                }
              >
                Sil
              </Button>
            </div>

            {confirming === row.id && (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-card border border-warm/40 bg-warm/8 px-3 py-2">
                <span className="flex-1 text-meta leading-relaxed text-warm">
                  <strong>{row.title}</strong> kalıcı olarak silinecek. Bağlı
                  kayıtlar (beğeni, yorum, puan, fotoğraf) da gider ve geri
                  alınamaz. Kaldırmak yeterliyse durumu <em>arşiv</em> yapın.
                </span>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => void run(() => deleteRecord(kind, row.id))}
                >
                  Kalıcı sil
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setConfirming(null)}
                >
                  Vazgeç
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/**
 * DENETİM KAYDI — salt okunur.
 *
 * Değiştirilebilen bir denetim kaydı denetim kaydı değildir; tabloda
 * admin için yalnızca `select` politikası var ve öyle kalmalı. Panelde
 * de hiçbir eylem düğmesi yok.
 */
export function AuditControl() {
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAuditLog()
      .then(setRows)
      .catch((e: unknown) => {
        setRows([]);
        setError(e instanceof Error ? e.message : 'Denetim kaydı okunamadı');
      });
  }, []);

  return (
    <Panel
      title="Denetim kaydı"
      status={rows ? `son ${rows.length}` : 'okunuyor…'}
    >
      <p className="mb-2 text-meta leading-relaxed text-muted-foreground">
        Salt okunur. Yönetici eylemlerinin izi burada tutuluyor ve panelden
        değiştirilemiyor.
      </p>

      {error && <Alert className="mb-2">{error}</Alert>}

      {rows && rows.length === 0 && !error && (
        <p className="py-3 text-center text-meta text-muted-foreground">
          Henüz kayıt yok.
        </p>
      )}

      <ul className="space-y-px">
        {(rows ?? []).map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-baseline gap-x-2 border-b border-border py-1.5 text-meta last:border-0"
          >
            <span className="tabular text-faint">
              {new Date(r.createdAt).toLocaleString('tr-TR')}
            </span>
            <span className="font-medium text-foreground">{r.action}</span>
            {r.targetType && (
              <span className="text-muted-foreground">
                {r.targetType}
                {r.targetId && ` · ${r.targetId.slice(0, 8)}`}
              </span>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

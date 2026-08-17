import { useCallback, useEffect, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/features/auth/AuthContext';
import { cn } from '@/lib/cn';
import {
  canRemoveContent,
  decideClubDeletion,
  durumEtiketi,
  fetchQueue,
  isResolved,
  reasonLabels,
  removeContent,
  resolveItem,
  sendModerationFeedback,
  statusLabels,
  targetLabels,
  type ModerationItem,
  type ModerationStatus,
  type QueueResult,
} from './moderation';

/**
 * ŞİKÂYET KUYRUĞU — karar yüzeyi.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BU EKRAN NEDEN SONRADAN YAZILDI
 * ══════════════════════════════════════════════════════════════════════
 *
 * `moderation.ts` eksiksiz bir karar katmanı taşıyordu — kuyruk okuma,
 * durum sayımı, karar yazma, içerik kaldırma, topluluk silme talebi,
 * şikâyetçiye geri bildirim — ve on bir export'un HİÇBİRİ çağrılmıyordu.
 * Panelde kuyruğa bakan bir ekran yoktu.
 *
 * Görünen tek iz Genel Bakış'taki "Onay bekleyen" sayacıydı: sayıyı
 * `moderation_queue`'dan okuyor, tıklandığında ise o tabloya hiç
 * dokunmayan içerik onay ekranına götürüyordu. Yani sayaç doğru, varış
 * yeri yanlıştı; kuyrukta bekleyen şikâyet hiçbir yerden görülemiyordu.
 *
 * ── HATALAR YUTULMUYOR ──────────────────────────────────────────────
 *
 * Panelin başka yerlerinde görülen desen burada bilerek tekrarlanmadı:
 * her okuma ve yazma `error` değerini okuyor. "Kuyruk boş" ile "kuyruk
 * okunamadı" ayırt edilemezse moderatör bekleyen şikâyeti olmadığını
 * sanır — bu ekranda en pahalı hata tam olarak budur.
 *
 * ── YETKİ İSTEMCİDE SORULMUYOR ──────────────────────────────────────
 *
 * `moderation.ts`'in kendi notundaki kural korunuyor: yetkiyi RLS verir.
 * Moderatör olmayan biri bu ekranı açarsa kuyruğu boş görür, çünkü
 * sorgu boş döner — burada ikinci bir "yetkili mi" kontrolü yok.
 */

/** Sekmeler. Bekleyen işler solda; kapanmış kayıtlar sağda. */
const TABS: readonly ModerationStatus[] = [
  'pending',
  'in_review',
  'escalated',
  'approved',
  'rejected',
  'archived',
];

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('tr-TR');
}

export function ModerationQueueControl() {
  const { user } = useAuth();
  const [tab, setTab] = useState<ModerationStatus>('pending');
  const [result, setResult] = useState<QueueResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedbackFor, setFeedbackFor] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  const load = useCallback(async (status: ModerationStatus) => {
    setError(null);
    try {
      setResult(await fetchQueue(status));
    } catch (err) {
      /* Okuma düştü: listeyi BOŞ bırakmıyoruz, `null` bırakıyoruz.
         Boş dizi "kuyrukta iş yok" demek olurdu ve hata gizlenirdi. */
      setResult(null);
      setError(err instanceof Error ? err.message : 'Kuyruk okunamadı.');
    }
  }, []);

  useEffect(() => {
    void load(tab);
  }, [load, tab]);

  /** Yazma işlerinin ortak sarmalayıcısı: hata yüzeye çıkar, liste tazelenir. */
  const run = useCallback(
    async (islem: () => Promise<void>) => {
      setBusy(true);
      setError(null);
      try {
        await islem();
        await load(tab);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'İşlem tamamlanamadı.');
      } finally {
        setBusy(false);
      }
    },
    [load, tab]
  );

  const karar = (item: ModerationItem, status: ModerationStatus) => {
    if (!user?.id) {
      setError('Karar yazmak için oturum gerekiyor.');
      return;
    }
    void run(() =>
      resolveItem(item.id, status, user.id, undefined, item.target_type)
    );
  };

  const items = result?.items ?? [];
  const counts = result?.counts;

  return (
    <Panel
      title="Şikâyet kuyruğu"
      status={result ? `${items.length} kayıt` : error ? 'okunamadı' : 'okunuyor…'}
    >
      <div className="mb-3 flex flex-wrap gap-1.5" role="tablist">
        {TABS.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={tab === s}
            onClick={() => setTab(s)}
            className={cn(
              'rounded-card border px-3 py-1.5 text-meta font-medium transition-colors',
              tab === s
                ? 'border-primary text-primary'
                : 'border-border text-muted hover:border-border-strong'
            )}
          >
            {statusLabels[s]}
            {counts && counts[s] > 0 ? ` · ${counts[s]}` : ''}
          </button>
        ))}
      </div>

      {error && <Alert className="mb-3">{error}</Alert>}

      {result && items.length === 0 && !error && (
        <p className="text-meta text-muted">
          Bu durumda kayıt yok.
        </p>
      )}

      <ul className="space-y-3">
        {items.map((item) => {
          const talep = item.target_type === 'club_deletion';
          return (
            <li
              key={item.id}
              className="rounded-card border border-border p-3"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge>{targetLabels[item.target_type]}</Badge>
                <Badge>{reasonLabels[item.reason]}</Badge>
                <span className="text-meta text-muted">
                  {durumEtiketi(item)} · {formatDate(item.created_at)}
                </span>
              </div>

              {/* Şikâyet notu TAM gösteriliyor: kırpılmış bir gerekçeyle
                  karar verilemez. */}
              {item.note && (
                <p className="mb-2 whitespace-pre-wrap text-body">{item.note}</p>
              )}

              {item.target_path && (
                <a
                  href={item.target_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-2 inline-block text-meta text-primary underline"
                >
                  Şikâyet edilen içeriği aç
                </a>
              )}

              {item.resolution_note && (
                <p className="mb-2 text-meta text-muted">
                  Karar notu: {item.resolution_note}
                </p>
              )}

              {!isResolved(item.status) && (
                <div className="flex flex-wrap gap-2">
                  {talep ? (
                    <>
                      {/* Silme talebi `resolveItem`den geçmiyor: silme,
                          bildirim ve denetim kaydı birlikte
                          `topluluk_silme_karari` içinde. */}
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          void run(() => decideClubDeletion(item.id, true))
                        }
                      >
                        Silmeyi onayla
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() =>
                          void run(() =>
                            decideClubDeletion(
                              item.id,
                              false,
                              'Talep reddedildi.'
                            )
                          )
                        }
                      >
                        Talebi reddet
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => karar(item, 'rejected')}
                      >
                        Şikâyet haklı
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => karar(item, 'approved')}
                      >
                        Şikâyet haksız
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => karar(item, 'in_review')}
                      >
                        İncelemeye al
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => karar(item, 'escalated')}
                      >
                        Yönetime taşı
                      </Button>
                      {/* Konusu kalmamış kayıt `approved` yerine
                          `archived`: denetim günlüğünde "incelendi, haklı
                          bulunmadı" gibi görünmesin. */}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => karar(item, 'archived')}
                      >
                        Arşivle
                      </Button>
                    </>
                  )}

                  {canRemoveContent(item.target_type) && (
                    /* Kuyruğu kapatmak içeriği kaldırmıyor; kaldırma
                       ayrı bir eylem ve yalnızca uygulanabildiği
                       hedeflerde çıkıyor. */
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        void run(() =>
                          removeContent(item.target_type, item.target_id)
                        )
                      }
                    >
                      İçeriği kaldır
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setFeedbackFor(
                        feedbackFor === item.id ? null : item.id
                      );
                      setFeedbackText('');
                    }}
                  >
                    Geri bildirim
                  </Button>
                </div>
              )}

              {feedbackFor === item.id && (
                <div className="mt-2 space-y-2">
                  <label
                    className="block text-meta text-muted"
                    htmlFor={`geri-bildirim-${item.id}`}
                  >
                    Şikâyetçiye gönderilecek mesaj
                  </label>
                  <textarea
                    id={`geri-bildirim-${item.id}`}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    rows={3}
                    className="w-full rounded-card border border-border bg-surface p-2 text-body"
                  />
                  <Button
                    size="sm"
                    disabled={busy || !feedbackText.trim()}
                    onClick={() =>
                      void run(async () => {
                        await sendModerationFeedback(item.id, feedbackText);
                        setFeedbackFor(null);
                        setFeedbackText('');
                      })
                    }
                  >
                    Gönder
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

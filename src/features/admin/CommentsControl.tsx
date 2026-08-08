import { useCallback, useEffect, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import {
  COMMENT_KINDS,
  fetchComments,
  removeComment,
  type CommentKind,
  type CommentRow,
} from './comments';
import { RemovedNotice } from './RemovedNotice';
import { cn } from '@/lib/cn';

/**
 * KULLANICI METİNLERİ — moderasyon yüzeyi.
 *
 * ══════════════════════════════════════════════════════════════════════
 * METİN TAM GÖSTERİLİYOR, KIRPILMIYOR
 *
 * Moderatör kararını yazıyı okuyarak veriyor. İki satırda kesilen bir
 * önizleme, hakaretin üçüncü satırda olduğu bir yorumu temiz gösterir.
 * Uzun metin satırı büyütüyor — bu bir maliyet ama yanlış karardan
 * ucuz.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DÜZENLEME YOK
 *
 * Bir moderatörün başkasının cümlesini değiştirebilmesi, o kişinin
 * ağzına söz koymak demek. Uygun olmayan metin kaldırılır, düzeltilmez.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ONAY KUTUSU TÜRE GÖRE FARKLI KONUŞUYOR
 *
 * Yorum ve forum gönderisinde kaldırma geri alınabiliyor (gövde arşive
 * gidiyor), saha yorumunda gitmiyor. Tek bir "geri alınamaz" cümlesi
 * ilkinde yalan, ikincisinde doğru olurdu — ve yalan olan yönü,
 * moderatörü gereksiz yere tereddüde düşürüp kuyruğu yavaşlatan yön.
 */
const KIND_ORDER: CommentKind[] = ['photoComment', 'forumPost', 'siteReview'];

export function CommentsControl({
  kinds = KIND_ORDER,
}: {
  /** Hangi türler gösterilsin — forum sekmesi yalnızca gönderileri istiyor. */
  kinds?: CommentKind[];
}) {
  const [kind, setKind] = useState<CommentKind>(kinds[0]);
  const [rows, setRows] = useState<CommentRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback((k: CommentKind) => {
    setRows(null);
    setError(null);
    setConfirming(null);
    fetchComments(k)
      .then(setRows)
      .catch((e: unknown) => {
        setRows([]);
        setError(e instanceof Error ? e.message : 'Metinler okunamadı');
      });
  }, []);

  useEffect(() => load(kind), [load, kind]);

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    try {
      await removeComment(kind, id);
      load(kind);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaldırılamadı');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Kullanıcı metinleri"
      status={rows ? `${rows.length} kayıt` : 'okunuyor…'}
    >
      <p className="mb-3 text-meta leading-relaxed text-muted-foreground">
        Yorum ve gönderiler burada <strong className="text-foreground">tam
        metniyle</strong> gösteriliyor — kırpılmış bir önizleme, sorunun
        üçüncü satırda olduğu bir yazıyı temiz gösterirdi. Düzenleme yok:
        uygun olmayan metin kaldırılır, düzeltilmez.
      </p>

      <p className="mb-3 text-meta leading-relaxed text-muted-foreground">
        {COMMENT_KINDS[kind].softRemoval
          ? 'Kaldırılan metnin yerinde kural açıklaması kalıyor ve satır sayfadan silinmiyor — kaldırılan bir iletiyi izsiz yok etmek, ona verilen yanıtları anlamsız bırakır.'
          : 'Saha yorumu kaldırıldığında kalıcı siliniyor: tek başına duran bir değerlendirme, yerinde açıklama bırakmanın bağlam kazandırdığı bir konuşmanın parçası değil.'}
      </p>

      {kinds.length > 1 && (
        <div
          role="tablist"
          aria-label="Metin türü"
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
              {COMMENT_KINDS[k].label}
            </button>
          ))}
        </div>
      )}

      {error && <Alert className="mb-3">{error}</Alert>}

      {rows && rows.length === 0 && !error && (
        <p className="py-4 text-center text-body-sm text-muted-foreground">
          {COMMENT_KINDS[kind].label} listesi boş.
        </p>
      )}

      <ul>
        {(rows ?? []).map((row) => (
          <li key={row.id} className="border-b border-border py-2.5 last:border-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-caption font-medium text-foreground">
                {row.authorName
                  ? `@${row.authorName}`
                  : (row.authorId?.slice(0, 8) ?? 'bilinmiyor')}
              </span>
              {row.rating !== null && (
                <Badge tone="cold">{row.rating}/5</Badge>
              )}
              {row.createdAt && (
                <span className="tabular text-meta text-faint">
                  {new Date(row.createdAt).toLocaleString('tr-TR')}
                </span>
              )}
              <span className="flex-1" />
              {/* Kaldırılmış satırda düğme yok: ikinci kez kaldırmak
                  bir şey değiştirmiyor, tetikleyici de boş gövdeyi
                  arşivin üzerine yazardı. */}
              {!row.removalReason && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    setConfirming(confirming === row.id ? null : row.id)
                  }
                >
                  Kaldır
                </Button>
              )}
            </div>

            {row.removalReason ? (
              <RemovedNotice reason={row.removalReason} className="mt-1" />
            ) : (
              /* `whitespace-pre-line`: kullanıcının satır aralarını koruyor —
                 tek bloğa sıkıştırmak anlamı değiştirebiliyor. */
              <p className="mt-1 whitespace-pre-line break-words text-body-sm leading-relaxed text-muted-foreground">
                {row.body}
              </p>
            )}

            {confirming === row.id && (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-card border border-warm/40 bg-warm/8 px-3 py-2">
                <span className="flex-1 text-meta text-warm">
                  {COMMENT_KINDS[kind].softRemoval
                    ? 'Metin siteden kaldırılacak ve yerinde kural açıklaması kalacak. Özgün metin arşivde saklanıyor.'
                    : 'Bu metin kalıcı olarak kaldırılacak. Geri alınamaz.'}
                </span>
                <Button size="sm" disabled={busy} onClick={() => void remove(row.id)}>
                  Kaldır
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

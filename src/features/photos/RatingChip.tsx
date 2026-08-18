import { useEffect, useRef, useState } from 'react';
import { usePhotoRating } from '@/services/content/engagement';
import { cn } from '@/lib/cn';
import type { AstroPhoto } from './types';

/**
 * ══════════════════════════════════════════════════════════════════════
 * KOMPAKT PUAN DÜĞMESİ — EYLEM ŞERİDİNDE (G01, G02)
 *
 * Puanlama paneli sayfanın ALTINDAydı: fotoğrafın, yedi sekmenin,
 * künyenin ve sürüm listesinin ardından. Yerleşim gerekçeliydi —
 * "hüküm vermeden önce künyeye bak" — ama sonucu şu oldu: kullanıcı
 * "fotoğrafa yıldız verme düğmesi yok" diye bildirdi. Görülmeyen bir
 * kontrol, olmayan bir kontroldür.
 *
 * Düğme artık beğeni ve paylaşımın yanında, aynı şeritte. Panel yerinde
 * duruyor ve ikisi AYNI duruma yazıyor: aşağıdan verilen puan yukarıda
 * da görünüyor.
 *
 * AÇILIR KUTU, YERİNDE ON DÜĞME DEĞİL. Şeride on düğme koymak
 * telefonda satırı taşırırdı; kutu yalnızca istendiğinde açılıyor,
 * Esc ile ve dışarı tıklamayla kapanıyor.
 */
export function RatingChip({ photo }: { photo: AstroPhoto }) {
  const rating = usePhotoRating(photo.id, photo.rating);
  const [acik, setAcik] = useState(false);
  const kapsayici = useRef<HTMLDivElement>(null);
  const tetik = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!acik) return;
    const disari = (e: MouseEvent) => {
      if (!kapsayici.current?.contains(e.target as Node)) setAcik(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setAcik(false);
      tetik.current?.focus();
    };
    document.addEventListener('mousedown', disari);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', disari);
      document.removeEventListener('keydown', esc);
    };
  }, [acik]);

  /* Kendi fotoğrafına puan verilemiyor (kural RLS'te); düğmeyi gösterip
     sunucuya reddettirmek anlamsız bir hata mesajı olurdu. */
  if (!rating.canRate) return null;

  return (
    <div className="relative" ref={kapsayici}>
      <button
        ref={tetik}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={acik}
        onClick={() => setAcik((a) => !a)}
        className={cn(
          'rounded-full border px-3 py-1.5 transition-colors',
          rating.mine !== null
            ? 'border-primary bg-primary/15 text-primary'
            : 'border-border bg-surface-1 text-muted-foreground hover:border-border-strong hover:text-foreground'
        )}
      >
        {rating.mine !== null ? `★ ${rating.mine}` : '☆ Puan ver'}
      </button>

      {acik && (
        <div
          role="dialog"
          aria-label="Puan — 10 üzerinden"
          className="absolute right-0 z-50 mt-1.5 w-64 rounded-card border border-border bg-surface-1 p-3"
        >
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="text-meta text-muted-foreground">
              Bu kareye 10 üzerinden puan ver
            </p>
            {/*
              ORTALAMA VE OY SAYISI BİRLİKTE. Tek başına "8.6" bir şey
              söylemiyor: iki oyluk 8.6 ile kırk oyluk 8.6 aynı şey
              değil ve yarışmada bu fark belirleyici.
            */}
            {rating.average !== null && (
              <p className="tabular shrink-0 text-meta text-faint">
                <span className="font-semibold text-primary">
                  {rating.average.toFixed(1)}
                </span>
                /10 · {rating.count} oy
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => (
              <button
                key={score}
                type="button"
                aria-label={`${score} puan`}
                aria-pressed={rating.mine === score}
                disabled={rating.busy}
                onClick={() => void rating.rate(score)}
                className={cn(
                  'tabular h-9 min-w-9 rounded-card border text-body-sm font-medium transition-colors disabled:opacity-50',
                  rating.mine !== null && score <= rating.mine
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
                )}
              >
                {score}
              </button>
            ))}
          </div>
          {rating.mine !== null && (
            <button
              type="button"
              onClick={() => void rating.clear()}
              disabled={rating.busy}
              className="mt-2 text-meta text-faint underline underline-offset-2 transition-colors hover:text-foreground disabled:opacity-50"
            >
              puanı geri al
            </button>
          )}
          {rating.error && (
            <p role="alert" className="mt-2 text-meta text-warm">
              {rating.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { usePhotoRating } from '@/services/content/engagement';
import { cn } from '@/lib/cn';
import type { AstroPhoto } from './types';

/**
 * PUANLAMA — 10 üzerinden (§7.2, yarışma altyapısı).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN YILDIZ DEĞİL DE SAYI
 *
 * Beş yıldızlı bir ölçek düşünüldü ve reddedildi. Astrofotoğrafta
 * değerlendirme aralığı dar: kimse gördüğü kareye 1 vermiyor, pratikte
 * bütün oylar 6–10 arasında toplanıyor. Beş kademeli bir ölçekte bu
 * aralık üç yıldıza sıkışır ve iyi ile çok iyi ayırt edilemez.
 *
 * Yarım yıldız da çözüm değil: yarım yıldız görsel olarak bir ondalık
 * ama tıklama hedefi olarak belirsiz — kullanıcı 3.5 mu 4 mü verdiğini
 * bilmiyor. On kademeli sayı ölçeği hem daha geniş hem tartışmasız.
 *
 * ══════════════════════════════════════════════════════════════════════
 * KENDİ FOTOĞRAFINA PUAN VERİLEMEZ
 *
 * Kural veritabanında (0036 RLS politikası); buradaki gizleme yalnızca
 * arayüz nezaketi. Düğmeleri gösterip sunucuya reddettirmek, kullanıcıya
 * anlamsız bir hata mesajı göstermek olurdu.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DOKUNMA HEDEFİ 24px'İN ALTINA DÜŞMÜYOR (WCAG 2.5.8)
 *
 * On düğme dar ekranda sıkışıyor. `min-w-9` ve `h-9` ile her düğme 36px
 * kalıyor; ızgara sarmalı (`flex-wrap`) taşma yerine ikinci satıra
 * geçiyor. Düğmeleri küçültüp tek satırda tutmak, telefonda yanlış
 * kademeye basmak demekti — ve puanı yanlış vermek beğeniden farklı
 * olarak ortalamayı kaydırıyor.
 */
export function RatingControl({ photo }: { photo: AstroPhoto }) {
  const rating = usePhotoRating(photo.id, photo.rating);
  const [hover, setHover] = useState<number | null>(null);

  const active = hover ?? rating.mine;

  return (
    <section className="rounded-card border border-border bg-surface-1 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-body-sm font-semibold text-foreground">
          Bu kareye puan ver
        </h3>

        {/*
          ORTALAMA VE OY SAYISI BİRLİKTE. Tek başına "8.6" bir şey
          söylemiyor: iki oyluk 8.6 ile kırk oyluk 8.6 aynı şey değil ve
          yarışmada bu fark belirleyici.
        */}
        {rating.average !== null ? (
          <p className="tabular text-body-sm text-muted-foreground">
            <span className="text-h3 font-semibold text-primary">
              {rating.average.toFixed(1)}
            </span>
            <span className="ml-1">/ 10</span>
            <span className="ml-2 text-meta text-faint">
              {rating.count} oy
            </span>
          </p>
        ) : (
          <p className="text-meta text-faint">Henüz puanlanmadı</p>
        )}
      </div>

      {rating.canRate ? (
        <>
          <div
            role="radiogroup"
            aria-label="Puan — 10 üzerinden"
            className="mt-3 flex flex-wrap gap-1.5"
            onMouseLeave={() => setHover(null)}
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => (
              <button
                key={score}
                type="button"
                role="radio"
                aria-checked={rating.mine === score}
                aria-label={`${score} puan`}
                disabled={rating.busy}
                onMouseEnter={() => setHover(score)}
                onFocus={() => setHover(score)}
                onBlur={() => setHover(null)}
                onClick={() => void rating.rate(score)}
                className={cn(
                  'tabular h-9 min-w-9 rounded-card border text-body-sm font-medium transition-colors disabled:opacity-50',
                  active !== null && score <= active
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
                )}
              >
                {score}
              </button>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            {rating.mine !== null && (
              <>
                <p className="text-meta text-muted-foreground">
                  Senin puanın: <strong className="tabular">{rating.mine}</strong>
                </p>
                <button
                  type="button"
                  onClick={() => void rating.clear()}
                  disabled={rating.busy}
                  className="text-meta text-faint underline underline-offset-2 transition-colors hover:text-foreground disabled:opacity-50"
                >
                  puanı geri al
                </button>
              </>
            )}
            {rating.error && (
              <p role="alert" className="text-meta text-warm">
                {rating.error}
              </p>
            )}
          </div>
        </>
      ) : (
        <p className="mt-3 text-meta text-muted-foreground">
          {rating.isOwn
            ? 'Kendi fotoğrafına puan veremezsin — ortalamayı korumak için.'
            : 'Puan vermek için giriş yapman gerekiyor.'}
        </p>
      )}
    </section>
  );
}

/* Rozet ayrı modülde (bkz. `RatingBadge.tsx`): kart onu içe aktarınca
   buradaki oy yazma yolu da ilk pakete giriyordu. Yeniden dışa aktarım
   mevcut çağıranları koruyor. */
export { RatingBadge } from './RatingBadge';

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
          <p className="mb-2 text-meta text-muted-foreground">
            Bu kareye 10 üzerinden puan ver
          </p>
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

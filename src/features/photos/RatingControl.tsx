import { useState } from 'react';
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

/**
 * Kart/liste için sıkıştırılmış rozet.
 *
 * Oy yokken HİÇ ÇİZİLMİYOR: "0.0" ya da "—" gösteren bir rozet, kartta
 * yer kaplayıp hiçbir şey söylemez ve yeni yüklenmiş bir kareyi kötü
 * puanlanmış gibi gösterir.
 */
export function RatingBadge({
  rating,
  className,
}: {
  rating: AstroPhoto['rating'];
  className?: string;
}) {
  if (rating.sayi === 0) return null;
  const average = rating.toplam / rating.sayi;

  return (
    <span
      className={cn(
        'tabular inline-flex items-center gap-1 rounded-full border border-border bg-surface-1 px-2 py-0.5 text-meta',
        className
      )}
      title={`${rating.sayi} oyun ortalaması`}
    >
      <span className="font-semibold text-primary">{average.toFixed(1)}</span>
      <span className="text-faint">/10</span>
    </span>
  );
}

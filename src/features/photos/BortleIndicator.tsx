import { useMemo } from 'react';
import { bortleScale, type BortleClass } from '@/domain/astronomy/skyQuality';
import { deriveBortle } from './bortle';
import { cn } from '@/lib/cn';

/**
 * BORTLE GÖSTERGESİ — konumdan türeyen gökyüzü kalitesi.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN YAZI DEĞİL DE ÖLÇEK
 *
 * Burada eskiden şu cümle vardı: "Konum, fotoğrafçının seçtiği gizlilik
 * seviyesinde gösterilir; tam koordinatlar açık onay olmadan
 * yayımlanmaz." Doğru bir cümleydi ama bir POLİTİKA açıklamasıydı ve
 * her fotoğrafın altında tekrar ediyordu. Kullanıcının o ekranda sorduğu
 * soru bu değil: "bu kare nasıl bir gökyüzünden çekilmiş?"
 *
 * "Bortle 8" yazmak da tek başına cevap değil — ölçeği ezbere bilmeyen
 * biri için 8'in iyi mi kötü mü olduğu belirsiz. Dokuz kademeli bir
 * şerit bunu bir bakışta veriyor: işaret nerede duruyorsa gökyüzü
 * oradadır, ve iki fotoğrafın şeridi yan yana konduğunda fark
 * okunabilir.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DEĞER NEREDEN GELİYOR — VE NE ZAMAN GELMİYOR
 *
 * Sıra şu: fotoğrafın kendi kaydı → konum etiketinden çözülen il.
 *
 * İl karşılığı KABA bir gösterge ve öyle etiketleniyor ("il ortalaması").
 * Ankara'nın 8'i il merkezinin değeridir; Ankara'nın kırsalından çekilmiş
 * bir kare için yanlıştır. Bunu ölçüm gibi göstermek, plate solve
 * tarafında özenle kurduğumuz "iddia / ölçüm" ayrımını burada bozardı.
 * Hiçbir kaynak yoksa gösterge HİÇ ÇİZİLMİYOR — uydurulmuş bir 5,
 * boşluktan kötü.
 */

/**
 * Ölçek renkleri: karanlıktan aydınlığa.
 *
 * Token değil sabit renk — şerit bir ÖLÇEĞİ temsil ediyor ve ölçeğin
 * anlamı temaya göre değişmiyor. `--color-primary` gibi anlamsal bir
 * token kullanmak, açık temada 3 ile 7'yi birbirine yaklaştırırdı.
 */
const STEP_COLORS: Record<BortleClass, string> = {
  1: '#0b1e46',
  2: '#123063',
  3: '#1f4d7a',
  4: '#2f7391',
  5: '#5c8f7b',
  6: '#9a9257',
  7: '#c08a3e',
  8: '#d4692f',
  9: '#d63b2f',
};

export function BortleIndicator({
  bortle,
  city,
  locationLabel,
  sqm,
  className,
}: {
  bortle?: number;
  city?: string;
  locationLabel?: string;
  /** Sahada ölçülmüş SQM — varsa ölçek aralığının yerine bu yazılıyor. */
  sqm?: number;
  className?: string;
}) {
  const derived = useMemo(
    () => deriveBortle({ bortle, city, locationLabel }),
    [bortle, city, locationLabel]
  );

  if (!derived) return null;

  const info = bortleScale[derived.value];
  const [sqmLow, sqmHigh] = info.sqmRange;

  return (
    <div
      className={cn(
        'rounded-card border border-border bg-surface-1 p-4',
        className
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-body-sm font-semibold text-foreground">
          Bortle {derived.value}
          <span className="ml-2 font-normal text-muted-foreground">
            {info.label}
          </span>
        </p>
        <p className="tabular text-meta text-faint">
          {sqm
            ? `SQM ${sqm.toFixed(2)} mag/arcsec² · ölçüldü`
            : `SQM ~${sqmLow.toFixed(1)}–${sqmHigh.toFixed(1)} mag/arcsec²`}
        </p>
      </div>

      {/*
        Şerit `role="img"`: dokuz ayrı kutu ekran okuyucuya dokuz anlamsız
        öğe olarak okunurdu. Tek bir etiket, aynı bilgiyi cümleyle veriyor.
      */}
      <div
        role="img"
        aria-label={`Bortle ölçeği: 9 üzerinden ${derived.value} — ${info.label}`}
        className="mt-3 flex gap-1"
      >
        {(Object.keys(STEP_COLORS) as unknown as string[]).map((key) => {
          const step = Number(key) as BortleClass;
          const active = step === derived.value;
          return (
            <div key={step} className="flex-1">
              <div
                className={cn(
                  'h-2 rounded-full transition-opacity',
                  active ? 'opacity-100' : 'opacity-30'
                )}
                style={{ backgroundColor: STEP_COLORS[step] }}
              />
              <span
                className={cn(
                  'tabular mt-1 block text-center text-meta leading-none',
                  active ? 'font-semibold text-foreground' : 'text-faint'
                )}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-meta leading-relaxed text-muted-foreground">
        {info.description}
      </p>

      <p className="mt-2 text-meta text-faint">
        {derived.source === 'kayit'
          ? 'Değer fotoğrafın kendi kaydından geliyor.'
          : `Değer ${locationLabel || city} il ortalamasından türetildi — sahanın gerçek gökyüzü daha karanlık olabilir.`}
      </p>
    </div>
  );
}

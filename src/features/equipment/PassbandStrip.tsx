import {
  SPECTRAL_LINES,
  VISIBLE_RANGE,
  bandLabelMismatch,
  bandwidthText,
  marketBandLabels,
  sortedPassbands,
  wavelengthColor,
  wavelengthPosition,
  type AstroFilterSpec,
} from '@/domain/equipment/spectrum';

/**
 * SPEKTRAL GEÇİŞ ŞERİDİ.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NE GÖSTERİYOR, NE GÖSTERMİYOR
 *
 * Bu bir geçirgenlik EĞRİSİ DEĞİL. Üreticinin ölçtüğü gerçek eğri elimizde
 * yok ve olmayan bir eğriyi çizmek — düzgün bir tepe, güzel bir omuz —
 * kullanıcıya ölçülmemiş bir şeyi ölçülmüş gibi gösterirdi. Şerit yalnızca
 * elimizde olanı gösteriyor: hangi emisyon çizgisi geçiyor ve (biliniyorsa)
 * kaç nm genişlikte.
 *
 * Bant genişliği bilinmeyen çizgi ince bir işaret olarak duruyor, kalın bir
 * blok olarak değil — 99 üründen 68'inde bu veri yok ve hepsini aynı
 * kalınlıkta çizmek, hepsini biliyormuşuz gibi görünürdü.
 *
 * ══════════════════════════════════════════════════════════════════════
 * PAZARLAMA ADI ÇELİŞİYORSA SÖYLENİYOR
 *
 * "Quad-band" yazan ama üç emisyon çizgisi geçiren ürünler var. Bu bir
 * veri hatası değil, sektörün kendi tutarsızlığı — ve gizlenirse kullanıcı
 * kutunun üstündeki sayıya güvenip yanlış filtre alır.
 */

const STRIP_HEIGHT = 44;

export function PassbandStrip({ spec }: { spec: AstroFilterSpec }) {
  const bands = sortedPassbands(spec);
  const mismatch = bandLabelMismatch(spec);
  const genislik = bandwidthText(spec.bandwidthMinNm, spec.bandwidthMaxNm);

  /* Ölçek etiketleri: görünür spektrumun okunur kilometre taşları. */
  const ticks = [400, 450, 500, 550, 600, 650];

  return (
    <div>
      <div
        className="relative overflow-hidden rounded-card border border-border bg-surface-2"
        style={{ height: STRIP_HEIGHT }}
        role="img"
        aria-label={
          bands.length > 0
            ? `Geçirdiği emisyon çizgileri: ${bands
                .map((b) => {
                  const line = SPECTRAL_LINES[b.line];
                  const bw = b.bandwidthNm ? `, ${b.bandwidthNm} nanometre` : '';
                  return `${line.shortName} ${line.wavelengthNm} nanometre${bw}`;
                })
                .join('; ')}`
            : 'Bu filtre için geçiş bandı verisi yok'
        }
      >
        {/* Görünür spektrum zemini — çok soluk, şeritler onun üstünde okunsun. */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-25"
          style={{
            background:
              'linear-gradient(90deg, #7a5cd0 0%, #4a63d8 22%, #3f9fd0 38%, #3fb87a 50%, #c9c04a 62%, #d98a3a 78%, #d1524a 100%)',
          }}
        />

        {ticks.map((nm) => (
          <span
            key={nm}
            aria-hidden
            className="absolute top-0 h-full border-l border-border/60"
            style={{ left: `${wavelengthPosition(nm) * 100}%` }}
          />
        ))}

        {bands.map((band) => {
          const line = SPECTRAL_LINES[band.line];
          const merkez = wavelengthPosition(line.wavelengthNm) * 100;
          /* Bant genişliği nm cinsinden; şeridin toplam genişliği 340 nm.
             Bilinmeyen genişlik 1.5 nm'lik ince bir işaret — "bir şey var
             ama ne kadar geniş bilmiyoruz" demenin görsel karşılığı. */
          const nmSpan = band.bandwidthNm ?? 1.5;
          const yuzde = Math.max(
            0.9,
            (nmSpan / (VISIBLE_RANGE.max - VISIBLE_RANGE.min)) * 100
          );
          return (
            <span
              key={band.line}
              aria-hidden
              className="absolute top-0 h-full"
              style={{
                left: `${merkez - yuzde / 2}%`,
                width: `${yuzde}%`,
                background: wavelengthColor(line.wavelengthNm),
                opacity: band.bandwidthNm === null ? 0.6 : 0.95,
                borderLeft:
                  band.bandwidthNm === null
                    ? `1px dashed ${wavelengthColor(line.wavelengthNm)}`
                    : undefined,
              }}
            />
          );
        })}
      </div>

      <div aria-hidden className="mt-1 flex justify-between text-meta tabular text-faint">
        <span>{VISIBLE_RANGE.min} nm</span>
        <span>{VISIBLE_RANGE.max} nm</span>
      </div>

      {bands.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {bands.map((band) => {
            const line = SPECTRAL_LINES[band.line];
            return (
              <li
                key={band.line}
                className="flex items-center gap-1.5 text-meta text-muted-foreground"
              >
                <span
                  aria-hidden
                  className="inline-block h-2.5 w-2.5 rounded-card"
                  style={{ background: wavelengthColor(line.wavelengthNm) }}
                />
                <span className="text-foreground">{line.shortName}</span>
                <span className="tabular">{line.wavelengthNm} nm</span>
                {/* Ölçüm yoksa "—": sıfır ya da tahmin yazmıyoruz. */}
                <span className="tabular text-faint">
                  {band.bandwidthNm !== null ? `· ${band.bandwidthNm} nm bant` : '· bant —'}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-border pt-3 text-meta sm:grid-cols-2">
        <Satir label="Pazar sınıfı" value={marketBandLabels[spec.marketBand]} />
        <Satir
          label="Emisyon çizgisi"
          value={spec.emissionLineCount !== null ? `${spec.emissionLineCount}` : null}
        />
        <Satir
          label="Geçiş penceresi"
          value={spec.passWindowCount !== null ? `${spec.passWindowCount}` : null}
        />
        <Satir label="Bant genişliği" value={genislik} />
        {spec.fastOpticsProfile && (
          <Satir label="Hızlı optik profili" value={spec.fastOpticsProfile} />
        )}
      </dl>

      {mismatch === true && (
        <p className="mt-3 border-l-2 border-warning pl-3 text-meta leading-relaxed text-muted-foreground">
          <span className="text-warning">Ad ile ölçüm ayrışıyor.</span> Ürün{' '}
          <b className="text-foreground">{marketBandLabels[spec.marketBand]}</b>{' '}
          olarak pazarlanıyor ama kayıtlarda{' '}
          <b className="text-foreground">{spec.emissionLineCount} emisyon çizgisi</b>{' '}
          görünüyor. Üreticiler bu terimleri farklı kullanıyor — satın almadan
          önce üreticinin kendi geçirgenlik grafiğine bakın.
        </p>
      )}

      {spec.notes && (
        <p className="mt-3 text-meta leading-relaxed text-muted-foreground">
          {spec.notes}
        </p>
      )}
    </div>
  );
}

function Satir({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-1.5">
      <dt className="text-faint">{label}</dt>
      <dd className={value ? 'tabular text-foreground' : 'text-faint'}>
        {value ?? '—'}
      </dd>
    </div>
  );
}

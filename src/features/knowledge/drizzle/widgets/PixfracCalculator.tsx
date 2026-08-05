import { useMemo, useState, type ReactNode } from 'react';
import { noiseCorrelation, fmt } from '../core';

/**
 * HESAPLAYICI 2 — pixfrac ve gürültü korelasyonu.
 *
 * Paketteki `PixfracCalculator.jsx` bileşeninin TSX karşılığı.
 *
 * "Denge noktasının altındasınız" dalında R'nin DÜŞTÜĞÜ yazıyor ve bu
 * doğrudur (bkz. `core.ts` içindeki `noiseCorrelation` notu) — metin
 * "R'yi minimize edin" şeklinde düzeltilmemeli.
 */
export function PixfracCalculator() {
  const [scale, setScale] = useState(2);
  const [pf, setPf] = useState(0.5);

  const m = useMemo(() => {
    const r = pf * scale;
    const R = noiseCorrelation(r);
    const opt = 1 / scale;
    const pen = (R / 1.5 - 1) * 100;
    const frames = Math.max(4, Math.ceil(6 / (pf * pf)));
    const risk: [string, string] =
      r >= 1
        ? ['Düşük', 'dz-ok']
        : r >= 0.7
          ? ['Orta', 'dz-mid']
          : ['Yüksek', 'dz-bad'];
    return { r, R, opt, pen, frames, risk };
  }, [scale, pf]);

  let verdict: ReactNode;
  if (scale === 1 && pf === 1) {
    verdict = (
      <>
        <b className="dz-ok">
          CFA drizzle / enterpolasyonsuz yeniden örnekleme ayarı.
        </b>{' '}
        Büyütme yok, dosya boyutu artmıyor, damla tam bir çıktı pikseli. OSC
        kameralar için önerilen standart ayar budur.
      </>
    );
  } else if (Math.abs(pf - m.opt) < 0.06) {
    verdict = (
      <>
        <b className="dz-ok">Denge noktasındasınız.</b> Damlanız tam olarak bir
        çıktı pikseli boyutunda (r = 1). Bu, keskinlik ile güvenli kapsama
        arasındaki klasik uzlaşmadır — Siril bu ayarı önerir. Kaba tahmin:
        yaklaşık <b>{m.frames} iyi dağılmış kare</b> ile delik görmezsiniz.
      </>
    );
  } else if (pf > m.opt) {
    verdict = (
      <>
        <b className="dz-mid">Denge noktasının üstündesiniz.</b> Bu ölçekte
        denge noktası pixfrac <b>{fmt(m.opt)}</b>. Şu anki ayar gürültüyü %
        {m.pen.toFixed(0)} daha fazla korele ediyor ve çıktıyı biraz
        yumuşatıyor. Karşılığında delik riski düşük —{' '}
        <b>az kareniz varsa bu bilinçli ve doğru bir tercih.</b>
      </>
    );
  } else {
    verdict = (
      <>
        <b className="dz-mid">Denge noktasının altındasınız.</b> Damla
        küçüldüğü için gürültü korelasyonu <i>azalıyor</i> (R = {fmt(m.R)}) ve
        çıktı keskinleşiyor — <b>ama R&apos;ye bakarak karar vermeyin</b>: bu
        bölgede asıl risk <b>delik ve Moiré</b>. Kaba tahmin: bu pixfrac için en
        az <b>{m.frames} iyi dağılmış kare</b> gerekir. Çıktıyı %100
        zoom&apos;da mutlaka kontrol edin.
      </>
    );
  }

  return (
    <div className="dz-tool">
      <h3 className="dz-tool-title">
        Hesaplayıcı 2 — Kendi ayarınızın R değeri
      </h3>
      <p className="dz-sub">
        Yazılımınızda gireceğiniz değerleri seçin, teorik gürültü
        korelasyonunu ve dosya maliyetini görün.
      </p>

      <div className="dz-grid">
        <div className="dz-fld">
          <label htmlFor="dz-r-scale">Drizzle ölçeği</label>
          <select
            id="dz-r-scale"
            value={scale}
            onChange={(e) => setScale(parseInt(e.target.value, 10))}
          >
            <option value={1}>1× (büyütme yok)</option>
            <option value={2}>2×</option>
            <option value={3}>3×</option>
          </select>
        </div>
        <div className="dz-fld">
          <label htmlFor="dz-r-pf">pixfrac / drop shrink</label>
          <div className="dz-rng">
            <input
              id="dz-r-pf"
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              value={pf}
              onChange={(e) => setPf(parseFloat(e.target.value))}
            />
            <span className="dz-v">{fmt(pf)}</span>
          </div>
        </div>
      </div>

      <div className="dz-out" aria-live="polite">
        <div className="dz-stat">
          <div className="dz-k">r değeri</div>
          <div className="dz-val">{fmt(m.r)}</div>
        </div>
        <div className="dz-stat">
          <div className="dz-k">R (korelasyon)</div>
          <div className="dz-val">{fmt(m.R)}</div>
        </div>
        <div className="dz-stat">
          <div className="dz-k">Dosya / RAM</div>
          <div className="dz-val">
            {scale * scale}
            <small>×</small>
          </div>
        </div>
        <div className="dz-stat">
          <div className="dz-k">Delik riski</div>
          <div className={`dz-val ${m.risk[1]}`}>{m.risk[0]}</div>
        </div>
      </div>

      <div className="dz-verdict">{verdict}</div>
    </div>
  );
}

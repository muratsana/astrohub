/**
 * HESAPLAYICI 1 — iki objeyi karşılaştır.
 *
 * İçerik paketindeki `ObjectComparison.jsx` bileşeninin TSX karşılığı.
 * Metinler, eşikler ve hesap paketin doğrulanmış hâliyle aynı; fizik
 * `../core` üzerinden geliyor ve o dosya paketin JS sürümüyle test
 * ediliyor (`core.test.ts`).
 */
import { useMemo, useState } from 'react';
import {
  OBJECTS,
  objById,
  BORTLE,
  rate,
  snrOf,
  timeForSNR,
  fmtDur,
} from '../core';

export function ObjectComparison() {
  const [a, setA] = useState('m57');
  const [b, setB] = useState('m33');
  const [bortle, setBortle] = useState(5);
  const [hours, setHours] = useState(2);

  const m = useMemo(() => {
    const A = objById(a),
      B = objById(b);
    const sky = rate(BORTLE[bortle]),
      RN = 1.5,
      t = 300;
    const T = Math.max(0.05, hours) * 3600,
      n = T / t;
    const snr = snrOf(rate(A.sb), sky, T, n, RN);
    const need = timeForSNR(snr, rate(B.sb), sky, RN, t);
    return { A, B, snr, need, T, r: need / T };
  }, [a, b, bortle, hours]);

  let verdict;
  if (a === b) {
    verdict = 'Aynı objeyi seçtiniz — doğal olarak süre aynı.';
  } else if (m.r > 50) {
    const dsb = m.B.sb - m.A.sb;
    verdict = (
      <>
        <b className="dz-bad">
          {m.B.n}, {m.A.n}&apos;den {Math.round(m.r)} kat daha uzun süre
          istiyor.
        </b>{' '}
        Yüzey parlaklıkları arasında {dsb.toFixed(1)} kadir fark var — yani
        piksel başına {Math.round(Math.pow(10, 0.4 * dsb))} kat daha az ışık.
        Katalog kadirlerine bakarak karar vermenin neden yanıltıcı olduğu tam
        olarak budur.
      </>
    );
  } else if (m.r > 3) {
    verdict = (
      <>
        <b className="dz-mid">
          {m.B.n} için {m.r.toFixed(1)} kat daha uzun süre gerekiyor.
        </b>{' '}
        Aynı gecede ikisini birden hedeflemek gerçekçi değil — {m.B.n} için ayrı
        bir proje planlayın.
      </>
    );
  } else if (m.r > 1) {
    verdict = (
      <>
        <b className="dz-ok">İkisi de benzer bütçede.</b> {m.B.n} yalnızca{' '}
        {m.r.toFixed(2)} kat daha uzun istiyor; aynı sezonda ikisini de
        bitirebilirsiniz.
      </>
    );
  } else {
    verdict = (
      <>
        <b className="dz-ok">{m.B.n} aslında daha kolay.</b> {m.A.n} için
        ayırdığınız sürenin sadece %{(m.r * 100).toFixed(0)}&apos;i yeterli.
      </>
    );
  }

  return (
    <div className="dz-tool">
      <h4>Hesaplayıcı 1 — İki objeyi karşılaştırın</h4>
      <p className="dz-sub">
        Aynı gökyüzünde, aynı ekipmanla, aynı SNR&apos;a ulaşmak için gereken
        süreler.
      </p>

      <div className="dz-grid">
        <div className="dz-fld">
          <label htmlFor="oc-a">Birinci obje</label>
          <select id="oc-a" value={a} onChange={(e) => setA(e.target.value)}>
            {OBJECTS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.n}
              </option>
            ))}
          </select>
        </div>
        <div className="dz-fld">
          <label htmlFor="oc-b">İkinci obje</label>
          <select id="oc-b" value={b} onChange={(e) => setB(e.target.value)}>
            {OBJECTS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.n}
              </option>
            ))}
          </select>
        </div>
        <div className="dz-fld">
          <label htmlFor="oc-sky">Gökyüzü (Bortle)</label>
          <div className="dz-rng">
            <input
              id="oc-sky"
              type="range"
              min="1"
              max="9"
              step="1"
              value={bortle}
              onChange={(e) => setBortle(+e.target.value)}
            />
            <span className="dz-v">{bortle}</span>
          </div>
        </div>
        <div className="dz-fld">
          <label htmlFor="oc-h">
            Birinci obje için ayırdığınız süre (saat)
          </label>
          <input
            id="oc-h"
            type="number"
            step="0.5"
            min="0.1"
            value={hours}
            onChange={(e) => setHours(parseFloat(e.target.value))}
          />
        </div>
      </div>

      <div className="dz-out" aria-live="polite">
        <div className="dz-stat">
          <div className="dz-k">İkinci obje için gereken</div>
          <div className="dz-val" style={{ fontSize: 26 }}>
            {fmtDur(m.need)}
          </div>
        </div>
        <div className="dz-stat dz-sm">
          <div className="dz-k">Süre oranı</div>
          <div className="dz-val">
            {m.r >= 1 ? m.r.toFixed(1) : m.r.toFixed(2)}
            <small>×</small>
          </div>
        </div>
        <div className="dz-stat dz-sm">
          <div className="dz-k">Ulaşılan SNR</div>
          <div className="dz-val">
            {m.snr < 100 ? m.snr.toFixed(1) : Math.round(m.snr)}
          </div>
        </div>
      </div>

      <div className="dz-verdict">{verdict}</div>
    </div>
  );
}

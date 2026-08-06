/**
 * HESAPLAYICI 2 — alt poz süresi.
 *
 * Paketin `SubExposureCalculator.jsx` bileşeninin TSX karşılığı.
 */
import { useMemo, useState } from 'react';
import { BORTLE, rate, minSubExposure } from '../core';

const TOL = [
  ['9.76', '%5 — güvenli (önerilen)'],
  ['4.76', '%10 — kabul edilebilir'],
  ['2.27', '%20 — kısa kare stratejisi'],
];
const FILT = [
  ['1', 'Yok / UV-IR kesme'],
  ['0.55', 'Işık kirliliği filtresi'],
  ['0.042', 'Çift bant 7 nm'],
  ['0.018', 'Çift bant 3 nm'],
  ['0.0095', 'Hα 3 nm (mono)'],
];

export function SubExposureCalculator() {
  const [rn, setRn] = useState(1.5);
  const [bortle, setBortle] = useState(6);
  const [fr, setFr] = useState(6);
  const [px, setPx] = useState(3.76);
  const [ff, setFf] = useState(1);
  const [k, setK] = useState(9.76);

  const m = useMemo(() => {
    const RN = Math.max(0.1, rn || 1.5);
    const ap = 80,
      fl = ap * Math.max(1, fr || 6);
    const sky = rate(BORTLE[bortle], ap, fl, Math.max(0.5, px || 3.76)) * ff;
    const t = minSubExposure(RN, sky, k);
    return { RN, sky, t };
  }, [rn, bortle, fr, px, ff, k]);

  const tTxt =
    m.t < 90
      ? Math.round(m.t) + ' saniye'
      : m.t < 3600
        ? (m.t / 60).toFixed(1) + ' dakika'
        : (m.t / 3600).toFixed(1) + ' saat';

  let verdict;
  if (m.t < 20) {
    verdict = (
      <>
        <b className="dz-ok">Çok kısa kareler yeterli.</b> Bu koşullarda gökyüzü
        okuma gürültüsünü {Math.round(m.t)} saniyede boğuyor. Pratikte bu kadar
        kısaya inmeyin: kare arası ölü zaman ve dosya sayısı sizi yer.{' '}
        <b>60–120 saniye</b> makul bir seçim olur, SNR kaybı ihmal edilebilir.
      </>
    );
  } else if (m.t < 200) {
    verdict = (
      <>
        <b className="dz-ok">İdeal aralık.</b> {Math.round(m.t)} saniye alt
        sınırınız. Bunu 2–3 katına çıkarmanın SNR maliyeti neredeyse sıfır, buna
        karşılık dosya sayısı düşer. Yıldızlarınızı yakmadığı sürece{' '}
        <b>
          {Math.round(m.t)}–{Math.round(m.t * 3)} saniye
        </b>{' '}
        arası çalışın.
      </>
    );
  } else if (m.t < 900) {
    verdict = (
      <>
        <b className="dz-mid">Uzun kareler gerekiyor.</b>{' '}
        {(m.t / 60).toFixed(1)} dakika. Bu, karanlık gökyüzü ya da dar bant
        filtre kullandığınızı gösterir. Takibinizin bu süreyi kaldırdığından
        emin olun.
      </>
    );
  } else {
    verdict = (
      <>
        <b className="dz-bad">Pratikte ulaşılamaz bir süre çıktı.</b>{' '}
        {(m.t / 60).toFixed(0)} dakika. Bu genellikle yüksek okuma gürültülü bir
        kamerayı çok karanlık gökyüzünde ya da çok dar bantta kullandığınız
        anlamına gelir. Makul bir süre seçip okuma gürültüsü cezasını kabul edin
        — eski CCD kullanıcıları tam olarak bunu yapıyordu.
      </>
    );
  }

  return (
    <div className="dz-tool">
      <h4>Hesaplayıcı 2 — Poz süreniz ne olmalı?</h4>
      <p className="dz-sub">
        Kameranızın okuma gürültüsünü ve gökyüzünüzü girin. Alt sınırı
        hesaplayın.
      </p>

      <div className="dz-grid">
        <div className="dz-fld">
          <label htmlFor="se-rn">Okuma gürültüsü (e⁻)</label>
          <input
            id="se-rn"
            type="number"
            step="0.1"
            min="0.3"
            value={rn}
            onChange={(e) => setRn(parseFloat(e.target.value))}
          />
        </div>
        <div className="dz-fld">
          <label htmlFor="se-b">Gökyüzü (Bortle)</label>
          <div className="dz-rng">
            <input
              id="se-b"
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
          <label htmlFor="se-f">Odak oranı (f/)</label>
          <input
            id="se-f"
            type="number"
            step="0.1"
            min="1"
            value={fr}
            onChange={(e) => setFr(parseFloat(e.target.value))}
          />
        </div>
        <div className="dz-fld">
          <label htmlFor="se-px">Piksel boyutu (µm)</label>
          <input
            id="se-px"
            type="number"
            step="0.01"
            min="0.5"
            value={px}
            onChange={(e) => setPx(parseFloat(e.target.value))}
          />
        </div>
        <div className="dz-fld">
          <label htmlFor="se-filt">Filtre</label>
          <select
            id="se-filt"
            value={ff}
            onChange={(e) => setFf(+e.target.value)}
          >
            {FILT.map((f) => (
              <option key={f[0]} value={f[0]}>
                {f[1]}
              </option>
            ))}
          </select>
        </div>
        <div className="dz-fld">
          <label htmlFor="se-tol">Kabul edilebilir SNR kaybı</label>
          <select id="se-tol" value={k} onChange={(e) => setK(+e.target.value)}>
            {TOL.map((f) => (
              <option key={f[0]} value={f[0]}>
                {f[1]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="dz-out" aria-live="polite">
        <div className="dz-stat dz-sm">
          <div className="dz-k">Gökyüzü hızı</div>
          <div className="dz-val">
            {m.sky < 0.01 ? m.sky.toFixed(4) : m.sky.toFixed(3)}
            <small> e⁻/px/sn</small>
          </div>
        </div>
        <div className="dz-stat">
          <div className="dz-k">Önerilen poz</div>
          <div className="dz-val">{tTxt}</div>
        </div>
        <div className="dz-stat dz-sm">
          <div className="dz-k">Karede gökyüzü</div>
          <div className="dz-val">
            {Math.round(m.sky * m.t)}
            <small> e⁻</small>
          </div>
        </div>
      </div>

      <div className="dz-verdict">
        {verdict}
        {m.RN > 5 && (
          <p style={{ margin: '12px 0 0' }}>
            <b>Not:</b> {m.RN.toFixed(1)} e⁻ okuma gürültüsü yüksek. Modern
            CMOS&apos;ta bu değer 1–1.5 e⁻; gereken poz süresi okuma
            gürültüsünün <b>karesiyle</b> orantılı olduğu için, geçiş yaparsanız
            süre yaklaşık <b>{Math.round(Math.pow(m.RN / 1.5, 2))} kat</b>{' '}
            kısalır.
          </p>
        )}
      </div>

      <p className="dz-note">
        Hesap V bandına göredir. Filtresiz gerçek bir kamera daha geniş bir
        aralık topladığı için pratikte gereken süre daha da kısadır — yani bu
        değer güvenli taraftadır.
      </p>
    </div>
  );
}

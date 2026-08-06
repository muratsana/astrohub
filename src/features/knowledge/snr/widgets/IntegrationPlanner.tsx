/**
 * HESAPLAYICI 3 — entegrasyon planlayıcı.
 *
 * Paketin `IntegrationPlanner.jsx` bileşeninin TSX karşılığı.
 */
import { useMemo, useState } from 'react';
import {
  OBJECTS,
  objById,
  BORTLE,
  FILTERS,
  rate,
  timeForSNR,
  minSubExposure,
  fmtDur,
  type FilterId,
} from '../core';

const TARGETS = [
  ['3', '3 — sadece tespit'],
  ['10', '10 — işlenebilir'],
  ['20', '20 — temiz sonuç'],
  ['40', '40 — dergi kalitesi'],
];

export function IntegrationPlanner() {
  const [objId, setObjId] = useState('m33');
  const [bortle, setBortle] = useState(5);
  const [ap, setAp] = useState(80);
  const [fr, setFr] = useState(6);
  const [px, setPx] = useState(3.76);
  const [filt, setFilt] = useState<FilterId>('none');
  const [target, setTarget] = useState(10);

  const m = useMemo(() => {
    const o = objById(objId);
    const A = Math.max(20, ap || 80),
      FR = Math.max(1, fr || 6),
      P = Math.max(0.5, px || 3.76);
    const fl = A * FR,
      RN = 1.5,
      F = FILTERS[filt];
    const S = rate(o.sb, A, fl, P) * (o.em ? F.em : F.broad);
    const B = rate(BORTLE[bortle], A, fl, P) * F.sky;
    const t = Math.min(
      600,
      Math.max(30, minSubExposure(RN, Math.max(1e-6, B)))
    );
    const T = timeForSNR(target, S, B, RN, t);
    const Tdark = timeForSNR(
      target,
      S,
      rate(BORTLE[3], A, fl, P) * F.sky,
      RN,
      t
    );
    return { o, S, B, T, Tdark, F };
  }, [objId, bortle, ap, fr, px, filt, target]);

  const hrs = m.T / 3600;
  let verdict;
  if (hrs < 1.5) {
    verdict = (
      <>
        <b className="dz-ok">Bir gecelik iş.</b> {m.o.n} bu koşullarda SNR{' '}
        {target} için {fmtDur(m.T)} istiyor. {m.o.note}.
      </>
    );
  } else if (hrs < 8) {
    verdict = (
      <>
        <b className="dz-ok">Makul bir proje.</b> {fmtDur(m.T)} — bir ya da iki
        temiz gece. {m.o.note}.
      </>
    );
  } else if (hrs < 30) {
    verdict = (
      <>
        <b className="dz-mid">Ciddi bir proje.</b> {fmtDur(m.T)} gerekiyor.
        Bortle 3 bir gökyüzünde aynı sonuç <b>{fmtDur(m.Tdark)}</b> sürerdi —
        yani karanlık gökyüzüne gitmek size {(m.T / m.Tdark).toFixed(1)} kat
        kazandırır.
      </>
    );
  } else if (hrs < 200) {
    verdict = (
      <>
        <b className="dz-bad">Çok uzun.</b> {fmtDur(m.T)}. Bu hedef bu gökyüzü
        için uygun değil. Seçenekleriniz: karanlık gökyüzüne gitmek (
        {fmtDur(m.Tdark)}),{' '}
        {m.o.em ? 'dar bant filtreye geçmek' : 'daha parlak bir hedef seçmek'},
        ya da hedef SNR&apos;ı düşürmek.
      </>
    );
  } else {
    verdict = (
      <>
        <b className="dz-bad">Pratikte imkânsız.</b> {fmtDur(m.T)}. Bu obje ve
        bu gökyüzü birbirine uymuyor.{' '}
        {m.o.sb > 24
          ? 'Bu sınıf hedefler yalnızca Bortle 1–4 gökyüzünde çekilebilir.'
          : 'Gökyüzünüzü karartmadan bu hedefe girmeyin.'}
      </>
    );
  }

  return (
    <div className="dz-tool">
      <h4>Hesaplayıcı 3 — Entegrasyon planlayıcı</h4>
      <p className="dz-sub">
        Hedefinizi ve koşullarınızı seçin, ulaşmak istediğiniz SNR için gereken
        süreyi görün.
      </p>

      <div className="dz-grid">
        <div className="dz-fld">
          <label htmlFor="ip-obj">Hedef obje</label>
          <select
            id="ip-obj"
            value={objId}
            onChange={(e) => setObjId(e.target.value)}
          >
            {OBJECTS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.n}
              </option>
            ))}
          </select>
        </div>
        <div className="dz-fld">
          <label htmlFor="ip-b">Gökyüzü (Bortle)</label>
          <div className="dz-rng">
            <input
              id="ip-b"
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
          <label htmlFor="ip-ap">Teleskop açıklığı (mm)</label>
          <input
            id="ip-ap"
            type="number"
            step="5"
            min="20"
            value={ap}
            onChange={(e) => setAp(parseFloat(e.target.value))}
          />
        </div>
        <div className="dz-fld">
          <label htmlFor="ip-f">Odak oranı (f/)</label>
          <input
            id="ip-f"
            type="number"
            step="0.1"
            min="1"
            value={fr}
            onChange={(e) => setFr(parseFloat(e.target.value))}
          />
        </div>
        <div className="dz-fld">
          <label htmlFor="ip-px">Piksel boyutu (µm)</label>
          <input
            id="ip-px"
            type="number"
            step="0.01"
            min="0.5"
            value={px}
            onChange={(e) => setPx(parseFloat(e.target.value))}
          />
        </div>
        <div className="dz-fld">
          <label htmlFor="ip-filt">Filtre</label>
          <select
            id="ip-filt"
            value={filt}
            onChange={(e) => setFilt(e.target.value as FilterId)}
          >
            {(Object.keys(FILTERS) as FilterId[]).map((k) => (
              <option key={k} value={k}>
                {FILTERS[k].ad}
              </option>
            ))}
          </select>
        </div>
        <div className="dz-fld">
          <label htmlFor="ip-snr">Hedef SNR</label>
          <select
            id="ip-snr"
            value={target}
            onChange={(e) => setTarget(+e.target.value)}
          >
            {TARGETS.map((t) => (
              <option key={t[0]} value={t[0]}>
                {t[1]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="dz-out" aria-live="polite">
        <div className="dz-stat">
          <div className="dz-k">Gereken süre</div>
          <div className="dz-val" style={{ fontSize: 28 }}>
            {fmtDur(m.T)}
          </div>
        </div>
        <div className="dz-stat dz-sm">
          <div className="dz-k">
            Kaç gece <small>(5 sa/gece)</small>
          </div>
          <div className="dz-val">
            {m.T / 3600 / 5 < 1
              ? '1 gecenin bir kısmı'
              : Math.ceil(m.T / 3600 / 5) + ' gece'}
          </div>
        </div>
        <div className="dz-stat dz-sm">
          <div className="dz-k">Obje / gökyüzü</div>
          <div className="dz-val">
            {m.S / m.B >= 1
              ? (m.S / m.B).toFixed(1) + '×'
              : '1 / ' + (m.B / m.S).toFixed(0)}
          </div>
        </div>
        <div className="dz-stat dz-sm">
          <div className="dz-k">Bortle 3&apos;te sürerdi</div>
          <div className="dz-val">{fmtDur(m.Tdark)}</div>
        </div>
      </div>

      <div className="dz-verdict">
        {verdict}
        {!m.o.em && m.F.sky < 0.1 && (
          <p style={{ margin: '12px 0 0' }}>
            <b className="dz-bad">Uyarı:</b> {m.o.n} bir emisyon bulutsusu
            değil. Dar bant filtre objenin ışığını gökyüzü kadar kesiyor, net
            sonuç <b>kayıp</b>. Bu hedefte filtreyi kaldırın.
          </p>
        )}
      </div>
    </div>
  );
}

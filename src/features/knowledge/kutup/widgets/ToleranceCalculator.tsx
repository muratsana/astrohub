/**
 * HESAPLAYICI 1 — "ne kadar hassas olmalıyım?".
 *
 * Paketin `ToleranceCalculator.jsx` bileşeninin TSX karşılığı. Fizik
 * `../core`'dan geliyor; burada yalnızca arayüz var.
 */
import { useMemo, useState } from 'react';
import {
  D2R,
  BARRETT_K,
  DRIFT_PER_ARCMIN,
  SENSORS,
  sensorById,
  pixelScale,
  halfDiagDeg,
  fmtErr,
} from '../core';

const EXPOSURES: [number, string][] = [
  [30, '30 saniye'],
  [60, '60 saniye'],
  [120, '120 saniye'],
  [300, '300 saniye (5 dk)'],
  [600, '600 saniye (10 dk)'],
  [1200, '1200 saniye (20 dk)'],
];

const TOLS: [string, string][] = [
  ['0.5', 'Yarım piksel — çok titiz'],
  ['1', '1 piksel — makul'],
  ['2', '2 piksel — rahat'],
  ['fwhm', "Yıldız şişkinliğinin 1/3'ü"],
];

export function ToleranceCalculator() {
  const [fl, setFl] = useState(530);
  const [senId, setSenId] = useState('apsc');
  const [expS, setExpS] = useState(300);
  const [dec, setDec] = useState(45);
  const [tol, setTol] = useState('1');
  const [guideWhere, setGuideWhere] = useState('scope');

  const m = useMemo(() => {
    const F = Math.max(50, fl || 530);
    const sen = sensorById(senId);
    const scale = pixelScale(sen.px, F);
    /* Dönme merkezi rehber yıldızdır. Ayrı rehber teleskop eş eksenlidir →
       yıldız kadrajın ortasında, ψ ≈ yarım köşegen. OAG ise kadrajın
       DIŞINDAN ışık alır → karşı köşeye olan açı yaklaşık iki katına
       çıkar. */
    let psi = halfDiagDeg(sen.w, sen.h, F);
    if (guideWhere === 'oag') psi *= 2.0;

    const tauUm =
      tol === 'fwhm' ? ((2.6 / 3) / scale) * sen.px : parseFloat(tol) * sen.px;
    const tMin = expS / 60;
    const maxErr = (BARRETT_K * tauUm * Math.cos(dec * D2R)) / (tMin * F * psi);
    const perAxis = maxErr / Math.SQRT2;
    const tolArcsec = (tauUm / sen.px) * scale;
    const ungErr = tolArcsec / tMin / DRIFT_PER_ARCMIN;

    return { sen, scale, psi, maxErr, perAxis, tolArcsec, ungErr, tMin };
  }, [fl, senId, expS, dec, tol, guideWhere]);

  const verdict = useMemo(() => {
    const { maxErr, perAxis, tolArcsec, ungErr } = m;
    let head, body;
    if (maxErr > 30) {
      head = (
        <b className="dz-hd dz-ok">
          Bu kurulumda alan dönmesi sizin sorununuz değil.
        </b>
      );
      body = (
        <>
          {fmtErr(maxErr)} bile {tolArcsec.toFixed(2)}″ izin altında kalıyor.
          Kaba bir hizalama (polarscope, hatta pusula + enlem skalası)
          yeterli. Zamanınızı odağa ve guiding&apos;e harcayın.
        </>
      );
    } else if (maxErr > 8) {
      head = <b className="dz-hd dz-ok">Rahat bir hedef.</b>;
      body = (
        <>
          {fmtErr(maxErr)} altında kalmanız yeterli — yani eksen başına{' '}
          {fmtErr(perAxis)}. Herhangi bir plaka çözümlemeli araç bunu birkaç
          dakikada verir. Polarscope bile (kolimasyonu doğruysa) yetişir.
        </>
      );
    } else if (maxErr > 2) {
      head = <b className="dz-hd dz-mid">Dikkat gerektiriyor.</b>;
      body = (
        <>
          {fmtErr(maxErr)} toplam, eksen başına {fmtErr(perAxis)}. Bu,
          SharpCap/TPPA/ASIAIR sınıfı bir araç ve dikkatli bir ayar demektir.
          Polarscope tek başına riskli.
        </>
      );
    } else {
      head = <b className="dz-hd dz-bad">Zorlu.</b>;
      body = (
        <>
          Yalnızca {fmtErr(maxErr)} toleransınız var (eksen başına{' '}
          {fmtErr(perAxis)}).{' '}
          {dec > 60
            ? `Hedefiniz kutba çok yakın; dönme ${(1 / Math.cos(dec * D2R)).toFixed(1)} katına çıkıyor. `
            : ''}
          {expS >= 600 ? 'Pozunuz da çok uzun. ' : ''}
          Poz süresini yarıya indirmek toleransı iki katına çıkarır — çoğu
          zaman en kolay çözüm budur.
        </>
      );
    }

    return (
      <>
        {head}
        {body}
        {ungErr < maxErr / 3 && (
          <p>
            <b>Guiding yapmıyorsanız</b> asıl sınır sürüklenmedir:{' '}
            {fmtErr(ungErr)}. Alan dönmesi sınırından{' '}
            <b>{(maxErr / ungErr).toFixed(0)} kat</b> daha katı.
            Guiding&apos;in kutup hizalaması gereksinimini bu kadar
            gevşetmesinin sebebi budur.
          </p>
        )}
        {guideWhere === 'oag' && (
          <p>
            <b>Not:</b> OAG seçtiniz. Prizma ana kameranın görüş alanının{' '}
            <em>dışından</em> ışık aldığı için rehber yıldız kadrajın
            kenarındadır ve karşı köşeye olan dönme kolu (ψ) yaklaşık iki
            katına çıkar; tolerans da yarıya iner. Bu, OAG&apos;yi kötü
            yapmaz — diferansiyel esnemeyi tamamen ortadan kaldırır — ama
            alan dönmesi hesabında bunu unutmayın.
          </p>
        )}
      </>
    );
  }, [m, dec, expS, guideWhere]);

  return (
    <div className="dz-tool">
      <h4>Hesaplayıcı 1 — Ne kadar hassas olmalıyım?</h4>
      <p className="dz-sub">
        Ekipmanınızı ve hedefinizi girin; alan dönmesinin görünür hâle
        geleceği hata sınırını görün.
      </p>

      <div className="dz-grid">
        <div className="dz-fld">
          <label htmlFor="tc-fl">Odak uzunluğu (mm)</label>
          <input
            id="tc-fl"
            type="number"
            min="50"
            step="10"
            value={fl}
            onChange={(e) => setFl(parseFloat(e.target.value))}
          />
        </div>
        <div className="dz-fld">
          <label htmlFor="tc-sen">Sensör</label>
          <select
            id="tc-sen"
            value={senId}
            onChange={(e) => setSenId(e.target.value)}
          >
            {SENSORS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.ad}
              </option>
            ))}
          </select>
        </div>
        <div className="dz-fld">
          <label htmlFor="tc-exp">Tek poz süresi</label>
          <select
            id="tc-exp"
            value={expS}
            onChange={(e) => setExpS(+e.target.value)}
          >
            {EXPOSURES.map((x) => (
              <option key={x[0]} value={x[0]}>
                {x[1]}
              </option>
            ))}
          </select>
        </div>
        <div className="dz-fld">
          <label htmlFor="tc-dec">Hedefin deklinasyonu</label>
          <div className="dz-rng">
            <input
              id="tc-dec"
              type="range"
              min="-30"
              max="88"
              step="1"
              value={dec}
              onChange={(e) => setDec(+e.target.value)}
            />
            <span className="dz-v">
              {dec >= 0 ? '+' : ''}
              {dec}°
            </span>
          </div>
        </div>
        <div className="dz-fld">
          <label htmlFor="tc-tol">Kabul edilebilir iz</label>
          <select
            id="tc-tol"
            value={tol}
            onChange={(e) => setTol(e.target.value)}
          >
            {TOLS.map((t) => (
              <option key={t[0]} value={t[0]}>
                {t[1]}
              </option>
            ))}
          </select>
        </div>
        <div className="dz-fld">
          <label htmlFor="tc-guide">Guiding yöntemi</label>
          <select
            id="tc-guide"
            value={guideWhere}
            onChange={(e) => setGuideWhere(e.target.value)}
          >
            <option value="scope">Ayrı rehber teleskop (eş eksenli)</option>
            <option value="oag">OAG — kadrajın kenarından</option>
          </select>
        </div>
      </div>

      <div className="dz-out" aria-live="polite">
        <div className="dz-stat">
          <div className="dz-k">İzin verilen hata</div>
          <div className="dz-val">{fmtErr(m.maxErr)}</div>
        </div>
        <div className="dz-stat dz-sm">
          <div className="dz-k">Eksen başına</div>
          <div className="dz-val">{fmtErr(m.perAxis)}</div>
        </div>
        <div className="dz-stat dz-sm">
          <div className="dz-k">Piksel ölçeği</div>
          <div className="dz-val">
            {m.scale.toFixed(2)}
            <small> ″/px</small>
          </div>
        </div>
        <div className="dz-stat dz-sm">
          <div className="dz-k">Guiding&apos;siz sınır</div>
          <div className="dz-val">{fmtErr(m.ungErr)}</div>
        </div>
      </div>

      <div className="dz-verdict">{verdict}</div>

      <p className="dz-note">
        &quot;Eksen başına&quot; değeri, hatanın iki eksene eşit dağıldığı
        varsayımıyla toplam ÷ √2&apos;dir. Yazılımlar azimut ve yükseklik
        hatasını ayrı gösterdiği için ayarlarken bakacağınız sayı budur.
        &quot;Guiding&apos;siz sınır&quot;, aynı poz süresinde sürüklenmenin
        aynı toleransı aşmayacağı hatadır. Hesap, dönmenin en güçlü olduğu
        saat açısını (en kötü durumu) varsayar.
      </p>
    </div>
  );
}

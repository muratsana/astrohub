/**
 * HESAPLAYICI 2 — sürüklenmeden hataya.
 *
 * Paketin `DriftCalculator.jsx` bileşeninin TSX karşılığı.
 */
import { useMemo, useState } from 'react';
import { D2R, K_PHD2, DRIFT_PER_ARCMIN, pixelScale, fmtErr } from '../core';

export function DriftCalculator() {
  const [mode, setMode] = useState('px');
  const [amt, setAmt] = useState(1.5);
  const [mins, setMins] = useState(5);
  const [pxUm, setPxUm] = useState(3.75);
  const [fl, setFl] = useState(120);
  const [station, setStation] = useState('mer');
  const [dec, setDec] = useState(0);
  const [lat, setLat] = useState(40);

  const m = useMemo(() => {
    const A = Math.max(0, amt || 0);
    const T = Math.max(0.1, mins || 5);
    const P = Math.max(1, pxUm || 3.75);
    const F = Math.max(30, fl || 120);
    const L = Math.min(75, Math.max(0, lat || 40));
    const scale = pixelScale(P, F);
    const arcsec = mode === 'px' ? A * scale : A;
    const rate = arcsec / T;
    const errSky = rate / DRIFT_PER_ARCMIN;
    const knob =
      station === 'mer' ? errSky / Math.max(0.2, Math.cos(L * D2R)) : errSky;
    const phd = (K_PHD2 * rate) / Math.max(0.02, Math.cos(dec * D2R));
    return { scale, rate, errSky, knob, phd, L };
  }, [mode, amt, mins, pxUm, fl, station, dec, lat]);

  const axis = station === 'mer' ? 'azimut' : 'yükseklik';

  const verdict = useMemo(() => {
    const { rate, errSky, knob, phd, L } = m;
    let head;
    if (errSky < 1) head = <b className="dz-hd dz-ok">Zaten çok iyi.</b>;
    else if (errSky > 20) head = <b className="dz-hd dz-bad">Büyük bir hata.</b>;
    else head = <b className="dz-hd">Ölçüm sonucu.</b>;

    return (
      <>
        {head}
        Ölçtüğünüz <b>{rate.toFixed(2)} ″/dk</b> sürüklenme,{' '}
        <b>{fmtErr(errSky)}</b> {axis} hatasına karşılık geliyor.{' '}
        {station === 'mer' ? (
          <>
            Meridyende ölçtüğünüz için yükseklik hatası bu sonuca <em>hiç</em>{' '}
            karışmaz — okuduğunuz her şey azimuttandır. Ayar vidasında ise{' '}
            {fmtErr(knob)} hareket etmeniz gerekir (enlem {L}° için 1/cos
            düzeltmesi).
          </>
        ) : (
          <>
            Ufka yakın ölçtüğünüz için azimut hatası bu sonuca karışmaz —
            okuduğunuz her şey yükseklikten. Yükseklik ayarında ölçek
            düzeltmesi yoktur: {fmtErr(knob)} kadar oynatın ve{' '}
            <b>yukarı doğru bitirin</b>.
          </>
        )}
        {errSky < 1 && (
          <p>
            Bu seviyede ölçtüğünüz şey büyük ölçüde seeing ve montür periyodik
            hatasıdır. Daha fazla iyileştirme kovalamayın.
          </p>
        )}
        {errSky > 20 && (
          <p>
            Bu kadar büyük bir sapmayı tek seferde düzeltmeye çalışmak yerine
            kaba bir geçiş yapıp ölçümü tekrarlayın.
          </p>
        )}
        {Math.abs(dec) > 25 && (
          <p>
            <b>PHD2 farkı:</b> aynı sürüklenmeyi PHD2 Guiding Assistant{' '}
            <b>{fmtErr(phd)}</b> olarak bildirirdi, çünkü sonucu cos
            δ&apos;ya bölüyor. Deklinasyon {dec}°&apos;de bu{' '}
            <b>{(1 / Math.cos(dec * D2R)).toFixed(1)} kat</b> şişirme demek.
            Ölçümü ekvatora yakın tekrarlarsanız iki sayı çakışır.
          </p>
        )}
      </>
    );
  }, [m, station, dec, axis]);

  /* Piksel alanları yalnızca "piksel" modunda anlamlı; yay saniyesi
     modunda soluklaşıyorlar ama KALDIRILMIYOR — kaybolan alan düzeni
     zıplatır ve kullanıcı geri döndüğünde değerini arar. */
  const dim = { opacity: mode === 'px' ? 1 : 0.45 };

  return (
    <div className="dz-tool">
      <h4>Hesaplayıcı 2 — Sürüklenmeden hataya</h4>
      <p className="dz-sub">
        Ölçtüğünüz kaymayı girin; hangi eksende ne kadar hatanız olduğunu
        görün.
      </p>

      <div className="dz-grid">
        <div className="dz-fld">
          <label htmlFor="dc-mode">Ölçüm birimi</label>
          <select
            id="dc-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="px">Piksel</option>
            <option value="as">Yay saniyesi</option>
          </select>
        </div>
        <div className="dz-fld">
          <label htmlFor="dc-amt">Kayma miktarı</label>
          <input
            id="dc-amt"
            type="number"
            step="0.5"
            min="0"
            value={amt}
            onChange={(e) => setAmt(parseFloat(e.target.value))}
          />
        </div>
        <div className="dz-fld">
          <label htmlFor="dc-min">Ölçüm süresi (dakika)</label>
          <input
            id="dc-min"
            type="number"
            step="0.5"
            min="0.5"
            value={mins}
            onChange={(e) => setMins(parseFloat(e.target.value))}
          />
        </div>
        <div className="dz-fld" style={dim}>
          <label htmlFor="dc-px">Rehber piksel boyutu (µm)</label>
          <input
            id="dc-px"
            type="number"
            step="0.05"
            min="1"
            value={pxUm}
            onChange={(e) => setPxUm(parseFloat(e.target.value))}
          />
        </div>
        <div className="dz-fld" style={dim}>
          <label htmlFor="dc-fl">Rehber odak uzunluğu (mm)</label>
          <input
            id="dc-fl"
            type="number"
            step="10"
            min="30"
            value={fl}
            onChange={(e) => setFl(parseFloat(e.target.value))}
          />
        </div>
        <div className="dz-fld">
          <label htmlFor="dc-sta">Nerede ölçtünüz?</label>
          <select
            id="dc-sta"
            value={station}
            onChange={(e) => setStation(e.target.value)}
          >
            <option value="mer">Meridyen + ekvator → azimut hatası</option>
            <option value="hor">Doğu/batı ufku → yükseklik hatası</option>
          </select>
        </div>
        <div className="dz-fld">
          <label htmlFor="dc-dec">Rehber yıldızın deklinasyonu</label>
          <div className="dz-rng">
            <input
              id="dc-dec"
              type="range"
              min="-40"
              max="85"
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
          <label htmlFor="dc-lat">Enlem (°)</label>
          <input
            id="dc-lat"
            type="number"
            min="0"
            max="75"
            step="1"
            value={lat}
            onChange={(e) => setLat(parseFloat(e.target.value))}
          />
        </div>
      </div>

      <div className="dz-out" aria-live="polite">
        <div className="dz-stat">
          <div className="dz-k">Bu eksendeki hata</div>
          <div className="dz-val">{fmtErr(m.errSky)}</div>
        </div>
        <div className="dz-stat dz-sm">
          <div className="dz-k">Sürüklenme hızı</div>
          <div className="dz-val">
            {m.rate.toFixed(2)}
            <small> ″/dk</small>
          </div>
        </div>
        <div className="dz-stat dz-sm">
          <div className="dz-k">Ayar vidasında</div>
          <div className="dz-val">{fmtErr(m.knob)}</div>
        </div>
        <div className="dz-stat dz-sm">
          <div className="dz-k">PHD2 ne derdi</div>
          <div className="dz-val">{fmtErr(m.phd)}</div>
        </div>
      </div>

      <div className="dz-verdict">{verdict}</div>

      <p className="dz-note">
        &quot;Ayar vidasında&quot; değeri, azimut için <code>cos(enlem)</code>{' '}
        düzeltmesini içerir: gökyüzünde 1′ oynatmak için vidayı 1/cos(enlem)
        kadar çevirmeniz gerekir. Yükseklik ayarında böyle bir çarpan yoktur.
      </p>
    </div>
  );
}

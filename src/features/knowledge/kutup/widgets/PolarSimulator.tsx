/**
 * SİMÜLATÖR — hizalama hatasının kareye yansıması.
 *
 * Paketin `PolarSimulator.jsx` bileşeninin TSX karşılığı. İki tuval
 * (guiding kapalı / açık) ve bir PHD2 grafiği aynı hesaptan besleniyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TUVAL SUNUCUDA ÇİZİLMİYOR
 *
 * Sayfa ön-derlemeden (prerender) geçiyor ve orada `document` yok. Çizim
 * `useEffect` içinde, yani yalnızca tarayıcıda çalışıyor; sunucu tarafında
 * tuvaller boş kalıyor ve ilk boyamada doluyor. Yıldız damgası (`sprite`)
 * da bu yüzden modül düzeyinde değil, çizim anında üretiliyor —
 * `document.createElement` modül yüklenirken çağrılsaydı ön-derleme
 * düşerdi.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  D2R,
  K_PHD2,
  SENSORS,
  TARGETS,
  targetById,
  sensorById,
  errorVector,
  decDrift,
  raDrift,
  fieldRotation,
  pixelScale,
  fmtErr,
  makeTrace,
  mulberry32,
} from '../core';
import { PhdGraph, PhdLegend } from './PhdGraph';

const EXPOSURES: [number, string][] = [
  [60, '60 saniye'],
  [120, '120 saniye'],
  [300, '300 saniye (5 dk)'],
  [600, '600 saniye (10 dk)'],
  [1200, '1200 saniye (20 dk)'],
];

/** Kesit boyutu: 240 görüntü pikseli, 2× örneklenmiş tuval. */
const CROP_PX = 240;
const UP = 2;

const STARS = (() => {
  const r = mulberry32(99);
  const a: { x: number; y: number; b: number }[] = [];
  for (let i = 0; i < 44; i++) {
    a.push({ x: r() - 0.5, y: r() - 0.5, b: Math.pow(r(), 2.1) * 0.95 + 0.09 });
  }
  return a;
})();

let damga: HTMLCanvasElement | null = null;
let damgaR = 0;

/** Yıldız damgası — her kare için yeniden çizmek yerine bir kez üretilir. */
function sprite(r: number): HTMLCanvasElement {
  if (damga && damgaR === r) return damga;
  damgaR = r;
  const c = document.createElement('canvas');
  c.width = c.height = r * 2 + 2;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(r + 1, r + 1, 0, r + 1, r + 1, r);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.22, 'rgba(255,255,252,0.62)');
  gr.addColorStop(0.5, 'rgba(255,255,248,0.16)');
  gr.addColorStop(0.78, 'rgba(255,255,248,0.03)');
  gr.addColorStop(1, 'rgba(255,255,248,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, c.width, c.height);
  damga = c;
  return c;
}

interface CropParams {
  scale: number;
  fwhm: number;
  rot: number;
  driftX: number;
  driftY: number;
  ccx: number;
  ccy: number;
  guided: boolean;
}

function renderCrop(cv: HTMLCanvasElement | null, p: CropParams) {
  if (!cv) return;
  const S = cv.width;
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#07070a';
  ctx.fillRect(0, 0, S, S);
  ctx.globalCompositeOperation = 'lighter';

  const cropHalf = (S / 2) * p.scale;
  const fwhmPx = Math.max(1.6, p.fwhm / p.scale);
  const R = Math.max(4, Math.round(fwhmPx * 2.1));
  const sp = sprite(R);

  const maxTrail =
    Math.hypot(p.driftX, p.driftY) + Math.abs(p.rot) * Math.hypot(p.ccx, p.ccy);
  const K = Math.max(6, Math.min(70, Math.ceil((maxTrail / p.scale) * 2.5) + 6));

  for (let i = 0; i < STARS.length; i++) {
    const st = STARS[i];
    const bx = p.ccx + st.x * cropHalf * 2;
    const by = p.ccy + st.y * cropHalf * 2;
    const amp = (st.b / K) * 1.5;
    for (let k = 0; k < K; k++) {
      const f = K === 1 ? 0 : k / (K - 1);
      const th = p.rot * f;
      let rx = bx * Math.cos(th) - by * Math.sin(th);
      let ry = bx * Math.sin(th) + by * Math.cos(th);
      if (!p.guided) {
        rx += p.driftX * f;
        ry += p.driftY * f;
      }
      const sx = (rx - p.ccx) / p.scale + S / 2;
      const sy = (ry - p.ccy) / p.scale + S / 2;
      if (sx < -R || sx > S + R || sy < -R || sy > S + R) continue;
      ctx.globalAlpha = Math.min(1, amp);
      ctx.drawImage(sp, sx - R - 1, sy - R - 1);
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = 'rgba(255,255,255,.10)';
  ctx.strokeRect(0.5, 0.5, S - 1, S - 1);
}

export function PolarSimulator() {
  const [err, setErr] = useState(8);
  const [dir, setDir] = useState('mix');
  const [tgtId, setTgtId] = useState('m81');
  const [ha, setHa] = useState(1);
  const [expS, setExpS] = useState(300);
  const [fl, setFl] = useState(530);
  const [senId, setSenId] = useState('apsc');
  const [lat, setLat] = useState(40);
  const [guided, setGuided] = useState(true);

  const cUn = useRef<HTMLCanvasElement>(null);
  const cGu = useRef<HTMLCanvasElement>(null);

  const m = useMemo(() => {
    const tgt = targetById(tgtId);
    const sen = sensorById(senId);
    const F = Math.max(50, fl || 530);
    const L = Math.min(75, Math.max(0, lat || 40));
    const cl = Math.max(0.2, Math.cos(L * D2R));

    let alt = 0,
      az = 0;
    if (dir === 'alt') alt = err;
    else if (dir === 'az') az = err / cl;
    else {
      alt = err / Math.SQRT2;
      az = err / Math.SQRT2 / cl;
    }

    const v = errorVector(alt, az, L);
    const dd = decDrift(v.a, v.b, ha);
    const dr = raDrift(v.a, v.b, ha, tgt.dec);
    const fr = fieldRotation(v.a, v.b, ha, tgt.dec);

    const tMin = expS / 60;
    const scale = pixelScale(sen.px, F);
    const halfDiagArcsec = ((Math.hypot(sen.w, sen.h) / 2 / F) * 206265);
    const rotRad = (fr * tMin) / 206265;
    const cornerTrail = Math.abs(rotRad) * halfDiagArcsec;

    const cropHalf = (CROP_PX / 2) * scale;
    const ccx = Math.max(0, (sen.w / 2 / F) * 206265 - cropHalf);
    const ccy = Math.max(0, (sen.h / 2 / F) * 206265 - cropHalf);

    return {
      tgt,
      sen,
      scale,
      dd,
      dr,
      fr,
      tMin,
      rotRad,
      cornerTrail,
      ccx,
      ccy,
      trailPx: cornerTrail / scale,
      driftTotPx: (Math.hypot(dd, dr) * tMin) / scale,
      phdErr:
        (K_PHD2 * Math.abs(dd)) / Math.max(0.02, Math.cos(tgt.dec * D2R)),
    };
  }, [err, dir, tgtId, ha, expS, fl, senId, lat]);

  useEffect(() => {
    const common = {
      scale: m.scale / UP,
      fwhm: 2.6,
      rot: m.rotRad,
      driftX: m.dr * m.tMin,
      driftY: m.dd * m.tMin,
      ccx: m.ccx,
      ccy: m.ccy,
    };
    const raf = requestAnimationFrame(() => {
      renderCrop(cUn.current, { ...common, guided: false });
      renderCrop(cGu.current, { ...common, guided: true });
    });
    return () => cancelAnimationFrame(raf);
  }, [m]);

  const trace = useMemo(
    () =>
      makeTrace({
        n: 130,
        expSec: 2,
        decRate: m.dd,
        raRate: guided ? 0 : m.dr,
        guided,
        pe: guided ? 0.35 : 1.1,
        seed: 4242,
      }),
    [m.dd, m.dr, guided]
  );

  const verdict = useMemo(() => {
    const px = m.trailPx;
    let head, body;
    if (px < 0.35) {
      head = <b className="dz-hd dz-ok">Bu hata sizi hiç etkilemiyor.</b>;
      body = (
        <>
          Köşedeki iz {px.toFixed(2)} piksel — yıldız şişkinliğinin çok
          altında. Guiding açıkken bu kareyi kusursuz sayabilirsiniz. Kutup
          hizalamasına daha fazla zaman ayırmanın hiçbir getirisi yok.
        </>
      );
    } else if (px < 1) {
      head = <b className="dz-hd dz-ok">Sınırda ama sorun değil.</b>;
      body = (
        <>
          Köşede {px.toFixed(2)} piksellik dönme izi var. Tek karede fark
          edilmez; ancak gece boyunca biriken dönme yüzünden yığınlama
          sırasında köşelerden bir miktar kırpma yapmanız gerekebilir.
        </>
      );
    } else if (px < 2.5) {
      head = <b className="dz-hd dz-mid">Köşelerde görünür.</b>;
      body = (
        <>
          {px.toFixed(1)} piksellik iz, sıkı bir incelemede fark edilir.
          Hatayı yarıya indirirseniz iz de yarıya iner — dönme hatayla doğru
          orantılıdır. Ya da poz sürenizi kısaltın: iz süreyle de doğru
          orantılı.
        </>
      );
    } else {
      head = <b className="dz-hd dz-bad">Kare bozuluyor.</b>;
      body = (
        <>
          Köşede {px.toFixed(1)} piksellik dönme izi var ve guiding bunu
          düzeltemez.{' '}
          {m.tgt.dec > 60
            ? `Hedefiniz kutba çok yakın (δ ${m.tgt.dec.toFixed(0)}°), bu yüzden dönme ${(1 / Math.cos(m.tgt.dec * D2R)).toFixed(1)} katına çıkıyor. `
            : ''}
          Hizalamayı düzeltin ya da poz süresini kısaltın.
        </>
      );
    }

    let extra: ReactNode;
    if (!guided) {
      extra = (
        <p>
          <b>Grafik ölçüm modunda:</b> DEC eğilim çizgisinin eğimi{' '}
          {Math.abs(m.dd).toFixed(2)} ″/dk. Bunu 3.82 ile çarpınca{' '}
          {fmtErr(K_PHD2 * Math.abs(m.dd))} çıkıyor — PHD2 Guiding Assistant
          tam olarak bunu yapar.
        </p>
      );
    } else {
      let pos = 0,
        neg = 0;
      trace.corr.forEach((c) => {
        if (c > 0) pos++;
        else if (c < 0) neg++;
      });
      const frac = pos + neg ? Math.max(pos, neg) / (pos + neg) : 0;
      extra =
        frac > 0.65 && pos + neg > 6 ? (
          <p>
            <b>Grafikteki imza:</b> DEC düzeltme darbelerinin{' '}
            <b>%{Math.round(frac * 100)}&apos;i aynı yönde</b>. Bu tek başına
            bir sorun değil — hatta deklinasyon boşluğunu devre dışı bırakır.
            Sorun, meridyen dönüşünde bu yönün tersine dönmesi ve o anda
            boşluğun devreye girmesidir.
          </p>
        ) : (
          <p>
            <b>Grafikte belirgin bir imza yok.</b> Bu sürüklenme hızında (
            {Math.abs(m.dd).toFixed(2)} ″/dk) guiding hatayı seeing
            gürültüsünün içinde rahatça yutuyor ve düzeltme darbeleri iki yöne
            de dağılıyor. Hatayı ölçmek istiyorsanız guiding&apos;i kapatmanız
            gerekir — Guiding Assistant tam olarak bunu yapar.
          </p>
        );
    }
    return (
      <>
        {head}
        {body}
        {extra}
      </>
    );
  }, [m, guided, trace]);

  return (
    <div className="dz-tool">
      <h4>Simülatör — hata kareye nasıl yansıyor?</h4>
      <p className="dz-sub">
        Ayarları değiştirin; iki kare ve PHD2 grafiği anında yeniden
        hesaplanır.
      </p>

      <div className="dz-grid">
        <div className="dz-fld">
          <label htmlFor="ps-err">Kutup hizalama hatası</label>
          <div className="dz-rng">
            <input
              id="ps-err"
              type="range"
              min="0"
              max="30"
              step="0.5"
              value={err}
              onChange={(e) => setErr(+e.target.value)}
            />
            <span className="dz-v">{err.toFixed(1)}′</span>
          </div>
        </div>
        <div className="dz-fld">
          <label htmlFor="ps-dir">Hatanın yönü</label>
          <select
            id="ps-dir"
            value={dir}
            onChange={(e) => setDir(e.target.value)}
          >
            <option value="alt">Tamamı yükseklik hatası</option>
            <option value="az">Tamamı azimut hatası</option>
            <option value="mix">Yarı yarıya (gerçekçi)</option>
          </select>
        </div>
        <div className="dz-fld">
          <label htmlFor="ps-tgt">Hedef</label>
          <select
            id="ps-tgt"
            value={tgtId}
            onChange={(e) => setTgtId(e.target.value)}
          >
            {TARGETS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.ad} · δ {t.dec >= 0 ? '+' : ''}
                {t.dec.toFixed(0)}°
              </option>
            ))}
          </select>
        </div>
        <div className="dz-fld">
          <label htmlFor="ps-ha">Saat açısı</label>
          <div className="dz-rng">
            <input
              id="ps-ha"
              type="range"
              min="-6"
              max="6"
              step="0.25"
              value={ha}
              onChange={(e) => setHa(+e.target.value)}
            />
            <span className="dz-v">
              {ha >= 0 ? '+' : ''}
              {ha.toFixed(1)} s
            </span>
          </div>
        </div>
        <div className="dz-fld">
          <label htmlFor="ps-exp">Poz süresi</label>
          <select
            id="ps-exp"
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
          <label htmlFor="ps-fl">Odak uzunluğu (mm)</label>
          <input
            id="ps-fl"
            type="number"
            min="50"
            step="10"
            value={fl}
            onChange={(e) => setFl(parseFloat(e.target.value))}
          />
        </div>
        <div className="dz-fld">
          <label htmlFor="ps-sen">Sensör</label>
          <select
            id="ps-sen"
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
          <label htmlFor="ps-lat">Enlem (°)</label>
          <input
            id="ps-lat"
            type="number"
            min="0"
            max="75"
            step="1"
            value={lat}
            onChange={(e) => setLat(parseFloat(e.target.value))}
          />
        </div>
      </div>

      <div className="dz-panels">
        <div>
          <canvas
            ref={cUn}
            width={CROP_PX * UP}
            height={CROP_PX * UP}
            aria-label="Guiding kapalıyken kare"
          />
          <div className="dz-pcap">
            <b>Guiding kapalı</b>
            <br />
            Sürüklenme + dönme birlikte:{' '}
            <b>{m.driftTotPx.toFixed(1)} piksel</b> iz.
            <br />
            Kadrajın köşesinden {CROP_PX}×{CROP_PX} piksellik kesit (1:1).
          </div>
        </div>
        <div>
          <canvas
            ref={cGu}
            width={CROP_PX * UP}
            height={CROP_PX * UP}
            aria-label="Guiding açıkken kare"
          />
          <div className="dz-pcap">
            <b className="dz-hl">Guiding açık</b>
            <br />
            Sürüklenme silindi. Kalan: <b>{m.cornerTrail.toFixed(2)}″</b> ={' '}
            <b>{m.trailPx.toFixed(2)} piksel</b> alan dönmesi.
            <br />
            Aynı kesit, aynı ölçek.
          </div>
        </div>
      </div>

      <p className="dz-note">
        Her iki panel de kadrajınızın{' '}
        <b>
          köşesinden alınmış {CROP_PX}×{CROP_PX} piksellik bir kesittir
        </b>{' '}
        ve gerçek piksel ölçeğinde çizilir — izler abartılmamıştır. Köşeyi
        seçmemizin sebebi, alan dönmesinin izinin orada en uzun olmasıdır;
        kadrajın ortasında hemen hemen hiçbir şey görünmez. Dönme merkezi
        (rehber yıldız) kadrajın ortasındadır, yani bu kesitin dışındadır.
      </p>

      <div className="dz-phdbox">
        <div className="dz-phdhead">
          PHD2 guiding grafiği —{' '}
          {guided ? 'guiding açık' : 'guiding kapalı (ölçüm modu)'}
        </div>
        <PhdGraph series={trace} xlabel="~4.3 dakika" />
        <PhdLegend />
      </div>

      <div className="dz-pillrow">
        <button
          type="button"
          className={'dz-pill' + (guided ? ' dz-on' : '')}
          aria-pressed={guided}
          onClick={() => setGuided(true)}
        >
          Guiding açık
        </button>
        <button
          type="button"
          className={'dz-pill' + (!guided ? ' dz-on' : '')}
          aria-pressed={!guided}
          onClick={() => setGuided(false)}
        >
          Guiding kapalı (ölçüm modu)
        </button>
      </div>

      <div className="dz-out" aria-live="polite">
        <div className="dz-stat">
          <div className="dz-k">DEC sürüklenmesi</div>
          <div className="dz-val">
            {Math.abs(m.dd).toFixed(2)}
            <small> ″/dk</small>
          </div>
        </div>
        <div className="dz-stat dz-sm">
          <div className="dz-k">Alan dönmesi</div>
          <div className="dz-val">
            {Math.abs(m.fr * m.tMin).toFixed(1)}
            <small>″</small>
          </div>
        </div>
        <div className="dz-stat dz-sm">
          <div className="dz-k">Köşede iz</div>
          <div className="dz-val">
            {m.trailPx.toFixed(2)}
            <small> px</small>
          </div>
        </div>
        <div className="dz-stat dz-sm">
          <div className="dz-k">PHD2 ne derdi</div>
          <div className="dz-val">{fmtErr(m.phdErr)}</div>
        </div>
      </div>

      <div className="dz-verdict">{verdict}</div>
    </div>
  );
}

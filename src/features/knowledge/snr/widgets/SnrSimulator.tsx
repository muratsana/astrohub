/**
 * SNR SİMÜLATÖRÜ — üç panel + gürültü bütçesi.
 *
 * Paketin `SnrSimulator.jsx` bileşeninin TSX karşılığı.
 *
 * Üç canvas AYNI şekil haritasından çiziliyor: gürültüsüz referans, tek
 * kare ve yığın. Rastgelelik deterministik (`mulberry32`), yani aynı
 * ayarlar her açılışta aynı görüntüyü veriyor — kullanıcı iki ayarı
 * karşılaştırırken aradaki farkın gürültü çekilişinden değil ayardan
 * geldiğinden emin olabilsin.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  OBJECTS,
  objById,
  BORTLE,
  FILTERS,
  DARKRATE,
  rate,
  snrOf,
  buildRateMap,
  renderToCanvas,
  noiseBudget,
  fmtDur,
  f2,
  type FilterId,
  type NoiseBudget,
} from '../core';

const SUBS = [15, 30, 60, 120, 300, 600];
const CAMS = [
  ['1.5', 'Modern CMOS — okuma gürültüsü 1.5 e⁻'],
  ['3.45', 'CMOS düşük gain — 3.45 e⁻'],
  ['9', 'Eski CCD (KAF-8300) — 9 e⁻'],
  ['13', 'Eski CCD (KAI-11002) — 13 e⁻'],
];

function BudgetBar({ b }: { b: NoiseBudget }) {
  const parts: [number, string][] = [
    [b.obj, '#3987e5'],
    [b.sky, '#d95926'],
    [b.dark, '#199e70'],
    [b.read, '#c98500'],
  ];
  let x = 0;
  return (
    <svg
      viewBox="0 0 720 74"
      style={{ display: 'block', width: '100%', height: 'auto' }}
      role="img"
      aria-label="Gürültü bütçesi"
    >
      {parts.map((p, i) => {
        const w = 720 * p[0];
        const el =
          w <= 0 ? null : (
            <g key={i}>
              <rect
                x={x + (x > 0 ? 1 : 0)}
                y={0}
                width={Math.max(0, w - (x > 0 ? 1 : 0))}
                height={30}
                rx={3}
                fill={p[1]}
              />
              {w > 52 ? (
                <text
                  x={x + w / 2}
                  y={20}
                  fill="#0d0d0d"
                  fontSize="13"
                  fontWeight="700"
                  fontFamily="system-ui"
                  textAnchor="middle"
                >
                  {(100 * p[0]).toFixed(0)}%
                </text>
              ) : w > 16 ? (
                <text
                  x={x + w / 2}
                  y={48}
                  fill={p[1]}
                  fontSize="11.5"
                  fontWeight="700"
                  fontFamily="system-ui"
                  textAnchor="middle"
                >
                  {(100 * p[0]).toFixed(0)}%
                </text>
              ) : null}
            </g>
          );
        x += w;
        return el;
      })}
    </svg>
  );
}

export function SnrSimulator() {
  const [objId, setObjId] = useState('m42');
  const [bortle, setBortle] = useState(5);
  const [n, setN] = useState(36);
  const [t, setT] = useState(300);
  const [rn, setRn] = useState(1.5);
  const [filt, setFilt] = useState<FilterId>('none');
  /* Panellerin sonucu ilk çizim tamamlanana kadar YOK: `null` bilinçli.
     Sıfırlarla başlatmak, bir kare boyunca "SNR 0" yazmak olurdu. */
  const [res, setRes] = useState<{
    snr: number;
    snr1: number;
    budget: NoiseBudget;
  } | null>(null);

  const cTrue = useRef(null),
    cOne = useRef(null),
    cStack = useRef(null);

  const model = useMemo(() => {
    const o = objById(objId);
    const F = FILTERS[filt];
    const S = rate(o.sb) * (o.em ? F.em : F.broad);
    const B = rate(BORTLE[bortle]) * F.sky;
    const T = n * t;
    return { o, S, B, T, D: DARKRATE };
  }, [objId, bortle, n, t, filt]);

  useEffect(() => {
    const { o, S, B, T, D } = model;
    const raf = requestAnimationFrame(() => {
      const rm = buildRateMap(S, o.sh);
      const refPeak = S * rm.peak * T;
      renderToCanvas(cTrue.current, rm.map, T, 0, rn, B, D, refPeak);
      renderToCanvas(cOne.current, rm.map, t, 1, rn, B, D, S * rm.peak * t);
      renderToCanvas(cStack.current, rm.map, T, n, rn, B, D, refPeak);
      setRes({
        snr: snrOf(S, B, T, n, rn, D),
        snr1: snrOf(S, B, t, 1, rn, D),
        budget: noiseBudget(S, B, D, T, n, rn),
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [model, rn, n, t]);

  const { o, S, B, T } = model;

  const msg = useMemo(() => {
    if (!res) return 'Hesaplanıyor…';
    const { snr, budget } = res;
    let m;
    if (snr < 1.5) {
      m = (
        <>
          <b className="dz-bad">Bu koşullarda çıkmaz.</b> SNR {f2(snr)} — obje
          gürültünün içinde kayboluyor.{' '}
          {o.sb > 23 ? 'Bu obje zaten çok sönük; ' : ''}Gökyüzünü karartmak süre
          eklemekten <b>çok</b> daha etkili olur.
        </>
      );
    } else if (snr < 4) {
      m = (
        <>
          <b className="dz-mid">Zar zor tespit.</b> SNR {snr.toFixed(1)}.
          Objenin orada olduğunu görürsünüz ama işlenebilir bir fotoğraf çıkmaz.
          SNR&apos;ı iki katına çıkarmak için toplam süreyi <b>4 katına</b> (
          {fmtDur(T * 4)}) çıkarmanız gerekir.
        </>
      );
    } else if (snr < 12) {
      m = (
        <>
          <b className="dz-mid">İşlenebilir ama gürültülü.</b> SNR{' '}
          {snr.toFixed(1)}. Gürültü azaltma şart olacak. SNR 20&apos;ye ulaşmak
          için toplam süre <b>{fmtDur(T * Math.pow(20 / snr, 2))}</b> olmalı.
        </>
      );
    } else if (snr < 30) {
      m = (
        <>
          <b className="dz-ok">İyi.</b> SNR {snr.toFixed(1)} — rahat işlenir,
          temiz bir sonuç. Buradan sonrası azalan getiri: iki kat daha iyi için{' '}
          {fmtDur(T * 4)} gerekir.
        </>
      );
    } else {
      m = (
        <>
          <b className="dz-ok">Çok iyi.</b> SNR {Math.round(snr)}. Bu objede
          gürültü artık sorununuz değil; dinamik aralık, yıldız şişkinliği ve
          işleme kalitesi ön plana çıkar.
        </>
      );
    }
    let extra = null;
    if (budget.read > 0.3) {
      extra = (
        <>
          <br />
          <br />
          <b style={{ color: '#c98500' }}>Dikkat:</b> gürültünüzün %
          {Math.round(budget.read * 100)}
          &apos;i <b>okuma gürültüsünden</b> geliyor. Poz süreniz bu kamera ve
          gökyüzü için çok kısa.
        </>
      );
    } else if (budget.sky > 0.85 && o.sb > 21) {
      extra = (
        <>
          <br />
          <br />
          Gürültünüzün %{Math.round(budget.sky * 100)}&apos;i <b>gökyüzünden</b>{' '}
          geliyor. Kamera değiştirmenin buna hiçbir faydası olmaz — çözüm daha
          karanlık gökyüzü, uygun filtre veya daha çok süre.
        </>
      );
    }
    return (
      <>
        {m}
        {extra}
      </>
    );
  }, [res, o, T]);

  return (
    <div className="dz-tool">
      <h4>SNR simülatörü</h4>
      <p className="dz-sub">
        80 mm f/6 · 3.76 µm piksel · 1.62″/px. Ayarları değiştirin, üç panel
        anında yeniden hesaplanır.
      </p>

      <div className="dz-grid" style={{ marginBottom: 18 }}>
        <div className="dz-fld">
          <label htmlFor="sn-obj">Hedef obje</label>
          <select
            id="sn-obj"
            value={objId}
            onChange={(e) => setObjId(e.target.value)}
          >
            {OBJECTS.map((x) => (
              <option key={x.id} value={x.id}>
                {x.n} · YP {x.sb.toFixed(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="dz-fld">
          <label htmlFor="sn-b">Gökyüzü (Bortle)</label>
          <div className="dz-rng">
            <input
              id="sn-b"
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
          <label htmlFor="sn-n">Kare sayısı</label>
          <div className="dz-rng">
            <input
              id="sn-n"
              type="range"
              min="1"
              max="240"
              step="1"
              value={n}
              onChange={(e) => setN(+e.target.value)}
            />
            <span className="dz-v">{n}</span>
          </div>
        </div>
        <div className="dz-fld">
          <label htmlFor="sn-t">Poz süresi (kare başına)</label>
          <select id="sn-t" value={t} onChange={(e) => setT(+e.target.value)}>
            {SUBS.map((v) => (
              <option key={v} value={v}>
                {v < 60 ? v + ' saniye' : v + ' saniye (' + v / 60 + ' dk)'}
              </option>
            ))}
          </select>
        </div>
        <div className="dz-fld">
          <label htmlFor="sn-cam">Kamera</label>
          <select
            id="sn-cam"
            value={rn}
            onChange={(e) => setRn(+e.target.value)}
          >
            {CAMS.map((c) => (
              <option key={c[0]} value={c[0]}>
                {c[1]}
              </option>
            ))}
          </select>
        </div>
        <div className="dz-fld">
          <label htmlFor="sn-f">Filtre</label>
          <select
            id="sn-f"
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
      </div>

      <div className="dz-panels">
        <div>
          <canvas
            ref={cTrue}
            width={116}
            height={116}
            aria-label="Gerçek obje"
          />
          <div className="dz-panel-cap">
            <b>Gerçek obje</b>
            <br />
            Gürültüsüz referans
          </div>
        </div>
        <div>
          <canvas ref={cOne} width={116} height={116} aria-label="Tek kare" />
          <div className="dz-panel-cap">
            <b>Tek kare</b>
            <br />
            {t} saniye · tek kare
          </div>
        </div>
        <div>
          <canvas
            ref={cStack}
            width={116}
            height={116}
            aria-label="Yığın sonucu"
          />
          <div className="dz-panel-cap">
            <b className="dz-hl">Yığın sonucu</b>
            <br />
            {n} kare · {fmtDur(T)}
          </div>
        </div>
      </div>

      <div className="dz-verdict" style={{ marginTop: 20 }} aria-live="polite">
        {msg}
      </div>

      <div
        className="dz-out"
        style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))' }}
      >
        <div className="dz-stat">
          <div className="dz-k">SNR (yığın)</div>
          <div className="dz-val">
            {res
              ? res.snr < 100
                ? res.snr.toFixed(1)
                : Math.round(res.snr)
              : '—'}
          </div>
        </div>
        <div className="dz-stat dz-sm">
          <div className="dz-k">Toplam süre</div>
          <div className="dz-val">{fmtDur(T)}</div>
        </div>
        <div className="dz-stat dz-sm">
          <div className="dz-k">Obje / gökyüzü</div>
          <div className="dz-val">
            {S / B >= 1
              ? (S / B).toFixed(1) + '×'
              : '1 / ' + (B / S).toFixed(0)}
          </div>
        </div>
        <div className="dz-stat dz-sm">
          <div className="dz-k">SNR (tek kare)</div>
          <div className="dz-val">
            {res ? (res.snr1 < 10 ? f2(res.snr1) : res.snr1.toFixed(1)) : '—'}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: '.09em',
            textTransform: 'uppercase',
            color: 'var(--dz-ink-3)',
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          Gürültü bütçesi — hangi kaynak ne kadar pay alıyor
        </div>
        {res ? <BudgetBar b={res.budget} /> : null}
        <div className="dz-legend" style={{ marginTop: 10 }}>
          <span>
            <i className="dz-sw" style={{ background: '#3987e5' }} />
            Objenin kendi foton gürültüsü
          </span>
          <span>
            <i className="dz-sw" style={{ background: '#d95926' }} />
            Gökyüzü
          </span>
          <span>
            <i className="dz-sw" style={{ background: '#199e70' }} />
            Karanlık akım
          </span>
          <span>
            <i className="dz-sw" style={{ background: '#c98500' }} />
            Okuma gürültüsü
          </span>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  buildSky,
  simulate,
  renderToCanvas,
  fmt,
  type DitherMode,
  type SimulateResult,
} from '../core';

/**
 * CANLI DRIZZLE SİMÜLATÖRÜ.
 *
 * Paketteki `DrizzleSimulator.jsx` bileşeninin TSX karşılığı. Gerçek
 * Fruchter & Hook algoritmasını tarayıcıda çalıştırır.
 *
 * PAHALI ADIM ÖNBELLEKTE: gökyüzü modeli yalnızca FWHM değişince yeniden
 * kuruluyor (`useMemo`), simülasyon ise `requestAnimationFrame` içinde —
 * sürgüyü sürerken her ara değerde tam hesap yapılmıyor.
 */

const FWHM_OPTS: [number, string][] = [
  [1.1, '1.1 px — ağır yetersiz'],
  [1.7, '1.7 px — yetersiz'],
  [2.6, '2.6 px — doğru örnekleme'],
  [4.2, '4.2 px — aşırı örnekleme'],
];

export function DrizzleSimulator() {
  const [n, setN] = useState(30);
  const [scale, setScale] = useState(2);
  const [pixfrac, setPixfrac] = useState(0.5);
  const [noise, setNoise] = useState(2);
  const [dither, setDither] = useState<DitherMode>(1);
  const [fwhm, setFwhm] = useState(1.1);
  const [res, setRes] = useState<SimulateResult | null>(null);

  const cTrue = useRef<HTMLCanvasElement>(null);
  const cRaw = useRef<HTMLCanvasElement>(null);
  const cStack = useRef<HTMLCanvasElement>(null);
  const cDriz = useRef<HTMLCanvasElement>(null);

  const sky = useMemo(() => buildSky(fwhm), [fwhm]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const r = simulate(sky, { frames: n, scale, pixfrac, noise, dither });
      renderToCanvas(cTrue.current, r.truth, r.OUT, r.OUT, r.tmax);
      renderToCanvas(cRaw.current, r.raw, r.GRID, r.GRID, r.tmax);
      renderToCanvas(cStack.current, r.stack, r.OUT, r.OUT, r.tmax);
      renderToCanvas(cDriz.current, r.drizzle, r.OUT, r.OUT, r.tmax);
      setRes(r);
    });
    return () => cancelAnimationFrame(raf);
  }, [sky, n, scale, pixfrac, noise, dither]);

  const msg: ReactNode = useMemo(() => {
    if (!res) return 'Hesaplanıyor…';
    if (dither === 0) {
      return (
        <>
          <b className="dz-bad">Dithering kapalı.</b> Bütün kareler aynı
          alt-piksel fazından örnekliyor. Kare sayısını artırmak gürültüyü
          azaltır ama <b>çözünürlüğe hiçbir katkı yapmaz</b> — drizzle paneli
          klasik yığından daha iyi değil, hatta{' '}
          {res.holePct > 1
            ? `delik deşik (%${fmt(res.holePct, 0)} boş piksel)`
            : 'sadece daha bloklu'}
          . İşte drizzle&apos;ın dithering&apos;e bağımlılığı budur.
        </>
      );
    }
    if (dither === 2) {
      return (
        <>
          <b className="dz-mid">Sadece tam piksel kayma.</b> Kareler kayıyor ama
          kesirli faz hep aynı: her kare gökyüzünü aynı ızgara hizasında
          örnekliyor. Yeni alt-piksel bilgisi gelmiyor, dolayısıyla drizzle yine
          çözünürlük kazandırmıyor. <b>Kaymanın kesirli olması şart.</b>
        </>
      );
    }
    if (fwhm >= 4.0) {
      return (
        <>
          <b className="dz-bad">Aşırı örneklenmiş veri.</b> Yıldızlar zaten çok
          piksele yayılmış; sensörde kaybolan bir detay yok. Drizzle paneliyle
          klasik yığın panelini karşılaştırın — fark neredeyse yok. Buna karşılık
          dosyanız {scale * scale} kat büyüdü ve gürültü korelasyonu R=
          {fmt(res.R)} oldu. <b>Bu durumda drizzle saf maliyettir.</b>
        </>
      );
    }
    if (res.holePct > 3) {
      return (
        <>
          <b className="dz-mid">
            Çıktıda %{fmt(res.holePct, 1)} boş piksel var.
          </b>{' '}
          Damla (pixfrac={fmt(pixfrac)}) bu kare sayısı için fazla küçük. İki
          çözüm: <b>pixfrac&apos;i yükseltin</b> ya da{' '}
          <b>kare sayısını artırın</b>. Gerçek işlemede bu delikler Moiré benzeri
          desenler olarak görünür.
        </>
      );
    }
    if (n < 8) {
      return (
        <>
          <b className="dz-mid">Kare sayısı çok az.</b> Drizzle çalışıyor ama
          yeterli alt-piksel pozisyonu yok; gürültü baskın. Kare sayısını artırıp
          farkı izleyin.
        </>
      );
    }
    return (
      <>
        <b className="dz-ok">Drizzle çalışıyor.</b> Drizzle panelini klasik
        yığınla karşılaştırın: yıldızlar daha sıkı, çapraz filament daha ince,
        sağ alttaki çift yıldız daha iyi ayrılmış. Bu detayın hiçbiri tek karede
        yoktu — {n} karenin farklı alt-piksel fazlarından yeniden
        yapılandırıldı. Gürültü korelasyonu R={fmt(res.R)}.
      </>
    );
  }, [res, dither, fwhm, n, pixfrac, scale]);

  const panels: [
    React.RefObject<HTMLCanvasElement | null>,
    string,
    string,
    boolean,
  ][] = [
    [cTrue, 'Gerçek gökyüzü', 'Sonsuz çözünürlüklü referans', false],
    [cRaw, 'Tek ham kare', 'Kameranızın gördüğü', false],
    [cStack, 'Klasik yığın + büyütme', 'Enterpolasyonla ölçeklenmiş', false],
    [cDriz, 'Drizzle çıktısı', 'Aynı veriden yeniden yapılandırma', true],
  ];

  return (
    <div className="dz-tool">
      <h3 className="dz-tool-title">Drizzle simülatörü</h3>
      <p className="dz-sub">
        Ayarları değiştirin, dört panel anlık olarak yeniden hesaplanır.
      </p>

      <div className="dz-grid dz-grid-sim">
        <div className="dz-fld">
          <label htmlFor="dz-sim-n">Kare sayısı</label>
          <div className="dz-rng">
            <input
              id="dz-sim-n"
              type="range"
              min="1"
              max="80"
              step="1"
              value={n}
              onChange={(e) => setN(parseInt(e.target.value, 10))}
            />
            <span className="dz-v">{n}</span>
          </div>
        </div>
        <div className="dz-fld">
          <label htmlFor="dz-sim-s">Drizzle ölçeği (scale)</label>
          <div className="dz-rng">
            <input
              id="dz-sim-s"
              type="range"
              min="1"
              max="3"
              step="1"
              value={scale}
              onChange={(e) => setScale(parseInt(e.target.value, 10))}
            />
            <span className="dz-v">{scale}×</span>
          </div>
        </div>
        <div className="dz-fld">
          <label htmlFor="dz-sim-p">pixfrac (damla boyutu)</label>
          <div className="dz-rng">
            <input
              id="dz-sim-p"
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={pixfrac}
              onChange={(e) => setPixfrac(parseFloat(e.target.value))}
            />
            <span className="dz-v">{fmt(pixfrac)}</span>
          </div>
        </div>
        <div className="dz-fld">
          <label htmlFor="dz-sim-no">Gürültü seviyesi</label>
          <div className="dz-rng">
            <input
              id="dz-sim-no"
              type="range"
              min="0"
              max="10"
              step="1"
              value={noise}
              onChange={(e) => setNoise(parseInt(e.target.value, 10))}
            />
            <span className="dz-v">{noise}</span>
          </div>
        </div>
        <div className="dz-fld">
          <label htmlFor="dz-sim-d">Dithering</label>
          <select
            id="dz-sim-d"
            value={dither}
            onChange={(e) =>
              setDither(parseInt(e.target.value, 10) as DitherMode)
            }
          >
            <option value={1}>Açık — rastgele alt-piksel kayma</option>
            <option value={0}>Kapalı — kareler üst üste</option>
            <option value={2}>Sadece tam piksel kayma</option>
          </select>
        </div>
        <div className="dz-fld">
          <label htmlFor="dz-sim-f">Örnekleme (yıldız FWHM)</label>
          <select
            id="dz-sim-f"
            value={fwhm}
            onChange={(e) => setFwhm(parseFloat(e.target.value))}
          >
            {FWHM_OPTS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="dz-panels">
        {panels.map(([ref, title, sub, hl]) => (
          <div key={title}>
            <canvas ref={ref} width={40} height={40} aria-label={title} />
            <div className="dz-panel-cap">
              <b className={hl ? 'dz-hl' : undefined}>{title}</b>
              <br />
              {sub}
            </div>
          </div>
        ))}
      </div>

      <div className="dz-verdict" aria-live="polite">
        {msg}
      </div>

      <div className="dz-out">
        <div className="dz-stat">
          <div className="dz-k">Boş kalan piksel</div>
          <div className="dz-val">
            {res ? fmt(res.holePct, 1) : '—'}
            <small>%</small>
          </div>
        </div>
        <div className="dz-stat">
          <div className="dz-k">Ortalama kapsama</div>
          <div className="dz-val">
            {res ? fmt(res.coverage, 1) : '—'}
            <small>×</small>
          </div>
        </div>
        <div className="dz-stat">
          {/* Kısa etiket bilinçli: "Gürültü korelasyonu R" dört sütunlu
              gösterge satırında iki satıra kırılıp değerlerin taban
              hizasını bozuyordu. */}
          <div className="dz-k">Korelasyon R</div>
          <div className="dz-val">{res ? fmt(res.R) : '—'}</div>
        </div>
        <div className="dz-stat">
          <div className="dz-k">Çıktı boyutu</div>
          <div className="dz-val">
            {scale * scale}
            <small>× dosya</small>
          </div>
        </div>
      </div>
    </div>
  );
}

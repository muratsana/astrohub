import { useMemo, useState, type ReactNode } from 'react';
import { imageScale, samplingVerdict, fmt, type SamplingVerdict } from '../core';

/**
 * HESAPLAYICI 1 — örnekleme durumu.
 *
 * İçerik paketindeki `SamplingCalculator.jsx` bileşeninin TSX karşılığı.
 * Metinler ve eşikler paketin doğrulanmış hâliyle aynı.
 */

const VERDICTS: Record<
  SamplingVerdict,
  { label: string; cls: string; body: ReactNode }
> = {
  'severe-under': {
    label: 'Ağır yetersiz',
    cls: 'dz-bad',
    body: (
      <>
        <b className="dz-ok">Drizzle güçlü aday.</b> Yıldızlarınız 1–2 piksele
        sıkışıyor; optiğinizin ürettiği detayın önemli kısmı sensörde
        kayboluyor. <b>2× drizzle, pixfrac 0.5</b> ile başlayın. Şartlar:
        rastgele dithering ve en az 20–30 kare.
      </>
    ),
  },
  under: {
    label: 'Yetersiz',
    cls: 'dz-mid',
    body: (
      <>
        <b className="dz-ok">Drizzle denemeye değer.</b> Nyquist eşiğinin
        altındasınız. <b>2× drizzle, pixfrac 0.5, Square kernel</b> ile deneyin
        ve drizzle&apos;lı / drizzle&apos;sız iki yığını yıldız FWHM&apos;si
        üzerinden karşılaştırın (SNR betiğiyle değil).
      </>
    ),
  },
  good: {
    label: 'Doğru örnekleme',
    cls: 'dz-ok',
    body: (
      <>
        <b>İdeal bölgedesiniz.</b> Ölçek büyüten drizzle size kayda değer bir
        çözünürlük kazandırmaz. Ama renkli (OSC/DSLR) kameranız varsa{' '}
        <b>1× CFA drizzle</b> hâlâ değerli: debayer artefaktlarını ve renk
        gürültüsünü temizler, çözünürlük iddiası taşımaz.
      </>
    ),
  },
  over: {
    label: 'Aşırı örnekleme',
    cls: 'dz-bad',
    body: (
      <>
        <b className="dz-bad">Drizzle yapmayın.</b> Aynı ışık zaten çok sayıda
        piksele bölünmüş durumda; ölçeği büyütmek yeni bilgi getirmez, sadece
        dosyanızı 4–9 kat şişirir ve gürültü korelasyonu ekler. Bunun yerine{' '}
        <b>binning</b>, daha kısa odak veya dekonvolüsyon düşünün.
      </>
    ),
  },
};

export function SamplingCalculator() {
  const [px, setPx] = useState(3.76);
  const [fl, setFl] = useState(400);
  const [bin, setBin] = useState(1);
  const [see, setSee] = useState(3.0);

  const { scale, fwhm, v } = useMemo(() => {
    const ok = px > 0 && fl > 0 && see > 0;
    const sc = ok ? imageScale(px, fl, bin) : NaN;
    const fw = ok ? see / sc : NaN;
    return {
      scale: sc,
      fwhm: fw,
      v: ok ? VERDICTS[samplingVerdict(fw)] : null,
    };
  }, [px, fl, bin, see]);

  return (
    <div className="dz-tool">
      <h3 className="dz-tool-title">Hesaplayıcı 1 — Örnekleme durumunuz</h3>
      <p className="dz-sub">
        Kameranızın piksel boyutunu, teleskobunuzun odak uzaklığını ve tipik
        seeing&apos;inizi girin.
      </p>

      <div className="dz-grid">
        <div className="dz-fld">
          <label htmlFor="dz-s-px">Piksel boyutu (µm)</label>
          <input
            id="dz-s-px"
            type="number"
            step="0.01"
            min="0.5"
            value={px}
            onChange={(e) => setPx(parseFloat(e.target.value))}
          />
        </div>
        <div className="dz-fld">
          <label htmlFor="dz-s-fl">Odak uzaklığı (mm)</label>
          <input
            id="dz-s-fl"
            type="number"
            step="10"
            min="10"
            value={fl}
            onChange={(e) => setFl(parseFloat(e.target.value))}
          />
        </div>
        <div className="dz-fld">
          <label htmlFor="dz-s-bin">Binning</label>
          <select
            id="dz-s-bin"
            value={bin}
            onChange={(e) => setBin(parseInt(e.target.value, 10))}
          >
            <option value={1}>1×1</option>
            <option value={2}>2×2</option>
            <option value={3}>3×3</option>
            <option value={4}>4×4</option>
          </select>
        </div>
        <div className="dz-fld">
          <label htmlFor="dz-s-see">Tipik FWHM / seeing (″)</label>
          <input
            id="dz-s-see"
            type="number"
            step="0.1"
            min="0.5"
            value={see}
            onChange={(e) => setSee(parseFloat(e.target.value))}
          />
        </div>
      </div>

      <div className="dz-out" aria-live="polite">
        <div className="dz-stat">
          <div className="dz-k">Görüntü ölçeği</div>
          <div className="dz-val">
            {Number.isFinite(scale) ? fmt(scale) : '—'}
            <small> ″/px</small>
          </div>
        </div>
        <div className="dz-stat">
          <div className="dz-k">Yıldız FWHM</div>
          <div className="dz-val">
            {Number.isFinite(fwhm) ? fmt(fwhm) : '—'}
            <small> px</small>
          </div>
        </div>
        <div className="dz-stat">
          <div className="dz-k">Durum</div>
          <div className={`dz-val ${v ? v.cls : ''}`}>{v ? v.label : '—'}</div>
        </div>
      </div>

      <div className="dz-verdict">{v ? v.body : 'Değerleri girin…'}</div>
    </div>
  );
}

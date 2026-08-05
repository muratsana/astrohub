import { useMemo, useState, type ReactNode } from 'react';
import { ditherConversion, fmt } from '../core';

/**
 * HESAPLAYICI 3 — dither miktarı çevirici.
 *
 * Paketteki `DitherCalculator.jsx` bileşeninin TSX karşılığı.
 */

type FieldKey = 'gp' | 'gf' | 'ip' | 'iff' | 'am' | 'sc';

const FIELDS: [FieldKey, string, number, number][] = [
  ['gp', 'Rehber kamera piksel (µm)', 3.75, 0.01],
  ['gf', 'Rehber odak uzaklığı (mm)', 200, 5],
  ['ip', 'Çekim kamera piksel (µm)', 3.76, 0.01],
  ['iff', 'Çekim odak uzaklığı (mm)', 400, 5],
  ['am', 'Dither miktarı (rehber px)', 5, 0.5],
  ['sc', 'PHD2 Scale çarpanı', 1, 0.1],
];

const INITIAL = Object.fromEntries(FIELDS.map((f) => [f[0], f[2]])) as Record<
  FieldKey,
  number
>;

export function DitherCalculator() {
  const [v, setV] = useState<Record<FieldKey, number>>(INITIAL);
  const set = (k: FieldKey) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV((s) => ({ ...s, [k]: parseFloat(e.target.value) }));

  const c = useMemo(() => {
    const ok = v.gp > 0 && v.gf > 0 && v.ip > 0 && v.iff > 0;
    if (!ok) return null;
    return ditherConversion({
      guidePixelUm: v.gp,
      guideFocalMm: v.gf,
      imagePixelUm: v.ip,
      imageFocalMm: v.iff,
      amountGuidePx: v.am,
      phd2Scale: v.sc,
    });
  }, [v]);

  let verdict: ReactNode = 'Değerleri girin…';
  if (c) {
    const mv = c.moveImagePx;
    const isOag = Math.abs(v.gf - v.iff) < 1e-6;
    let main: ReactNode;
    if (mv < 3) {
      const need = 6 / (c.ratio * v.sc);
      main = (
        <>
          <b className="dz-bad">Dither çok küçük.</b> Çekim kameranızda sadece{' '}
          {fmt(mv, 1)} piksel hareket ediyorsunuz. Bu, sabit desen gürültüsünü ve
          yürüyen gürültüyü temizlemeye yetmez. Dither miktarını{' '}
          <b>~{fmt(need, 1)} rehber pikseline</b> çıkarın (≈6 çekim pikseli
          için).
        </>
      );
    } else if (mv <= 18) {
      main = (
        <>
          <b className="dz-ok">İdeal aralıktasınız.</b> {fmt(mv, 1)} çekim
          pikseli hem sabit desen / yürüyen gürültüyü temizler hem de drizzle
          için gereken alt-piksel faz çeşitliliğini fazlasıyla sağlar. Renkli
          (OSC/DSLR) kamerada 10–20 aralığı tercih edilir — Bayer deseni 2×2
          olduğu için.
        </>
      );
    } else if (mv <= 35) {
      main = (
        <>
          <b className="dz-mid">Büyük ama kullanılabilir.</b> {fmt(mv, 1)} çekim
          pikseli, ağır yürüyen gürültü sorunu olanlar için mantıklı. Bedeli:
          daha uzun oturma süresi ve gece boyunca alanın yavaşça kayması. Yığın
          kenarlarında kırpma payı bırakın.
        </>
      );
    } else {
      main = (
        <>
          <b className="dz-bad">Fazla büyük.</b> {fmt(mv, 0)} çekim pikseli
          oturma sürelerini uzatır ve alanınızı kaydırır. PHD2 Scale çarpanını
          1.0&apos;a çekmeyi ve miktarı çekim uygulamasında ayarlamayı düşünün —
          bu iki değerin <b>çarpıldığını</b> unutmayın.
        </>
      );
    }
    verdict = (
      <>
        {main}
        {isOag && (
          <p className="dz-note-inline">
            Aynı odak uzaklığı girdiniz — OAG kurulumu. Oran, piksel boyutları
            oranına iniyor ({v.gp}/{v.ip} = {fmt(c.ratio)}×). OAG kullanıcıları
            rehber teleskop kullananlardan daha büyük dither sayısına ihtiyaç
            duyar.
          </p>
        )}
      </>
    );
  }

  return (
    <div className="dz-tool">
      <h3 className="dz-tool-title">Hesaplayıcı 3 — Dither miktarı çevirici</h3>
      <p className="dz-sub">
        Rehber pikselinde girdiğiniz sayının çekim kameranızda kaç piksele
        karşılık geldiğini bulun. Hedef: <b>5–15 çekim pikseli</b> (OSC/DSLR
        için 10–20).
      </p>

      <div className="dz-grid">
        {FIELDS.map(([k, label, , step]) => (
          <div className="dz-fld" key={k}>
            <label htmlFor={`dz-d-${k}`}>{label}</label>
            <input
              id={`dz-d-${k}`}
              type="number"
              step={step}
              value={v[k]}
              onChange={set(k)}
            />
          </div>
        ))}
      </div>

      <div className="dz-out" aria-live="polite">
        <div className="dz-stat">
          <div className="dz-k">Rehber ölçeği</div>
          <div className="dz-val">
            {c ? fmt(c.guideScale) : '—'}
            <small> ″/px</small>
          </div>
        </div>
        <div className="dz-stat">
          <div className="dz-k">Çekim ölçeği</div>
          <div className="dz-val">
            {c ? fmt(c.imgScale) : '—'}
            <small> ″/px</small>
          </div>
        </div>
        <div className="dz-stat">
          <div className="dz-k">Oran</div>
          <div className="dz-val">
            {c ? fmt(c.ratio) : '—'}
            <small>×</small>
          </div>
        </div>
        <div className="dz-stat">
          <div className="dz-k">Çekimde hareket</div>
          <div className="dz-val">
            {c ? fmt(c.moveImagePx, 1) : '—'}
            <small> px</small>
          </div>
        </div>
      </div>

      <div className="dz-verdict">{verdict}</div>

      <p className="dz-note">
        <b>Formül:</b> çekim pikseli = dither miktarı × PHD2 Scale × (rehber
        ölçeği ÷ çekim ölçeği). OAG kullanıyorsanız iki odak uzaklığını da aynı
        girin — o zaman oran sadece piksel boyutları oranına iner.
      </p>
    </div>
  );
}

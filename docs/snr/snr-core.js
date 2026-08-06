/**
 * snr-core.js — astrofotoğrafta SNR hesapları için çerçeveden bağımsız çekirdek.
 *
 * DOM kullanmaz (tek istisna: renderToCanvas). Hem React bileşenleri hem de
 * vanilla widget'lar bu dosyayı kullanır.
 *
 * Fizik: standart CCD denklemi.
 *   SNR = S·T / sqrt( (S + B + D)·T + n·RN² )
 * S,B,D = elektron/piksel/saniye · T = toplam saniye · n = kare sayısı · RN = e⁻ RMS
 *
 * Kaynak: Howell, "Handbook of CCD Astronomy"; Merline & Howell 1995;
 * Craig Stark, "Signal to Noise" serisi.
 */

/* ------------------------------------------------------------------ sabitler */

/** V bandında sıfırıncı kadir için foton/s/cm². */
export const NPHOT_V0 = 1000 * 890;

/** Bortle sınıfı → gökyüzü parlaklığı (mag/arcsec²).
 *  NOT: Bortle'ın 2001 tarihli özgün makalesinde mag/arcsec² değeri YOKTUR;
 *  bu karşılıklar sonradan türetilmiştir ve kaynaklar arasında 0.5 kadire
 *  varan fark bulunur. Değerler handprint.com tablosunun ara değerleridir. */
export const BORTLE = {
  1: 22.00, 2: 21.93, 3: 21.80, 4: 21.30, 5: 20.10,
  6: 19.20, 7: 18.65, 8: 18.10, 9: 17.50,
};

export const BORTLE_NAME = {
  1: 'Mükemmel karanlık', 2: 'Gerçek karanlık', 3: 'Kırsal', 4: 'Kırsal/banliyö',
  5: 'Banliyö', 6: 'Parlak banliyö', 7: 'Banliyö/şehir', 8: 'Şehir', 9: 'Şehir merkezi',
};

/** Filtre geçirgenlikleri: gökyüzü, geniş bant (sürekli tayf) obje, emisyon objesi. */
export const FILTERS = {
  none:  {sky: 1.00,   broad: 1.00,  em: 1.00,  ad: 'Yok / UV-IR kesme'},
  lp:    {sky: 0.55,   broad: 0.90,  em: 0.93,  ad: 'Işık kirliliği filtresi'},
  dual7: {sky: 0.042,  broad: 0.040, em: 0.90,  ad: 'Çift bant 7 nm'},
  dual3: {sky: 0.018,  broad: 0.017, em: 0.90,  ad: 'Çift bant 3 nm'},
  ha3:   {sky: 0.0095, broad: 0.009, em: 0.95,  ad: 'Hα 3 nm (mono)'},
};

/** Gerçek objeler. sb = yüzey parlaklığı (mag/arcsec²), em = emisyon bulutsusu mu. */
export const OBJECTS = [
  {id: 'm42c',  n: 'M42 çekirdeği (Trapezium)', sb: 15.5, sh: 'neb',  em: true,  note: 'Gökyüzünden her koşulda parlak'},
  {id: 'm57',   n: 'M57 Halka Bulutsusu',       sb: 17.8, sh: 'ring', em: true,  note: 'Küçük ama çok parlak'},
  {id: 'm31c',  n: 'M31 çekirdeği',             sb: 18.5, sh: 'gal',  em: false, note: 'Galaksinin en kolay kısmı'},
  {id: 'm42',   n: 'M42 iç bölgesi',            sb: 19.6, sh: 'neb',  em: true,  note: 'Klasik başlangıç hedefi'},
  {id: 'm27',   n: 'M27 Dumbbell',              sb: 20.2, sh: 'ring', em: true,  note: 'Banliyöden rahat'},
  {id: 'm45',   n: 'M45 Ülker tozu',            sb: 21.3, sh: 'neb',  em: false, note: 'Yansıma tozu — dar bant işe yaramaz'},
  {id: 'n7000', n: 'NGC 7000 Kuzey Amerika',    sb: 21.5, sh: 'neb',  em: true,  note: 'Dar bantla şehirden çekilir'},
  {id: 'm81',   n: 'M81 Bode Galaksisi',        sb: 21.5, sh: 'gal',  em: false, note: 'Çekirdek kolay, kollar zor'},
  {id: 'm51',   n: 'M51 Girdap Galaksisi',      sb: 21.7, sh: 'gal',  em: false, note: 'Gelgit köprüsü için derin veri ister'},
  {id: 'm33',   n: 'M33 Üçgen Galaksisi',       sb: 23.1, sh: 'gal',  em: false, note: 'Kolay sanılan zor hedef'},
  {id: 'm31o',  n: 'M31 dış diski',             sb: 24.0, sh: 'gal',  em: false, note: 'Gökyüzünün çok altında'},
  {id: 'ifn',   n: 'IFN — galaktik sirus',      sb: 25.5, sh: 'wisp', em: false, note: 'Doğal gökyüzünden bile sönük'},
];

export function objById(id) {
  for (let i = 0; i < OBJECTS.length; i++) if (OBJECTS[i].id === id) return OBJECTS[i];
  return OBJECTS[0];
}

/** Modern soğutmalı CMOS için karanlık akım (e⁻/piksel/saniye). */
export const DARKRATE = 0.0002;

/* ------------------------------------------------------------------ fizik */

/**
 * Verilen yüzey parlaklığı için elektron hızı (e⁻/piksel/saniye).
 * @param {number} mag  yüzey parlaklığı, mag/arcsec²
 * @param {number} ap   açıklık (mm)
 * @param {number} fl   odak uzaklığı (mm)
 * @param {number} px   piksel boyutu (µm)
 * @param {number} qe   kuantum verimi (0–1)
 * @param {number} thr  optik geçirgenlik (0–1)
 * @param {number} ff   filtre geçirgenliği (0–1)
 *
 * NOT: Hesap V bandı içindir. Filtresiz gerçek bir kamera V'den 2–3 kat geniş
 * bir aralık toplar, dolayısıyla mutlak hızlar temkinlidir. SNR *oranları*
 * bundan etkilenmez, çünkü obje ve gökyüzü aynı bantta hesaplanır.
 */
export function rate(mag, ap = 80, fl = 480, px = 3.76, qe = 0.60, thr = 0.85, ff = 1) {
  const A = Math.PI * Math.pow(ap / 20, 2);   // cm²
  const sc = 206.265 * px / fl;               // arcsec/piksel
  return NPHOT_V0 * Math.pow(10, -0.4 * mag) * A * sc * sc * qe * thr * ff;
}

/** Yığınlanmış SNR. */
export function snrOf(S, B, T, n, RN, D = DARKRATE) {
  return S * T / Math.sqrt((S + B + D) * T + n * RN * RN);
}

/** Hedef SNR için gereken toplam süre (saniye). t = alt poz süresi. */
export function timeForSNR(target, S, B, RN, t, D = DARKRATE) {
  return target * target * ((S + B + D) + RN * RN / t) / (S * S);
}

/**
 * Okuma gürültüsünü "boğmak" için gereken alt poz süresi (saniye).
 * @param {number} k  tolerans katsayısı: %5 kayıp → 9.76, %10 → 4.76, %20 → 2.27
 */
export function minSubExposure(RN, skyRate, k = 9.76) {
  return k * RN * RN / skyRate;
}

/** Süreyi okunur metne çevirir. */
export function fmtDur(sec) {
  if (!isFinite(sec) || sec <= 0) return '—';
  const h = sec / 3600;
  if (h < 1) return Math.round(sec / 60) + ' dakika';
  if (h < 10) return h.toFixed(1) + ' saat';
  if (h < 1000) return Math.round(h) + ' saat';
  return Math.round(h).toLocaleString('tr-TR') + ' saat (≈ ' +
         Math.round(h / 5).toLocaleString('tr-TR') + ' gece)';
}

export const f2 = (x) => Number(x).toFixed(2);

/* ------------------------------------------------------- rastgele sayı */

/** Deterministik PRNG — sonuçların tekrarlanabilir olması için. */
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gaussFrom(rnd) {
  let spare = null;
  return function () {
    if (spare !== null) { const v = spare; spare = null; return v; }
    const u = Math.max(1e-9, rnd()), v2 = rnd(), m = Math.sqrt(-2 * Math.log(u));
    spare = m * Math.sin(2 * Math.PI * v2);
    return m * Math.cos(2 * Math.PI * v2);
  };
}

/* ------------------------------------------------- obje şekil modelleri */

export const SIM_SIZE = 116;

function shapeGal(x, y) {
  const dx = x - 0.5, dy = y - 0.5;
  const xr = dx * Math.cos(0.5) - dy * Math.sin(0.5);
  const yr = (dx * Math.sin(0.5) + dy * Math.cos(0.5)) / 0.45;
  const r = Math.sqrt(xr * xr + yr * yr);
  let v = 1.15 * Math.exp(-r / 0.055) + 0.85 * Math.exp(-r / 0.20);
  const th = Math.atan2(yr, xr);
  for (let k = 0; k < 2; k++) {
    const arm = Math.cos(2 * (th - Math.log(Math.max(r, 0.02)) * 2.4 + k * Math.PI));
    v += 0.34 * Math.max(0, arm) * Math.exp(-Math.abs(r - 0.14) / 0.16) * Math.min(1, r / 0.05);
  }
  v *= (1 - 0.30 * Math.exp(-Math.pow((r - 0.115) / 0.022, 2)));   // toz şeridi
  return v;
}

function shapeNeb(x, y) {
  let v = 0;
  const blobs = [[.42,.46,.20,1.0],[.58,.40,.15,.75],[.36,.60,.17,.62],[.62,.62,.13,.5],
                 [.50,.30,.11,.42],[.30,.38,.10,.35],[.70,.52,.12,.38],[.46,.72,.12,.3]];
  for (let i = 0; i < blobs.length; i++) {
    const b = blobs[i], dx = (x - b[0]) / b[2], dy = (y - b[1]) / b[2];
    v += b[3] * Math.exp(-(dx * dx + dy * dy));
  }
  const fx = x - 0.5, fy = y - 0.5;
  v += 0.45 * Math.exp(-Math.pow((fy - 0.30 * Math.sin(fx * 5)) / 0.045, 2)) * Math.exp(-Math.abs(fx) / 0.5);
  return v;
}

function shapeRing(x, y) {
  const dx = x - 0.5, dy = (y - 0.5) / 0.82;
  const r = Math.sqrt(dx * dx + dy * dy);
  let v = 1.0 * Math.exp(-Math.pow((r - 0.20) / 0.055, 2));
  v += 0.30 * Math.exp(-Math.pow(r / 0.17, 2));
  v += 0.10 * Math.exp(-Math.pow((r - 0.30) / 0.11, 2));
  return v;
}

function shapeWisp(x, y) {
  let v = 0.05;
  for (let k = 0; k < 5; k++) {
    const ph = k * 1.3;
    const d = y - (0.18 + k * 0.16) - 0.10 * Math.sin(x * 4 + ph);
    v += 0.55 * Math.exp(-Math.pow(d / 0.055, 2)) * (0.6 + 0.4 * Math.sin(x * 7 + ph));
  }
  return Math.max(0, v);
}

const SHAPES = {gal: shapeGal, neb: shapeNeb, ring: shapeRing, wisp: shapeWisp};

const shapeCache = {};
/** Şekil haritası: ortalaması 1.0 olacak biçimde normalize edilmiş parlaklık. */
export function shapeMap(kind) {
  if (shapeCache[kind]) return shapeCache[kind];
  const N = SIM_SIZE, f = SHAPES[kind] || shapeNeb;
  const m = new Float64Array(N * N);
  let sum = 0, peak = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const v = Math.max(0, f((x + 0.5) / N, (y + 0.5) / N));
    m[y * N + x] = v; sum += v; if (v > peak) peak = v;
  }
  const mean = sum / (N * N);
  for (let i = 0; i < m.length; i++) m[i] /= mean;
  shapeCache[kind] = {map: m, peak: peak / mean};
  return shapeCache[kind];
}

/** Sabit yıldız listesi (görsel çıpa). */
export const STARS = (function () {
  const r = mulberry32(4242), out = [];
  for (let i = 0; i < 14; i++) {
    out.push({x: r(), y: r(), a: 3 + 70 * Math.pow(r(), 3.0), s: 0.9 + r() * 0.7});
  }
  return out;
})();

/** Obje + yıldızlardan elektron hızı haritası üretir. */
export function buildRateMap(objSignal, shapeKind) {
  const N = SIM_SIZE, sm = shapeMap(shapeKind);
  const out = new Float64Array(N * N);
  for (let i = 0; i < out.length; i++) out[i] = objSignal * sm.map[i];
  STARS.forEach(function (st) {
    const cx = st.x * N, cy = st.y * N, sg = st.s, r0 = Math.ceil(3.2 * sg);
    for (let yy = Math.max(0, Math.floor(cy - r0)); yy <= Math.min(N - 1, Math.ceil(cy + r0)); yy++)
      for (let xx = Math.max(0, Math.floor(cx - r0)); xx <= Math.min(N - 1, Math.ceil(cx + r0)); xx++) {
        const dx = (xx + 0.5 - cx) / sg, dy = (yy + 0.5 - cy) / sg;
        out[yy * N + xx] += st.a * objSignal * Math.exp(-(dx * dx + dy * dy) / 2);
      }
  });
  return {map: out, peak: sm.peak};
}

/**
 * Elektron hızı haritasını canvas'a çizer (asinh germe).
 * n = 0 ise gürültüsüz "gerçek obje" paneli çizilir.
 */
export function renderToCanvas(canvas, rateMap, T, n, RN, B, D, refPeakSignal) {
  if (!canvas) return;
  const N = SIM_SIZE;
  canvas.width = N; canvas.height = N;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const im = ctx.createImageData(N, N), px = im.data;
  const rnd = mulberry32(20260805), g = gaussFrom(rnd);
  const K = 5, denom = Math.asinh(K);
  for (let i = 0; i < N * N; i++) {
    const S = rateMap[i];
    let val = S * T;
    if (n > 0) val += Math.sqrt((S + B + D) * T + n * RN * RN) * g();
    let t = Math.asinh(Math.max(0, val / refPeakSignal) * K) / denom;
    t = Math.max(0, Math.min(1, t));
    const gg = Math.round(255 * t), o = i * 4;
    px[o] = Math.round(gg * 0.93); px[o + 1] = Math.round(gg * 0.96); px[o + 2] = gg; px[o + 3] = 255;
  }
  ctx.putImageData(im, 0, 0);
}

/** Gürültü bütçesi: her kaynağın toplam varyanstaki payı (0–1). */
export function noiseBudget(S, B, D, T, n, RN) {
  const vo = S * T, vs = B * T, vd = D * T, vr = n * RN * RN;
  const tot = vo + vs + vd + vr;
  return {obj: vo / tot, sky: vs / tot, dark: vd / tot, read: vr / tot, total: tot};
}

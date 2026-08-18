import type { AlanCismi } from '@/services/content/fieldObjects';
import type { AlanYildizi } from '@/services/content/fieldStars';
import { yildizEtiketi } from '@/services/content/fieldStars';

/**
 * ALAN ÇÖZÜMLÜ FOTOĞRAF — İNDİRİLEBİLİR KOPYA.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN İSTEMCİDE ÇİZİLİYOR
 *
 * astrometry.net kendi açıklamalı görüntüsünü sunuyor
 * (`/annotated_display/<job>`) ve ilk akla gelen onu indirmek. Üç
 * sebeple vazgeçildi:
 *
 *   · O görüntü yalnızca astrometry.net'in kataloğunu biliyor. Bizim
 *     katmanımız `bright_stars` ve `celestial_objects`ten besleniyor,
 *     yani ekranda görünen etiketlerle indirilen dosya AYRIŞIRDI.
 *   · Dış servise bağlı: iş kimliği silinirse ya da servis düşerse
 *     indirme de düşer.
 *   · Türkçe etiket ve künye yok.
 *
 * Ekranda ne görünüyorsa dosyada da o olsun diye çizim burada, aynı
 * verilerden yapılıyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ÖLÇEKLER PİKSELE DEĞİL, GÖRÜNTÜ BOYUNA BAĞLI
 *
 * 900 piksellik bir kopyada 14 piksellik yazı okunur, 4000 piksellikte
 * görünmez olur. Yazı boyu, çizgi kalınlığı ve işaret yarıçapı kısa
 * kenarın oranı olarak hesaplanıyor — böylece küçük ve büyük kopya aynı
 * görünüyor.
 */

export interface AnnotatedParams {
  imageUrl: string;
  /** Kadraj dönüklüğü (derece) — gül bununla döndürülüyor. */
  rotationDeg: number | null;
  /** Alan genişliği (derece) — ölçek çubuğu bundan çıkıyor. */
  fieldWidthDeg: number | null;
  cisimler: AlanCismi[];
  yildizlar: AlanYildizi[];
  /** Görüntünün altına basılan künye satırı. */
  kunye: string;
}

const CIZGI = '#58a6ff';
const YAZI = '#e6edf3';
const YILDIZ = '#f0c674';
/** JPEG kalitesi: açıklama katmanı keskin kenarlı, düşük kalite bulandırıyor. */
const KALITE = 0.92;

function gorseliYukle(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    /*
     * `crossOrigin` ŞART. Görsel başka kaynakta (depolama alan adı) ve
     * bu nitelik olmadan tuval "kirlenmiş" sayılıyor: `toBlob` güvenlik
     * hatasıyla düşüyor ve indirme hiç oluşmuyor.
     */
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Fotoğraf okunamadı.'));
    image.src = url;
  });
}

/** Ölçek çubuğu için "yuvarlak" bir yay değeri seçer. */
export function olcekCubugu(
  fieldWidthDeg: number | null
): { arcmin: number; oran: number } | null {
  if (!fieldWidthDeg || fieldWidthDeg <= 0) return null;
  const hedef = (fieldWidthDeg * 60) / 5;
  const adimlar = [1, 2, 5, 10, 15, 30, 60, 120, 300];
  const secim = adimlar.find((a) => a >= hedef) ?? adimlar[adimlar.length - 1];
  return { arcmin: secim, oran: secim / 60 / fieldWidthDeg };
}

export async function annotatedBlob(params: AnnotatedParams): Promise<Blob> {
  const image = await gorseliYukle(params.imageUrl);
  const w = image.naturalWidth;
  const h = image.naturalHeight;
  if (!w || !h) throw new Error('Fotoğraf boyutu okunamadı.');

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Çizim başlatılamadı.');

  ctx.drawImage(image, 0, 0, w, h);

  const kisa = Math.min(w, h);
  const yaziBoyu = Math.max(11, Math.round(kisa * 0.022));
  const kalinlik = Math.max(1, kisa * 0.0022);
  const isaret = Math.max(3, kisa * 0.006);

  ctx.lineWidth = kalinlik;
  ctx.font = `${yaziBoyu}px system-ui, sans-serif`;
  ctx.textBaseline = 'middle';

  /* Merkez artısı ve halkası — kadrajın orta noktası. */
  ctx.strokeStyle = CIZGI;
  ctx.beginPath();
  ctx.moveTo(w / 2, h / 2 - kisa * 0.05);
  ctx.lineTo(w / 2, h / 2 - kisa * 0.015);
  ctx.moveTo(w / 2, h / 2 + kisa * 0.015);
  ctx.lineTo(w / 2, h / 2 + kisa * 0.05);
  ctx.moveTo(w / 2 - kisa * 0.05, h / 2);
  ctx.lineTo(w / 2 - kisa * 0.015, h / 2);
  ctx.moveTo(w / 2 + kisa * 0.015, h / 2);
  ctx.lineTo(w / 2 + kisa * 0.05, h / 2);
  ctx.stroke();

  /**
   * Etiketi okunur kılan koyu zemin: yıldız alanının üstünde yazı
   * kaybolur.
   *
   * KENARDA SOLA DÖNÜYOR. Sağ kenara yakın bir işaretin etiketi sağda
   * kalsaydı görüntünün DIŞINA taşardı — ekranda düzeltilen hatanın
   * dosyada tekrarı olurdu.
   */
  const etiketBas = (metin: string, x: number, y: number, renk: string) => {
    const genislik = ctx.measureText(metin).width;
    const dolgu = yaziBoyu * 0.3;
    const solda = x + genislik + dolgu * 2 > w;
    const basX = solda ? x - genislik - isaret * 4.8 : x;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(
      basX - dolgu,
      y - yaziBoyu * 0.62,
      genislik + dolgu * 2,
      yaziBoyu * 1.24
    );
    ctx.fillStyle = renk;
    ctx.fillText(metin, basX, y);
  };

  /* Yıldızlar önce: nesne etiketleri onların üstünde kalmalı. */
  for (const y of params.yildizlar) {
    const px = y.nokta.x * w;
    const py = y.nokta.y * h;
    ctx.strokeStyle = YILDIZ;
    ctx.beginPath();
    ctx.moveTo(px - isaret * 1.8, py);
    ctx.lineTo(px - isaret * 0.6, py);
    ctx.moveTo(px + isaret * 0.6, py);
    ctx.lineTo(px + isaret * 1.8, py);
    ctx.moveTo(px, py - isaret * 1.8);
    ctx.lineTo(px, py - isaret * 0.6);
    ctx.moveTo(px, py + isaret * 0.6);
    ctx.lineTo(px, py + isaret * 1.8);
    ctx.stroke();
    etiketBas(yildizEtiketi(y), px + isaret * 2.4, py, YILDIZ);
  }

  for (const c of params.cisimler) {
    const px = c.nokta.x * w;
    const py = c.nokta.y * h;
    ctx.strokeStyle = CIZGI;
    ctx.beginPath();
    ctx.arc(px, py, isaret, 0, Math.PI * 2);
    ctx.stroke();
    etiketBas(c.katalog, px + isaret * 2.4, py, YAZI);
  }

  /* Kuzey-doğu gülü: dönüklük kadar döndürülüyor. */
  const rot = params.rotationDeg ?? 0;
  const gulX = w - kisa * 0.09;
  const gulY = kisa * 0.09;
  ctx.save();
  ctx.translate(gulX, gulY);
  ctx.rotate((-rot * Math.PI) / 180);
  ctx.strokeStyle = CIZGI;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -kisa * 0.055);
  ctx.moveTo(0, 0);
  ctx.lineTo(-kisa * 0.055, 0);
  ctx.stroke();
  ctx.fillStyle = YAZI;
  ctx.textAlign = 'center';
  ctx.fillText('K', 0, -kisa * 0.072);
  ctx.fillText('D', -kisa * 0.072, 0);
  ctx.restore();
  ctx.textAlign = 'left';

  const cubuk = olcekCubugu(params.fieldWidthDeg);
  if (cubuk) {
    const uzunluk = Math.min(w * 0.45, cubuk.oran * w);
    const x0 = kisa * 0.05;
    const y0 = h - kisa * 0.09;
    ctx.strokeStyle = CIZGI;
    ctx.beginPath();
    ctx.moveTo(x0, y0 - isaret);
    ctx.lineTo(x0, y0);
    ctx.lineTo(x0 + uzunluk, y0);
    ctx.lineTo(x0 + uzunluk, y0 - isaret);
    ctx.stroke();
    etiketBas(`${cubuk.arcmin}′`, x0 + uzunluk / 2, y0 + yaziBoyu, YAZI);
  }

  /* Künye: dosya elden ele dolaştığında nereden geldiği yazılı olmalı. */
  etiketBas(params.kunye, kisa * 0.05, h - kisa * 0.035, YAZI);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('Görüntü oluşturulamadı.')),
      'image/jpeg',
      KALITE
    );
  });
}

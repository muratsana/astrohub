/**
 * KADRAJ MATEMATİĞİ — EN-BOY ORANINDAN BAĞIMSIZ.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN AYRILDI
 *
 * Bu hesap `avatar.ts` içinde KARE varsayımıyla yazılmıştı: kaynak
 * dikdörtgeni tek bir `size` değeriyle dönüyordu. Profil kapağı geldiğinde
 * o varsayım tutmadı — kapak 3:1, avatar 1:1 ve ikisi de aynı sürükleme,
 * aynı FOV mantığını istiyor.
 *
 * İkinci bir kopya yazmak, kullanıcının aynı hareketi iki ayrı kodda
 * yaşaması demekti: birinde kenara dayanma düzeltilir, diğerinde
 * unutulurdu. Hesap tek yerde, en-boy oranı bir parametre.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ZOOM 1 NE DEMEK
 *
 * "İstenen orana sığan EN BÜYÜK dikdörtgen". Kare avatar için bu, kısa
 * kenara oturan kare; 3:1 kapak için genişliğe ya da yüksekliğe oturan
 * geniş bant — hangisi önce sığıyorsa. Böylece zoom 1'de kullanıcı
 * fotoğrafın alabildiğince çoğunu görüyor ve yakınlaştırma tek yönde
 * ilerliyor.
 */

export interface Kadraj {
  /** 1 = en geniş kadraj, üst sınır çağırana ait. */
  zoom: number;
  /** -1 sol, 1 sağ. Gidilecek yer yoksa etkisiz. */
  panX: number;
  /** -1 üst, 1 alt. Gidilecek yer yoksa etkisiz. */
  panY: number;
}

export interface KaynakDikdortgen {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const VARSAYILAN_KADRAJ: Kadraj = { zoom: 1, panX: 0, panY: 0 };

export const EN_AZ_ZOOM = 1;
export const EN_COK_ZOOM = 4;

function sikistir(deger: number, alt: number, ust: number): number {
  return Math.min(ust, Math.max(alt, deger));
}

export function kadrajiTemizle(kadraj: Kadraj): Kadraj {
  return {
    zoom: sikistir(
      Number.isFinite(kadraj.zoom) ? kadraj.zoom : EN_AZ_ZOOM,
      EN_AZ_ZOOM,
      EN_COK_ZOOM
    ),
    panX: sikistir(Number.isFinite(kadraj.panX) ? kadraj.panX : 0, -1, 1),
    panY: sikistir(Number.isFinite(kadraj.panY) ? kadraj.panY : 0, -1, 1),
  };
}

/**
 * Kaynak görselden alınacak dikdörtgen.
 *
 * `enBoy` hedefin genişlik/yükseklik oranı: 1 kare, 3 ise üç kat geniş.
 */
export function kaynakDikdortgen(
  kaynak: { width: number; height: number },
  kadraj: Kadraj,
  enBoy: number
): KaynakDikdortgen {
  const guvenli = kadrajiTemizle(kadraj);
  const oran = Number.isFinite(enBoy) && enBoy > 0 ? enBoy : 1;
  const kw = Math.max(1, kaynak.width);
  const kh = Math.max(1, kaynak.height);

  /* Orana sığan en büyük dikdörtgen: genişlikten mi yükseklikten mi
     sınırlandığını karşılaştırma söylüyor. */
  const tamGenislik = Math.min(kw, kh * oran);
  const genislik = Math.max(1, tamGenislik / guvenli.zoom);
  const yukseklik = Math.max(1, genislik / oran);

  const enFazlaX = Math.max(0, kw - genislik);
  const enFazlaY = Math.max(0, kh - yukseklik);
  const merkezX = kw / 2 + guvenli.panX * (enFazlaX / 2);
  const merkezY = kh / 2 + guvenli.panY * (enFazlaY / 2);

  return {
    x: sikistir(merkezX - genislik / 2, 0, enFazlaX),
    y: sikistir(merkezY - yukseklik / 2, 0, enFazlaY),
    width: genislik,
    height: yukseklik,
  };
}

/** Tam fotoğrafı verilen sahneye sığdıran ölçek ve kenar boşlukları. */
export interface SahneOturmasi {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function sahneOturmasi(
  kaynak: { width: number; height: number },
  sahneGenislik: number,
  sahneYukseklik: number
): SahneOturmasi {
  const kw = Math.max(1, kaynak.width);
  const kh = Math.max(1, kaynak.height);
  const scale = Math.min(sahneGenislik / kw, sahneYukseklik / kh);
  return {
    scale,
    offsetX: (sahneGenislik - kw * scale) / 2,
    offsetY: (sahneYukseklik - kh * scale) / 2,
  };
}

/**
 * Sürüklemeyi kadraj değerine çevirir (kaynak piksel cinsinden).
 *
 * Gidilecek yer yokken (`enFazla` sıfır) bölme YAPILMIYOR: korumasız bir
 * hesap `Infinity` üretir, `kadrajiTemizle` onu sonlu bulmayıp sıfıra
 * çeker ve kadraj sessizce başa döner.
 */
export function suruklediktenSonra(
  kaynak: { width: number; height: number },
  kadraj: Kadraj,
  dx: number,
  dy: number,
  enBoy: number
): Kadraj {
  const guvenli = kadrajiTemizle(kadraj);
  const dik = kaynakDikdortgen(kaynak, guvenli, enBoy);
  const yariX = Math.max(0, Math.max(1, kaynak.width) - dik.width) / 2;
  const yariY = Math.max(0, Math.max(1, kaynak.height) - dik.height) / 2;

  return kadrajiTemizle({
    zoom: guvenli.zoom,
    panX: yariX > 0 ? guvenli.panX + dx / yariX : guvenli.panX,
    panY: yariY > 0 ? guvenli.panY + dy / yariY : guvenli.panY,
  });
}

/** Tekerlek ya da kıstırma oranını FOV değerine çevirir. */
export function yakinlastiktanSonra(kadraj: Kadraj, oran: number): Kadraj {
  const guvenli = kadrajiTemizle(kadraj);
  const carpan = Number.isFinite(oran) && oran > 0 ? oran : 1;
  return kadrajiTemizle({ ...guvenli, zoom: guvenli.zoom * carpan });
}

/**
 * ══════════════════════════════════════════════════════════════════════
 * HANGİ EKSENDE GİDİLECEK YER VAR
 *
 * "Yatay kadraj çalışmıyor" şikâyetinin cevabı burada ve şikâyet
 * haklıydı — ama hata hesapta değil, arayüzün sustuğu yerdeydi.
 *
 * 3:1 bir kapak, 2:1 bir fotoğraftan en geniş hâlinde alınırken
 * fotoğrafın TÜM GENİŞLİĞİNİ kaplıyor: yatayda gidilecek yer sıfır.
 * Kaydırıcı yine de hareket ediyor, görüntü hiç kıpırdamıyordu. Ölü bir
 * kontrol, bozuk bir kontroldür.
 *
 * Bu fonksiyon boşluğu kaynak piksel cinsinden veriyor; arayüz sıfır
 * gördüğü ekseni kilitliyor ve nedenini yazıyor: yakınlaştırınca o
 * eksende yer açılıyor.
 */
export function kadrajBoslugu(
  kaynak: { width: number; height: number },
  kadraj: Kadraj,
  enBoy: number
): { x: number; y: number } {
  const dik = kaynakDikdortgen(kaynak, kadraj, enBoy);
  return {
    x: Math.max(0, Math.max(1, kaynak.width) - dik.width),
    y: Math.max(0, Math.max(1, kaynak.height) - dik.height),
  };
}

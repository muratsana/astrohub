/**
 * GÖK TARAMASI ÖNİZLEMELERİ — her katalog cismi için gerçek görüntü.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SORUN
 *
 * Hedef kartları `StarField` ile çiziliyordu: cismin slug'ından üretilen
 * yordamsal bir yıldız alanı. 230 kayıtlık bir katalogda bu bir tasarım
 * tercihiydi; 16.149 kayıtta ise şu anlama geliyor: Sh2-101 ile
 * LDN 1235 ekranda ayırt edilemiyor ve kullanıcı neye baktığını
 * göremiyor. Hedef kataloğunun işi tam olarak "bu nesne neye benziyor"
 * sorusunu cevaplamak.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN DSS2, NEDEN AstroBin/APOD DEĞİL
 *
 * AstroBin'deki ve APOD'daki görüntülerin telif hakkı onları ÇEKEN
 * fotoğrafçılarda. İkisi de "ücretsiz görüntülenebilir" olmakla "başka
 * bir sitede yeniden yayımlanabilir" olmayı aynı şey yapmıyor; 16.000
 * nesne için toplu çekmek ise açıkça ihlal olurdu. Bu yüzden onlardan
 * görüntü ALMIYORUZ.
 *
 * DSS2 (Digitized Sky Survey, Palomar/UK Schmidt plakalarının sayısal
 * hâli) kamuya açık. CDS'in `hips2fits` servisi her koordinat için
 * kesit üretiyor — yani kataloğun TAMAMI kapsanıyor, "popüler 200
 * nesnenin görseli var, gerisi boş" durumu oluşmuyor. Aladin ve
 * AstroBin'in nesne sayfalarında gördüğünüz gökyüzü altlığı da aynı
 * kaynak.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN DOĞRUDAN BAĞLANIYORUZ
 *
 * Görüntüler kendi depolamamıza kopyalanmıyor. Kopyalasaydık 16.149
 * nesne × birkaç boyut = on binlerce dosya ve hiç görüntülenmeyecek
 * olanların da bedeli. Tembel yükleme (`loading="lazy"`) sayesinde
 * yalnızca ekrana giren kart istek atıyor ve tarayıcı önbelleği geri
 * kalanı hallediyor.
 *
 * URL üretimi TEK YERDE (bu dosya) — ileride bir önbellek vekili
 * konursa çağrı yerlerinin hiçbiri değişmeyecek.
 */

const HIPS2FITS = 'https://alasky.cds.unistra.fr/hips-image-services/hips2fits';

/**
 * Kullanılan tarama katmanı.
 *
 * DSS2 renkli, kırmızı ve mavi plakaların birleşimi: emisyon
 * bulutsuları kırmızı, yansıma bulutsuları mavi çıkıyor, yani görüntü
 * sınıflandırmayı da destekliyor. Tek bantlı bir katman (DSS2/red) daha
 * keskin ama gri olurdu.
 */
const KATMAN = 'CDS/P/DSS2/color';

/**
 * Kadraj payı: cismin kendi boyutunun 2,4 katı.
 *
 * Tam boyutta kadrajlamak cismi çerçeveye yapıştırır ve nerede
 * durduğunu göstermez. İki buçuk kat, cismi ortada bırakıp çevresini de
 * gösteren yaygın kadraj — hedef kartında istenen tam olarak bu.
 */
const PAY = 2.4;

/**
 * En küçük ve en büyük kadraj.
 *
 * ALT SINIR: 10 yay dakikasının altına inince DSS plakalarının kendi
 * çözünürlüğü bitiyor ve görüntü bulanık bir lekeye dönüyor. Küçük
 * gezegenimsi bulutsularda görüntü zaten sınırda; daha da yakınlaşmak
 * bilgi eklemiyor.
 *
 * ÜST SINIR: 5 derece. Barnard 150 ya da LDN kompleksleri gibi çok
 * büyük alanlarda daha geniş kadraj, cismi görünmez bir toz lekesi
 * yapardı.
 */
const EN_KUCUK_ARCMIN = 10;
const EN_BUYUK_ARCMIN = 300;

export interface OnizlemeIstegi {
  raDeg: number;
  decDeg: number;
  /** Cismin büyük ekseni, yay dakikası. Bilinmiyorsa alt sınır kullanılır. */
  arcmin?: number | null;
  width: number;
  height: number;
}

/**
 * Gök taraması kesiti için görsel adresi.
 *
 * `null` dönen tek durum geçersiz koordinat: güneş sistemi hedeflerinin
 * (Ay, gezegenler, meteor yağmurları) sabit koordinatı yok ve onlara
 * gökyüzünden bir kesit göstermek yanlış bir yeri göstermek olurdu.
 */
export function taramaOnizlemesi(istek: OnizlemeIstegi): string | null {
  const { raDeg, decDeg, arcmin, width, height } = istek;

  if (!Number.isFinite(raDeg) || !Number.isFinite(decDeg)) return null;
  if (decDeg < -90 || decDeg > 90) return null;

  const ham = (arcmin ?? 0) * PAY;
  const kadraj = Math.min(
    EN_BUYUK_ARCMIN,
    Math.max(EN_KUCUK_ARCMIN, ham || EN_KUCUK_ARCMIN)
  );

  /*
    `fov` GENİŞLİK üzerinden veriliyor (servisin tanımı bu). Kart geniş
    bir dikdörtgense yükseklik otomatik daralır; cismi ortada tutmak
    için kadrajı kısa kenara göre büyütüyoruz — aksi hâlde geniş bir
    kartta cismin üstü ve altı kırpılırdı.
  */
  const enBoy = width / height;
  const fovDerece = (enBoy < 1 ? kadraj / enBoy : kadraj) / 60;

  const p = new URLSearchParams({
    hips: KATMAN,
    width: String(Math.round(width)),
    height: String(Math.round(height)),
    fov: fovDerece.toFixed(4),
    projection: 'TAN',
    coordsys: 'icrs',
    ra: raDeg.toFixed(6),
    dec: decDeg.toFixed(6),
    format: 'jpg',
  });

  return `${HIPS2FITS}?${p.toString()}`;
}

/** Görsellerin kaynağı — kullanıcıya gösterilen atıf. */
export const TARAMA_ATFI =
  'DSS2 · Digitized Sky Survey / CDS (kamuya açık)';

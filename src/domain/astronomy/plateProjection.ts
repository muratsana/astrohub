/**
 * ALAN ÇÖZÜMÜNDEN KADRAJ KOORDİNATINA — katalog etiketlerinin yeri.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NE YAPIYOR
 *
 * Alan çözümü bir fotoğrafın gökyüzündeki yerini söylüyor: merkez
 * (RA/Dec), dönüklük, ölçek ve alan genişliği. Katalog da her cismin
 * gökyüzündeki yerini biliyor. Bu modül ikisini birleştirip "NGC 1977
 * bu fotoğrafın SOL ÜST çeyreğinde" diyebilmeyi sağlıyor — AstroBin'in
 * açıklamalı görüntüsünün yaptığı iş.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN GNOMONİK (TAN) İZDÜŞÜM
 *
 * astrometry.net çözümü TAN izdüşümünde veriyor ve teleskoplar zaten
 * yaklaşık olarak öyle görüntülüyor. Düzlemsel (kartezyen) bir yaklaşım
 * küçük alanlarda çalışır ama 2–3 derecelik geniş alan kadrajlarında
 * kenarlarda gözle görülür kayma bırakır — tam da etiketin yanlış
 * cisme yapıştığı yer.
 *
 * ══════════════════════════════════════════════════════════════════════
 * İKİ KONVANSİYON, İKİ AYRI SATIR
 *
 * Bu hesabın iki yerde yanlış gitme ihtimali var ve ikisi de tek bir
 * sabitte toplandı:
 *
 *   DÖNÜKLÜK — astrometry.net'in `orientation` değeri, görüntünün
 *   YUKARI yönünün kuzeyden doğuya doğru ölçülen açısı. Yani 0
 *   derecede kuzey yukarıda.
 *
 *   PARİTE — kadrajın aynalı olup olmadığı. Aynasız bir gökyüzü
 *   görüntüsünde kuzey yukarıdayken DOĞU SOLDADIR (gökyüzüne içeriden
 *   bakıyoruz). Ayna görüntüsünde sağda.
 *
 * Parite değeri gelmezse aynasız varsayılıyor: setup'ların çoğu öyle ve
 * yanlış tarafa yazmaktansa yaygın olanı varsaymak daha az zarar
 * veriyor. Değer geldiğinde tahmine gerek kalmıyor.
 */

const D2R = Math.PI / 180;

export interface CozumGeometrisi {
  /** Alan merkezi, derece. */
  raDeg: number;
  decDeg: number;
  /** Görüntünün yukarı yönünün kuzeyden doğuya açısı, derece. */
  rotationDeg: number;
  /** Kadraj genişliği ve yüksekliği, derece. */
  fieldWidthDeg: number;
  fieldHeightDeg: number;
  /** astrometry.net paritesi; bilinmiyorsa `null`. */
  parity?: number | null;
}

export interface KadrajNoktasi {
  /** Soldan sağa 0–1 arası oran. */
  x: number;
  /** Yukarıdan aşağı 0–1 arası oran. */
  y: number;
}

/**
 * PARİTE İŞARETİNİN ANLAMI — değişecekse burası değişir.
 *
 * astrometry.net dokümantasyonunda parite, WCS dönüşüm matrisinin
 * determinantının işareti. Negatif determinant "normal" gökyüzü
 * görüntüsü demek (doğu solda); pozitif olan ayna görüntüsü.
 *
 * Sabit burada tek satır olarak duruyor: gerçek bir çözümde etiketler
 * doğu-batı ters çıkarsa düzeltilecek yer tam olarak bu karşılaştırma,
 * hesabın geri kalanı değil.
 */
function aynaliMi(parity: number | null | undefined): boolean {
  return typeof parity === 'number' && parity > 0;
}

/**
 * Gök cismini kadraj oranına çevirir.
 *
 * `null` dönen durumlar:
 *   · Kadraj boyutu bilinmiyor ya da sıfır — oran hesaplanamaz.
 *   · Cisim gökyüzünün ÖBÜR YARISINDA. Gnomonik izdüşüm 90 dereceden
 *     uzaktaki noktaları sonsuza gönderiyor; oradan bir sayı üretmek
 *     kadrajın içinde bir yer uydurmak olurdu.
 *
 * Kadrajın DIŞINA düşen sonuçlar `null` DEĞİL: çağıran taraf hem
 * "kadrajda değil" hem "biraz dışında" durumlarını ayırt edebilsin diye
 * oran 0–1 aralığının dışına taşabiliyor.
 */
export function gokyuzundenKadraja(
  cozum: CozumGeometrisi,
  hedefRaDeg: number,
  hedefDecDeg: number
): KadrajNoktasi | null {
  const { fieldWidthDeg: gen, fieldHeightDeg: yuk } = cozum;
  if (!(gen > 0) || !(yuk > 0)) return null;

  const ra0 = cozum.raDeg * D2R;
  const dec0 = cozum.decDeg * D2R;
  const ra = hedefRaDeg * D2R;
  const dec = hedefDecDeg * D2R;

  const dRa = ra - ra0;
  const cosc =
    Math.sin(dec0) * Math.sin(dec) +
    Math.cos(dec0) * Math.cos(dec) * Math.cos(dRa);

  /* cosc <= 0: cisim izdüşüm düzleminin arkasında ya da tam ufkunda. */
  if (cosc <= 1e-9) return null;

  /* Standart koordinatlar, radyan. ksi doğuya, eta kuzeye artıyor. */
  const ksi = (Math.cos(dec) * Math.sin(dRa)) / cosc;
  const eta =
    (Math.cos(dec0) * Math.sin(dec) -
      Math.sin(dec0) * Math.cos(dec) * Math.cos(dRa)) /
    cosc;

  /*
    EKRAN EKSENLERİNE ÇEVİRME.

    Dönüklük sıfırken ve ayna yokken:
      · kuzey (eta +) YUKARI  → ekran y ekseni aşağı arttığı için -eta
      · doğu  (ksi +) SOLA    → -ksi

    Aynalı kadrajda doğu sağa gider; tek değişen ksi'nin işareti.
  */
  const dogudanSaga = aynaliMi(cozum.parity) ? 1 : -1;
  const sagX = dogudanSaga * ksi;
  const asagiY = -eta;

  /*
    Dönüklük, görüntünün yukarı yönünün kuzeyden doğuya açısı. Kadrajı
    o açı kadar geri döndürmek, gökyüzü eksenlerini ekran eksenlerine
    oturtuyor. Ayna, dönüş yönünü de tersine çeviriyor — aksi hâlde
    aynalı bir kadrajda etiketler doğru tarafta ama yanlış açıda
    çıkardı.
  */
  const aci = cozum.rotationDeg * D2R * dogudanSaga;
  const cos = Math.cos(aci);
  const sin = Math.sin(aci);

  const donmusX = sagX * cos - asagiY * sin;
  const donmusY = sagX * sin + asagiY * cos;

  /* Radyandan kadraj oranına: alan genişliği derece cinsinden. */
  const genRad = gen * D2R;
  const yukRad = yuk * D2R;

  return {
    x: 0.5 + donmusX / genRad,
    y: 0.5 + donmusY / yukRad,
  };
}

/**
 * Nokta kadrajın içinde mi.
 *
 * ══════════════════════════════════════════════════════════════════════
 * PAY ARTIK VARSAYILAN OLARAK SIFIR
 *
 * Sabit %6'lık bir pay vardı ve gerekçesi şuydu: kadrajın hemen
 * kenarındaki büyük bir bulutsunun MERKEZİ dışarıda kalabilir ama
 * kendisi karede görünür.
 *
 * Gerekçe doğruydu, uygulaması yanlıştı. Pay her cisme aynı şekilde
 * veriliyordu — bir yıldıza da, boyutu hiç bilinmeyen bir kayda da.
 * Sonuç canlıda görüldü: fotoğrafın DIŞINDA, siyah alanda "M 52",
 * "NGC 7635", "IC 1470" etiketleri belirdi. Alan çözümü bir ÖLÇÜM;
 * kadrajın dışına taşan bir etiket o ölçümün güvenilirliğini bitirir.
 *
 * Varsayılan artık sıfır: merkezi dışarıdaysa cisim karede değildir.
 * Payı yalnızca cismin KENDİ AÇISAL BOYUTUNU bilen çağıran veriyor
 * (bkz. `fieldObjects`), çünkü payın ne kadar olacağını yalnızca o
 * bilebilir. Noktasal kaynaklarda (yıldız) pay hiç yok — bir yıldızın
 * merkezi dışarıdaysa yıldız da dışarıdadır.
 */
export function kadrajIcinde(nokta: KadrajNoktasi, pay = 0): boolean {
  return (
    nokta.x >= -pay && nokta.x <= 1 + pay && nokta.y >= -pay && nokta.y <= 1 + pay
  );
}

/** Kadrajın köşegeni, derece — koni araması yarıçapı için. */
export function kadrajYaricapiDerece(cozum: CozumGeometrisi): number {
  const { fieldWidthDeg: gen, fieldHeightDeg: yuk } = cozum;
  if (!(gen > 0) || !(yuk > 0)) return 0;
  return Math.sqrt(gen * gen + yuk * yuk) / 2;
}

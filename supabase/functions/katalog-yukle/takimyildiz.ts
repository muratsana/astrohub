/**
 * KOORDİNATTAN TAKIMYILDIZ.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN HESAPLIYORUZ
 *
 * OpenNGC her satırda takımyıldızı veriyor. VizieR'deki Sh2, Barnard,
 * LDN, vdB, Ced, RCW tabloları VERMİYOR — o kataloglar 1950'lerde
 * yayımlandı ve takımyıldız sütunu taşımıyorlar. Tabloya "—" yazmak
 * 4.000 kaydı takımyıldız filtresinin dışında bırakırdı; hedef ararken
 * en çok kullanılan filtre o.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN B1875, NEDEN J2000 DEĞİL
 *
 * IAU sınırları 1930'da B1875 çerçevesinde, sağ açıklık ve dik açıklık
 * doğrularına PARALEL çizildi. J2000'de o doğrular artık eğik: sınır
 * tablosunu doğrudan J2000 koordinatıyla taramak, sınıra yakın
 * cisimlerde yanlış takımyıldız verir. Doğru yol koordinatı B1875'e
 * geri götürmek — Roman'ın (1987) tablonun kullanımı için tarif ettiği
 * yöntem bu.
 *
 * Presesyon burada Newcomb'un dönüşümünün küçük açı yaklaşımıyla
 * uygulanıyor. 125 yıllık geri gidişte hata yay saniyeleri
 * mertebesinde; sınır tablosunun çözünürlüğü ise yay dakikası, yani
 * fazlasıyla yeterli.
 */

/** IAU üç harfli kısaltma → Türkçe ad. */
export const TAKIMYILDIZ_TR: Record<string, string> = {
  And: 'Andromeda',
  Ant: 'Pompa',
  Aps: 'Cennet Kuşu',
  Aql: 'Kartal',
  Aqr: 'Kova',
  Ara: 'Sunak',
  Ari: 'Koç',
  Aur: 'Arabacı',
  Boo: 'Çoban',
  Cae: 'Kalem',
  Cam: 'Zürafa',
  Cap: 'Oğlak',
  Car: 'Karina',
  Cas: 'Kraliçe',
  Cen: 'Erboğa',
  Cep: 'Kral',
  Cet: 'Balina',
  Cha: 'Bukalemun',
  Cir: 'Pergel',
  CMa: 'Büyük Köpek',
  CMi: 'Küçük Köpek',
  Cnc: 'Yengeç',
  Col: 'Güvercin',
  Com: 'Berenis Saçı',
  CrA: 'Güney Tacı',
  CrB: 'Kuzey Tacı',
  Crt: 'Kadeh',
  Cru: 'Güney Haçı',
  Crv: 'Kuzgun',
  CVn: 'Av Köpekleri',
  Cyg: 'Kuğu',
  Del: 'Yunus',
  Dor: 'Yaldızlı Balık',
  Dra: 'Ejder',
  Equ: 'Tay',
  Eri: 'Irmak',
  For: 'Ocak',
  Gem: 'İkizler',
  Gru: 'Turna',
  Her: 'Herkül',
  Hor: 'Saat',
  Hya: 'Hidra',
  Hyi: 'Küçük Su Yılanı',
  Ind: 'Yerli',
  Lac: 'Kertenkele',
  Leo: 'Aslan',
  Lep: 'Tavşan',
  Lib: 'Terazi',
  LMi: 'Küçük Aslan',
  Lup: 'Kurt',
  Lyn: 'Vaşak',
  Lyr: 'Çalgı',
  Men: 'Masa Dağı',
  Mic: 'Mikroskop',
  Mon: 'Tek Boynuzlu At',
  Mus: 'Sinek',
  Nor: 'Gönye',
  Oct: 'Sekizlik',
  Oph: 'Yılancı',
  Ori: 'Avcı',
  Pav: 'Tavus Kuşu',
  Peg: 'Pegasus',
  Per: 'Perseus',
  Phe: 'Anka',
  Pic: 'Ressam Sehpası',
  PsA: 'Güney Balığı',
  Psc: 'Balıklar',
  Pup: 'Pupa',
  Pyx: 'Pusula',
  Ret: 'Ağ',
  Scl: 'Heykeltıraş',
  Sco: 'Akrep',
  Sct: 'Kalkan',
  Ser: 'Yılan',
  Sex: 'Sekstant',
  Sge: 'Ok',
  Sgr: 'Yay',
  Tau: 'Boğa',
  Tel: 'Teleskop',
  TrA: 'Güney Üçgeni',
  Tri: 'Üçgen',
  Tuc: 'Tukan',
  UMa: 'Büyük Ayı',
  UMi: 'Küçük Ayı',
  Vel: 'Yelken',
  Vir: 'Başak',
  Vol: 'Uçan Balık',
  Vul: 'Küçük Tilki',
};

export interface Sinir {
  /** Alt sağ açıklık sınırı, SAAT (B1875). */
  raAlt: number;
  /** Üst sağ açıklık sınırı, saat. */
  raUst: number;
  /** Alt dik açıklık sınırı, derece. */
  decAlt: number;
  kisaltma: string;
}

/**
 * VI/42 çıktısını sınır dizisine çevirir.
 *
 * Tablo dik açıklığa göre azalan sırada ve arama "ilk eşleşen satır"
 * kuralıyla çalışıyor; sıra bozulursa sonuç bozulur, bu yüzden satırlar
 * kaynaktaki sırasıyla korunuyor.
 */
export function sinirlariAyristir(metin: string): Sinir[] {
  const sinirlar: Sinir[] = [];

  for (const satir of metin.split('\n')) {
    /* VizieR başlıkları `#`, birim ve ayraç satırları harf/tire ile
       başlıyor. Veri satırı her zaman boşluk veya rakamla başlar. */
    if (!satir || satir.startsWith('#')) continue;
    const parcalar = satir.split('\t');
    if (parcalar.length < 4) continue;

    const raAlt = Number(parcalar[0]);
    const raUst = Number(parcalar[1]);
    const decAlt = Number(parcalar[2]);
    const kisaltma = parcalar[3].trim();

    if (!Number.isFinite(raAlt) || !Number.isFinite(raUst)) continue;
    if (!Number.isFinite(decAlt) || !TAKIMYILDIZ_TR[kisaltma]) continue;

    sinirlar.push({ raAlt, raUst, decAlt, kisaltma });
  }

  return sinirlar;
}

const D2R = Math.PI / 180;

/**
 * J2000 → B1875 (yaklaşık).
 *
 * Presesyon açıları Newcomb ifadelerinden J2000'den geriye 125 yıl için
 * hesaplanmış sabitler. Kartezyen dönüşüm yerine küçük açı formülü
 * kullanılıyor; kutba çok yakın cisimlerde (|dec| > 89.5°) formül
 * bozulur ama orada tek bir takımyıldız var (UMi/Oct) ve dik açıklık
 * kuralı zaten doğru cevabı veriyor.
 */
function b1875e(raDeg: number, decDeg: number): [number, number] {
  /* J2000'den B1875'e: T = -1.25 yüzyıl. */
  const T = -1.25;
  const zeta = (2306.2181 * T + 0.30188 * T * T) / 3600;
  const z = (2306.2181 * T + 1.09468 * T * T) / 3600;
  const theta = (2004.3109 * T - 0.42665 * T * T) / 3600;

  const ra = (raDeg + zeta) * D2R;
  const dec = decDeg * D2R;

  const A = Math.cos(dec) * Math.sin(ra);
  const B =
    Math.cos(theta * D2R) * Math.cos(dec) * Math.cos(ra) -
    Math.sin(theta * D2R) * Math.sin(dec);
  const C =
    Math.sin(theta * D2R) * Math.cos(dec) * Math.cos(ra) +
    Math.cos(theta * D2R) * Math.sin(dec);

  let ra1875 = Math.atan2(A, B) / D2R + z;
  const dec1875 = Math.asin(Math.max(-1, Math.min(1, C))) / D2R;

  ra1875 = ((ra1875 % 360) + 360) % 360;
  return [ra1875, dec1875];
}

/**
 * Verilen J2000 konumunun takımyıldızı — Türkçe ad.
 *
 * Hiçbir sınır eşleşmezse `null`: uydurulmuş bir takımyıldız, boş
 * bırakılmış olandan daha kötüdür çünkü filtrede sessizce yanlış sonuç
 * üretir.
 */
export function takimyildizBul(
  sinirlar: Sinir[],
  raDeg: number,
  decDeg: number
): string | null {
  const [ra1875, dec1875] = b1875e(raDeg, decDeg);
  const raSaat = ra1875 / 15;

  for (const s of sinirlar) {
    if (dec1875 < s.decAlt) continue;
    if (raSaat < s.raAlt || raSaat >= s.raUst) continue;
    return TAKIMYILDIZ_TR[s.kisaltma] ?? null;
  }

  return null;
}

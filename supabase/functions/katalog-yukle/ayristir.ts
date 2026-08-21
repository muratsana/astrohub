/**
 * KATALOG AYRIŞTIRMA — ham metinden normalleştirilmiş gök cismine.
 *
 * Bu dosyada ağ da veritabanı da yok; girdisi metin, çıktısı nesne
 * dizisi. Böyle olması bilinçli: 19.000 kaydı üreten mantığın testi,
 * internete ya da bir veritabanına ihtiyaç duymadan çalışabilmeli.
 */

import { takimyildizBul, type Sinir } from './takimyildiz.ts';
import type { VizierKaynak } from './kaynaklar.ts';

export interface Nesne {
  slug: string;
  ad: string;
  /** Birincil katalog kodu — "NGC 7000", "Sh2-155". */
  katalog: string;
  tur: string;
  takimyildiz: string;
  raDeg: number | null;
  decDeg: number | null;
  kadir: number | null;
  buyukEksen: number | null;
  kucukEksen: number | null;
  /** Birincil dâhil tüm katalog kodları. */
  kodlar: string[];
}

/**
 * OpenNGC tip kodu → bizim tür sınıfımız.
 *
 * `Dup` ve `NonEx` burada yok, çünkü ikisi de NESNE DEĞİL: `Dup` başka
 * bir kaydın ikinci numarası (takma ada dönüşüyor), `NonEx` ise
 * kataloğa yanlışlıkla girmiş, gökyüzünde karşılığı olmayan bir kayıt.
 * Onları "bilinmeyen tür" diye içeri almak, hedef listesine gökyüzünde
 * bulunmayan on satır eklemek olurdu.
 */
export const TUR_ESLEME: Record<string, string> = {
  G: 'galaksi',
  GPair: 'galaksi-grubu',
  GTrpl: 'galaksi-grubu',
  GGroup: 'galaksi-grubu',
  GCl: 'kuresel-kume',
  OCl: 'acik-kume',
  'Cl+N': 'acik-kume',
  PN: 'gezegenimsi-bulutsu',
  SNR: 'sungerimsi-kalinti',
  HII: 'emisyon-bulutsusu',
  EmN: 'emisyon-bulutsusu',
  RfN: 'yansima-bulutsusu',
  DrkN: 'karanlik-bulutsu',
  Neb: 'bulutsu',
  '*': 'yildiz',
  '**': 'cift-yildiz',
  '*Ass': 'asterizm',
  Nova: 'yildiz',
  Other: 'diger',
};

/** Ad üretiminde kullanılan tamlama ekleri. */
export const TUR_ADI: Record<string, string> = {
  galaksi: 'Galaksisi',
  'galaksi-grubu': 'Galaksi Grubu',
  'emisyon-bulutsusu': 'Emisyon Bulutsusu',
  'yansima-bulutsusu': 'Yansıma Bulutsusu',
  'gezegenimsi-bulutsu': 'Gezegenimsi Bulutsusu',
  'karanlik-bulutsu': 'Karanlık Bulutsusu',
  'sungerimsi-kalinti': 'Süpernova Kalıntısı',
  'kuresel-kume': 'Küresel Kümesi',
  'acik-kume': 'Açık Kümesi',
  'yildiz-bulutu': 'Yıldız Bulutu',
  'cift-yildiz': 'Çift Yıldızı',
  asterizm: 'Asterizmi',
  bulutsu: 'Bulutsusu',
  yildiz: 'Yıldızı',
  diger: 'Gök Cismi',
};

/**
 * Takma ad olarak SAKLANAN katalog önekleri.
 *
 * OpenNGC her satıra 20'ye yakın çapraz kimlik veriyor: SDSS, IRAS,
 * TYC, UCAC, 2MASS… Hepsini almak `catalog_identifiers` tablosunu
 * 90.000 satıra çıkarır ve hiçbirinin arama değeri yoktur — kimse
 * "SDSS J004244.33+411608.6" yazarak hedef aramıyor.
 *
 * Buradakiler ise gerçekten aranan kodlar: PGC ve UGC galaksi
 * literatüründe standart, ESO ve MCG güney yarımkürede yaygın, MWSC
 * açık küme kaynaklarının ortak dili, PK/PN G gezegenimsi bulutsuların,
 * C Caldwell, LBN Lynds.
 */
const KABUL_EDILEN_ONEKLER = [
  'PGC',
  'UGC',
  'UGCA',
  'ESO',
  'MCG',
  'LEDA',
  'MWSC',
  'PN G',
  'PK',
  'C',
  'LBN',
  'Cr',
  'Mel',
];

/** "00:08:27.05" → derece. */
function raSaatiDerece(metin: string): number | null {
  const p = metin.trim().split(':');
  if (p.length !== 3) return null;
  const [s, d, sn] = p.map(Number);
  if (![s, d, sn].every(Number.isFinite)) return null;
  return (s + d / 60 + sn / 3600) * 15;
}

/** "+27:43:03.6" → derece. */
function decDerece(metin: string): number | null {
  const ham = metin.trim();
  const p = ham.replace(/^[+-]/, '').split(':');
  if (p.length !== 3) return null;
  const [d, dk, sn] = p.map(Number);
  if (![d, dk, sn].every(Number.isFinite)) return null;
  const isaret = ham.startsWith('-') ? -1 : 1;
  return isaret * (d + dk / 60 + sn / 3600);
}

function sayi(metin: string | undefined): number | null {
  if (metin === undefined) return null;
  const t = metin.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function katalogNumarasi(
  kaynak: VizierKaynak,
  metin: string | undefined
): number | null {
  if (kaynak.numaraDeseni) {
    const m = new RegExp(kaynak.numaraDeseni).exec((metin ?? '').trim());
    return m?.[1] ? sayi(m[1]) : null;
  }

  return sayi(metin);
}

/**
 * "NGC0224" → "NGC 224", "IC0059A" → "IC 59A".
 *
 * OpenNGC adları sabit genişlikte sıfır dolgulu; ekranda ve aramada
 * kullanılan biçim ise boşluklu ve dolgusuz. Dönüşüm burada tek yerde
 * çünkü aynı kayıt hem birincil kod hem takma ad olarak geçebiliyor.
 */
export function openNgcAdi(ham: string): string | null {
  const m = /^(NGC|IC)(\d+)(.*)$/.exec(ham.trim());
  if (!m) return null;
  return `${m[1]} ${Number(m[2])}${m[3]}`;
}

/**
 * Katalog kodundan URL parçası: "Sh2-155" → "sh2-155", "NGC 7000" → "ngc7000".
 *
 * Veritabanındaki `celestial_slug_format` kısıtı `^[a-z0-9-]{2,80}$`
 * istiyor. Türkçe harfler önce ASCII karşılığına iniyor: `toLowerCase`
 * "İ" harfini nokta taşıyan bir karaktere çevirir ve o karakter kısıtı
 * düşürürdü.
 */
export function slugUret(kod: string): string {
  const ascii = kod
    .replace(/[ıİ]/g, 'i')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u')
    .replace(/[şŞ]/g, 's')
    .replace(/[öÖ]/g, 'o')
    .replace(/[çÇ]/g, 'c');

  return ascii
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Koordinatı veritabanının kabul ettiği aralığa indirir.
 *
 * `celestial_ra_range` sağ açıklığı [0, 360) istiyor: kaynaklarda 360.0
 * değeri geçebiliyor ve tek bir satır yüzünden 19.000 satırlık ekleme
 * düşerdi. Dik açıklık kırpılmıyor, ELENİYOR — |dec| > 90 bir yuvarlama
 * artığı değil, o satırın bozuk olduğunun işareti.
 */
function konumNormalle(
  raDeg: number | null,
  decDeg: number | null
): [number | null, number | null] {
  if (raDeg === null || decDeg === null) return [null, null];
  if (!Number.isFinite(raDeg) || !Number.isFinite(decDeg)) return [null, null];
  if (decDeg < -90 || decDeg > 90) return [null, null];
  return [((raDeg % 360) + 360) % 360, decDeg];
}

/** Takma ad kodunu normalleştirir; tutmaya değmiyorsa `null`. */
function takmaAdNormalle(ham: string): string | null {
  const t = ham.trim();
  if (!t) return null;

  const onek = KABUL_EDILEN_ONEKLER.find(
    (o) => t === o || t.startsWith(`${o} `) || t.startsWith(`${o}0`)
  );
  if (!onek) return null;

  const kalan = t.slice(onek.length).trim();
  if (!kalan) return null;

  /* Baştaki sıfırlar düşüyor: "C 009" ile "C 9" aynı kod ve ikisini de
     tutmak aramada iki farklı sonuç gibi görünürdü. Harf soneki olan
     kayıtlarda (ESO 056-115) sayıya çevirme yapılmıyor. */
  const sadeceSayi = /^0*(\d+)$/.exec(kalan);
  return sadeceSayi ? `${onek} ${Number(sadeceSayi[1])}` : `${onek} ${kalan}`;
}

interface HamSatir {
  ad: string;
  tip: string;
  raDeg: number | null;
  decDeg: number | null;
  takimyildiz: string;
  buyuk: number | null;
  kucuk: number | null;
  kadir: number | null;
  messier: string;
  ngc: string;
  ic: string;
  kimlikler: string;
  yayginAd: string;
}

function hamSatirOku(alanlar: string[]): HamSatir | null {
  const ad = (alanlar[0] ?? '').trim();
  if (!ad) return null;

  return {
    ad,
    tip: (alanlar[1] ?? '').trim(),
    raDeg: raSaatiDerece(alanlar[2] ?? ''),
    decDeg: decDerece(alanlar[3] ?? ''),
    takimyildiz: (alanlar[4] ?? '').trim(),
    buyuk: sayi(alanlar[5]),
    kucuk: sayi(alanlar[6]),
    /* Görsel kadir yoksa mavi kadir: ikisi farklı büyüklükler ama boş
       bırakmak, kaydı "kadir bilinmiyor" kutusuna atardı ve zorluk
       hesabı o kayıtta hep en kötü senaryoyu varsayardı. */
    kadir: sayi(alanlar[9]) ?? sayi(alanlar[8]),
    messier: (alanlar[23] ?? '').trim(),
    ngc: (alanlar[24] ?? '').trim(),
    ic: (alanlar[25] ?? '').trim(),
    kimlikler: (alanlar[27] ?? '').trim(),
    yayginAd: (alanlar[28] ?? '').trim(),
  };
}

/**
 * OpenNGC CSV'sini nesnelere çevirir.
 *
 * `ek` dosyası (addendum) NGC/IC numarası olmayan ama Messier ya da
 * Caldwell listesinde yer alan kayıtları taşıyor — M 40, M 102, Mel 111
 * gibi. Aynı sütun düzeninde olduğu için aynı ayrıştırıcıdan geçiyor.
 */
export function openNgcAyristir(
  csv: string,
  ek: string,
  sinirlar: Sinir[]
): { nesneler: Nesne[]; kopyalar: Map<string, string> } {
  const nesneler: Nesne[] = [];
  /* Kopya kayıtlar: "NGC 5866B" → "NGC 5866". Nesne olarak eklenmiyor,
     asıl kaydın takma adına dönüşüyorlar. */
  const kopyalar = new Map<string, string>();

  for (const kaynak of [csv, ek]) {
    const satirlar = kaynak.split('\n');
    for (let i = 1; i < satirlar.length; i++) {
      const satir = satirlar[i];
      if (!satir.trim()) continue;

      const ham = hamSatirOku(satir.split(';'));
      if (!ham) continue;
      if (ham.tip === 'NonEx') continue;

      const kod = openNgcAdi(ham.ad) ?? ekAdi(ham.ad);
      if (!kod) continue;

      if (ham.tip === 'Dup') {
        const asil = ham.ngc
          ? openNgcAdi(`NGC${ham.ngc}`)
          : ham.ic
            ? openNgcAdi(`IC${ham.ic}`)
            : null;
        if (asil && asil !== kod) kopyalar.set(kod, asil);
        continue;
      }

      const tur = TUR_ESLEME[ham.tip] ?? 'diger';

      const kodlar = new Set<string>([kod]);
      if (ham.messier) kodlar.add(`M ${Number(ham.messier)}`);
      if (ham.ngc && !kod.startsWith('NGC')) {
        const n = openNgcAdi(`NGC${ham.ngc}`);
        if (n) kodlar.add(n);
      }
      if (ham.ic && !kod.startsWith('IC')) {
        const n = openNgcAdi(`IC${ham.ic}`);
        if (n) kodlar.add(n);
      }
      for (const parca of ham.kimlikler.split(',')) {
        const takma = takmaAdNormalle(parca);
        if (takma) kodlar.add(takma);
      }

      /* Messier numarası varsa BİRİNCİL kod o olur: "M 31" kullanıcının
         yazdığı ad, "NGC 224" ise ikinci sıradaki teknik kod. */
      const messier = [...kodlar].find((k) => k.startsWith('M '));
      const birincil = messier ?? kod;

      const [raDeg, decDeg] = konumNormalle(ham.raDeg, ham.decDeg);
      const takimyildiz =
        (raDeg !== null && decDeg !== null
          ? takimyildizBul(sinirlar, raDeg, decDeg)
          : null) ?? '—';

      nesneler.push({
        slug: slugUret(birincil),
        ad: ham.yayginAd || `${birincil} ${TUR_ADI[tur] ?? 'Gök Cismi'}`,
        katalog: birincil,
        tur,
        takimyildiz,
        raDeg,
        decDeg,
        kadir: ham.kadir,
        buyukEksen: ham.buyuk,
        kucukEksen: ham.kucuk,
        kodlar: [...kodlar],
      });
    }
  }

  return { nesneler, kopyalar };
}

/**
 * Addendum dosyasındaki NGC/IC dışı adlar: "M040", "Mel022", "HCG079",
 * "ESO056-115", "Cl399".
 */
function ekAdi(ham: string): string | null {
  const t = ham.trim();
  const m = /^([A-Za-z]+)0*(\d+.*)$/.exec(t);
  if (!m) return null;
  const onek = m[1] === 'Cl' ? 'Cr' : m[1];
  return `${onek} ${m[2]}`;
}

/**
 * VizieR TSV çıktısını nesnelere çevirir.
 *
 * VizieR biçimi: `#` ile başlayan üstbilgi, ardından sütun adları, birim
 * satırı, `----` ayracı ve veri. Sütunlar ADLA bulunuyor, sırayla değil:
 * VizieR istenmeyen bir sütunu atlarsa (bazı tablolarda `Diam` boş
 * geliyor) sıraya güvenen bir okuyucu sessizce kaydırırdı.
 */
export function vizierAyristir(
  kaynak: VizierKaynak,
  tsv: string,
  sinirlar: Sinir[]
): Nesne[] {
  const satirlar = tsv.split('\n');
  const baslikIndeksi = satirlar.findIndex(
    (s) => !s.startsWith('#') && s.includes('_RAJ2000')
  );
  if (baslikIndeksi < 0) return [];

  const basliklar = satirlar[baslikIndeksi].split('\t').map((s) => s.trim());
  const sutun = (ad: string | undefined): number =>
    ad ? basliklar.indexOf(ad) : -1;

  const iRa = sutun('_RAJ2000');
  const iDec = sutun('_DEJ2000');
  const iNo = sutun(kaynak.numara);
  if (iRa < 0 || iDec < 0 || iNo < 0) return [];

  const iCap = sutun(kaynak.capSutun);
  const iCap2 = sutun(kaynak.capSutun2);
  const iAlan = sutun(kaynak.alanSutun);
  const iKadir = sutun(kaynak.kadirSutun);

  const gorulen = new Set<string>();
  const nesneler: Nesne[] = [];

  for (let i = baslikIndeksi + 1; i < satirlar.length; i++) {
    const satir = satirlar[i];
    if (!satir || satir.startsWith('#') || satir.startsWith('---')) continue;

    const alanlar = satir.split('\t');
    const numara = katalogNumarasi(kaynak, alanlar[iNo]);
    const [raDeg, decDeg] = konumNormalle(
      sayi(alanlar[iRa]),
      sayi(alanlar[iDec])
    );
    if (numara === null || raDeg === null || decDeg === null) continue;

    const kod = `${kaynak.onek}${kaynak.ayirici}${numara}`;
    /* Arp gibi kataloglarda bir numara altında birden çok galaksi
       listeleniyor; ilk satır grubun konumunu veriyor ve nesne o. */
    if (gorulen.has(kod)) continue;
    gorulen.add(kod);

    let buyuk = iCap >= 0 ? sayi(alanlar[iCap]) : null;
    const kucuk = iCap2 >= 0 ? sayi(alanlar[iCap2]) : null;

    if (buyuk === null && iAlan >= 0) {
      const alan = sayi(alanlar[iAlan]);
      /* LDN çap değil ALAN veriyor (derece kare). Eşdeğer daire çapına
         çeviriyoruz: kadraj hesabı bir açısal boyut bekliyor ve "0.054
         derece kare" o hesaba giremiyor. */
      if (alan !== null && alan > 0) {
        buyuk = Math.round(2 * Math.sqrt(alan / Math.PI) * 60 * 10) / 10;
      }
    }

    nesneler.push({
      slug: slugUret(kod),
      ad: `${kod} ${TUR_ADI[kaynak.tur] ?? 'Gök Cismi'}`,
      katalog: kod,
      tur: kaynak.tur,
      takimyildiz: takimyildizBul(sinirlar, raDeg, decDeg) ?? '—',
      raDeg,
      decDeg,
      kadir: iKadir >= 0 ? sayi(alanlar[iKadir]) : null,
      buyukEksen: buyuk,
      kucukEksen: kucuk,
      kodlar: [kod],
    });
  }

  return nesneler;
}

/** İki gökyüzü konumu arasındaki açı, YAY DAKİKASI. */
export function ayrilikArcmin(
  ra1: number,
  dec1: number,
  ra2: number,
  dec2: number
): number {
  const d = Math.PI / 180;
  const dRa = (ra2 - ra1) * d;
  const dDec = (dec2 - dec1) * d;
  const a =
    Math.sin(dDec / 2) ** 2 +
    Math.cos(dec1 * d) * Math.cos(dec2 * d) * Math.sin(dRa / 2) ** 2;
  return (2 * Math.asin(Math.min(1, Math.sqrt(a))) * 180 * 60) / Math.PI;
}

/**
 * KONUM EŞLEŞMESİ — NEDEN 2 YAY DAKİKASI.
 *
 * Aynı bulutsu vdB, Ced ve NGC'de üç ayrı numarayla geçebiliyor. Üç
 * kayıt bırakmak, hedef aramasında aynı şeyin üç kez çıkması demek.
 *
 * Eşik DAR tutuldu. Geniş bir eşik (10–15 yay dakikası) daha çok
 * birleştirme yapardı ama yanlış birleştirme de yapardı: Avcı
 * bölgesinde 10 yay dakikası içinde birbirinden bağımsız üç bulutsu
 * var ve onları tek kayda indirmek, kullanıcıya "böyle bir hedef yok"
 * dedirtirdi. İki yay dakikası, iki kataloğun aynı cisme verdiği
 * merkezler arasındaki tipik farkın üstünde, komşu cisimler arasındaki
 * mesafenin altında.
 *
 * Yanlış AYIRMANIN bedeli bir fazla satır; yanlış BİRLEŞTİRMENİN bedeli
 * kaybolmuş bir hedef. Eşik bu asimetriye göre seçildi.
 */
const ESLESME_ARCMIN = 2;

/**
 * Kaynakları tek listede birleştirir.
 *
 * İlk listedeki kayıtlar ASIL kabul ediliyor; sonraki listelerden gelen
 * ve konumca eşleşen kayıtlar onların takma adına dönüşüyor.
 */
export function birlestir(
  listeler: Nesne[][],
  kopyalar: Map<string, string>
): Nesne[] {
  const sonuc: Nesne[] = [];
  const kodSahibi = new Map<string, Nesne>();
  /* Dik açıklık kuşaklarına göre kaba indeks: eşleşme araması 19.000
     kaydın tamamını değil, yalnızca komşu üç kuşağı tarıyor. */
  const indeks = new Map<number, Nesne[]>();

  const ekle = (n: Nesne): void => {
    sonuc.push(n);
    for (const k of n.kodlar) kodSahibi.set(k, n);
    if (n.decDeg !== null) {
      const k = Math.floor(n.decDeg);
      const kova = indeks.get(k);
      if (kova) kova.push(n);
      else indeks.set(k, [n]);
    }
  };

  for (const liste of listeler) {
    for (const aday of liste) {
      /* Önce KOD eşleşmesi: kaynağın kendi beyan ettiği çapraz kimlik,
         konum tahmininden her zaman güvenilir. */
      const kodEsi = aday.kodlar
        .map((k) => kodSahibi.get(k))
        .find((n): n is Nesne => n !== undefined);

      if (kodEsi) {
        for (const k of aday.kodlar) {
          if (!kodEsi.kodlar.includes(k)) {
            kodEsi.kodlar.push(k);
            kodSahibi.set(k, kodEsi);
          }
        }
        continue;
      }

      const konumEsi =
        aday.raDeg !== null && aday.decDeg !== null
          ? konumdanBul(indeks, aday.raDeg, aday.decDeg)
          : null;

      if (konumEsi) {
        for (const k of aday.kodlar) {
          if (!konumEsi.kodlar.includes(k)) {
            konumEsi.kodlar.push(k);
            kodSahibi.set(k, konumEsi);
          }
        }
        continue;
      }

      ekle(aday);
    }
  }

  /* Kopya NGC/IC numaraları en sonda bağlanıyor: asıl kaydın hangi
     listede olduğunu bilmemiz gerekmiyor, kod sahipliği zaten kurulu. */
  for (const [kopya, asil] of kopyalar) {
    const sahip = kodSahibi.get(asil);
    if (sahip && !sahip.kodlar.includes(kopya)) {
      sahip.kodlar.push(kopya);
      kodSahibi.set(kopya, sahip);
    }
  }

  return sonuc;
}

function konumdanBul(
  indeks: Map<number, Nesne[]>,
  raDeg: number,
  decDeg: number
): Nesne | null {
  const merkez = Math.floor(decDeg);
  let enIyi: Nesne | null = null;
  let enYakin = ESLESME_ARCMIN;

  for (let k = merkez - 1; k <= merkez + 1; k++) {
    for (const n of indeks.get(k) ?? []) {
      if (n.raDeg === null || n.decDeg === null) continue;
      const d = ayrilikArcmin(raDeg, decDeg, n.raDeg, n.decDeg);
      if (d < enYakin) {
        enYakin = d;
        enIyi = n;
      }
    }
  }

  return enIyi;
}

/**
 * Slug çakışmalarını çözer.
 *
 * "NGC 5866B" ve "NGC 5866" farklı slug üretiyor ama "M 102" ile
 * "NGC 5866" birleşince aynı kayda iki aday slug kalabiliyor. Çakışan
 * ikinci kayda katalog kodunun tamamı ekleniyor — sessizce birini
 * düşürmek, o hedefin bağlantısını kalıcı olarak kırardı.
 */
export function slugCakismalariniCoz(nesneler: Nesne[]): void {
  const gorulen = new Set<string>();
  for (const n of nesneler) {
    let aday = n.slug || slugUret(n.katalog);
    /* Kısıt en az iki karakter istiyor. "M 1" → "m1" zaten iki; tek
       karaktere düşen bir kod olursa katalog önekiyle uzatılıyor. */
    if (aday.length < 2) aday = `nesne-${aday || 'x'}`;
    if (gorulen.has(aday)) {
      let i = 2;
      while (gorulen.has(`${aday}-${i}`)) i++;
      aday = `${aday}-${i}`;
    }
    n.slug = aday;
    gorulen.add(aday);
  }
}

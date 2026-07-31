import { targets, type CelestialTarget } from './data';

/**
 * KATALOG KODU TANIMA — dosya adından ve serbest metinden.
 *
 * İki iş yapıyor:
 *
 *   1. `resolveByCode`  — "ngc7000", "NGC 7000", "ngc-7000" hepsi aynı
 *      objeye çözülüyor; alias'lar da taranıyor, yani "NGC 224" M 31'i
 *      buluyor.
 *   2. `guessTargetFromFilename` — "M31_L_300s.fit" dosyasından M 31.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TASARIM: GENİŞ TAHMİN, SONRA KATALOGLA DOĞRULAMA.
 *
 * Dosya adları kirli: tarih ("2024-07-11"), poz ("300s"), filtre
 * ("Ha", "L"), sürüm ("v2"), kamera adı, hepsi bir arada. Dar bir
 * desenle "yalnız doğru olanı yakalamaya" çalışmak iki yönde de
 * hata veriyor — kaçırıyor ya da tarihi katalog kodu sanıyor.
 *
 * Bunun yerine desen BİLEREK geniş, süzgeç ise katalogun kendisi:
 * üretilen her aday gerçek bir kayda çözülüyor mu diye bakılıyor ve
 * çözülmeyen sessizce atılıyor. Yani yanlış bir tahminin kullanıcıya
 * ulaşması için katalogda o kodda gerçek bir obje bulunması gerekir.
 *
 * Bu, "IMG_2024.jpg" gibi bir dosyanın "2024" diye bir koda dönüşmesini
 * imkânsız kılıyor: hiçbir önekle eşleşmiyor, eşleşse bile katalogda
 * karşılığı yok.
 */

/**
 * Normalleştirme — VERİTABANIYLA BİREBİR AYNI KURAL.
 *
 * `catalog_identifiers.normalized` kolonu şöyle üretiliyor:
 *
 *     lower(replace(replace(code, ' ', ''), '-', ''))
 *
 * Aynı kuralı burada tekrar yazmak zorundayız (istemci veritabanına
 * sormadan çözüyor) ama AYNI olması şart: ikisi ayrışırsa aynı kod
 * istemcide bir objeye, sunucuda başkasına çözülür ve bunu kimse fark
 * etmez. Türkçe yerel ayarı bilinçli: `toLowerCase()` "I" harfini
 * "ı" yapmaz ve "IC" kodunu bozardı.
 */
export function normalizeCode(code: string): string {
  return code.toLocaleLowerCase('en-US').replace(/[\s-]/g, '');
}

/** Normalleştirilmiş kod → hedef. Alias'lar dahil, tek seferde kuruluyor. */
const byCode = new Map<string, CelestialTarget>();
for (const target of targets) {
  for (const code of [target.catalog, ...target.aliases]) {
    const key = normalizeCode(code);
    // İlk gelen kazanıyor: birincil katalog kodu alias'tan önce yazılıyor.
    if (!byCode.has(key)) byCode.set(key, target);
  }
}

/** Kesin kod eşleşmesi — arama değil, çözümleme. Bulunamazsa `null`. */
export function resolveByCode(code: string): CelestialTarget | null {
  const key = normalizeCode(code);
  if (!key) return null;
  return byCode.get(key) ?? null;
}

/**
 * Tanınan katalog önekleri.
 *
 * Liste katalogda GERÇEKTEN geçen öneklerden çıkarıldı (NGC 140, M 110,
 * Caldwell 24, IC 13, Sh2 5, Barnard 3 kayıt; LDN/LBN/vdB/Abell/HCG/
 * Simeis/Winnecke birer) ve yaygın birkaç öneğe genişletildi. Fazla
 * cömert olması sorun değil — katalog doğrulaması arkada duruyor.
 *
 * Uzun önekler ÖNCE: "ngc" ile "n" aynı metinde eşleşebilir ve
 * düzenli ifade ilk alternatifi seçer.
 */
const PREFIXES = [
  'caldwell', 'barnard', 'winnecke', 'simeis', 'abell', 'stock',
  'sh2', 'sh', 'ngc', 'ldn', 'lbn', 'vdb', 'hcg', 'pgc', 'ugc', 'arp',
  'mel', 'cr', 'tr', 'ic', 'm', 'b', 'c',
];

/*
 * Önek + ayırıcı + sayı.
 *
 * `(?<![a-z0-9])` başta ŞART: onsuz "IMG_31" içindeki "g31" ya da
 * kamera modeli "ASI2600MC" içindeki "c2600" eşleşirdi. Önek bir
 * kelimenin ortasında başlayamaz.
 *
 * Sonda `(?![0-9])` var ama harf yasaklanmıyor: "M42a" gibi alt
 * bileşen kodları katalogda geçebiliyor.
 */
const CODE_PATTERN = new RegExp(
  `(?<![a-z0-9])(${PREFIXES.join('|')})[\\s_-]?(\\d{1,4})(?![0-9])`,
  'gi'
);

/**
 * Dosya adındaki bütün aday kodlar — dosyadaki SIRAYLA.
 *
 * Sıra korunuyor çünkü kullanıcılar dosya adına önce objeyi yazıyor:
 * "M31_L_300s_c_10.fit" içinde hem "M31" hem "c10" (Caldwell 10, gerçek
 * bir obje) aday. Baştaki kazanmalı.
 */
export function extractCatalogCodes(filename: string): string[] {
  // Uzantı atılıyor: "ic1805.fit" içindeki "fit" bir kod değil ama
  // uzantıdaki rakamlar ("v2.fits") gürültü üretebiliyor.
  const base = filename.replace(/\.[a-z0-9]{1,5}$/i, '');

  const found: string[] = [];
  for (const match of base.matchAll(CODE_PATTERN)) {
    found.push(`${match[1]}${match[2]}`);
  }
  return found;
}

/**
 * Dosya adından hedef tahmini — çözülemezse `null`.
 *
 * TAHMİN BAĞLAYICI DEĞİL. Çağıran taraf bunu alana yazıyor ama
 * kullanıcı değiştirebiliyor; bu yüzden "emin değilsek yazmayalım"
 * yerine "katalogda karşılığı varsa yazalım" kuralı yeterli.
 */
export function guessTargetFromFilename(
  filename: string
): CelestialTarget | null {
  for (const code of extractCatalogCodes(filename)) {
    const target = resolveByCode(code);
    if (target) return target;
  }
  return null;
}

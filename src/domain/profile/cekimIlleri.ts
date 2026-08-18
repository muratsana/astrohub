/**
 * ÇEKİM İLLERİ — PROFİLDEKİ ROZET ŞERİDİ.
 *
 * ══════════════════════════════════════════════════════════════════════
 * KAPANAN HATA: AYNI İL ÜÇ KEZ
 *
 * Profilde şunlar yan yana duruyordu:
 *
 *   [Çankaya, Ankara]  [Denizli]  [Ankara]  [Gölbaşı Ankara]
 *
 * Dördü de doğruydu ve üçü aynı ili söylüyordu. Sebep, tek bir listede
 * İKİ FARKLI ŞEYİN toplanmasıydı: kullanıcının kendi beyan ettiği yer
 * (ilçesiyle birlikte) ve fotoğraflarının çekildiği yerler. Üstüne
 * eski kayıtlarda `city` alanı serbest metin olduğu için "Gölbaşı
 * Ankara" gibi ilçe-il birleşik değerler de var.
 *
 * ══════════════════════════════════════════════════════════════════════
 * İKİSİ AYRILDI
 *
 * Kişinin kendi konumu bir BEYAN — kimliğin parçası, adının yanında
 * bir kez yazılıyor. Rozet şeridi ise bir ÖZET: "bu kişi nerelerden
 * çekiyor". Özeti ilçe ilçe dökmek onlarca rozet üretir ve soruyu
 * cevaplamak yerine gömer.
 *
 * Normalleştirme serbest metni il düzeyine indiriyor: metin bilinen bir
 * il adı içeriyorsa o il yazılıyor. İçermiyorsa metin OLDUĞU GİBİ
 * kalıyor — tanımadığımız bir yeri tahminle değiştirmek, yanlış bilgi
 * göstermek olurdu.
 */

/**
 * Karşılaştırma için metni katlar.
 *
 * NOKTASIZ 'ı' NOKTALI 'i'YE İNDİRİLİYOR ve sıra önemli: Türkçe
 * küçültme "IZMIR"i "ızmır" yapıyor, "İzmir"i "izmir". İkisini
 * eşleştirmek için katlama küçültmeden SONRA gelmeli — önce yapılsaydı
 * büyük harfler zaten kaybolmuş olurdu ve "IZMIR kırsalı" hiçbir ile
 * eşleşmezdi.
 */
function katla(metin: string): string {
  return metin
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Serbest metinden il adı çıkarır.
 *
 * En UZUN eşleşme kazanıyor: "Afyonkarahisar" içinde "Afyon" da geçer
 * ve kısa eşleşme kabul edilseydi il yanlış yazılırdı.
 */
export function ilAdiniNormallestir(
  ham: string,
  iller: readonly string[]
): string {
  const hedef = katla(ham);
  let enIyi: string | null = null;
  for (const il of iller) {
    const k = katla(il);
    if (!k || !hedef.includes(k)) continue;
    if (!enIyi || k.length > katla(enIyi).length) enIyi = il;
  }
  return enIyi ?? ham.trim();
}

/**
 * Fotoğraf şehirlerinden tekrarsız il listesi.
 *
 * Sıra korunuyor: ilk çekilen il başta kalıyor ve liste her boyamada
 * aynı sırayla çiziliyor. Alfabetik sıralamak, "en çok nerede çekiyor"
 * bilgisini rastgele bir sıraya çevirirdi.
 */
export function cekimIlleri(
  sehirler: readonly (string | null | undefined)[],
  iller: readonly string[]
): string[] {
  const gorulen = new Set<string>();
  const cikti: string[] = [];
  for (const ham of sehirler) {
    if (!ham || !ham.trim()) continue;
    const il = ilAdiniNormallestir(ham, iller);
    const anahtar = katla(il);
    if (gorulen.has(anahtar)) continue;
    gorulen.add(anahtar);
    cikti.push(il);
  }
  return cikti;
}

/**
 * ADRES PARÇASI ÜRETİMİ — tek kaynak.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN ORTAK DOSYA
 *
 * Aynı dönüşüm iki yerde kopyalanmıştı: `services/content/forum`
 * (`threadSlug`) ve yükleme sihirbazının yerel `slugify`si. İkisi bugün
 * aynı; Türkçe harf listesine bir ekleme yapıldığında biri güncellenip
 * diğeri eski kalırdı ve fark ancak "ş" içeren bir başlıkta, adres
 * çubuğunda görülürdü.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TÜRKÇE HARFLER ASCII'YE İNDİRGENİYOR
 *
 * Adres çubuğunda yüzde kodlaması okunmuyor: "gözlem-raporları"
 * paylaşıldığında "g%C3%B6zlem-raporlar%C4%B1" olarak görünür ve
 * kopyalanan bağlantı anlamsızlaşır.
 *
 * `toLocaleLowerCase('tr-TR')` ÖNCE çalışıyor ve bu önemli: Türkçe
 * yerelde "I" harfi "ı"ya düşüyor. İngilizce yerelde "i" olurdu ve
 * "IŞIK" başlığı "isik" yerine "iSik" gibi bozuk bir sonuç verirdi.
 */

const HARFLER: Record<string, string> = {
  ı: 'i',
  ş: 's',
  ğ: 'g',
  ü: 'u',
  ö: 'o',
  ç: 'c',
  â: 'a',
  î: 'i',
  û: 'u',
};

/**
 * Metni adres parçasına çevirir. Son ek EKLEMİYOR — çağıran taraf
 * benzersizliğe kendi karar veriyor.
 *
 * Boş dönebilir: yalnızca noktalama içeren bir başlıkta geriye hiçbir
 * harf kalmıyor. Çağıran bunu kontrol etmeli; sessizce bir varsayılan
 * uydurmak, adres çubuğunda kullanıcının yazmadığı bir kelime
 * göstermek olurdu.
 */
export function slugify(input: string, maxLength = 90): string {
  return input
    .toLocaleLowerCase('tr-TR')
    .replace(/[ışğüöçâîû]/g, (c) => HARFLER[c] ?? c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    /* Kırpma sonrası sonda tire kalabiliyor: "uzun-baslik-" gibi bir
       adres, kopyalandığında bozuk görünür. */
    .replace(/-+$/, '');
}

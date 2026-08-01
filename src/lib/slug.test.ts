import { describe, expect, it } from 'vitest';
import { slugify } from './slug';

/**
 * ADRES PARÇASI — iki kopyadan tek kaynağa alındı.
 *
 * Aynı dönüşüm `services/content/forum` ve yükleme sihirbazında ayrı
 * ayrı yazılıydı. Birleştirmenin riski davranışın sessizce değişmesi:
 * bir harf eşlemesi kaybolursa mevcut adresler bozulmaz ama YENİ
 * adresler bozuk üretilir ve bu ancak "ş" içeren bir başlıkta görülür.
 */

describe('slugify · Türkçe harfler', () => {
  it('Türkçe harfleri ASCII karşılığına indiriyor', () => {
    expect(slugify('Gözlem Raporları')).toBe('gozlem-raporlari');
    expect(slugify('Işık Kirliliği')).toBe('isik-kirliligi');
    expect(slugify('Çukurova Şenliği')).toBe('cukurova-senligi');
  });

  /*
   * ASIL İNCELİK. `toLocaleLowerCase('tr-TR')` önce çalışmalı: Türkçe
   * yerelde "I" → "ı" → "i". İngilizce yerelde "I" → "i" olur ve
   * eşleme tablosu devreye girmez; sonuç aynı görünür ama "İ" harfinde
   * ayrışır.
   */
  it('büyük I ve İ doğru iniyor', () => {
    expect(slugify('IŞIK')).toBe('isik');
    expect(slugify('İSTANBUL')).toBe('istanbul');
  });

  it('şapkalı harfleri de karşılıyor', () => {
    expect(slugify('Rüzgâr')).toBe('ruzgar');
  });
});

describe('slugify · biçim', () => {
  it('boşluk ve noktalama yerine tek tire koyuyor', () => {
    expect(slugify('Ay   ve  Güneş!!!')).toBe('ay-ve-gunes');
  });

  it('baştaki ve sondaki tireleri atıyor', () => {
    expect(slugify('!!! deneme !!!')).toBe('deneme');
  });

  /*
   * Kırpma sondaki tireyi bırakabiliyordu: "uzun-baslik-" gibi bir
   * adres kopyalandığında bozuk görünür.
   */
  it('uzunluk sınırından sonra sonda tire bırakmıyor', () => {
    const uzun = slugify('a'.repeat(50) + ' b', 51);
    expect(uzun.endsWith('-')).toBe(false);
  });

  it('uzunluk sınırına uyuyor', () => {
    expect(slugify('x'.repeat(200)).length).toBeLessThanOrEqual(90);
    expect(slugify('x'.repeat(200), 20).length).toBeLessThanOrEqual(20);
  });
});

describe('slugify · boş sonuç', () => {
  /*
   * Yalnızca noktalama içeren bir başlıkta geriye harf kalmıyor.
   * Fonksiyon burada sessizce bir varsayılan UYDURMUYOR — çağıran
   * taraf kendi yedeğini seçiyor ("konu", "fotograf"). Uydursaydı,
   * adres çubuğunda kullanıcının yazmadığı bir kelime çıkardı.
   */
  it('harf kalmayınca boş dönüyor', () => {
    expect(slugify('!!!')).toBe('');
    expect(slugify('   ')).toBe('');
  });
});

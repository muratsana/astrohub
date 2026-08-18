import { describe, expect, it } from 'vitest';
import { cekimIlleri, ilAdiniNormallestir } from './cekimIlleri';

const ILLER = ['Ankara', 'Denizli', 'Afyon', 'Afyonkarahisar', 'İzmir'];

/**
 * PROFİLDE AYNI İL ÜÇ KEZ GÖRÜNÜYORDU:
 *   [Çankaya, Ankara] [Denizli] [Ankara] [Gölbaşı Ankara]
 * Dördü de doğruydu, üçü aynı ili söylüyordu.
 */
describe('il adı normalleştirme', () => {
  it('ilçe-il birleşik metinden ili çıkarıyor', () => {
    expect(ilAdiniNormallestir('Gölbaşı Ankara', ILLER)).toBe('Ankara');
    expect(ilAdiniNormallestir('Çankaya, Ankara', ILLER)).toBe('Ankara');
  });

  /* En UZUN eşleşme kazanmalı: "Afyonkarahisar" içinde "Afyon" da geçiyor
     ve kısa eşleşme kabul edilseydi il yanlış yazılırdı. */
  it('en uzun il adını seçiyor', () => {
    expect(ilAdiniNormallestir('Afyonkarahisar merkez', ILLER)).toBe(
      'Afyonkarahisar'
    );
  });

  it('Türkçe büyük-küçük harf farkını yutuyor', () => {
    expect(ilAdiniNormallestir('IZMIR kırsalı', ILLER)).toBe('İzmir');
  });

  /* Tanımadığımız bir yeri tahminle değiştirmek yanlış bilgi göstermek
     olurdu; metin olduğu gibi kalıyor. */
  it('bilinmeyen yeri olduğu gibi bırakıyor', () => {
    expect(ilAdiniNormallestir('Kapadokya', ILLER)).toBe('Kapadokya');
  });
});

describe('çekim illeri', () => {
  it('aynı ili bir kez yazıyor', () => {
    expect(
      cekimIlleri(['Gölbaşı Ankara', 'Denizli', 'Ankara', null, ''], ILLER)
    ).toEqual(['Ankara', 'Denizli']);
  });

  /* Sıra korunuyor: alfabetik sıralamak "en çok nerede çekiyor"
     bilgisini rastgele bir sıraya çevirirdi. */
  it('ilk görülen sırayı koruyor', () => {
    expect(cekimIlleri(['Denizli', 'Ankara'], ILLER)).toEqual([
      'Denizli',
      'Ankara',
    ]);
  });

  it('boş listede boş dönüyor', () => {
    expect(cekimIlleri([], ILLER)).toEqual([]);
  });
});

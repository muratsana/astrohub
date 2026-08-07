import { describe, expect, it } from 'vitest';
import { sorguyuOku, uzaklikMetni } from './katalog';

describe('sorguyuOku', () => {
  it('boş adresten varsayılan sorgu üretir', () => {
    expect(sorguyuOku(new URLSearchParams())).toEqual({
      q: '',
      aile: null,
      tur: null,
      takimyildiz: null,
      sadeceSecki: false,
      enSonukKadir: null,
      enKucukArcmin: null,
      sirala: 'parlaklik',
      sayfa: 0,
    });
  });

  it('filtreleri adresten okur', () => {
    const s = sorguyuOku(
      new URLSearchParams(
        'q=sh2&aile=Sh2-%25&tur=emisyon-bulutsusu&takimyildiz=Ku%C4%9Fu&secki=1&kadir=9&boyut=15&sirala=boyut&sayfa=3'
      )
    );
    expect(s).toMatchObject({
      q: 'sh2',
      aile: 'Sh2-%',
      tur: 'emisyon-bulutsusu',
      takimyildiz: 'Kuğu',
      sadeceSecki: true,
      enSonukKadir: 9,
      enKucukArcmin: 15,
      sirala: 'boyut',
      sayfa: 3,
    });
  });

  it('bilinmeyen sıralamayı varsayılana düşürür', () => {
    // Adres elle düzenlenebiliyor; tanınmayan bir değer sunucuya
    // gitseydi sıralama sessizce kaybolurdu.
    expect(sorguyuOku(new URLSearchParams('sirala=rastgele')).sirala).toBe(
      'parlaklik'
    );
  });

  it('negatif sayfayı sıfıra çeker', () => {
    expect(sorguyuOku(new URLSearchParams('sayfa=-4')).sayfa).toBe(0);
  });

  it('sayı olmayan eşiği yok sayar', () => {
    expect(sorguyuOku(new URLSearchParams('kadir=abc')).enSonukKadir).toBeNull();
  });
});

describe('uzaklikMetni', () => {
  it('ölçeğe göre birim seçer', () => {
    // On binin altı tam yazılıyor: bulutsu uzaklıkları bu aralıkta ve
    // "1,5 bin ışık yılı" Türkçede söylenmeyen bir ifade.
    expect(uzaklikMetni(1500)).toBe('1.500 ışık yılı');
    expect(uzaklikMetni(8200)).toBe('8.200 ışık yılı');
    expect(uzaklikMetni(47_000)).toBe('47 bin ışık yılı');
    expect(uzaklikMetni(2_500_000)).toBe('2,5 milyon ışık yılı');
  });

  it('bilinmeyen uzaklıkta metin üretmez', () => {
    // "0 ışık yılı" yazmak, ölçüm yapılmış ama sıfır çıkmış gibi okunur.
    expect(uzaklikMetni(null)).toBeNull();
    expect(uzaklikMetni(0)).toBeNull();
  });
});

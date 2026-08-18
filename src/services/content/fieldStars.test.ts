import { describe, expect, it } from 'vitest';
import { yildizEtiketi } from './fieldStars';

/**
 * ETİKET SIRASI.
 *
 * Sıra bilgi değerine göre: özel ad yıldızı TANITIR, Bayer/Flamsteed imi
 * gökyüzündeki YERİNİ söyler, HD yalnızca kimliğini verir. Sıra
 * bozulursa Sadr'ın üstünde "HD 194093" yazar — teknik olarak doğru,
 * okuyan için hiçbir şey.
 */
describe('yıldız etiketi', () => {
  it('özel ad her şeyin önünde', () => {
    expect(
      yildizEtiketi({ ozelAd: 'Sadr', im: 'γ Cyg', hd: 194093, hip: 100453 })
    ).toBe('Sadr');
  });

  it('özel ad yoksa Bayer/Flamsteed imi', () => {
    expect(
      yildizEtiketi({ ozelAd: null, im: 'γ Cyg', hd: 194093, hip: 100453 })
    ).toBe('γ Cyg');
  });

  it('im de yoksa HD', () => {
    expect(
      yildizEtiketi({ ozelAd: null, im: null, hd: 192163, hip: 99546 })
    ).toBe('HD 192163');
  });

  /* Yıldızların ezici çoğunluğunda ad da im de yok; HD bile eksik
     olabiliyor. Etiketin BOŞ çıkması, kadrajda sebepsiz bir işaret
     bırakmak olurdu. */
  it('hiçbiri yoksa HIP', () => {
    expect(yildizEtiketi({ ozelAd: null, im: null, hd: null, hip: 12345 })).toBe(
      'HIP 12345'
    );
  });
});

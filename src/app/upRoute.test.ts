import { describe, it, expect } from 'vitest';
import { upRoute } from './upRoute';

/**
 * ÜST ROTA.
 *
 * Ölçülen şey: adresten türeyen "yukarı" hedefinin GERÇEKTEN var olan bir
 * sayfa olması. Segment düşürmek tek başına yetmiyor — `/galeri/foto/42`
 * bir üstte `/galeri/foto` veriyor ve öyle bir sayfa yok; oraya götüren
 * bir düğme, çalışmayan bir düğmedir.
 */
describe('upRoute', () => {
  it('detay adresinden modül köküne iner', () => {
    expect(upRoute('/galeri/foto/42')).toBe('/galeri');
    expect(upRoute('/yazilar/kadraj-secimi')).toBe('/yazilar');
  });

  it('modül kökünde ana sayfaya iner', () => {
    expect(upRoute('/galeri')).toBe('/');
  });

  it('ara segment sayfa değilse bir üste geçer', () => {
    /* `/galeri/foto` siteMap'te yok; kendisine götürmek yerine atlanıyor. */
    expect(upRoute('/galeri/foto/42')).not.toBe('/galeri/foto');
  });

  it('bilinmeyen adreste ana sayfaya düşer', () => {
    /* Yanlış bir sayfaya götürmektense bilinen bir yere götürmek. */
    expect(upRoute('/olmayan/bir/derin/yol')).toBe('/');
    expect(upRoute('/')).toBe('/');
  });

  it('sondaki eğik çizgi sonucu değiştirmez', () => {
    expect(upRoute('/galeri/foto/42/')).toBe(upRoute('/galeri/foto/42'));
  });
});

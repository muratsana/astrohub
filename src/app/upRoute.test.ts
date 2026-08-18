import { describe, it, expect } from 'vitest';
import { upRoute, TEKIL_LISTE } from './upRoute';

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

/**
 * TEKİL DETAY ROTALARI — "Galeriye dön" ana sayfayı açıyordu.
 *
 * Segment düşürme `/fotograf/<slug>` için `/fotograf` üretiyor, öyle
 * bir sayfa yok ve düğme ana sayfaya gidiyordu. Üstünde "Galeriye dön"
 * yazan bir düğmenin ana sayfayı açması, çalışmamasından beter.
 *
 * Yalnızca DOĞRUDAN gelen ziyaretçide görülüyordu (paylaşılan bağlantı,
 * yeni sekme); geçmişi olanda `navigate(-1)` devreye giriyor. Yani hata
 * tam olarak en savunmasız ziyaretçiyi vuruyordu.
 */
describe('tekil detay rotasının listesi', () => {
  it('fotoğraf detayı galeriye çıkıyor', () => {
    expect(upRoute('/fotograf/kalp-bulutsusu-er2')).toBe('/galeri');
  });

  it('etkinlik, ilan, haber ve hedef kendi listesine çıkıyor', () => {
    expect(upRoute('/etkinlik/x')).toBe('/etkinlikler');
    expect(upRoute('/ilan/x')).toBe('/ilanlar');
    expect(upRoute('/haber/x')).toBe('/haberler');
  });

  /*
   * Tablo elle yazıldı; sessizce çürümemesinin tek güvencesi bu test.
   * Hedefi olmayan bir liste rotası yazılırsa düğme yine boşluğa
   * götürürdü — üstelik bu sefer "düzeltilmiş" görünerek.
   */
  it('tablodaki her hedef gerçekten var olan bir sayfa', () => {
    for (const [tekil, liste] of Object.entries(TEKIL_LISTE)) {
      /* `upRoute` doğrulamadan geçmeyen hedefte '/' dönüyor; dönüşün
         hedefe eşit olması, hedefin site haritasında GERÇEKTEN var
         olduğunun kanıtı. Var olmayan bir adres yazılırsa burada
         düşer. */
      expect(upRoute(`${tekil}/ornek-slug`), tekil).toBe(liste);
    }
  });
});

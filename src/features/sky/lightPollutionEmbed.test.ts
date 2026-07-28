import { describe, expect, it } from 'vitest';
import {
  LIGHT_POLLUTION_HOST,
  OPACITY_RANGE,
  ZOOM_RANGE,
  embedUrl,
  fullUrl,
  normalizeView,
} from './lightPollutionEmbed';

const ANKARA = { lat: 39.9199, lng: 32.8543, zoom: 6, opacity: 50 };

describe('embedUrl', () => {
  it('sağlayıcının yayımladığı gömme adresini üretir', () => {
    // Bu tam olarak lightpollutionmap.app'in paylaş penceresinde verdiği
    // adres. Parametre adı ya da sırası değişirse harita boş açılır ve
    // sebebi görünmez — bu yüzden birebir sabitlendi.
    expect(embedUrl(ANKARA)).toBe(
      'https://lightpollutionmap.app/embed?lat=39.91990&lng=32.85430&zoom=6&opacity=50'
    );
  });

  it('paylaşım adresi gömme değil, sitenin kendisidir', () => {
    // Gömme adresini paylaşmak karşı tarafa çerçevesiz bir widget açar;
    // paylaşılan bağlantı haritanın kendi sayfasına gitmeli.
    expect(fullUrl(ANKARA)).toBe(
      'https://lightpollutionmap.app/?lat=39.91990&lng=32.85430&zoom=6&opacity=50'
    );
  });

  it('yalnızca sağlayıcının kendi alan adına gider', () => {
    for (const url of [embedUrl(ANKARA), fullUrl(ANKARA)]) {
      expect(url.startsWith(`${LIGHT_POLLUTION_HOST}/`)).toBe(true);
    }
  });
});

describe('normalizeView', () => {
  it('yakınlaştırmayı aralığa kırpar', () => {
    expect(normalizeView({ ...ANKARA, zoom: 99 }).zoom).toBe(ZOOM_RANGE.max);
    expect(normalizeView({ ...ANKARA, zoom: -3 }).zoom).toBe(ZOOM_RANGE.min);
  });

  it('saydamlığı yüzde aralığına kırpar', () => {
    expect(normalizeView({ ...ANKARA, opacity: 250 }).opacity).toBe(
      OPACITY_RANGE.max
    );
    expect(normalizeView({ ...ANKARA, opacity: -10 }).opacity).toBe(
      OPACITY_RANGE.min
    );
  });

  it('bozuk koordinatta adres üretmeyi sürdürür', () => {
    // Cihaz konumu henüz çözülmemişse NaN gelebiliyor. Adresi hiç
    // üretmemek haritayı tümden kapatırdı; kırpmak en azından bir yer
    // gösteriyor ve kullanıcı sürgüyle gezinebiliyor.
    const url = embedUrl({ lat: NaN, lng: NaN, zoom: 6, opacity: 50 });
    expect(url).toContain('lat=-85.00000');
    expect(url).not.toContain('NaN');
  });

  it('yakınlaştırmayı tam sayıya yuvarlar', () => {
    expect(normalizeView({ ...ANKARA, zoom: 7.6 }).zoom).toBe(8);
  });

  it('koordinatı beş ondalıkta keser', () => {
    // Metre altı hassasiyet ne haritada işe yarıyor ne de üçüncü tarafa
    // bildirilmesi gerekiyor.
    expect(embedUrl({ ...ANKARA, lat: 39.919912345 })).toContain(
      'lat=39.91991'
    );
  });
});

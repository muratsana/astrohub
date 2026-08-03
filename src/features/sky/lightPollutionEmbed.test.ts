import { describe, expect, it } from 'vitest';
import {
  LIGHT_POLLUTION_HOST,
  OPACITY_RANGE,
  OVERLAY_SOURCES,
  ZOOM_RANGE,
  basemapSource,
  fullUrl,
  normalizeView,
} from './lightPollutionEmbed';

const ANKARA = { lat: 39.9199, lng: 32.8543, zoom: 6, opacity: 50 };

describe('fullUrl', () => {
  it('sağlayıcının kendi sayfasına aynı görünümle gider', () => {
    expect(fullUrl(ANKARA)).toBe(
      'https://lightpollutionmap.app/?lat=39.919900&lng=32.854300&zoom=6&opacity=50'
    );
  });

  it('yalnızca sağlayıcının alan adına gider', () => {
    expect(fullUrl(ANKARA).startsWith(`${LIGHT_POLLUTION_HOST}/`)).toBe(true);
  });

  it('bozuk koordinatta bile adres üretir', () => {
    // Cihaz konumu henüz çözülmemişse NaN gelebiliyor; bağlantıyı hiç
    // üretmemek "yeni sekmede aç"ı kırardı.
    const url = fullUrl({ lat: NaN, lng: NaN, zoom: 6, opacity: 50 });
    expect(url).not.toContain('NaN');
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

  it('yakınlaştırmayı tam sayıya yuvarlar', () => {
    expect(normalizeView({ ...ANKARA, zoom: 7.6 }).zoom).toBe(8);
  });
});

describe('döşeme kaynakları', () => {
  it('altlık temaya göre değişir', () => {
    expect(basemapSource(true).url({ x: 1, y: 2, z: 3 })).toContain('dark_all');
    expect(basemapSource(false).url({ x: 1, y: 2, z: 3 })).toContain(
      'light_all'
    );
  });

  it('aynı döşeme her zaman aynı alt alan adından istenir', () => {
    // Rastgele seçilseydi her boyamada başka adres istenir ve tarayıcı
    // önbelleği işe yaramazdı.
    const source = basemapSource(true);
    const tile = { x: 37, y: 22, z: 6 };
    expect(source.url(tile)).toBe(source.url(tile));
    expect(source.url(tile)).toMatch(
      /^https:\/\/[abc]\.basemaps\.cartocdn\.com\/dark_all\/6\/37\/22\.png$/
    );
  });

  it('katman verisinin çözünürlüğünün ötesine döşeme istemez', () => {
    for (const source of OVERLAY_SOURCES) {
      expect(source.maxZoom).toBe(8);
    }
  });

  it('yalnızca doğrulanmış NASA gece ışıkları kaynağını kullanır', () => {
    expect(OVERLAY_SOURCES).toHaveLength(1);
    expect(OVERLAY_SOURCES[0].url({ x: 4, y: 5, z: 3 })).toBe(
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_CityLights_2012/default/default/GoogleMapsCompatible_Level8/3/5/4.jpg'
    );
  });

  it('her kaynak neye bakıldığını yazar', () => {
    // Yedeğe düşüldüğünde altındaki kaynak yazısı da değişmeli; aksi
    // hâlde ham parlaklık, ölçekli atlas diye okunur.
    for (const source of OVERLAY_SOURCES) {
      expect(source.credit.length).toBeGreaterThan(10);
    }
    expect(OVERLAY_SOURCES[0].credit).toContain('ham parlaklık');
  });

  it('GIBS adresi WMTS satır/sütun sırasını korur', () => {
    // z/y/x yerine z/x/y yazılırsa harita aynasal kayar ve bu, gözle
    // ancak tanıdık bir kıyıda fark edilir.
    const gibs = OVERLAY_SOURCES.find((s) => s.id.startsWith('gibs'))!;
    expect(gibs.url({ x: 4, y: 5, z: 3 })).toContain(
      'GoogleMapsCompatible_Level8/3/5/4.jpg'
    );
    expect(gibs.blend).toBe('screen');
  });
});

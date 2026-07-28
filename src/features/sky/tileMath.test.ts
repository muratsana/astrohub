import { describe, expect, it } from 'vitest';
import {
  MAX_LATITUDE,
  TILE_SIZE,
  clampLatitude,
  latToTileY,
  lngToTileX,
  panBy,
  pointToLatLng,
  tileXToLng,
  tileYToLat,
  visibleTiles,
  wrapLongitude,
} from './tileMath';

const ANKARA = { lat: 39.9199, lng: 32.8543 };

describe('izdüşüm', () => {
  it('sıfır noktasını dünyanın ortasına koyar', () => {
    expect(lngToTileX(0, 4)).toBeCloseTo(8, 10);
    expect(latToTileY(0, 4)).toBeCloseTo(8, 10);
  });

  it('ileri ve geri dönüşüm aynı noktaya döner', () => {
    for (const zoom of [3, 6, 12]) {
      expect(tileXToLng(lngToTileX(ANKARA.lng, zoom), zoom)).toBeCloseTo(
        ANKARA.lng,
        9
      );
      expect(tileYToLat(latToTileY(ANKARA.lat, zoom), zoom)).toBeCloseTo(
        ANKARA.lat,
        9
      );
    }
  });

  it('enlemi Mercator sınırında keser', () => {
    // Kutup Mercator'da sonsuza gider; kesmezsek döşeme satırı NaN olur
    // ve harita bembeyaz kalır.
    expect(clampLatitude(90)).toBe(MAX_LATITUDE);
    expect(latToTileY(90, 5)).toBeCloseTo(0, 6);
    expect(Number.isFinite(latToTileY(-90, 5))).toBe(true);
  });

  it('boylamı sarmalar, kırpmaz', () => {
    // Kırpsaydık doğuya kaydırma tarih çizgisinde dururdu.
    expect(wrapLongitude(190)).toBeCloseTo(-170, 10);
    expect(wrapLongitude(-190)).toBeCloseTo(170, 10);
    // 540° tam bir tur artı yarım tur: tarih çizgisi. Aralığın alt ucu
    // seçiliyor (-180 ile +180 aynı meridyen).
    expect(wrapLongitude(540)).toBeCloseTo(-180, 10);
  });
});

describe('panBy', () => {
  it('sürükleme yönünün tersine gider', () => {
    // Harita sağa sürüklenir → görülen yer batıya kayar.
    const moved = panBy(ANKARA, 100, 0, 8);
    expect(moved.lng).toBeLessThan(ANKARA.lng);
  });

  it('bir döşeme kadar kaydırma tam bir döşeme sütunu ilerletir', () => {
    const moved = panBy(ANKARA, -TILE_SIZE, 0, 8);
    expect(lngToTileX(moved.lng, 8)).toBeCloseTo(
      lngToTileX(ANKARA.lng, 8) + 1,
      6
    );
  });

  it('kutbun ötesine taşmaz', () => {
    const moved = panBy({ lat: 84, lng: 0 }, 0, 5000, 4);
    expect(moved.lat).toBeLessThanOrEqual(MAX_LATITUDE);
    expect(Number.isFinite(moved.lat)).toBe(true);
  });
});

describe('pointToLatLng', () => {
  it('görünüm alanının ortası merkezdir', () => {
    const p = pointToLatLng(ANKARA, 7, 800, 600, 400, 300);
    expect(p.lat).toBeCloseTo(ANKARA.lat, 9);
    expect(p.lng).toBeCloseTo(ANKARA.lng, 9);
  });

  it('sağ üst köşe kuzeydoğudadır', () => {
    const p = pointToLatLng(ANKARA, 7, 800, 600, 800, 0);
    expect(p.lng).toBeGreaterThan(ANKARA.lng);
    expect(p.lat).toBeGreaterThan(ANKARA.lat);
  });
});

describe('visibleTiles', () => {
  it('görünüm alanını boşluksuz kaplar', () => {
    const tiles = visibleTiles({
      center: ANKARA,
      zoom: 6,
      width: 800,
      height: 600,
    });
    expect(tiles.length).toBeGreaterThan(0);

    // Her kenar en az bir döşemeyle örtülmeli; aksi hâlde haritanın
    // kenarında zemin rengi görünür ve bu "veri yok" gibi okunur.
    const minLeft = Math.min(...tiles.map((t) => t.left));
    const maxRight = Math.max(...tiles.map((t) => t.left + t.size));
    const minTop = Math.min(...tiles.map((t) => t.top));
    const maxBottom = Math.max(...tiles.map((t) => t.top + t.size));
    expect(minLeft).toBeLessThanOrEqual(0);
    expect(maxRight).toBeGreaterThanOrEqual(800);
    expect(minTop).toBeLessThanOrEqual(0);
    expect(maxBottom).toBeGreaterThanOrEqual(600);
  });

  it('sütunu sarmalar ama satırı dünyanın dışına taşırmaz', () => {
    const tiles = visibleTiles({
      center: { lat: 84, lng: 179.9 },
      zoom: 3,
      width: 900,
      height: 700,
    });
    for (const tile of tiles) {
      expect(tile.x).toBeGreaterThanOrEqual(0);
      expect(tile.x).toBeLessThan(8);
      expect(tile.y).toBeGreaterThanOrEqual(0);
      expect(tile.y).toBeLessThan(8);
    }
  });

  it('tarih çizgisinde tekrarlanan döşemeye ayrı anahtar verir', () => {
    const tiles = visibleTiles({
      center: { lat: 0, lng: 180 },
      zoom: 1,
      width: 1200,
      height: 400,
    });
    const keys = new Set(tiles.map((t) => t.key));
    expect(keys.size).toBe(tiles.length);
  });

  it('büyütülmüş döşeme altlıkla aynı noktaya hizalanır', () => {
    // Işık kirliliği katmanı üst yakınlaştırmadan büyütülerek çiziliyor.
    // Hizalama bozulursa katman şehirlerin yanına düşer ve kimse fark
    // etmez — bu yüzden ölçülüyor.
    const base = visibleTiles({
      center: ANKARA,
      zoom: 10,
      width: 512,
      height: 512,
    });
    const scaled = visibleTiles({
      center: ANKARA,
      zoom: 8,
      width: 512,
      height: 512,
      tileSize: TILE_SIZE * 4,
    });
    const baseTile = base.find((t) => t.x === Math.floor(lngToTileX(ANKARA.lng, 10)));
    const scaledTile = scaled.find(
      (t) => t.x === Math.floor(lngToTileX(ANKARA.lng, 8))
    );
    expect(baseTile).toBeDefined();
    expect(scaledTile).toBeDefined();
    const offset = baseTile!.left - scaledTile!.left;
    // Büyütülmüş döşeme, kapsadığı 4×4 altlık döşemenin sol kenarına
    // tam sayı katı uzaklıkta olmalı.
    expect(offset % TILE_SIZE).toBeLessThanOrEqual(1);
  });

  it('ölçülemeyen alanda döşeme istemez', () => {
    // İlk boyamada kutunun genişliği 0'dır; o anda döşeme istemek
    // yüzlerce gereksiz isteğe yol açardı.
    expect(
      visibleTiles({ center: ANKARA, zoom: 6, width: 0, height: 0 })
    ).toEqual([]);
  });
});

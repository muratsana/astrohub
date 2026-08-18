import { describe, expect, it } from 'vitest';
import { contain, SHARE_SIZES } from './shareImage';

/**
 * SIĞDIRMA — en-boy oranı bozulmuyor (D05).
 */
describe('contain (D05 bozulmasız)', () => {
  it('kaynağın en-boy oranını korur (geniş kaynak)', () => {
    const kaynak = { width: 4000, height: 2000 }; // 2:1
    const yer = contain(kaynak, SHARE_SIZES.feed);
    expect(yer.width / yer.height).toBeCloseTo(2, 5);
    // Feed genişliğine oturur, dikeyde ortalanır.
    expect(yer.width).toBeCloseTo(1080, 5);
    expect(yer.x).toBeCloseTo(0, 5);
    expect(yer.y).toBeGreaterThan(0);
  });

  it('dikey kaynağı story\'ye oranını bozmadan sığdırır', () => {
    const kaynak = { width: 2000, height: 3000 }; // 2:3
    const yer = contain(kaynak, SHARE_SIZES.story);
    expect(yer.width / yer.height).toBeCloseTo(2 / 3, 5);
    // Hedefin içinde kalır.
    expect(yer.width).toBeLessThanOrEqual(SHARE_SIZES.story.width + 0.01);
    expect(yer.height).toBeLessThanOrEqual(SHARE_SIZES.story.height + 0.01);
  });

  it('kare kaynak feed içinde ortalanır, taşmaz', () => {
    const yer = contain({ width: 1000, height: 1000 }, SHARE_SIZES.feed);
    expect(yer.width).toBeCloseTo(yer.height, 5);
    expect(yer.width).toBeLessThanOrEqual(1080.01);
  });

  it('sıfır boyutlu kaynakta tüm hedefi doldurur (bölme hatası yok)', () => {
    const yer = contain({ width: 0, height: 0 }, SHARE_SIZES.feed);
    expect(yer).toEqual({ x: 0, y: 0, width: 1080, height: 1350 });
  });
});

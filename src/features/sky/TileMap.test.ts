import { describe, expect, it } from 'vitest';
import { tileRenderZoom } from './tileMath';

describe('tileRenderZoom', () => {
  it('standart ekranda görünen zoom döşemesini ister', () => {
    expect(tileRenderZoom(6, 19, 1)).toBe(6);
  });

  it('retina ekranda bir üst zoom döşemesini yarı boyda çizdirir', () => {
    expect(tileRenderZoom(6, 19, 2)).toBe(7);
  });

  it('kaynak çözünürlük sınırını aşmaz', () => {
    expect(tileRenderZoom(12, 8, 2)).toBe(8);
  });
});

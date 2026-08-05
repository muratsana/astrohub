import { describe, expect, it } from 'vitest';
import {
  bandLabelMismatch,
  bandwidthText,
  sortedPassbands,
  SPECTRAL_LINES,
  VISIBLE_RANGE,
  wavelengthPosition,
  type AstroFilterSpec,
} from './spectrum';

function spec(over: Partial<AstroFilterSpec> = {}): AstroFilterSpec {
  return {
    slug: 'test',
    categoryCode: 'dual_band',
    marketBand: 'dual',
    emissionLineCount: 2,
    passWindowCount: 2,
    bandwidthMinNm: 3,
    bandwidthMaxNm: 3,
    fastOpticsProfile: null,
    passbands: [],
    isDiscontinued: false,
    notes: null,
    ...over,
  };
}

describe('bandLabelMismatch', () => {
  it('pazarlama adı ölçümle uyuşuyorsa çelişki yok', () => {
    expect(bandLabelMismatch(spec())).toBe(false);
  });

  it('quad diyen ama üç çizgi geçiren ürünü işaretler', () => {
    expect(
      bandLabelMismatch(spec({ marketBand: 'quad', emissionLineCount: 3 }))
    ).toBe(true);
  });

  it('ölçüm yoksa çelişki UYDURMAZ', () => {
    expect(
      bandLabelMismatch(spec({ marketBand: 'quad', emissionLineCount: null }))
    ).toBeNull();
  });

  it('geniş bant ve belirsiz için karşılaştırılacak sayı yok', () => {
    expect(bandLabelMismatch(spec({ marketBand: 'broadband' }))).toBeNull();
    expect(bandLabelMismatch(spec({ marketBand: 'unknown' }))).toBeNull();
  });
});

describe('sortedPassbands', () => {
  it('dalga boyuna göre sıralar — şerit soldan sağa çizilsin', () => {
    const sonuc = sortedPassbands(
      spec({
        passbands: [
          { line: 'ha', bandwidthNm: 3 },
          { line: 'oiii', bandwidthNm: 3 },
          { line: 'sii', bandwidthNm: null },
        ],
      })
    );
    expect(sonuc.map((p) => p.line)).toEqual(['oiii', 'ha', 'sii']);
  });
});

describe('wavelengthPosition', () => {
  it('aralık uçlarını 0 ve 1e eşler', () => {
    expect(wavelengthPosition(VISIBLE_RANGE.min)).toBe(0);
    expect(wavelengthPosition(VISIBLE_RANGE.max)).toBe(1);
  });

  it('aralık dışını kırpar — OII şeridin dışına taşmasın', () => {
    expect(wavelengthPosition(100)).toBe(0);
    expect(wavelengthPosition(2000)).toBe(1);
  });

  it('Hα kırmızı uçta, OIII ortada', () => {
    const ha = wavelengthPosition(SPECTRAL_LINES.ha.wavelengthNm);
    const oiii = wavelengthPosition(SPECTRAL_LINES.oiii.wavelengthNm);
    expect(ha).toBeGreaterThan(oiii);
    expect(oiii).toBeGreaterThan(0.3);
  });
});

describe('bandwidthText', () => {
  it('tek değer, aralık ve boş durumu ayırır', () => {
    expect(bandwidthText(3, 3)).toBe('3 nm');
    expect(bandwidthText(3, 7)).toBe('3–7 nm');
    expect(bandwidthText(null, null)).toBeNull();
    expect(bandwidthText(5, null)).toBe('5 nm');
  });
});

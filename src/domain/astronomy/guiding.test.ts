import { describe, expect, it } from 'vitest';
import { computeGuiding } from './guiding';

describe('guiding hesapları', () => {
  it('ana ve rehber piksel ölçeğini birlikte hesaplar', () => {
    const result = computeGuiding({
      mainFocalLength: 910,
      mainPixelSize: 3.76,
      guideFocalLength: 245,
      guidePixelSize: 2.75,
      seeingArcsec: 4.1,
    });

    expect(result.mainPixelScale).toBeCloseTo(0.852, 3);
    expect(result.guidePixelScale).toBeCloseTo(2.315, 3);
    expect(result.scaleRatio).toBeCloseTo(2.717, 3);
    expect(result.guideStarFwhmPx).toBeCloseTo(1.771, 3);
    expect(result.verdict.tone).toBe('ok');
  });

  it('çok kaba rehber ölçeğini riskli işaretler', () => {
    const result = computeGuiding({
      mainFocalLength: 2000,
      mainPixelSize: 3.76,
      guideFocalLength: 120,
      guidePixelSize: 5.86,
      seeingArcsec: 2.5,
    });

    expect(result.verdict.tone).toBe('error');
  });
});

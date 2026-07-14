import { describe, it, expect } from 'vitest';
import {
  pixelScale,
  fieldOfView,
  fRatio,
  effectiveFocalLength,
  samplingVerdict,
  computeOptics,
} from './optics';

describe('optik hesapları (§7.12)', () => {
  it('piksel ölçeğini doğru hesaplar', () => {
    // 206.265 × 3.76 / 1000 = 0.7756... "/px  (fl=1000mm, pixel=3.76µm)
    expect(pixelScale(1000, 3.76)).toBeCloseTo(0.7756, 3);
    // fl=500, pixel=3.76 → ~1.551 "/px
    expect(pixelScale(500, 3.76)).toBeCloseTo(1.551, 2);
  });

  it('odak uzaklığı pozitif değilse hata verir', () => {
    expect(() => pixelScale(0, 3.76)).toThrow();
  });

  it('FOV arctan formülüyle hesaplar', () => {
    // fl=530mm, tam-kare 36×24mm → yaklaşık 3.89° × 2.59°
    const fov = fieldOfView(530, 36, 24);
    expect(fov.widthDeg).toBeCloseTo(3.889, 2);
    expect(fov.heightDeg).toBeCloseTo(2.594, 2);
    expect(fov.widthArcmin).toBeCloseTo(233.3, 0);
  });

  it('f-oranını hesaplar, açıklık yoksa null', () => {
    expect(fRatio(1000, 200)).toBe(5);
    expect(fRatio(1000)).toBeNull();
  });

  it('reducer efektif odak uzaklığını uygular', () => {
    expect(effectiveFocalLength(1000, 0.8)).toBe(800);
    expect(effectiveFocalLength(1000)).toBe(1000);
  });

  it('örnekleme kategorilerini sınıflandırır', () => {
    expect(samplingVerdict(0.7).category).toBe('oversampled');
    expect(samplingVerdict(1.5).category).toBe('optimal');
    expect(samplingVerdict(3.0).category).toBe('undersampled');
  });

  it('computeOptics reducer ile zincirleme hesap yapar', () => {
    const result = computeOptics(
      { focalLength: 1000, aperture: 200 },
      { pixelSize: 3.76, sensorWidth: 23.5, sensorHeight: 15.7 },
      0.8
    );
    expect(result.effectiveFocalLength).toBe(800);
    expect(result.fRatio).toBe(4);
    expect(result.pixelScale).toBeCloseTo(0.9695, 3);
    expect(result.sampling.category).toBe('oversampled');
    // Türetilmiş çözünürlük: 23.5mm / 3.76µm ≈ 6250 px
    expect(result.resolutionX).toBe(6250);
  });
});

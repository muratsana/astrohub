import { describe, it, expect } from 'vitest';
import {
  checkPayload,
  checkBackfocus,
  checkSampling,
  checkGuiding,
  checkFocalRatio,
  checkSetup,
} from './compatibility';
import type { SetupInput } from './compatibility';

const baseSetup: SetupInput = {
  mount: { name: 'EQ6-R Pro', payloadCapacityKg: 20 },
  optic: {
    name: 'Esprit 100',
    focalLength: 550,
    aperture: 100,
    weightKg: 6.4,
    requiredBackfocusMm: 55,
  },
  camera: {
    name: 'ASI2600MC',
    pixelSize: 3.76,
    sensorWidth: 23.5,
    sensorHeight: 15.7,
    weightKg: 0.7,
    backfocusMm: 17.5,
  },
  spacerMm: 37.5,
  filterThicknessMm: 0,
  accessoriesKg: 1.5,
  reducerFactor: 1,
  seeingArcsec: 3,
};

describe('montür yük kontrolü', () => {
  it('görüntüleme payının altındaki yükü onaylar', () => {
    // 20 kg × 0.6 = 12 kg kullanılabilir
    expect(checkPayload(20, 9).severity).toBe('ok');
  });

  it('nominal kapasitenin altında ama görüntüleme payının üstünde uyarır', () => {
    expect(checkPayload(20, 15).severity).toBe('warning');
  });

  it('nominal kapasiteyi aşan yükü hata sayar', () => {
    expect(checkPayload(20, 22).severity).toBe('error');
  });
});

describe('backfocus kontrolü', () => {
  it('tam tutturulmuş mesafeyi onaylar', () => {
    const check = checkBackfocus(55, 17.5, 37.5, 0);
    expect(check.achievedMm).toBeCloseTo(55, 6);
    expect(check.severity).toBe('ok');
  });

  it('filtre kalınlığının 1/3 kadarını optik yola ekler', () => {
    const check = checkBackfocus(55, 17.5, 36.5, 3);
    expect(check.achievedMm).toBeCloseTo(55, 6);
    expect(check.severity).toBe('ok');
  });

  it('1 mm sapmayı uyarı, 3 mm sapmayı hata sayar', () => {
    expect(checkBackfocus(55, 17.5, 38.5, 0).severity).toBe('warning');
    expect(checkBackfocus(55, 17.5, 40.5, 0).severity).toBe('error');
  });

  it('eksik mesafede halka eklemeyi, fazlada çıkarmayı söyler', () => {
    expect(checkBackfocus(55, 17.5, 34, 0).detail).toContain('ekleyin');
    expect(checkBackfocus(55, 17.5, 41, 0).detail).toContain('çıkarın');
  });
});

describe('örnekleme kontrolü seeing’e bağlıdır', () => {
  it('3″ seeing için 1.2″/px makuldür', () => {
    expect(checkSampling(1.2, 3).severity).toBe('ok');
  });

  it('aynı piksel ölçeği 1.5″ seeing’de aşırı örneklemeye düşmez ama 6″’de kabalaşmaz', () => {
    // ideal aralık 0.5–0.75; 1.2 üst sınırın 2 katının altında → hâlâ ok
    expect(checkSampling(1.2, 1.5).severity).toBe('ok');
  });

  it('çok küçük piksel ölçeğinde aşırı örnekleme uyarısı verir', () => {
    expect(checkSampling(0.2, 3).severity).toBe('warning');
    expect(checkSampling(0.2, 3).detail).toContain('Aşırı örnekleme');
  });

  it('çok büyük piksel ölçeğinde yetersiz örnekleme uyarısı verir', () => {
    expect(checkSampling(5, 3).severity).toBe('warning');
    expect(checkSampling(5, 3).detail).toContain('Yetersiz örnekleme');
  });
});

describe('guide kontrolü', () => {
  it('uygun guide ölçeğini onaylar', () => {
    // 240mm guide + 3.75µm → ~3.2″/px
    expect(checkGuiding(550, 240, 3.75).severity).toBe('ok');
  });

  it('kaba guide ölçeğinde uyarır', () => {
    // 120mm + 5.2µm → ~8.9″/px değil; 1:  oran ve ölçek uyarı sınırında
    expect(checkGuiding(1000, 162, 3.75).severity).toBe('warning');
  });

  it('aşırı kaba guide ölçeğini hata sayar', () => {
    // 60mm + 5.6µm → ~19″/px
    expect(checkGuiding(2000, 60, 5.6).severity).toBe('error');
  });
});

describe('odak oranı', () => {
  it('hızlı optiği onaylar, yavaş optikte uyarır', () => {
    expect(checkFocalRatio(5.5).severity).toBe('ok');
    expect(checkFocalRatio(10).severity).toBe('warning');
    expect(checkFocalRatio(null).value).toBe('—');
  });
});

describe('tüm zincir', () => {
  it('sağlıklı setup’ta verdict ok döner', () => {
    const report = checkSetup(baseSetup);
    expect(report.verdict).toBe('ok');
    expect(report.achievedBackfocusMm).toBeCloseTo(55, 6);
    expect(report.totalWeightKg).toBeCloseTo(8.6, 6);
    expect(report.usablePayloadKg).toBeCloseTo(12, 6);
  });

  it('en kötü kontrol verdict’i belirler', () => {
    const report = checkSetup({ ...baseSetup, spacerMm: 30 });
    expect(report.verdict).toBe('error');
  });

  it('guide verilmezse guide kontrolü listeye girmez', () => {
    const withoutGuide = checkSetup(baseSetup);
    expect(withoutGuide.checks.some((c) => c.id === 'guiding')).toBe(false);

    const withGuide = checkSetup({
      ...baseSetup,
      guide: { name: '30F4', focalLength: 120, pixelSize: 2.9 },
    });
    expect(withGuide.checks.some((c) => c.id === 'guiding')).toBe(true);
    // guide varsa ağırlık payı eklenir
    expect(withGuide.totalWeightKg).toBeGreaterThan(withoutGuide.totalWeightKg);
  });

  it('reducer piksel ölçeğini ve odak oranını değiştirir', () => {
    const full = checkSetup(baseSetup);
    const reduced = checkSetup({ ...baseSetup, reducerFactor: 0.8 });
    expect(reduced.optics.pixelScale).toBeGreaterThan(full.optics.pixelScale);
    expect(reduced.optics.fRatio!).toBeLessThan(full.optics.fRatio!);
  });
});

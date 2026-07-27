import { describe, it, expect } from 'vitest';
import {
  planMosaic,
  planMosaicBestOrientation,
  mosaicTime,
  nightsNeeded,
  parseAngularSizeArcmin,
} from './mosaic';

const frame = { frameWidthArcmin: 120, frameHeightArcmin: 80 };

describe('mozaik planlama (§7.12)', () => {
  it('hedef tek kareye sığıyorsa tek panel önerir', () => {
    const plan = planMosaic({
      ...frame,
      targetWidthArcmin: 90,
      targetHeightArcmin: 60,
      overlap: 0.15,
    });

    expect(plan.panels).toBe(1);
    expect(plan.fitsInSingleFrame).toBe(true);
    expect(plan.marginWidthArcmin).toBeCloseTo(30, 6);
  });

  it('örtüşmesiz adımda panel sayısını kare boyutundan türetir', () => {
    // 240′ hedef / 120′ kare, örtüşme yok → tam 2 panel
    const plan = planMosaic({
      ...frame,
      targetWidthArcmin: 240,
      targetHeightArcmin: 80,
      overlap: 0,
    });

    expect(plan.columns).toBe(2);
    expect(plan.rows).toBe(1);
    expect(plan.stepWidthArcmin).toBe(120);
    expect(plan.coveredWidthArcmin).toBe(240);
  });

  it('örtüşme adımı daraltır ve panel sayısını artırır', () => {
    const withoutOverlap = planMosaic({
      ...frame,
      targetWidthArcmin: 240,
      targetHeightArcmin: 80,
      overlap: 0,
    });
    const withOverlap = planMosaic({
      ...frame,
      targetWidthArcmin: 240,
      targetHeightArcmin: 80,
      overlap: 0.2,
    });

    // adım 120 → 96; 240′ için 2 panel yetmez
    expect(withOverlap.stepWidthArcmin).toBeCloseTo(96, 6);
    expect(withOverlap.columns).toBeGreaterThan(withoutOverlap.columns);
  });

  it('kapsanan alan her zaman hedefi örter', () => {
    const plan = planMosaic({
      ...frame,
      targetWidthArcmin: 300,
      targetHeightArcmin: 200,
      overlap: 0.15,
    });

    expect(plan.coveredWidthArcmin).toBeGreaterThanOrEqual(300);
    expect(plan.coveredHeightArcmin).toBeGreaterThanOrEqual(200);
    expect(plan.marginWidthArcmin).toBeGreaterThanOrEqual(0);
    expect(plan.marginHeightArcmin).toBeGreaterThanOrEqual(0);
  });

  it('90° çevirme kadraj kenarlarını takas eder', () => {
    const plan = planMosaic({
      ...frame,
      targetWidthArcmin: 100,
      targetHeightArcmin: 100,
      overlap: 0.1,
      rotate90: true,
    });

    expect(plan.effectiveFrameWidthArcmin).toBe(80);
    expect(plan.effectiveFrameHeightArcmin).toBe(120);
  });

  it('en iyi yönelim daha az panelli olanı seçer', () => {
    // 80′ × 200′ dikey hedef: dik kadraj (80×120) daha verimli
    const best = planMosaicBestOrientation({
      ...frame,
      targetWidthArcmin: 80,
      targetHeightArcmin: 200,
      overlap: 0,
    });

    expect(best.effectiveFrameWidthArcmin).toBe(80);
    expect(best.panels).toBe(2);
  });

  it('eşit panel sayısında çevrilmemiş kadrajı korur', () => {
    const best = planMosaicBestOrientation({
      ...frame,
      targetWidthArcmin: 60,
      targetHeightArcmin: 60,
      overlap: 0.15,
    });

    expect(best.effectiveFrameWidthArcmin).toBe(120);
  });

  it('örtüşmeyi %90 ile sınırlar — panel sayısı sonsuza gitmez', () => {
    const plan = planMosaic({
      ...frame,
      targetWidthArcmin: 240,
      targetHeightArcmin: 80,
      overlap: 0.99,
    });

    expect(plan.stepWidthArcmin).toBeCloseTo(12, 6);
    expect(Number.isFinite(plan.panels)).toBe(true);
  });

  it('geçersiz boyutta hata verir', () => {
    expect(() =>
      planMosaic({
        ...frame,
        targetWidthArcmin: 0,
        targetHeightArcmin: 60,
        overlap: 0.1,
      })
    ).toThrow();
    expect(() =>
      planMosaic({
        frameWidthArcmin: 0,
        frameHeightArcmin: 80,
        targetWidthArcmin: 60,
        targetHeightArcmin: 60,
        overlap: 0.1,
      })
    ).toThrow();
  });
});

describe('katalog açısal boyutu ayrıştırma', () => {
  it('arcdakika yazımını okur', () => {
    expect(parseAngularSizeArcmin("178' × 63'")).toEqual({
      widthArcmin: 178,
      heightArcmin: 63,
    });
  });

  it('prime karakterinin iki biçimini de kabul eder', () => {
    expect(parseAngularSizeArcmin('11′ × 9′')).toEqual({
      widthArcmin: 11,
      heightArcmin: 9,
    });
  });

  it('dereceyi arcdakikaya çevirir', () => {
    expect(parseAngularSizeArcmin('3° × 2°')).toEqual({
      widthArcmin: 180,
      heightArcmin: 120,
    });
  });

  it('arcsaniyeyi arcdakikaya çevirir', () => {
    expect(parseAngularSizeArcmin('90″')).toEqual({
      widthArcmin: 1.5,
      heightArcmin: 1.5,
    });
  });

  it('tek boyutta hedefi dairesel kabul eder', () => {
    expect(parseAngularSizeArcmin("12'")).toEqual({
      widthArcmin: 12,
      heightArcmin: 12,
    });
  });

  it('ondalık ayırıcı olarak virgülü kabul eder', () => {
    expect(parseAngularSizeArcmin("1,5' × 1'")).toEqual({
      widthArcmin: 1.5,
      heightArcmin: 1,
    });
  });

  it('ayrıştıramadığında null döner — tahmin üretmez', () => {
    expect(parseAngularSizeArcmin('bilinmiyor')).toBeNull();
    expect(parseAngularSizeArcmin('')).toBeNull();
  });
});

describe('mozaik süre hesabı', () => {
  it('ek yükü poz ve panel başına ayrı ekler', () => {
    const time = mosaicTime({
      panels: 4,
      subExposureSec: 300,
      subsPerPanel: 12,
      overheadPerSubSec: 10,
      overheadPerPanelSec: 60,
    });

    // panel başına: 300×12 = 3600 net + 10×12 = 120 + 60 = 3780
    expect(time.integrationPerPanelSec).toBe(3600);
    expect(time.perPanelSec).toBe(3780);
    expect(time.totalSec).toBe(15_120);
    expect(time.totalHours).toBeCloseTo(4.2, 5);
  });

  it('verimliliği net entegrasyon / toplam olarak verir', () => {
    const time = mosaicTime({
      panels: 2,
      subExposureSec: 180,
      subsPerPanel: 10,
      overheadPerSubSec: 20,
      overheadPerPanelSec: 0,
    });

    expect(time.efficiency).toBeCloseTo(180 / 200, 6);
  });

  it('gece sayısını yukarı yuvarlar', () => {
    expect(nightsNeeded(9, 4)).toBe(3);
    expect(nightsNeeded(8, 4)).toBe(2);
    expect(nightsNeeded(0.5, 4)).toBe(1);
    expect(nightsNeeded(5, 0)).toBe(Infinity);
  });
});

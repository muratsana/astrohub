import { describe, it, expect } from 'vitest';
import {
  estimateSeeing,
  seeingLabel,
  observingVerdict,
} from './seeing';

describe('estimateSeeing', () => {
  it('sakin atmosferde en iyi indeksi verir', () => {
    const { index } = estimateSeeing({
      wind200hPa: 20,
      wind500hPa: 10,
      windSurface: 2,
    });
    expect(index).toBe(1);
  });

  it('güçlü jet akımında en kötü indeksi verir', () => {
    const { index } = estimateSeeing({
      wind200hPa: 220,
      wind500hPa: 120,
      windSurface: 50,
    });
    expect(index).toBe(5);
  });

  it('indeks her zaman 1–5 aralığında kalır', () => {
    // Uç ve saçma girdilerde bile aralık dışına taşmamalı: arayüz bu
    // değeri doğrudan etikete çeviriyor.
    const cases = [
      { wind200hPa: -50, wind500hPa: -10, windSurface: -5 },
      { wind200hPa: 9999, wind500hPa: 9999, windSurface: 9999 },
      { wind200hPa: 0, wind500hPa: 500, windSurface: 0 },
    ];
    for (const c of cases) {
      const { index } = estimateSeeing(c);
      expect(index).toBeGreaterThanOrEqual(1);
      expect(index).toBeLessThanOrEqual(5);
    }
  });

  it('jet akımı baskın bileşen olarak raporlanır', () => {
    // Yalnızca 200 hPa yüksek: sürükleyici jet olmalı.
    const { driver } = estimateSeeing({
      wind200hPa: 180,
      wind500hPa: 20,
      windSurface: 5,
    });
    expect(driver).toBe('jet');
  });

  it('jet sakinken yer rüzgârı sürükleyici olabilir', () => {
    const { driver } = estimateSeeing({
      wind200hPa: 40,
      wind500hPa: 20,
      windSurface: 35,
    });
    expect(driver).toBe('yer-rüzgarı');
  });

  it('jet hızlandıkça indeks monoton artar', () => {
    const speeds = [40, 80, 120, 160, 200];
    const indices = speeds.map(
      (wind200hPa) =>
        estimateSeeing({ wind200hPa, wind500hPa: 30, windSurface: 10 }).index
    );
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThanOrEqual(indices[i - 1]);
    }
    expect(indices.at(-1)).toBeGreaterThan(indices[0]);
  });
});

describe('seeingLabel', () => {
  it('indeks aralıklarını etikete çevirir', () => {
    expect(seeingLabel(1)).toBe('Mükemmel');
    expect(seeingLabel(2)).toBe('İyi');
    expect(seeingLabel(3)).toBe('Orta');
    expect(seeingLabel(4)).toBe('Zayıf');
    expect(seeingLabel(5)).toBe('Kötü');
  });
});

describe('observingVerdict', () => {
  it('bulut örtüsü seeing’i ezer', () => {
    // Mükemmel seeing bile kapalı gökyüzünde işe yaramaz.
    expect(observingVerdict(90, 1).label).toBe('Kapalı');
    expect(observingVerdict(90, 1).tone).toBe('danger');
  });

  it('açık ve sakin geceyi en iyi olarak işaretler', () => {
    expect(observingVerdict(5, 1.5).label).toBe('Çok iyi gece');
  });

  it('seeing verisi yokken hüküm vermez, eksikliği söyler', () => {
    // Veri eksikken "çok iyi gece" ilan etmek kullanıcıyı boşuna sahaya
    // çıkarır; bulut az olsa bile hüküm bulutla sınırlı kalmalı.
    const verdict = observingVerdict(5, null);
    expect(verdict.label).toBe('Az bulutlu · seeing verisi yok');
    expect(verdict.tone).toBe('primary');
  });

  it('seeing yokken bile yoğun bulutu net bildirir', () => {
    expect(observingVerdict(90, null).label).toBe('Kapalı');
    expect(observingVerdict(60, null).label).toBe('Parçalı bulutlu');
  });

  it('parçalı bulutu ayrı bir durum olarak bildirir', () => {
    expect(observingVerdict(60, 2).label).toBe('Parçalı bulutlu');
  });

  it('açık ama türbülanslı gecede geniş alanı önerir', () => {
    const verdict = observingVerdict(15, 4);
    expect(verdict.label).toBe('Geniş alan için uygun');
  });
});

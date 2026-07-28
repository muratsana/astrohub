import { describe, expect, it } from 'vitest';
import { dewPointFromHumidity } from './humidity';

describe('dewPointFromHumidity', () => {
  it('%100 nemde çiy noktası sıcaklığa eşittir', () => {
    // Tanım gereği: hava doymuşsa yoğuşma zaten o sıcaklıkta başlar.
    expect(dewPointFromHumidity(12, 100)).toBeCloseTo(12, 1);
  });

  it('bilinen bir değeri doğru veriyor', () => {
    // 20 °C / %50 → yaklaşık 9.3 °C (meteoroloji tablolarındaki değer).
    expect(dewPointFromHumidity(20, 50)).toBeCloseTo(9.3, 1);
  });

  it('çiy noktası her zaman sıcaklığın altında ya da eşit', () => {
    for (const t of [-10, 0, 5, 15, 25, 35]) {
      for (const rh of [10, 40, 70, 99]) {
        const dew = dewPointFromHumidity(t, rh)!;
        expect(dew, `${t}°C %${rh}`).toBeLessThanOrEqual(t + 0.05);
      }
    }
  });

  it('nem düştükçe çiy noktası düşer', () => {
    const humid = dewPointFromHumidity(15, 90)!;
    const dry = dewPointFromHumidity(15, 30)!;
    expect(dry).toBeLessThan(humid);
  });

  it('sıfır ya da eksik nemde null döner', () => {
    // "%0 nem" gerçek bir ölçüm değil, eksik veri. Sıfır yazmak
    // "çiylenme imkânsız" demek olurdu.
    expect(dewPointFromHumidity(15, 0)).toBeNull();
    expect(dewPointFromHumidity(15, NaN)).toBeNull();
    expect(dewPointFromHumidity(NaN, 60)).toBeNull();
  });
});

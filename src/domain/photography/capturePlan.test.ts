import { describe, it, expect } from 'vitest';
import {
  ditherAdvice,
  estimateStorage,
  formatBytes,
  planCapture,
} from './capturePlan';

/**
 * ÇEKİM PLANI HESAPLARI (§14.2).
 *
 * §14.2 açıkça "hesapların formüllerini testlerle doğrula" diyor, o
 * yüzden buradaki testler elle hesaplanabilir sayılarla yazıldı —
 * fonksiyonun kendi çıktısını beklenen değer olarak almak, formülü
 * değil yalnızca değişmezliği ölçerdi.
 *
 * İkinci kural — "bilimsel sonucu belirsiz alanlarda kesinlik iddiası
 * kullanma" — burada da ölçülüyor: dither bir ARALIK döndürüyor, tek
 * sayı değil; depolama SIKIŞTIRILMAMIŞ boyut veriyor, uydurma bir
 * çarpan uygulamıyor.
 */

describe('planCapture', () => {
  it('hedefi ağırlıklara böler — LRGB 4:1:1:1', () => {
    /* 10 saat = 36 000 sn. Paylar: L 4/7, R/G/B 1/7 each.
       L: 36000×4/7 = 20571,4 sn ÷ 300 = 68,57 → 69 kare
       R: 36000×1/7 =  5142,9 sn ÷ 300 = 17,14 → 18 kare  */
    const plan = planCapture(10, [
      { filter: 'L', weight: 4, subSeconds: 300 },
      { filter: 'R', weight: 1, subSeconds: 300 },
      { filter: 'G', weight: 1, subSeconds: 300 },
      { filter: 'B', weight: 1, subSeconds: 300 },
    ]);

    expect(plan.rows.map((r) => r.frames)).toEqual([69, 18, 18, 18]);
    expect(plan.totalFrames).toBe(123);
    expect(plan.totalSeconds).toBe(123 * 300);
  });

  it('kare sayısı YUKARI yuvarlanır — hedefin altında kalınmaz', () => {
    /* 1 saat = 3600 sn ÷ 500 = 7,2 kare. Aşağı yuvarlamak 7 kare =
       3500 sn verir, yani hedefin altı. */
    const plan = planCapture(1, [{ filter: 'Ha', weight: 1, subSeconds: 500 }]);
    expect(plan.rows[0]!.frames).toBe(8);
    expect(plan.totalSeconds).toBe(4000);
    expect(plan.totalSeconds).toBeGreaterThanOrEqual(3600);
  });

  it('gece sayısı kullanılabilir süreye bölünür, yukarı yuvarlanır', () => {
    /* 10 saat plan, gecede 4 saat → 2,5 → 3 gece. */
    const plan = planCapture(
      10,
      [{ filter: 'L', weight: 1, subSeconds: 3600 }],
      { usableHoursPerNight: 4 }
    );
    expect(plan.totalSeconds).toBe(10 * 3600);
    expect(plan.nights).toBe(3);
  });

  it('gece süresi verilmezse gece sayısı `null` — ortalama uydurulmuyor', () => {
    const plan = planCapture(5, [{ filter: 'L', weight: 1, subSeconds: 300 }]);
    expect(plan.nights).toBeNull();
  });

  it('sıfır ağırlıklı filtre listede kalır ama kare almaz', () => {
    /* Kullanıcı bir filtreyi geçici sıfırlayıp satırı kaybetmemeli. */
    const plan = planCapture(2, [
      { filter: 'L', weight: 1, subSeconds: 120 },
      { filter: 'SII', weight: 0, subSeconds: 120 },
    ]);
    expect(plan.rows).toHaveLength(2);
    expect(plan.rows[1]!.frames).toBe(0);
  });

  it('tüm ağırlıklar sıfırsa bölme patlamaz', () => {
    const plan = planCapture(3, [
      { filter: 'L', weight: 0, subSeconds: 60 },
      { filter: 'R', weight: 0, subSeconds: 60 },
    ]);
    expect(plan.totalFrames).toBe(0);
    expect(plan.totalSeconds).toBe(0);
  });

  it('geçersiz girdi sessizce yanlış sonuç üretmez', () => {
    expect(() => planCapture(-1, [])).toThrow();
    expect(() =>
      planCapture(1, [{ filter: 'L', weight: -1, subSeconds: 60 }])
    ).toThrow();
    /* Sıfır alt poz sonsuz kare demek olurdu. */
    expect(() =>
      planCapture(1, [{ filter: 'L', weight: 1, subSeconds: 0 }])
    ).toThrow();
  });
});

describe('estimateStorage', () => {
  it('formül: genişlik × yükseklik × bayt/piksel × kare', () => {
    /* 6248 × 4176 × 2 bayt = 52 183 296 bayt/kare (ASI2600 benzeri).
       100 kare → 5 218 329 600 bayt. */
    const s = estimateStorage(
      { width: 6248, height: 4176, bitDepth: 16 },
      100
    );
    expect(s.bytesPerFrame).toBe(6248 * 4176 * 2);
    expect(s.lightBytes).toBe(6248 * 4176 * 2 * 100);
    expect(s.totalBytes).toBe(s.lightBytes);
  });

  it('kalibrasyon kareleri ayrı sayılır ama toplama girer', () => {
    const s = estimateStorage({ width: 1000, height: 1000, bitDepth: 16 }, 10, 40);
    expect(s.lightBytes).toBe(2_000_000 * 10);
    expect(s.calibrationBytes).toBe(2_000_000 * 40);
    expect(s.totalBytes).toBe(2_000_000 * 50);
  });

  it('bit derinliği boyutu doğrudan etkiler', () => {
    const on2 = estimateStorage({ width: 100, height: 100, bitDepth: 12 }, 1);
    const on16 = estimateStorage({ width: 100, height: 100, bitDepth: 16 }, 1);
    expect(on16.bytesPerFrame / on2.bytesPerFrame).toBeCloseTo(16 / 12);
  });

  it('geçersiz sensör reddedilir', () => {
    expect(() => estimateStorage({ width: 0, height: 10, bitDepth: 16 }, 1)).toThrow();
    expect(() => estimateStorage({ width: 10, height: 10, bitDepth: 0 }, 1)).toThrow();
    expect(() => estimateStorage({ width: 10, height: 10, bitDepth: 16 }, -1)).toThrow();
  });
});

describe('formatBytes', () => {
  it('1024 tabanı — kullanıcı sonucu diskiyle karşılaştıracak', () => {
    /* 1000 tabanı kullansaydık "40 GB" diyen plan diskte 37,2 GB
       görünürdü ve fark açıklama gerektirirdi. */
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
    expect(formatBytes(1024 ** 3)).toBe('1,0 GB');
  });

  it('GB ve üstünde bir ondalık, altında tam sayı', () => {
    expect(formatBytes(5_218_329_600)).toBe('4,9 GB');
    expect(formatBytes(1024 * 1024 * 137)).toBe('137 MB');
  });

  it('bayt altı ve negatif', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(() => formatBytes(-1)).toThrow();
  });
});

describe('ditherAdvice', () => {
  it('TEK SAYI değil ARALIK döndürüyor — §14.2 kesinlik yasağı', () => {
    /* Dither aralığının türetilebileceği bir denklem yok; tek sayı
       vermek "hesaplandı" demek olurdu. */
    const a = ditherAdvice(180);
    expect(a.min).toBeLessThan(a.max);
    expect(a.note.length).toBeGreaterThan(20);
  });

  it('kısa pozda aralık genişliyor, uzun pozda daralıyor', () => {
    /* Mekanik gerekçe: kısa pozda kare çok, her dither sonrası yeniden
       yerleşme beklemesi toplam süreden pay alır. */
    expect(ditherAdvice(30).min).toBeGreaterThan(ditherAdvice(180).min);
    expect(ditherAdvice(600).min).toBeLessThanOrEqual(ditherAdvice(180).min);
  });

  it('sıfır ya da negatif poz reddedilir', () => {
    expect(() => ditherAdvice(0)).toThrow();
    expect(() => ditherAdvice(-5)).toThrow();
  });
});

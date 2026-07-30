import { describe, expect, it } from 'vitest';
import {
  fitWithin,
  needsResize,
  storagePath,
  extensionOf,
  chooseWithinBudget,
  ARCHIVE_LADDER,
  DISPLAY_MAX_EDGE,
  THUMB_MAX_EDGE,
} from './resize';

describe('fitWithin', () => {
  it('uzun kenarı hedefe indirir, oranı korur', () => {
    // 6000×4000 (3:2) → uzun kenar 2048
    const result = fitWithin({ width: 6000, height: 4000 }, DISPLAY_MAX_EDGE);
    expect(result.width).toBe(2048);
    expect(result.height).toBe(1365);
    expect(result.width / result.height).toBeCloseTo(1.5, 2);
  });

  it('dikey kareyi de doğru ölçekler', () => {
    const result = fitWithin({ width: 4000, height: 6000 }, DISPLAY_MAX_EDGE);
    expect(result.height).toBe(2048);
    expect(result.width).toBe(1365);
  });

  /*
   * Büyütme yok: küçük bir kareyi hedefe kadar şişirmek dosyayı büyütür ve
   * tek bir yeni piksel bilgisi eklemez.
   */
  it('zaten küçük olanı büyütmez', () => {
    const source = { width: 800, height: 600 };
    expect(fitWithin(source, DISPLAY_MAX_EDGE)).toEqual(source);
  });

  it('tam hedefte olanı değiştirmez', () => {
    const source = { width: DISPLAY_MAX_EDGE, height: 1000 };
    expect(fitWithin(source, DISPLAY_MAX_EDGE)).toEqual(source);
  });

  /*
   * Aşırı ince bir panorama küçültülürken kısa kenar 0'a yuvarlanabilir;
   * canvas 0 genişlikte çizemez ve oran hesabı sıfıra bölerdi.
   */
  it('kenarı asla 1 pikselin altına düşürmez', () => {
    const result = fitWithin({ width: 20000, height: 30 }, THUMB_MAX_EDGE);
    expect(result.width).toBe(640);
    expect(result.height).toBeGreaterThanOrEqual(1);
  });

  it('bozuk ölçüde sıfır döner, çökmez', () => {
    expect(fitWithin({ width: 0, height: 100 }, 640)).toEqual({
      width: 0,
      height: 0,
    });
  });
});

describe('needsResize', () => {
  it('yalnızca hedefi aşanlarda true', () => {
    expect(needsResize({ width: 4000, height: 3000 }, 2048)).toBe(true);
    expect(needsResize({ width: 1600, height: 1200 }, 2048)).toBe(false);
    expect(needsResize({ width: 2048, height: 100 }, 2048)).toBe(false);
  });
});

describe('storagePath', () => {
  /*
   * Yolun ilk parçası kullanıcı kimliği: nesne politikaları sahipliği
   * oradan okuyor (0012). Değişirse bir kullanıcı başkasının klasörüne
   * yazabilir hâle gelir.
   */
  it('kullanıcı kimliğiyle başlar', () => {
    const path = storagePath('user-1', 'photo-9', 'display');
    expect(path.startsWith('user-1/')).toBe(true);
    expect(path).toBe('user-1/photo-9/display.jpg');
  });

  it('orijinalde biçim uzantısı korunur', () => {
    expect(storagePath('u', 'p', 'original', 'tif')).toBe('u/p/original.tif');
  });

  it('kullanıcının dosya adı yola hiç girmez', () => {
    // Yol yalnızca kimliklerden kuruluyor; ad kaynaklı sürprizler
    // (boşluk, Türkçe karakter, ../) baştan eleniyor.
    const path = storagePath('u', 'p', 'thumb');
    expect(path).not.toContain(' ');
    expect(path).not.toContain('..');
  });
});

describe('extensionOf', () => {
  it('uzantıyı küçük harfe indirir', () => {
    expect(extensionOf('Gece.JPG')).toBe('jpg');
    expect(extensionOf('yigin.tif')).toBe('tif');
  });

  it('uzantı yoksa varsayılana düşer', () => {
    expect(extensionOf('dosya')).toBe('jpg');
    expect(extensionOf('dosya', 'png')).toBe('png');
  });

  it('nokta içeren adlarda son uzantıyı alır', () => {
    expect(extensionOf('M31.final.v2.jpeg')).toBe('jpeg');
  });
});

describe('ARCHIVE_LADDER', () => {
  /*
   * Merdivenin sırası bir tercih değil, bir ilke: astro karede piksel
   * bilginin kendisidir. Önce sıkıştırma feda edilir, ölçü en sona kalır.
   * Bu test o ilkeyi sabitliyor — biri basamak eklerken sırayı bozarsa
   * burada kırılır.
   */
  it('önce kaliteyi, sonra ölçüyü feda eder', () => {
    const fullSize = ARCHIVE_LADDER.filter((a) => a.maxEdge === Infinity);
    const scaled = ARCHIVE_LADDER.filter((a) => a.maxEdge !== Infinity);

    expect(fullSize.length).toBeGreaterThanOrEqual(3);
    // Ölçü indiren hiçbir basamak, ölçü koruyan bir basamaktan önce gelmemeli.
    const firstScaled = ARCHIVE_LADDER.findIndex((a) => a.maxEdge !== Infinity);
    const lastFull = ARCHIVE_LADDER.map((a) => a.maxEdge).lastIndexOf(Infinity);
    expect(firstScaled).toBeGreaterThan(lastFull);

    // Ölçü indiren basamaklar da giderek küçülüyor.
    const edges = scaled.map((a) => a.maxEdge);
    expect([...edges].sort((a, b) => b - a)).toEqual(edges);
  });

  it('kalite astro gradyanlarında bant yapacak kadar düşmez', () => {
    for (const attempt of ARCHIVE_LADDER) {
      expect(attempt.quality).toBeGreaterThanOrEqual(0.55);
      expect(attempt.quality).toBeLessThanOrEqual(1);
    }
  });
});

describe('chooseWithinBudget', () => {
  const ladder = [
    { maxEdge: Infinity, quality: 0.9 },
    { maxEdge: Infinity, quality: 0.7 },
    { maxEdge: 2048, quality: 0.6 },
  ];

  it('bütçeye uyan ilk basamakta durur — fazladan kalite feda etmez', () => {
    const tried: number[] = [];
    const sizes = [5000, 900, 100];

    return chooseWithinBudget(1000, ladder, async (_attempt, index) => {
      tried.push(index);
      return { bytes: sizes[index] };
    }).then((choice) => {
      expect(choice?.withinBudget).toBe(true);
      expect(choice?.result.bytes).toBe(900);
      // Üçüncü basamak hiç çalıştırılmadı: her basamak bir canvas turu.
      expect(tried).toEqual([0, 1]);
    });
  });

  it('hiçbiri sığmazsa en küçüğü döner ama uyduğunu SÖYLEMEZ', async () => {
    const sizes = [9000, 7000, 6000];
    const choice = await chooseWithinBudget(
      1000,
      ladder,
      async (_attempt, index) => ({ bytes: sizes[index] })
    );

    expect(choice).not.toBeNull();
    expect(choice?.withinBudget).toBe(false);
    expect(choice?.result.bytes).toBe(6000);
  });

  it('kodlanamayan basamağı atlar, akışı bitirmez', async () => {
    const choice = await chooseWithinBudget(1000, ladder, async (_a, index) =>
      index === 0 ? null : { bytes: 500 }
    );

    expect(choice?.withinBudget).toBe(true);
    expect(choice?.attempt).toEqual(ladder[1]);
  });

  it('hiçbir basamak kodlanamazsa null döner', async () => {
    const choice = await chooseWithinBudget(1000, ladder, async () => null);
    expect(choice).toBeNull();
  });

  it('tam bütçedeki sonuç kabul edilir', async () => {
    const choice = await chooseWithinBudget(1000, ladder, async () => ({
      bytes: 1000,
    }));
    expect(choice?.withinBudget).toBe(true);
  });
});

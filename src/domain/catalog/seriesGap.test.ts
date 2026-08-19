import { describe, expect, it } from 'vitest';
import {
  findSeriesGaps,
  groupSeries,
  modelNumbers,
  modelVariants,
  seriesRoot,
  type CatalogEntry,
} from './seriesGap';

/**
 * SERİ-GAP ANALİZİ (F06).
 *
 * Analiz eksik ürünü UYDURMUYOR, boşluğu işaret ediyor: bir serinin
 * gerçekte hangi üyeleri olduğunu üretici bilir. Uydurulmuş bir model
 * kaydı eksik kayıttan zararlıdır — kullanıcı ona güvenip künyesine
 * yazar.
 */
function e(brand: string, model: string, category = 'optik-tup'): CatalogEntry {
  return { slug: `${brand}-${model}`.toLowerCase(), brand, model, category };
}

describe('seriesRoot', () => {
  it('sayıları ve bilinen sonekleri soyar', () => {
    expect(seriesRoot('Esprit 100ED')).toBe('Esprit');
    expect(seriesRoot('Esprit 120ED')).toBe('Esprit');
    expect(seriesRoot('ASI533MC Pro')).toBe('ASI');
  });

  it('yalnızca sayıdan ibaret adda boş döner', () => {
    expect(seriesRoot('6200')).toBe('');
  });
});

describe('modelNumbers / modelVariants', () => {
  it('sayıları çıkarır', () => {
    expect(modelNumbers('Esprit 100ED')).toEqual([100]);
    expect(modelNumbers('EQ6-R Pro')).toEqual([6]);
  });

  it('varyant soneklerini çıkarır, tekrarsız ve büyük harf', () => {
    expect(modelVariants('ASI533MC Pro')).toEqual(['MC', 'PRO']);
    expect(modelVariants('Esprit 100ED')).toEqual(['ED']);
  });

  /*
   * CANLI VERİDE YAKALANAN YANLIŞ POZİTİF. Küçük harfli "mm"
   * milimetredir: "Hyperion 24mm" bir okülerin odak uzunluğu, mono
   * sensör değil. Harf duyarsız arama katalogda 20'den fazla uydurma
   * "MM varyantı" üretiyordu.
   */
  it('küçük harfli "mm" ölçüsünü MM varyantı saymaz', () => {
    expect(modelVariants('Hyperion 24mm')).toEqual([]);
    expect(modelVariants('Delos 10mm')).toEqual([]);
    expect(modelVariants('Photoline 102mm FPL53')).toEqual([]);
    // Büyük harfli sensör kodu yakalanmaya devam ediyor.
    expect(modelVariants('ASI2600MM Pro')).toContain('MM');
  });
});

describe('groupSeries', () => {
  it('aynı marka ve kökü tek seride toplar', () => {
    const gruplar = groupSeries([
      e('Sky-Watcher', 'Esprit 100ED'),
      e('Sky-Watcher', 'Esprit 120ED'),
      e('Takahashi', 'FSQ 106EDX4'),
    ]);
    const esprit = gruplar.find((g) => g.series === 'Esprit')!;
    expect(esprit.members).toHaveLength(2);
    expect(esprit.numbers).toEqual([100, 120]);
  });

  it('farklı kategoriyi ayrı seri sayar', () => {
    const gruplar = groupSeries([
      e('ZWO', 'ASI174MM Mini', 'guide'),
      e('ZWO', 'ASI174MM Mini', 'astro-kamera'),
    ]);
    expect(gruplar).toHaveLength(2);
  });
});

describe('findSeriesGaps (F06)', () => {
  it('varyant asimetrisini bildirir: MC var, MM yok', () => {
    const bulgular = findSeriesGaps(
      groupSeries([
        e('ZWO', 'ASI533MC Pro', 'astro-kamera'),
        e('ZWO', 'ASI2600MC Pro', 'astro-kamera'),
      ])
    );
    expect(bulgular.some((b) => /MC varyantı var ama MM yok/.test(b.reason))).toBe(
      true
    );
  });

  /*
   * CANLI VERİDE YAKALANDI. Optik tüpte "MC" Maksutov-Cassegrain demek
   * (Bresser Messier MC-127), sensör varyantı değil — orada MM diye bir
   * karşılık yok ve uyarı üretmek yanlış olurdu.
   */
  it('optik tüpteki MC (Maksutov-Cassegrain) asimetri sayılmaz', () => {
    const bulgular = findSeriesGaps(
      groupSeries([
        e('Bresser', 'Messier MC-127/1900', 'optik-tup'),
        e('Bresser', 'Messier MC-152/1900', 'optik-tup'),
      ])
    );
    expect(bulgular.some((b) => /MC|MM/.test(b.reason))).toBe(false);
  });

  it('guide kamerasında yalnız mono olması asimetri sayılmaz', () => {
    // Guide kameraları neredeyse yalnız mono üretiliyor; renkli
    // karşılığının yokluğu eksiklik değil (ZWO ASI guide serisi).
    const bulgular = findSeriesGaps(
      groupSeries([
        e('ZWO', 'ASI120MM Mini', 'guide'),
        e('ZWO', 'ASI174MM Mini', 'guide'),
      ])
    );
    expect(bulgular.some((b) => /MC|MM/.test(b.reason))).toBe(false);
  });

  it('MC ve MM birlikteyse asimetri bildirmez', () => {
    const bulgular = findSeriesGaps(
      groupSeries([
        e('ZWO', 'ASI533MC Pro', 'astro-kamera'),
        e('ZWO', 'ASI533MM Pro', 'astro-kamera'),
      ])
    );
    expect(bulgular.some((b) => /MC|MM/.test(b.reason))).toBe(false);
  });

  it('tek üyeli seriyi "bak" sinyali olarak bildirir (F05 EAGLE durumu)', () => {
    const bulgular = findSeriesGaps(
      groupSeries([e('PrimaLuceLab', 'Eagle 5', 'kontrol')])
    );
    expect(bulgular).toHaveLength(1);
    expect(bulgular[0].reason).toMatch(/tek kayıt/);
    expect(bulgular[0].members).toEqual(['Eagle 5']);
  });

  it('sayısal boşluğu (100,120 var 110 yok) sinyal SAYMAZ', () => {
    // Üretici 110'u hiç yapmamış olabilir; uydurmak kataloğa var olmayan
    // ürün sokardı.
    const bulgular = findSeriesGaps(
      groupSeries([
        e('Sky-Watcher', 'Esprit 100ED'),
        e('Sky-Watcher', 'Esprit 120ED'),
      ])
    );
    expect(bulgular.some((b) => /110/.test(b.reason))).toBe(false);
  });
});

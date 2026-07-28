import { describe, expect, it } from 'vitest';
import {
  MAX_COMPARE,
  compareKeys,
  compareRows,
  comparePath,
  parseCompareParam,
  toggleCompare,
} from './compare';
import { equipment, type EquipmentModel } from './data';

function model(
  slug: string,
  specs: Record<string, string>,
  priceHint?: string
): EquipmentModel {
  return {
    slug,
    brand: 'Marka',
    model: slug,
    category: 'astro-kamera',
    specs,
    priceHint,
  };
}

describe('compareKeys', () => {
  it('anahtarları katalogdaki yazım sırasına göre toplar', () => {
    // Alfabetik sıralamak "Açıklık" ile "Ağırlık"ı yan yana koyup optik ve
    // mekanik bilgiyi karıştırırdı.
    const keys = compareKeys([
      model('a', { Açıklık: '100 mm', Odak: '550 mm' }),
      model('b', { Odak: '250 mm', Ağırlık: '1.6 kg' }),
    ]);
    expect(keys).toEqual(['Açıklık', 'Odak', 'Ağırlık']);
  });
});

describe('compareRows', () => {
  it('farklı değerli satırı işaretler', () => {
    const rows = compareRows([
      model('a', { Odak: '550 mm', Tip: 'APO' }),
      model('b', { Odak: '250 mm', Tip: 'APO' }),
    ]);
    expect(rows.find((r) => r.label === 'Odak')?.differs).toBe(true);
    expect(rows.find((r) => r.label === 'Tip')?.differs).toBe(false);
  });

  it('eksik alanı null bırakır ve kısmi olarak işaretler', () => {
    // Eksik veriyi "aynı" saymak, olmayan bir özelliği varmış gibi
    // gösterir; tabloda "—" ile ayırt edilmesi şart.
    const rows = compareRows([
      model('a', { Odak: '550 mm', Soğutma: 'var' }),
      model('b', { Odak: '550 mm' }),
    ]);
    const row = rows.find((r) => r.label === 'Soğutma')!;
    expect(row.values).toEqual(['var', null]);
    expect(row.partial).toBe(true);
    expect(row.differs).toBe(false);
  });

  it('fiyat segmentini en üste alır', () => {
    const rows = compareRows([
      model('a', { Odak: '550 mm' }, 'Üst segment'),
      model('b', { Odak: '250 mm' }, 'Orta segment'),
    ]);
    expect(rows[0].label).toBe('Fiyat segmenti');
    expect(rows[0].differs).toBe(true);
  });

  it('hiçbir modelde fiyat yoksa o satırı hiç çizmez', () => {
    const rows = compareRows([model('a', { Odak: '550 mm' })]);
    expect(rows.map((r) => r.label)).not.toContain('Fiyat segmenti');
  });

  it('boş seçimde satır üretmez', () => {
    expect(compareRows([])).toEqual([]);
  });
});

describe('toggleCompare', () => {
  it('seçili olmayanı ekler', () => {
    expect(toggleCompare(['a'], 'b')).toEqual({ next: ['a', 'b'], full: false });
  });

  it('seçiliyi çıkarır', () => {
    expect(toggleCompare(['a', 'b'], 'a')).toEqual({ next: ['b'], full: false });
  });

  it('sınırda sessizce yutmaz, dolu olduğunu bildirir', () => {
    // Tıklamanın hiçbir şey yapmaması, arayüzün bozuk olduğu izlenimi verir.
    const full = Array.from({ length: MAX_COMPARE }, (_, i) => `m${i}`);
    const result = toggleCompare(full, 'yeni');
    expect(result.full).toBe(true);
    expect(result.next).toEqual(full);
  });

  it('sınır doluyken çıkarma hâlâ çalışır', () => {
    const full = Array.from({ length: MAX_COMPARE }, (_, i) => `m${i}`);
    expect(toggleCompare(full, 'm0').next).toHaveLength(MAX_COMPARE - 1);
  });
});

describe('parseCompareParam', () => {
  const known = new Set(equipment.map((e) => e.slug));

  it('katalogdaki slug\'ları sırasıyla döndürür', () => {
    expect(parseCompareParam('zwo-asi2600mm,zwo-asi533mc', known)).toEqual([
      'zwo-asi2600mm',
      'zwo-asi533mc',
    ]);
  });

  it('bilinmeyen slug\'ı atar, sayfayı boşaltmaz', () => {
    // Eski bir bağlantıda katalogdan kaldırılmış model olabilir; üçünü de
    // kaybettirmek yerine çalışanları göstermek doğru davranış.
    expect(
      parseCompareParam('zwo-asi2600mm,olmayan-model', known)
    ).toEqual(['zwo-asi2600mm']);
  });

  it('tekrarları temizler', () => {
    expect(
      parseCompareParam('zwo-asi2600mm,zwo-asi2600mm', known)
    ).toEqual(['zwo-asi2600mm']);
  });

  it('sınırdan fazlasını kesip alır', () => {
    const many = equipment.slice(0, MAX_COMPARE + 3).map((e) => e.slug);
    expect(parseCompareParam(many.join(','), known)).toHaveLength(MAX_COMPARE);
  });

  it('boş parametrede boş dizi', () => {
    expect(parseCompareParam(null, known)).toEqual([]);
    expect(parseCompareParam('', known)).toEqual([]);
  });
});

describe('comparePath', () => {
  it('seçimi adres çubuğunda taşır', () => {
    expect(comparePath(['a', 'b'])).toBe('/ekipman/karsilastir?m=a,b');
  });

  it('boş seçimde sorgu parçası eklemez', () => {
    expect(comparePath([])).toBe('/ekipman/karsilastir');
  });
});

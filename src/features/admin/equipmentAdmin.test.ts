import { describe, expect, it } from 'vitest';
import {
  REQUIRED_FIELDS,
  coverageSummary,
  missingFieldReport,
  validatePatch,
} from './equipmentAdmin';
import { equipment, type EquipmentModel } from '@/features/equipment/data';

function model(over: Partial<EquipmentModel>): EquipmentModel {
  return {
    slug: 'x',
    brand: 'X',
    model: 'Y',
    category: 'astro-kamera',
    specs: {},
    ...over,
  };
}

describe('missingFieldReport', () => {
  it('kategorisiyle ilgisiz alanı eksik saymaz', () => {
    // Bir montürde "flanş–sensör mesafesi" diye bir şey yok; onu eksik
    // saymak raporu gürültüye boğar ve gerçek eksikleri görünmez kılar.
    const rows = missingFieldReport([
      model({
        category: 'montur',
        specs: { Ağırlık: '17.7 kg', 'Yük kapasitesi': '20 kg' },
      }),
    ]);
    expect(rows).toEqual([]);
  });

  it('kameranın eksik flanş mesafesini bildirir', () => {
    const rows = missingFieldReport([
      model({
        category: 'astro-kamera',
        specs: { Ağırlık: '0.7 kg' },
        connections: { input: 'M42x0.75' },
      }),
    ]);
    expect(rows[0].missing).toContain('Flanş–sensör mesafesi');
  });

  it('dolu alanı eksik saymaz', () => {
    const rows = missingFieldReport([
      model({
        category: 'astro-kamera',
        specs: { Ağırlık: '0.7 kg' },
        connections: { input: 'M42x0.75' },
        optics: { flangeDistanceMm: 17.5 },
      }),
    ]);
    expect(rows).toEqual([]);
  });

  it('en çok eksiği olan kayıt en üstte', () => {
    const rows = missingFieldReport([
      model({ slug: 'az', category: 'reducer', optics: { factor: 0.7, requiredBackfocusMm: 55 } }),
      model({ slug: 'cok', category: 'reducer' }),
    ]);
    expect(rows[0].slug).toBe('cok');
  });

  it('gerçek katalogda çalışır ve mevcut eksikleri sayar', () => {
    // Sayıyı sabitlemiyoruz — katalog büyüdükçe değişir. Ölçtüğümüz şey
    // raporun gerçek veriyle çalışıp anlamlı bir sonuç ürettiği.
    const rows = missingFieldReport(equipment);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(equipment.length);
    for (const row of rows) {
      expect(row.missing.length).toBeGreaterThan(0);
    }
  });
});

describe('coverageSummary', () => {
  it('eksiksiz + eksik = toplam', () => {
    const summary = coverageSummary(equipment);
    expect(summary.complete + summary.incomplete).toBe(summary.total);
    expect(summary.total).toBe(equipment.length);
  });

  it('kategori dağılımı azalan sırada', () => {
    const counts = coverageSummary(equipment).byCategory.map((c) => c.missing);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
  });
});

describe('validatePatch', () => {
  it('bilinmeyen bağlantı standardını reddeder', () => {
    // Serbest metin bir bağlantı uyumluluk kontrolünde hiçbir şeyle
    // eşleşmez ama alan dolu göründüğü için motor "veri var" sanar.
    expect(validatePatch({ connection_output: 'M48 vidalı' })).toContain(
      'Bilinmeyen bağlantı'
    );
  });

  it('geçerli standardı kabul eder', () => {
    expect(validatePatch({ connection_output: 'M48x0.75' })).toBeNull();
  });

  it('sıfır çarpanı reddeder', () => {
    expect(validatePatch({ optic_factor: 0 })).toContain('sıfırdan büyük');
  });

  it('negatif ölçüyü reddeder', () => {
    expect(validatePatch({ flange_distance_mm: -5 })).toContain('negatif');
  });

  it('boş yama geçerlidir — hiçbir alan değiştirilmiyor', () => {
    expect(validatePatch({})).toBeNull();
  });

  it('null değer alanı temizlemek için geçerlidir', () => {
    // Yanlış girilmiş bir değeri silmek de bir düzeltme; null'ı
    // reddetseydik yönetici hatalı veriyi kaldıramazdı.
    expect(validatePatch({ optic_factor: null })).toBeNull();
  });
});

describe('REQUIRED_FIELDS', () => {
  it('her alan en az bir kategoriye bağlı', () => {
    for (const field of REQUIRED_FIELDS) {
      expect(field.categories.length, field.key).toBeGreaterThan(0);
    }
  });

  it('alan anahtarları tekrar etmiyor', () => {
    const keys = REQUIRED_FIELDS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

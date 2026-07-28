import { describe, expect, it } from 'vitest';
import {
  equipment,
  equipmentCategoryLabels,
  equipmentCategoryOrder,
  brandSlug,
  getEquipmentBySlug,
  type EquipmentCategory,
} from './data';
import { typedSpecs, remainingSpecs, mergeSpecs } from '@/domain/equipment/specs';

describe('ekipman kataloğu bütünlüğü', () => {
  it('slug çakışması yok', () => {
    const slugs = equipment.map((e) => e.slug);
    const duplicates = slugs.filter((s, i) => slugs.indexOf(s) !== i);
    expect(duplicates).toEqual([]);
  });

  it('slug biçimi URL güvenli', () => {
    for (const model of equipment) {
      expect(model.slug, model.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('her kayıt tanımlı bir kategoride', () => {
    for (const model of equipment) {
      expect(equipmentCategoryLabels[model.category], model.slug).toBeTruthy();
    }
  });

  it('her kategoride en az bir kayıt var', () => {
    // Boş bir kategori, arayüzde tıklandığında hiçbir şey göstermeyen bir
    // filtre üretir; ya kayıt eklenmeli ya kategori kaldırılmalı.
    const present = new Set(equipment.map((e) => e.category));
    for (const category of equipmentCategoryOrder) {
      expect(present.has(category), category).toBe(true);
    }
  });

  it('marka slug\'ı boş üretmiyor', () => {
    for (const model of equipment) {
      expect(brandSlug(model.brand), model.brand).not.toBe('');
    }
  });

  it('her kayıtta en az iki teknik özellik var', () => {
    // Tek satırlık künye karşılaştırma tablosunda boş sütun üretir.
    for (const model of equipment) {
      expect(Object.keys(model.specs).length, model.slug).toBeGreaterThanOrEqual(2);
    }
  });

  it('slug ile geri bulunuyor', () => {
    for (const model of equipment.slice(0, 20)) {
      expect(getEquipmentBySlug(model.slug)?.model).toBe(model.model);
    }
  });
});

describe('typed kolon gidiş-dönüşü', () => {
  /**
   * Typed kolona giden alanlar (Odak, Açıklık, Piksel, Yük kapasitesi,
   * Ağırlık) sayıya çevrilip geri yazılıyor. Değerin içinde sayıdan başka
   * bir şey varsa — "8 kg (karşı ağırlıksız)" gibi — o açıklama
   * veritabanı yolculuğunda kayboluyor ve aynı model iki kaynakta farklı
   * görünüyor. Bu test tam olarak o durumu yakaladı.
   */
  it('typed alanlarda sayı ve birim dışında metin yok', () => {
    for (const model of equipment) {
      const typed = typedSpecs(model.specs);
      const rebuilt = mergeSpecs(typed, remainingSpecs(model.specs));
      expect(rebuilt, `${model.slug} — typed alanda ek açıklama var`).toEqual(
        model.specs
      );
    }
  });
});

describe('kategori dağılımı', () => {
  it('ışık zincirinin her halkası temsil ediliyor', () => {
    const chain: EquipmentCategory[] = [
      'optik-tup',
      'reducer',
      'barlow',
      'filtre',
      'filtre-carki',
      'astro-kamera',
      'montur',
      'odaklayici',
      'guide',
      'kontrol',
    ];
    for (const category of chain) {
      const count = equipment.filter((e) => e.category === category).length;
      expect(count, category).toBeGreaterThan(0);
    }
  });

  it('katalog en az 120 model taşıyor', () => {
    expect(equipment.length).toBeGreaterThanOrEqual(120);
  });
});

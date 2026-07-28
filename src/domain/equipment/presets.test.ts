import { describe, expect, it } from 'vitest';
import {
  cameraMechanicalPresetsFrom,
  cameraPresetsFrom,
  factorPresetsFrom,
  guidePresetsFrom,
  mountPresetsFrom,
  opticMechanicalPresetsFrom,
  opticPresetsFrom,
  type CatalogEntry,
} from './presets';
import { equipment } from '@/features/equipment/data';

const entries: CatalogEntry[] = equipment;

describe('opticPresetsFrom', () => {
  it('optik tüp ve lensleri odağa göre sıralar', () => {
    const presets = opticPresetsFrom(entries);
    expect(presets.length).toBeGreaterThan(20);
    const focals = presets.map((p) => p.focalLength);
    expect([...focals].sort((a, b) => a - b)).toEqual(focals);
  });

  it('odağı okunamayan kaydı listeye almaz', () => {
    // Uydurma bir odak, FOV hesabını sessizce yanlış yapar; kaydı hiç
    // göstermemek kullanıcıyı en azından yanıltmaz.
    const presets = opticPresetsFrom([
      {
        slug: 'x',
        brand: 'X',
        model: 'Y',
        category: 'optik-tup',
        specs: { Odak: 'bilinmiyor', Açıklık: '100 mm' },
      },
    ]);
    expect(presets).toEqual([]);
  });

  it('montür ve kamera kayıtları optik listesine sızmaz', () => {
    const slugs = new Set(opticPresetsFrom(entries).map((p) => p.slug));
    for (const e of entries) {
      if (e.category === 'montur' || e.category === 'astro-kamera') {
        expect(slugs.has(e.slug), e.slug).toBe(false);
      }
    }
  });
});

describe('cameraPresetsFrom', () => {
  it('sensör boyutunu çözünürlük × piksel boyutundan türetir', () => {
    const presets = cameraPresetsFrom(entries);
    const asi2600 = presets.find((p) => p.slug === 'zwo-asi2600mm');
    expect(asi2600).toBeDefined();
    // 6248 × 3.76 µm = 23.49 mm
    expect(asi2600!.sensorWidth).toBeCloseTo(23.5, 1);
  });

  it('çözünürlüğü olmayan kamerayı listeye almaz', () => {
    const presets = cameraPresetsFrom([
      {
        slug: 'x',
        brand: 'X',
        model: 'Y',
        category: 'astro-kamera',
        specs: { Piksel: '3.76 µm' },
      },
    ]);
    expect(presets).toEqual([]);
  });

  it('en büyük sensör başta gelir', () => {
    const widths = cameraPresetsFrom(entries).map((p) => p.sensorWidth);
    expect([...widths].sort((a, b) => b - a)).toEqual(widths);
  });
});

describe('mountPresetsFrom', () => {
  it('yük kapasitesine göre artan sırada listeler', () => {
    const presets = mountPresetsFrom(entries);
    expect(presets.length).toBeGreaterThan(8);
    const loads = presets.map((p) => p.payloadCapacityKg);
    expect([...loads].sort((a, b) => a - b)).toEqual(loads);
  });

  it('etiket kapasiteyi de gösterir', () => {
    const preset = mountPresetsFrom(entries).find(
      (p) => p.slug === 'sw-eq6r-pro'
    );
    expect(preset?.label).toContain('20 kg');
  });
});

describe('mekanik ön ayarlar', () => {
  it('ağırlığı bilinmeyen optiği uyumluluk listesine almaz', () => {
    // Uyumluluk kontrolü montür yükünü hesaplıyor; eksik ağırlık, aşırı
    // yüklü bir kurulumu "uygun" göstermek olurdu.
    const mechanical = opticMechanicalPresetsFrom(entries);
    const all = opticPresetsFrom(entries);
    expect(mechanical.length).toBeGreaterThan(0);
    expect(mechanical.length).toBeLessThanOrEqual(all.length);
    for (const preset of mechanical) {
      expect(preset.weightKg, preset.slug).toBeGreaterThan(0);
    }
  });

  it('kameraların flanş mesafesi pozitif', () => {
    for (const preset of cameraMechanicalPresetsFrom(entries)) {
      expect(preset.backfocusMm, preset.slug).toBeGreaterThan(0);
    }
  });
});

describe('factorPresetsFrom', () => {
  it('reducer ve barlow tek listede, çarpana göre sıralı', () => {
    const presets = factorPresetsFrom(entries);
    const factors = presets.map((p) => p.factor);
    expect([...factors].sort((a, b) => a - b)).toEqual(factors);
    expect(factors.some((f) => f < 1)).toBe(true); // reducer
    expect(factors.some((f) => f > 1)).toBe(true); // barlow
  });

  it('sıfır ya da negatif çarpanı reddeder', () => {
    // Sıfır çarpan efektif odağı sıfırlar ve FOV hesabı sonsuza gider.
    const presets = factorPresetsFrom([
      {
        slug: 'x',
        brand: 'X',
        model: 'Y',
        category: 'reducer',
        specs: { Çarpan: '0x' },
      },
    ]);
    expect(presets).toEqual([]);
  });
});

describe('guidePresetsFrom', () => {
  it('guide teleskobu ile guide kamerasını eşleştirir', () => {
    const presets = guidePresetsFrom(entries);
    expect(presets.length).toBeGreaterThan(0);
    for (const preset of presets) {
      expect(preset.focalLength).toBeGreaterThan(0);
      expect(preset.pixelSize).toBeGreaterThan(0);
    }
  });
});

import { describe, expect, it } from 'vitest';
import {
  analyzeSetup,
  buildBackfocusChain,
  computeAchievedBackfocus,
  computeEffectiveFRatio,
  computeEffectiveFocal,
  computeGuideRatio,
  computePixelScale,
  computeSensorDiagonal,
  computeTotalWeight,
  computeUsablePayload,
} from './engine';
import type { ResolvedSetup } from './types';
import { equipment, type EquipmentModel } from '@/features/equipment/data';

function model(slug: string): EquipmentModel {
  const found = equipment.find((e) => e.slug === slug);
  if (!found) throw new Error(`katalogda yok: ${slug}`);
  return found;
}

function setup(
  models: ResolvedSetup['models'],
  overrides: Partial<Omit<ResolvedSetup, 'models'>> = {}
): ResolvedSetup {
  return {
    models,
    spacerMm: 0,
    extraWeightKg: 0,
    seeingArcsec: 3,
    ...overrides,
  };
}

/** Gerçek katalog kayıtlarından kurulmuş, çalışan bir referans setup. */
function referenceSetup(): ResolvedSetup {
  return setup({
    montur: model('sw-eq6r-pro'),
    optik: model('sw-esprit-100'),
    kamera: model('zwo-asi2600mm'),
  });
}

describe('computeEffectiveFocal', () => {
  it('reducer çarpanını uygular', () => {
    const withReducer = setup({
      optik: model('askar-fra400'),
      reducer: model('askar-reducer-07x-fra400'),
      kamera: model('zwo-asi2600mm'),
    });
    // 400 mm × 0.7 = 280 mm
    expect(computeEffectiveFocal(withReducer).value).toBeCloseTo(280, 1);
  });

  it('barlow çarpanını uygular', () => {
    const withBarlow = setup({
      optik: model('celestron-edgehd-8'),
      barlow: model('televue-powermate-2x'),
      kamera: model('zwo-asi678mc'),
    });
    expect(computeEffectiveFocal(withBarlow).value).toBeCloseTo(4064, 0);
  });

  it('çarpanı bilinmeyen düzelticide varsayım işaretler', () => {
    // Çarpan uydurulmuyor; 1 kabul ediliyor ve bu açıkça söyleniyor.
    const unknown: EquipmentModel = {
      slug: 'x',
      brand: 'X',
      model: 'Bilinmeyen Reducer',
      category: 'reducer',
      specs: { Uyum: 'genel' },
    };
    const result = computeEffectiveFocal(
      setup({ optik: model('sw-esprit-100'), reducer: unknown })
    );
    expect(result.value).toBe(550);
    expect(result.confidence).toBe('varsayim');
    expect(result.assumptions[0]).toContain('çarpan 1 kabul edildi');
  });

  it('optik yoksa null döner, sıfır değil', () => {
    const result = computeEffectiveFocal(setup({}));
    expect(result.value).toBeNull();
    expect(result.confidence).toBe('veri-yok');
  });
});

describe('computeEffectiveFRatio', () => {
  it('reducer sonrası odak oranını günceller', () => {
    const base = computeEffectiveFRatio(
      setup({ optik: model('askar-fra400'), kamera: model('zwo-asi2600mm') })
    );
    const reduced = computeEffectiveFRatio(
      setup({
        optik: model('askar-fra400'),
        reducer: model('askar-reducer-07x-fra400'),
        kamera: model('zwo-asi2600mm'),
      })
    );
    expect(base.value).toBeCloseTo(400 / 72, 2);
    expect(reduced.value).toBeCloseTo(280 / 72, 2);
    expect(reduced.value!).toBeLessThan(base.value!);
  });
});

describe('computePixelScale', () => {
  it('bilinen bir kombinasyonda doğru sonuç verir', () => {
    // 206.265 × 3.76 µm ÷ 550 mm = 1.410 ″/px
    const result = computePixelScale(referenceSetup());
    expect(result.value).toBeCloseTo(1.41, 2);
    expect(result.unit).toBe('″/px');
  });

  it('formülü ve girdileri sonuçla birlikte taşır', () => {
    // "Neden bu sonuç?" sorusunun cevabı ekranda durmalı.
    const result = computePixelScale(referenceSetup());
    expect(result.formula).toContain('206.265');
    expect(result.inputs.map((i) => i.label)).toContain('Piksel boyutu');
    expect(result.inputs[0].source).toContain('katalog');
  });
});

describe('computeSensorDiagonal', () => {
  it('çözünürlük × piksel boyutundan türetir', () => {
    // 6248×3.76 = 23.49 mm, 4176×3.76 = 15.70 mm → hipotenüs 28.26
    const result = computeSensorDiagonal(referenceSetup());
    expect(result.value).toBeCloseTo(28.26, 1);
  });

  it('çözünürlüğü olmayan kamerada veri-yok döner', () => {
    const noRes: EquipmentModel = {
      slug: 'x',
      brand: 'X',
      model: 'Y',
      category: 'astro-kamera',
      specs: { Piksel: '3.76 µm' },
    };
    expect(computeSensorDiagonal(setup({ kamera: noRes })).value).toBeNull();
  });
});

describe('computeTotalWeight', () => {
  it('montürü toplama katmaz', () => {
    // Montür kendini taşımıyor; katılırsa kapasite kontrolü anlamsızlaşır.
    const result = computeTotalWeight(referenceSetup());
    const labels = result.inputs.map((i) => i.label);
    expect(labels).not.toContain('Montür');
  });

  it('kullanıcı ek ağırlığını ekler', () => {
    const withExtra = computeTotalWeight(
      setup(referenceSetup().models, { extraWeightKg: 2.5 })
    );
    const without = computeTotalWeight(referenceSetup());
    expect(withExtra.value! - without.value!).toBeCloseTo(2.5, 3);
  });

  it('ağırlığı bilinmeyen parçayı sıfır saymaz, varsayım işaretler', () => {
    const heavy: EquipmentModel = {
      slug: 'x',
      brand: 'X',
      model: 'Ağırlığı bilinmeyen tüp',
      category: 'optik-tup',
      specs: { Odak: '1000 mm', Açıklık: '150 mm' },
    };
    const result = computeTotalWeight(
      setup({ montur: model('sw-eq6r-pro'), optik: heavy, kamera: model('zwo-asi2600mm') })
    );
    expect(result.confidence).toBe('varsayim');
    expect(result.assumptions[0]).toContain('en az');
  });
});

describe('computeUsablePayload', () => {
  it('klasik ekvatoryal montürde %60 kullanır', () => {
    const result = computeUsablePayload(referenceSetup());
    expect(result.value).toBeCloseTo(20 * 0.6, 2);
  });

  it('harmonik dişli montürde daha yüksek oran kullanır', () => {
    // Dişli boşluğu olmadığı için güvenli oran daha yüksek tutulabiliyor.
    const harmonic = computeUsablePayload(setup({ montur: model('zwo-am5') }));
    expect(harmonic.value).toBeCloseTo(20 * 0.75, 2);
  });

  it('kullanılan oranı varsayım olarak bildirir', () => {
    const result = computeUsablePayload(referenceSetup());
    expect(result.confidence).toBe('varsayim');
    expect(result.assumptions[0]).toContain('nominal kapasitenin');
  });

  it('montür yoksa null döner', () => {
    expect(computeUsablePayload(setup({})).value).toBeNull();
  });
});

describe('backfocus zinciri', () => {
  it('her parçayı ayrı segment olarak listeler', () => {
    const chain = buildBackfocusChain(
      setup(
        {
          optik: model('sw-esprit-100'),
          oag: model('zwo-oag-l'),
          'filtre-carki': model('zwo-efw-7x36'),
          kamera: model('zwo-asi2600mm'),
        },
        { spacerMm: 3 }
      )
    );
    const labels = chain.map((s) => s.label);
    expect(labels.some((l) => l.includes('OAG-L'))).toBe(true);
    expect(labels.some((l) => l.includes('EFW'))).toBe(true);
    expect(labels.some((l) => l.includes('Ara halkalar'))).toBe(true);
    expect(labels.some((l) => l.includes('flanş'))).toBe(true);
  });

  it('toplam optik yolu doğru sayar', () => {
    // OAG 16.5 + EFW 20 + kamera 17.5 + ara halka 1 = 55.0
    const result = computeAchievedBackfocus(
      setup(
        {
          optik: model('sw-esprit-100'),
          oag: model('zwo-oag-l'),
          'filtre-carki': model('zwo-efw-7x36'),
          kamera: model('zwo-asi2600mm'),
        },
        { spacerMm: 1 }
      )
    );
    expect(result.value).toBeCloseTo(55, 2);
  });

  it('filtre camını kalınlığın 1/3\'ü kadar sayar', () => {
    const withFilter = computeAchievedBackfocus(
      setup({
        optik: model('sw-esprit-100'),
        filtre: model('antlia-3nm-sho'),
        kamera: model('zwo-asi2600mm'),
      })
    );
    const without = computeAchievedBackfocus(
      setup({ optik: model('sw-esprit-100'), kamera: model('zwo-asi2600mm') })
    );
    // 2 mm cam ≈ 0.667 mm optik yol
    expect(withFilter.value! - without.value!).toBeCloseTo(2 / 3, 3);
  });

  it('optik uzunluğu bilinmeyen parçayı varsayım olarak bildirir', () => {
    const unknown: EquipmentModel = {
      slug: 'x',
      brand: 'X',
      model: 'Bilinmeyen çark',
      category: 'filtre-carki',
      specs: { Yuva: '7' },
    };
    const result = computeAchievedBackfocus(
      setup({
        optik: model('sw-esprit-100'),
        'filtre-carki': unknown,
        kamera: model('zwo-asi2600mm'),
      })
    );
    expect(result.confidence).toBe('varsayim');
    expect(result.assumptions[0]).toContain('optik uzunluk katalogda yok');
  });
});

describe('computeGuideRatio', () => {
  it('OAG kullanıldığında ana optiğin odağını kullanır', () => {
    const withOag = computeGuideRatio(
      setup({
        optik: model('sw-esprit-100'),
        kamera: model('zwo-asi2600mm'),
        oag: model('zwo-oag-l'),
        'guide-kamera': model('zwo-asi174mini'),
      })
    );
    // Aynı odakta oran = guide piksel ÷ ana piksel = 5.86 / 3.76
    expect(withOag.value).toBeCloseTo(5.86 / 3.76, 2);
  });

  it('ayrı guide teleskobunda onun odağını kullanır', () => {
    const result = computeGuideRatio(
      setup({
        optik: model('sw-esprit-100'),
        kamera: model('zwo-asi2600mm'),
        'guide-scope': model('sv-bony-sv106-guidescope'),
        'guide-kamera': model('zwo-asi120mm-mini'),
      })
    );
    expect(result.value).toBeGreaterThan(1);
    expect(result.inputs.some((i) => i.label === 'Guide odak uzaklığı')).toBe(true);
  });
});

describe('analyzeSetup', () => {
  it('temel bileşen eksikse bunu ilk sırada bildirir', () => {
    const report = analyzeSetup(setup({ optik: model('sw-esprit-100') }));
    expect(report.checks[0].id).toBe('required');
    expect(report.checks[0].explanation).toContain('Montür');
  });

  it('çalışan bir setup için uyumlu sonuç üretir', () => {
    const report = analyzeSetup(
      setup(
        {
          montur: model('sw-eq6r-pro'),
          optik: model('sw-esprit-100'),
          oag: model('zwo-oag-l'),
          'filtre-carki': model('zwo-efw-7x36'),
          kamera: model('zwo-asi2600mm'),
        },
        { spacerMm: 1 }
      )
    );
    const backfocus = report.checks.find((c) => c.id === 'backfocus');
    expect(backfocus?.status).toBe('uyumlu');
  });

  it('aşırı yüklü setupu önermez', () => {
    const report = analyzeSetup(
      setup(
        {
          montur: model('sw-star-adventurer-gti'),
          optik: model('celestron-c11'),
          kamera: model('zwo-asi2600mm'),
        },
        { extraWeightKg: 0 }
      )
    );
    const payload = report.checks.find((c) => c.id === 'payload');
    expect(payload?.status).toBe('onerilmez');
    expect(payload?.advice).toContain('montür');
  });

  it('bağlantısı uyuşmayan parçalar için adaptör ister', () => {
    const report = analyzeSetup(
      setup({
        montur: model('sw-eq6r-pro'),
        // Esprit çıkışı M48, ASI2600 girişi M42 → adaptör gerekli
        optik: model('sw-esprit-100'),
        kamera: model('zwo-asi2600mm'),
      })
    );
    const connection = report.checks.find((c) => c.id.startsWith('connection-'));
    expect(connection?.status).toBe('adaptor-gerekli');
    expect(connection?.headline).toContain('M48');
  });

  it('veri eksikse uydurma sonuç üretmez', () => {
    const bare: EquipmentModel = {
      slug: 'bare',
      brand: 'Bilinmeyen',
      model: 'Tüp',
      category: 'optik-tup',
      specs: { Tip: 'Newton' },
    };
    const report = analyzeSetup(
      setup({ montur: model('sw-eq6r-pro'), optik: bare, kamera: model('zwo-asi2600mm') })
    );
    const sampling = report.checks.find((c) => c.id === 'sampling');
    expect(sampling?.status).toBe('veri-yok');
    expect(sampling?.explanation).toContain('veritabanında bulunamadı');
    expect(report.missingDataCount).toBeGreaterThan(0);
  });

  it('kontroller önem sırasına göre dizilir', () => {
    const report = analyzeSetup(referenceSetup());
    const severities = report.checks.map((c) => c.severity);
    expect([...severities].sort((a, b) => a - b)).toEqual(severities);
  });

  it('genel sonuç en kötü kontrole eşittir', () => {
    // Sabit bir sonuç beklemek yerine kuralı doğruluyoruz: hangi kontrol
    // en kötüyse özet rozeti onu göstermeli. İlk yazımda "önerilmez"
    // beklemiştim ama aynı setupta backfocus "uyumsuz" çıkıyordu — testin
    // kendisi yanlıştı, motor doğruydu.
    const report = analyzeSetup(
      setup({
        montur: model('sw-star-adventurer-gti'),
        optik: model('celestron-c11'),
        kamera: model('zwo-asi2600mm'),
      })
    );
    const order = ['uyumlu', 'veri-yok', 'dikkat', 'adaptor-gerekli', 'onerilmez', 'uyumsuz'];
    const worstSeen = report.checks.reduce(
      (acc, c) => (order.indexOf(c.status) > order.indexOf(acc) ? c.status : acc),
      'uyumlu' as (typeof report.checks)[number]['status']
    );
    expect(report.verdict).toBe(worstSeen);
    // Bu setup gerçekten sorunlu olmalı — test boş yere geçmesin.
    expect(['onerilmez', 'uyumsuz']).toContain(report.verdict);
  });

  it('hızlı optikte dar bant filtre için uyarı verir', () => {
    // f/4 Newton + 3 nm filtre: bant kayması riski.
    const report = analyzeSetup(
      setup({
        montur: model('sw-eq6r-pro'),
        optik: model('sw-200p-f4'),
        reducer: model('starizona-nexus-075x'),
        filtre: model('chroma-3nm-ha'),
        kamera: model('zwo-asi2600mm'),
      })
    );
    const filter = report.checks.find((c) => c.id === 'filter');
    expect(filter?.status).toBe('dikkat');
    expect(filter?.advice).toContain('f/2');
  });
});

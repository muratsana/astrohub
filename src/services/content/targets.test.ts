import { describe, expect, it } from 'vitest';
import { mapTargetRow } from './targets';
import { targets } from '@/features/targets/data';


/**
 * Tohum kaydından, veritabanının döndüreceği satırı üretir.
 *
 * Tohum veri saat/derece metinleri tutuyor, veritabanı derece sayıları.
 * Fikstür bu çevirmeyi tersine yapıyor ki test, arayüzün gördüğü değerin
 * iki kaynakta da aynı olduğunu gerçekten ölçsün.
 */
function rowFor(slug: string, { asText = false } = {}) {
  const seed = targets.find((t) => t.slug === slug);
  if (!seed) throw new Error(`tohum kaydı yok: ${slug}`);

  /*
   * Koordinatlar tohumun HAM derecesinden geliyor, biçimlenmiş
   * metninden değil. İlk sürüm "+22° 01′" dizesini geri ayrıştırıyordu
   * ve bu, yay saniyesi altındaki basamağı kaybediyordu (22.017 →
   * 22.0167). Veritabanı tam değeri saklıyor; fikstürün ondan daha az
   * bilgi taşıması, testi gerçekte olmayan bir kayba karşı korurdu.
   */
  const raDeg = seed.raDeg;
  const decDeg = seed.decDeg;
  const [major, minor] = seed.angularSize
    .split('×')
    .map((p) => Number(p.replace('′', '').trim()));

  const cast = (v: number | null) =>
    v === null || Number.isNaN(v) ? null : asText ? String(v) : v;

  return {
    id: `id-${seed.slug}`,
    slug: seed.slug,
    name: seed.name,
    catalog: seed.catalog,
    kind: seed.kind,
    constellation: seed.constellation,
    ra_deg: cast(raDeg),
    dec_deg: cast(decDeg),
    magnitude: cast(seed.magnitude ?? null),
    size_major_arcmin: cast(Number.isFinite(major) ? major : null),
    size_minor_arcmin: cast(Number.isFinite(minor) ? minor : null),
    best_months: seed.bestMonths,
    difficulty: seed.difficulty,
    recommended_focal: seed.recommendedFocal,
    recommended_filters: seed.recommendedFilters,
    description: seed.description,
    catalog_identifiers: [
      { code: seed.catalog, is_primary: true },
      ...seed.aliases.map((code) => ({ code, is_primary: false })),
    ],
  };
}

describe('mapTargetRow', () => {
  it('satırı tohum kaydının aynısına çevirir', () => {
    const seed = targets.find((t) => t.slug === 'm31-andromeda')!;
    expect(mapTargetRow(rowFor('m31-andromeda'))).toEqual({
      ...seed,
      id: 'id-m31-andromeda',
    });
  });

  it('numeric kolonlar metin gelse de aynı sonucu verir', () => {
    // PostgREST numeric'i string serileştirir; sınırda çevrilmezse
    // koordinatlar "5.588" yerine NaN olur ve hedef listeden düşer.
    const seed = targets.find((t) => t.slug === 'm42-orion')!;
    expect(mapTargetRow(rowFor('m42-orion', { asText: true }))).toEqual({
      ...seed,
      id: 'id-m42-orion',
    });
  });

  it('tek eksenli boyutu iki kez yazmaz', () => {
    const mapped = mapTargetRow(rowFor('m13-herkul'));
    expect(mapped.angularSize).toBe('20′');
  });

  it('birincil kod alias listesine sızmaz', () => {
    // "M 31 — M 31, NGC 224" gibi bir künye, aynı bilgiyi iki kez yazardı.
    const mapped = mapTargetRow(rowFor('m31-andromeda'));
    expect(mapped.aliases).not.toContain('M 31');
    expect(mapped.aliases).toContain('NGC 224');
  });

  it('koordinatsız satırda boş metin döner, sıfır değil', () => {
    // Sıfır gerçek bir koordinattır (Koç noktası); efemeris hesabı
    // koordinatsız bir hedefi oraya çivilemiş olurdu.
    const row = { ...rowFor('m31-andromeda'), ra_deg: null, dec_deg: null };
    const mapped = mapTargetRow(row);
    expect(mapped.ra).toBe('');
    expect(mapped.dec).toBe('');
  });

  it('türetilen alanlar boş satırda kural motorundan doldurulur', () => {
    const row = {
      ...rowFor('m31-andromeda'),
      best_months: null,
      difficulty: null,
      recommended_focal: null,
      recommended_filters: null,
    };
    const mapped = mapTargetRow(row);
    expect(mapped.bestMonths).toBe('Ağustos – Kasım');
    expect(mapped.difficulty).toBe('Kolay');
    expect(mapped.recommendedFocal).toContain('mm');
    expect(mapped.recommendedFilters.length).toBeGreaterThan(0);
  });

  it('geçersiz zorluk değeri kurala düşer, ekrana yazılmaz', () => {
    const row = { ...rowFor('m31-andromeda'), difficulty: 'çok kolay' };
    expect(mapTargetRow(row).difficulty).toBe('Kolay');
  });

  it('sabit koordinatlı hedeflerin tamamı gidiş-dönüşü korur', () => {
    for (const seed of targets.filter((t) => !t.moving)) {
      expect(mapTargetRow(rowFor(seed.slug)), seed.slug).toEqual({
        ...seed,
        id: `id-${seed.slug}`,
      });
    }
  });
});

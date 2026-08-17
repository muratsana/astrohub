import { describe, expect, it } from 'vitest';
import { GuideDocumentSchema, describeUnsafeGuideHtml } from '@/domain/content/guide';
import { GUIDE_SEEDS, describeSegmentProblem, guideSeed } from './guidesAdmin';

/**
 * TOHUMLAR ŞEMADAN GEÇMELİ.
 *
 * Bu test üç rehberin GERÇEK üretilmiş gövdesini (toplam ~400 kB) şemadan
 * geçiriyor. İki şeyi birden koruyor:
 *
 *   · Panel bir rehberi ilk kez kaydettiğinde tohum olduğu gibi tabloya
 *     iniyor. Tohum şemadan geçmiyorsa kaydetme çalışmaz ve bunu ancak
 *     üretimde fark ederdik.
 *   · Üretici betik (`scripts/<rehber>-icerik.mjs`) çıktısını kendi
 *     doğruluyor ama listesi üç desenli. Buradaki liste daha geniş
 *     (iframe/object/embed dahil); ikisi ayrışırsa bu test söyler.
 */
describe('rehber tohumları', () => {
  it('üç rehber de tanımlı', () => {
    expect(GUIDE_SEEDS.map((s) => s.slug)).toEqual([
      'snr-rehberi',
      'kutup-hizalamasi',
      'drizzle-rehberi',
    ]);
  });

  it.each(GUIDE_SEEDS.map((seed) => [seed.slug, seed] as const))(
    '%s tohumu şemadan geçiyor',
    (_slug, seed) => {
      const sonuc = GuideDocumentSchema.safeParse({
        toc: seed.toc,
        segments: seed.segments,
      });
      expect(sonuc.success).toBe(true);
    }
  );

  it.each(GUIDE_SEEDS.map((seed) => [seed.slug, seed] as const))(
    '%s gövdesinde güvensiz desen yok',
    (_slug, seed) => {
      const html = seed.segments
        .filter((s) => s.kind === 'html')
        .map((s) => (s.kind === 'html' ? s.html : ''))
        .join('');
      expect(describeUnsafeGuideHtml(html)).toBeNull();
    }
  );

  it.each(GUIDE_SEEDS.map((seed) => [seed.slug, seed] as const))(
    '%s hem metin hem hesaplayıcı bölümü taşıyor',
    (_slug, seed) => {
      expect(seed.segments.some((s) => s.kind === 'html')).toBe(true);
      expect(seed.segments.some((s) => s.kind === 'widget')).toBe(true);
      expect(seed.toc.length).toBeGreaterThan(0);
    }
  );

  it('bilinmeyen slug tanınmıyor', () => {
    expect(guideSeed('uydurma')).toBeUndefined();
  });
});

describe('describeSegmentProblem', () => {
  it('hesaplayıcı bölümünde sorun aramıyor', () => {
    expect(describeSegmentProblem({ kind: 'widget', id: 'simulator' })).toBeNull();
  });

  it('güvensiz metin bölümünü işaretliyor', () => {
    expect(
      describeSegmentProblem({ kind: 'html', html: '<script>x</script>' })
    ).toBeTruthy();
  });

  it('temiz metin bölümünü geçiriyor', () => {
    expect(
      describeSegmentProblem({ kind: 'html', html: '<p>Temiz</p>' })
    ).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import {
  GuideDocumentSchema,
  describeUnsafeGuideHtml,
  parseGuideDocument,
} from './guide';

/**
 * REHBER GÖVDESİ `dangerouslySetInnerHTML` İLE BASILIYOR.
 *
 * Eskiden içerik depoya işlenmiş sabit bir belgeden geliyordu ve üretici
 * betiği her koşuda doğruluyordu. Artık veritabanından — yani YAZILABİLİR
 * bir yüzeyden — geliyor. Sitenin CSP'sinde `unsafe-inline` var
 * (`vercel.json:788`), dolayısıyla gövdeye giren bir `<script>` gerçekten
 * çalışırdı. Bu testler o kapının kapalı olduğunu ölçüyor.
 */
describe('describeUnsafeGuideHtml', () => {
  it('temiz gövdeyi geçiriyor', () => {
    expect(
      describeUnsafeGuideHtml(
        '<h2 id="giris">Giriş</h2><p>Sinyal, <strong>foton</strong> sayısıdır.</p><table><tr><td>1</td></tr></table>'
      )
    ).toBeNull();
  });

  it('betik etiketini yakalıyor', () => {
    expect(describeUnsafeGuideHtml('<p>a</p><script>alert(1)</script>')).toMatch(
      /script/
    );
  });

  it('olay niteliğini yakalıyor', () => {
    expect(describeUnsafeGuideHtml('<img src=x onerror="alert(1)">')).toBeTruthy();
    expect(describeUnsafeGuideHtml('<div onclick="x()">a</div>')).toBeTruthy();
  });

  it('javascript: adresini yakalıyor', () => {
    expect(
      describeUnsafeGuideHtml('<a href="javascript:alert(1)">tık</a>')
    ).toBeTruthy();
  });

  it('gömülü çerçeveleri yakalıyor', () => {
    expect(describeUnsafeGuideHtml('<iframe src="//x"></iframe>')).toBeTruthy();
    expect(describeUnsafeGuideHtml('<object data="x"></object>')).toBeTruthy();
    expect(describeUnsafeGuideHtml('<embed src="x">')).toBeTruthy();
  });

  it('SVG ve inline stil gibi meşru içeriği engellemiyor', () => {
    /* Rehber gövdesinin dörtte biri üretici tarafından çizilmiş SVG;
       fazla geniş bir yasak listesi içeriği yok ederdi. */
    expect(
      describeUnsafeGuideHtml(
        '<svg viewBox="0 0 10 10"><g><rect width="4" height="4" style="fill:red"/></g></svg>'
      )
    ).toBeNull();
  });
});

describe('GuideDocumentSchema', () => {
  const gecerli = {
    toc: [{ id: 'giris', label: 'Giriş' }],
    segments: [
      { kind: 'html', html: '<p>Metin</p>' },
      { kind: 'widget', id: 'simulator' },
    ],
  };

  it('geçerli belgeyi kabul ediyor', () => {
    expect(GuideDocumentSchema.safeParse(gecerli).success).toBe(true);
  });

  it('betik taşıyan bölümü reddediyor', () => {
    const sonuc = GuideDocumentSchema.safeParse({
      ...gecerli,
      segments: [{ kind: 'html', html: '<script>x</script>' }],
    });
    expect(sonuc.success).toBe(false);
  });

  it('boş gövdeyi reddediyor — sayfa beyaz kalırdı', () => {
    expect(
      GuideDocumentSchema.safeParse({ ...gecerli, segments: [] }).success
    ).toBe(false);
  });

  it('nitelik sınırından kaçabilecek bölüm kimliğini reddediyor', () => {
    /* Kimlik doğrudan `href="#id"` içine giriyor. */
    expect(
      GuideDocumentSchema.safeParse({
        ...gecerli,
        toc: [{ id: 'a" onclick="x', label: 'A' }],
      }).success
    ).toBe(false);
  });
});

describe('parseGuideDocument', () => {
  it('bozuk kayıtta null dönüyor — çağıran tohuma düşsün', () => {
    expect(parseGuideDocument({ toc: 'yanlış', segments: [] })).toBeNull();
    expect(parseGuideDocument(null)).toBeNull();
    expect(
      parseGuideDocument({
        toc: [],
        segments: [{ kind: 'html', html: '<script>x</script>' }],
      })
    ).toBeNull();
  });

  it('geçerli kaydı çözümlüyor', () => {
    const doc = parseGuideDocument({
      toc: [{ id: 'a', label: 'A' }],
      segments: [{ kind: 'html', html: '<p>x</p>' }],
    });
    expect(doc?.segments).toHaveLength(1);
  });
});

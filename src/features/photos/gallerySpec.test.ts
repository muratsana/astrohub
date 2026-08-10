import { describe, it, expect } from 'vitest';
import { gallerySpec } from './gallerySpec';
import { photos } from './data';

/**
 * GALERİ SÜZGEÇLERİ — ekipman (§17.7).
 *
 * ══════════════════════════════════════════════════════════════════════
 * ASIL ÖLÇÜLEN: PARAMETRE ADININ SABİTLİĞİ
 *
 * Fotoğraf künyesindeki ekipman adı `/galeri?optik=...` bağlantısına
 * gidiyor (§17.6). Bağlantıdaki parametre ile buradaki `param` birbirini
 * tutmazsa hata SESSİZ: galeri açılır, süzgeç uygulanmaz, kullanıcı
 * "bu teleskopla çekilenler" diye tıkladığı yerde tüm galeriyi görür ve
 * bunu fark etmez. Bu yüzden adı testle çiviliyoruz.
 */
describe('ekipman süzgeçleri', () => {
  const params = gallerySpec.facets.map((f) => f.param);

  it('optik ve kamera ayrı süzgeç', () => {
    expect(params).toContain('optik');
    expect(params).toContain('kamera');
  });

  it('süzgeç değeri künyedeki adın AYNISI', () => {
    /* Bağlantı `value` alanını olduğu gibi adrese yazıyor; süzgeç başka
       bir biçime (küçük harf, slug) çevirseydi eşleşme tutmazdı. */
    const optik = gallerySpec.facets.find((f) => f.param === 'optik');
    const ornek = photos[0];
    expect(optik?.valueOf(ornek!)).toBe(ornek!.setup.optic);
  });

  it('arama metni ekipmanı da kapsıyor', () => {
    const ornek = photos[0]!;
    const alanlar = gallerySpec.searchFields(ornek);
    expect(alanlar).toContain(ornek.setup.optic);
    expect(alanlar).toContain(ornek.setup.camera);
  });
});

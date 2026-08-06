import { describe, expect, it } from 'vitest';
import { FILTER_SPECTRUM_SELECT } from './filterSpectrum';

/**
 * GÖMME NİTELEYİCİSİNİN NÖBETÇİSİ.
 *
 * `astro_filter_products` ile `astro_filter_categories` arasında iki yol
 * var (birincil kategori FK'si ve ikincil kategori çoka-çok tablosu).
 * Niteleyici düşerse PostgREST sorgunun tamamını `PGRST201` ile
 * reddediyor — ve bu sessiz bir arıza: harita boş kalıyor, arayüz
 * spektral bölümü hiç çizmiyor, hiçbir yerde hata görünmüyor.
 *
 * Canlıda bir kez başımıza geldi. Bu test gerçek bir veritabanına
 * bağlanamaz ama niteleyicinin varlığını garanti edebilir.
 */
describe('filtre spektrum sorgusu', () => {
  it('birincil kategori gömmesi FK adıyla nitelenmiş', () => {
    expect(FILTER_SPECTRUM_SELECT).toContain(
      'astro_filter_categories!astro_filter_products_primary_category_id_fkey'
    );
  });

  it('nitelenmemiş kategori gömmesi BIRAKILMAMIŞ', () => {
    /* "astro_filter_categories (" deseni yalnızca niteleyicinin ardından
       gelmeli; çıplak hâli PGRST201 demek. */
    const ciplak = /astro_filter_categories\s*\(/.test(FILTER_SPECTRUM_SELECT);
    expect(ciplak).toBe(false);
  });

  it('geçiş bantları ve çizgi kodu birlikte isteniyor', () => {
    /* Şerit dalga boyunu koddaki tablodan çözüyor ama HANGİ çizgi
       olduğunu bu gömmeden öğreniyor; düşerse şerit boş çizilir. */
    expect(FILTER_SPECTRUM_SELECT).toContain('astro_filter_passbands');
    expect(FILTER_SPECTRUM_SELECT).toContain('astro_spectral_lines ( code )');
  });
});

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { SITE_SELECT } from './sites';

/**
 * A12 REGRESYONU — SEÇİMDE OLMAYAN KOLON.
 *
 * `/saha` canlıda hiç yüklenmiyordu: seçim dizesi tabloda bulunmayan
 * dört kolon istiyor ve PostgREST sorgunun TAMAMINI 400'e düşürüyordu.
 * Katalog katmanı hatada tohum veriye çekildiği için sayfa dolu
 * görünüyor, kimse bir şey fark etmiyordu.
 *
 * Buradaki test veritabanına bakamaz; bakabildiği şey şu: seçimin
 * istediği her kolonun `SiteRow` içinde bir karşılığı var mı. İkisi
 * ayrıştığında ya eşleyici okumadığı bir kolonu boşuna istiyor ya da —
 * asıl tehlikeli olan — dizeye elle bir kolon eklenip tablo tarafı
 * unutuluyor demektir. Tablo tarafının güvencesi migration'da
 * (20260818210000); bu test dizenin kendi içinde tutarlı kalmasını
 * sağlıyor.
 */
describe('saha listesi seçimi', () => {
  const kaynak = readFileSync('src/services/content/sites.ts', 'utf8');
  /* Arayüz gövdesi SATIR BAŞINDAKİ kapanış süslüsüne kadar okunuyor.
     İlk `}` ile kesmek yetmiyor: `source_urls` alanının tipi kendi
     içinde süslü taşıyor ve dilim orada bitince son iki alan (`rating`,
     `review_count`) görünmez oluyordu — testin kendisi yanlış alarm
     veriyordu. */
  const bas = kaynak.indexOf('interface SiteRow {');
  const arayuz = kaynak.slice(bas, kaynak.indexOf('\n}', bas));

  const kolonlar = SITE_SELECT.split(',').map((k) => k.trim());

  it('boş değil ve tekrar içermiyor', () => {
    expect(kolonlar.length).toBeGreaterThan(10);
    expect(new Set(kolonlar).size).toBe(kolonlar.length);
  });

  it('seçilen her kolonun SiteRow karşılığı var', () => {
    const eksik = kolonlar.filter(
      (k) => !new RegExp(`\\n\\s*${k}[?]?:`).test(arayuz)
    );
    expect(eksik, `SiteRow'da yok: ${eksik.join(', ')}`).toEqual([]);
  });

  /* Birleştirilmiş dize PostgREST tip çözümlemesini bozuyor ve tam da
     bu hatanın derlemede yakalanmasını engelliyordu. */
  it('dize birleştirilerek kurulmuyor', () => {
    const satir = kaynak.slice(
      kaynak.indexOf('export const SITE_SELECT'),
      kaynak.indexOf(';', kaynak.indexOf('export const SITE_SELECT'))
    );
    expect(satir).not.toContain('+');
  });
});

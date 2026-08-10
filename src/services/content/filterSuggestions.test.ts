import { describe, it, expect } from 'vitest';
import { SIK_FILTRELER } from './filterSuggestions';

/**
 * FİLTRE ÖNERİLERİ.
 *
 * Ölçülen şey listenin SIRASI ve İÇERİĞİ: plan §17.1 sekiz kanalın üstte,
 * kataloğun altta olmasını istiyor. Katalog başa gelseydi en sık girilen
 * değer doksan dokuz ürünün arkasında kalırdı.
 *
 * Ağ çağrısı burada sınanmıyor: `useFilterSuggestions` Supabase yoksa
 * sessizce sık kullanılanlarla kalıyor ve asıl güvence bu — öneri bir
 * kolaylık, yükleme sihirbazının önkoşulu değil.
 */
describe('sık kullanılan filtreler', () => {
  it('sekiz kanal, plandaki sırayla', () => {
    expect(SIK_FILTRELER.map((f) => f.value)).toEqual([
      'L',
      'R',
      'G',
      'B',
      'Hα',
      'OIII',
      'SII',
      'UV/IR Cut',
    ]);
  });

  it('her birinin açıklaması var', () => {
    /* Açıklama süs değil: "SII" kısaltmasını bilmeyen biri hangi
       filtreyle çektiğini biliyor ama koduyla eşleştiremiyor. */
    for (const f of SIK_FILTRELER) expect(f.hint).toBeTruthy();
  });

  it('değerler benzersiz', () => {
    const küme = new Set(SIK_FILTRELER.map((f) => f.value));
    expect(küme.size).toBe(SIK_FILTRELER.length);
  });
});

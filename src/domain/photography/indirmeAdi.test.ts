import { describe, expect, it } from 'vitest';
import { indirmeAdi } from './indirmeAdi';

/**
 * Depolamadaki ad `display.jpg`: indirme klasöründe on tane yan yana
 * durunca hangisinin hangi fotoğraf olduğu anlaşılmıyordu.
 */
describe('indirme adı', () => {
  it('parçaları birleştirip sadeleştiriyor', () => {
    expect(indirmeAdi(['astrohub', 'Kalp Bulutsusu', 'IC 1805'])).toBe(
      'astrohub-kalp-bulutsusu-ic-1805.jpg'
    );
  });

  it('Türkçe harfleri güvenli karşılığına indiriyor', () => {
    expect(indirmeAdi(['Işık Kirliliği Çekimi'])).toBe(
      'isik-kirliligi-cekimi.jpg'
    );
  });

  /*
   * BAŞLIK KULLANICI METNİ. Eğik çizgi ve nokta nokta içeren bir ad,
   * dosya adına doğrudan geçirilseydi indirme yolunu kaydın dışına
   * taşımaya çalışan bir girdi hâline gelirdi.
   */
  it('yol karakterlerini dışarıda bırakıyor', () => {
    const ad = indirmeAdi(['../../etc/passwd']);
    expect(ad).not.toContain('/');
    expect(ad).not.toContain('..');
    expect(ad).toBe('etc-passwd.jpg');
  });

  it('boş girdide bile geçerli bir ad üretiyor', () => {
    expect(indirmeAdi([null, '', '   '])).toBe('astrohub-fotograf.jpg');
  });

  it('çok uzun başlığı kırpıyor', () => {
    const ad = indirmeAdi(['x'.repeat(200)]);
    expect(ad.length).toBeLessThanOrEqual(84);
    expect(ad.endsWith('.jpg')).toBe(true);
  });
});

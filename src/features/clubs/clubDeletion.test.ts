import { describe, expect, it } from 'vitest';
import {
  beklemede,
  fetchSilmeDurumu,
  silmeTalebiAc,
  type SilmeTalebi,
} from './clubDeletion';

const talep = (durum: SilmeTalebi['durum']): SilmeTalebi => ({
  id: 'talep-1',
  durum,
  gerekce: 'Topluluk dağıldı.',
  kararNotu: null,
  olusturuldu: '2026-08-08T10:00:00Z',
});

/**
 * GEREKÇE ZORUNLU — VE SUNUCUYA GİTMEDEN ÖNCE.
 *
 * Veritabanındaki CHECK kısıtı da reddediyor; buradaki doğrulama onun
 * yerine geçmiyor, sahibini YAZARKEN uyarmak için var. Boş gerekçe
 * sunucuya gitseydi kullanıcı "check_violation" görürdü — kendi
 * cümlesiyle yazması istenen bir alan için anlaşılmaz bir cevap.
 */
describe('silme talebi — gerekçe zorunlu', () => {
  it('boş gerekçeyle veritabanına gitmiyor', async () => {
    await expect(silmeTalebiAc('bir-topluluk', '   ')).rejects.toThrow(
      /gerekçesi zorunlu/i
    );
  });

  it('gerekçe varsa sunucuya ulaşmayı deniyor', async () => {
    /* Yapılandırma yok, dolayısıyla istemci kurulamıyor ve hata SUNUCU
       yolundan geliyor — yani doğrulama gerekçeyi geçirmiş. */
    await expect(
      silmeTalebiAc('bir-topluluk', 'Topluluk dağıldı.')
    ).rejects.toThrow(/yapılandırılmamış/i);
  });
});

/**
 * SAHİP DEĞİLSE KUTU YOK.
 *
 * Sahiplik sorusunun cevabı veritabanında: RPC sahip olmayana boş
 * dönüyor. Yapılandırma yokken de `null` dönmesi gerekiyor — hata
 * fırlatsaydı, Supabase kapalıyken her topluluk sayfası kırmızı bir
 * uyarı kutusuyla açılırdı.
 */
describe('silme durumu okuma', () => {
  it('yapılandırma yokken sessizce null dönüyor', async () => {
    await expect(fetchSilmeDurumu('bir-topluluk')).resolves.toBeNull();
  });
});

/**
 * AÇIK TALEP HANGİSİ.
 *
 * Yalnızca açık talepte form gizleniyor ve "incelemede" yazıyor.
 * Reddedilmiş bir talebi açık saysaydık sahip ikinci talebi hiç
 * açamazdı; kapanmış talebi açık saymazsak da aynı anda iki talep
 * açılabilirdi — veritabanındaki tekillik kısıtı da tam bu ayrımı
 * kullanıyor.
 */
describe('beklemede', () => {
  it('sıradaki ve incelemedeki talep açık sayılıyor', () => {
    expect(beklemede(talep('pending'))).toBe(true);
    expect(beklemede(talep('in_review'))).toBe(true);
  });

  it('karara bağlanmış talep açık sayılmıyor', () => {
    expect(beklemede(talep('approved'))).toBe(false);
    expect(beklemede(talep('rejected'))).toBe(false);
    expect(beklemede(talep('archived'))).toBe(false);
  });

  it('hiç talep yoksa açık talep de yok', () => {
    expect(beklemede(null)).toBe(false);
  });
});

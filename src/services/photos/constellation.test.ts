import { afterEach, describe, expect, it, vi } from 'vitest';

const kayit = {
  rpc: [] as { fn: string; args: unknown }[],
  sonuc: null as unknown,
  hata: null as { message: string } | null,
  configured: true,
};

vi.mock('@/services/supabase/client', () => ({
  getSupabase: () =>
    kayit.configured
      ? Promise.resolve({
          rpc: async (fn: string, args: unknown) => {
            kayit.rpc.push({ fn, args });
            return { data: kayit.sonuc, error: kayit.hata };
          },
        })
      : null,
}));

import {
  CONSTELLATION_GUESS_ACCURACY,
  guessConstellation,
} from './constellation';

afterEach(() => {
  kayit.rpc = [];
  kayit.sonuc = null;
  kayit.hata = null;
  kayit.configured = true;
});

/**
 * TAKIMYILDIZ TÜRETME (B07).
 *
 * Canlıda ölçüldü: 16.644 nesnenin otantik takımyıldız etiketiyle,
 * dokuz komşulu çoğunluk oyu %91 isabet veriyor (300 nesnelik yansız
 * örneklem). M42 → Avcı, M31 → Andromeda, M51 → Av Köpekleri,
 * M45 → Boğa doğrulandı.
 */
describe('guessConstellation (B07)', () => {
  it('koordinatı RPC ile sorup adı ve isabet oranını döndürür', async () => {
    kayit.sonuc = 'Andromeda';
    const sonuc = await guessConstellation(10.684, 41.269);
    expect(sonuc).toEqual({
      name: 'Andromeda',
      accuracy: CONSTELLATION_GUESS_ACCURACY,
    });
    expect(kayit.rpc[0]).toEqual({
      fn: 'takimyildiz_tahmini',
      args: { p_ra_deg: 10.684, p_dec_deg: 41.269 },
    });
  });

  it('isabet oranı bir ÖLÇÜM — sessizce %100 varsayılmıyor', () => {
    // Tahminin künye alanını sessizce doldurmamasının sebebi bu sayı.
    expect(CONSTELLATION_GUESS_ACCURACY).toBeGreaterThan(0.85);
    expect(CONSTELLATION_GUESS_ACCURACY).toBeLessThan(1);
  });

  it('geçersiz koordinatta RPC hiç çağrılmaz', async () => {
    expect(await guessConstellation(Number.NaN, 41)).toBeNull();
    expect(await guessConstellation(10, Number.POSITIVE_INFINITY)).toBeNull();
    expect(kayit.rpc).toEqual([]);
  });

  it('katalog hata verirse null — künyeye yanlış değer yazılmaz', async () => {
    kayit.hata = { message: 'katalog erişilemedi' };
    expect(await guessConstellation(10, 41)).toBeNull();
  });

  it('boş sonuçta null (kutup bölgesinde komşu bulunamayabilir)', async () => {
    kayit.sonuc = null;
    expect(await guessConstellation(10, 41)).toBeNull();
  });

  it('supabase yapılandırılmamışsa null', async () => {
    kayit.configured = false;
    expect(await guessConstellation(10, 41)).toBeNull();
  });
});

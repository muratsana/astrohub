import { describe, expect, it, vi, afterEach } from 'vitest';
import { fetchTransparency, transparencyFromAod } from './airQuality';

/**
 * Şeffaflık ölçülen bir büyüklük ve testin koruduğu şey de bu: ölçüm
 * gelmediğinde bir sayı ÜRETİLMEMELİ. Nemden türetilmiş bir "şeffaflık",
 * kullanıcının hedef listesini yanlış kurmasına yol açardı.
 */

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('transparencyFromAod', () => {
  it('temiz kıtasal hava berrak sayılıyor', () => {
    expect(transparencyFromAod(0.08)?.index).toBe(1);
    expect(transparencyFromAod(0.15)?.index).toBe(2);
  });

  it('toz taşınımı bulanık sayılıyor', () => {
    expect(transparencyFromAod(0.55)?.index).toBe(4);
    expect(transparencyFromAod(0.9)?.index).toBe(5);
    expect(transparencyFromAod(0.9)?.label).toBe('Çok bulanık');
  });

  /* Sınırlar tek yönlü: 0.2 tam değeri bir üst kademeye ait olmalı,
     yoksa iki kademe aynı değeri iddia eder. */
  it('eşik değerleri üst kademeye ait', () => {
    expect(transparencyFromAod(0.1)?.index).toBe(2);
    expect(transparencyFromAod(0.2)?.index).toBe(3);
    expect(transparencyFromAod(0.4)?.index).toBe(4);
    expect(transparencyFromAod(0.7)?.index).toBe(5);
  });

  it('kadir kaybı AOD ile artıyor', () => {
    const berrak = transparencyFromAod(0.08)!;
    const bulanik = transparencyFromAod(0.6)!;
    expect(bulanik.magnitudeLoss).toBeGreaterThan(berrak.magnitudeLoss);
    /* 1.086 × 0.6 ≈ 0.65 kadir. */
    expect(bulanik.magnitudeLoss).toBeCloseTo(0.65, 2);
  });

  it('geçersiz ölçümde sayı üretmiyor', () => {
    expect(transparencyFromAod(Number.NaN)).toBeNull();
    expect(transparencyFromAod(-1)).toBeNull();
  });
});

function stubFetch(payload: unknown, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok, json: async () => payload }))
  );
}

describe('fetchTransparency', () => {
  const at = new Date('2026-08-01T21:00:00Z');

  it('istenen saatin ölçümünü okuyor', async () => {
    stubFetch({
      hourly: {
        time: ['2026-08-01T20:00Z', '2026-08-01T21:00Z', '2026-08-01T22:00Z'],
        aerosol_optical_depth: [0.05, 0.45, 0.9],
      },
    });
    const result = await fetchTransparency(39.93, 32.86, at);
    expect(result?.aod).toBe(0.45);
    expect(result?.index).toBe(4);
  });

  /*
   * TAHMİN UFKUNUN ÖTESİ. En yakın saat üç saatten uzaksa eşleşme
   * sayılmıyor: komşu günün değerini o geceye yazmak, kullanıcıya
   * bakmadığı bir gecenin havasını göstermek olurdu.
   */
  it('ufkun ötesindeki an için null', async () => {
    stubFetch({
      hourly: {
        time: ['2026-08-01T00:00Z'],
        aerosol_optical_depth: [0.2],
      },
    });
    expect(await fetchTransparency(39.93, 32.86, at)).toBeNull();
  });

  it('ölçüm boşsa null', async () => {
    stubFetch({
      hourly: {
        time: ['2026-08-01T21:00Z'],
        aerosol_optical_depth: [null],
      },
    });
    expect(await fetchTransparency(39.93, 32.86, at)).toBeNull();
  });

  it('servis hata verirse null — panel ayakta kalıyor', async () => {
    stubFetch({}, false);
    expect(await fetchTransparency(39.93, 32.86, at)).toBeNull();
  });

  it('ağ düşerse null, fırlatmıyor', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('ağ yok');
      })
    );
    await expect(fetchTransparency(39.93, 32.86, at)).resolves.toBeNull();
  });

  it('boş yanıtta null', async () => {
    stubFetch({});
    expect(await fetchTransparency(39.93, 32.86, at)).toBeNull();
  });
});

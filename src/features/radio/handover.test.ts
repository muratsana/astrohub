import { describe, expect, it } from 'vitest';
import { decideSource, onTrackEnd, sourceLabels } from './handover';

/**
 * DEVİR TESLİM.
 *
 * Ölçülen asıl kural: canlı yayın başladığında ÇALAN PARÇA KESİLMİYOR.
 * Gerçek radyo otomasyonu da böyle yapmaz — AutoDJ parçayı bitirir,
 * sonra mikrofonu devreder. Kesmek teknik olarak daha kolaydı ve
 * dinleyiciyi parçanın ortasında başka bir sese atlatırdı.
 */

const temel = {
  live: false,
  streamUrl: null as string | null,
  hasTracks: true,
  current: 'kasa' as const,
  playing: true,
};

describe('decideSource — canlı yayın yokken', () => {
  it('kasada kalıyor', () => {
    expect(decideSource(temel)).toEqual({ source: 'kasa', pending: false });
  });

  /**
   * ADRES OLMADAN "CANLI" DEMEK, ÇALINACAK BİR ŞEY OLMADAN CANLI
   * DEMEKTİR. İki şart da gerekli.
   */
  it('ölçüm canlı ama adres yoksa kasada kalıyor', () => {
    expect(decideSource({ ...temel, live: true, streamUrl: null })).toEqual({
      source: 'kasa',
      pending: false,
    });
  });

  it('adres var ama ölçüm canlı değilse kasada kalıyor', () => {
    expect(
      decideSource({ ...temel, live: false, streamUrl: 'https://yayin/live' })
    ).toEqual({ source: 'kasa', pending: false });
  });
});

describe('decideSource — canlı yayın başlayınca', () => {
  const canli = { ...temel, live: true, streamUrl: 'https://yayin/live' };

  /* ASIL KURAL: çalan parça kesilmiyor, bekleniyor. */
  it('kasa çalıyorken hemen geçmiyor, bekliyor', () => {
    expect(decideSource(canli)).toEqual({ source: 'kasa', pending: true });
  });

  /* Duraklatılmışken beklenecek bir parça yok. */
  it('kasa duraklatılmışsa hemen geçiyor', () => {
    expect(decideSource({ ...canli, playing: false })).toEqual({
      source: 'canli',
      pending: false,
    });
  });

  it('kasada parça yoksa hemen geçiyor', () => {
    expect(decideSource({ ...canli, hasTracks: false })).toEqual({
      source: 'canli',
      pending: false,
    });
  });

  it('zaten canlıdaysa kalıyor', () => {
    expect(decideSource({ ...canli, current: 'canli' })).toEqual({
      source: 'canli',
      pending: false,
    });
  });
});

describe('decideSource — canlı yayın düşünce', () => {
  /**
   * TERSİ BEKLEMİYOR. Yayın düştüğünde ortada ses kalmadı; beklemek
   * dinleyiciyi sessizlikte bırakmak olurdu.
   */
  it('canlıdan kasaya HEMEN dönüyor', () => {
    expect(
      decideSource({
        ...temel,
        live: false,
        streamUrl: 'https://yayin/live',
        current: 'canli',
      })
    ).toEqual({ source: 'kasa', pending: false });
  });

  it('adres kaybolunca da hemen dönüyor', () => {
    expect(
      decideSource({ ...temel, live: true, streamUrl: null, current: 'canli' })
    ).toEqual({ source: 'kasa', pending: false });
  });
});

describe('onTrackEnd', () => {
  it('bekleyen canlı yayın varsa sıradaki parçaya geçmiyor', () => {
    expect(onTrackEnd(true)).toBe('canli');
  });

  it('bekleyen yoksa döngü sürüyor', () => {
    expect(onTrackEnd(false)).toBe('kasa');
  });
});

describe('sourceLabels', () => {
  /* Dinleyici hangi kaynağı duyduğunu görebilmeli — ikisi bir radyonun
     iki hâli ama aynı şey değil. */
  it('iki kaynağın da adı var', () => {
    expect(sourceLabels.kasa).toBe('Kayıtlı yayın');
    expect(sourceLabels.canli).toBe('Canlı yayın');
  });
});

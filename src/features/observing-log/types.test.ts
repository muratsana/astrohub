import { describe, it, expect } from 'vitest';
import {
  MAX_NOTE,
  MAX_TARGET,
  describeDraftProblem,
  logTitle,
} from './types';

/**
 * GÖZLEM GÜNLÜĞÜ — saf kurallar (§14.6).
 *
 * Ölçülenler:
 *
 *  1. YALNIZCA TARİH ZORUNLU. §14.6 hiçbir alanı zorunlu kılmıyor; hedef
 *     ve not olmadan da kayıt açılabilmeli — aksi hâlde "dürbünle baktım"
 *     gecesi hiç kaydedilmez.
 *  2. GELECEK TARİH REDDEDİLİR, ama BİR GÜN PAY VAR: kullanıcı kendi
 *     diliminde "bu gece" derken sunucu UTC'de ertesi güne geçmiş
 *     olabilir. Pay `0064`teki CHECK ile aynı.
 *  3. SINIRLAR VERİTABANIYLA AYNI — istemci daha DAR olabilir, daha
 *     geniş olamaz (geniş olsaydı arayüz "tamam" der, veritabanı
 *     reddederdi).
 *  4. KOŞUL ÖLÇEĞİ 1–5 tam sayı.
 */

const bugun = new Date('2026-08-02T12:00:00Z');

describe('describeDraftProblem', () => {
  it('yalnızca tarih yeterli', () => {
    /* Hedefsiz, notsuz, ekipmansız kayıt geçerli olmalı. */
    expect(describeDraftProblem({ observedOn: '2026-08-01' }, bugun)).toBeNull();
  });

  it('tarih zorunlu', () => {
    expect(describeDraftProblem({ observedOn: '' }, bugun)).toMatch(/tarih/i);
  });

  it('okunamayan tarih reddediliyor', () => {
    expect(describeDraftProblem({ observedOn: 'dün' }, bugun)).toMatch(/okunamadı/i);
  });

  it('gelecek tarih reddediliyor ama yarın kabul (saat dilimi payı)', () => {
    /* Türkiye akşamı UTC'de ertesi gün olabilir; kullanıcının "bu gece"si
       reddedilmemeli. Pay `observation_logs_date_check` ile aynı. */
    expect(describeDraftProblem({ observedOn: '2026-08-03' }, bugun)).toBeNull();
    expect(describeDraftProblem({ observedOn: '2026-08-10' }, bugun)).toMatch(
      /gelecek/i
    );
  });

  it('hedef ve not sınırları veritabanıyla aynı', () => {
    expect(
      describeDraftProblem(
        { observedOn: '2026-08-01', target: 'x'.repeat(MAX_TARGET) },
        bugun
      )
    ).toBeNull();
    expect(
      describeDraftProblem(
        { observedOn: '2026-08-01', target: 'x'.repeat(MAX_TARGET + 1) },
        bugun
      )
    ).toMatch(/Hedef/);
    expect(
      describeDraftProblem(
        { observedOn: '2026-08-01', note: 'x'.repeat(MAX_NOTE + 1) },
        bugun
      )
    ).toMatch(/Not/);
  });

  it('koşul ölçeği 1–5 tam sayı', () => {
    const g = (v: number | null) =>
      describeDraftProblem({ observedOn: '2026-08-01', seeing: v }, bugun);
    expect(g(1)).toBeNull();
    expect(g(5)).toBeNull();
    /* `null` "girilmemiş" demek — hata değil. */
    expect(g(null)).toBeNull();
    expect(g(0)).toMatch(/Seeing/);
    expect(g(6)).toMatch(/Seeing/);
    expect(g(3.5)).toMatch(/Seeing/);
  });

  it('şeffaflık da aynı kurala tabi', () => {
    expect(
      describeDraftProblem({ observedOn: '2026-08-01', transparency: 9 }, bugun)
    ).toMatch(/Şeffaflık/);
  });
});

describe('logTitle', () => {
  it('hedef varsa hedefi verir', () => {
    expect(logTitle({ target: 'M31' })).toBe('M31');
  });

  it('hedef yoksa boş başlık değil "Gözlem"', () => {
    /* Boş başlık, tıklanacak bir şey olmadığını düşündürürdü. */
    expect(logTitle({ target: null })).toBe('Gözlem');
    expect(logTitle({ target: '   ' })).toBe('Gözlem');
  });
});

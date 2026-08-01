import { describe, it, expect } from 'vitest';
import {
  buildIcs,
  eventMorning,
  icsFileName,
  reminderAvailability,
  reminderDueAt,
} from './reminders';
import type { AstroEvent } from './types';

/**
 * Bu testlerin ÖLÇÜTÜ VERİTABANI. Her beklenen değer, `app.reminder_due_at`
 * ve `app.reminders_before_write` (0049) canlıda çalıştırılarak alındı;
 * istemcinin ön görünümü sunucunun kararından ayrılırsa kullanıcı
 * seçilebilir görünen bir seçeneğe tıklayıp hata alır.
 *
 * Canlı ölçüm (13.12.2026 15:00Z başlangıçlı etkinlik):
 *   gun            → 2026-12-12 15:00:00+00
 *   etkinlik_gunu  → 2026-12-13 06:00:00+00   (09:00 Europe/Istanbul)
 */

function makeEvent(overrides: Partial<AstroEvent> = {}): AstroEvent {
  return {
    slug: 'geminid-2026-erciyes',
    title: 'Geminid Meteor Yağmuru Kampı',
    type: 'meteor-yagmuru',
    city: 'Kayseri',
    venue: 'Erciyes Yaylası',
    startsAt: '2026-12-13T15:00:00.000Z',
    free: true,
    camping: true,
    kidsFriendly: false,
    astrophotoFocused: true,
    telescopesProvided: false,
    organizer: { name: 'Kayseri Astronomi Derneği', verified: true },
    description: 'Yılın en verimli meteor yağmuru için kamp.',
    program: [],
    observedTargets: [],
    gradient: 'from-slate-900 to-slate-700',
    source: { name: 'Düzenleyici', lastVerifiedAt: '2026-08-01' },
    ...overrides,
  };
}

describe('reminderDueAt', () => {
  it('1 hafta önce = başlangıç - 7 gün', () => {
    expect(
      reminderDueAt('2026-12-13T15:00:00.000Z', 'hafta')?.toISOString()
    ).toBe('2026-12-06T15:00:00.000Z');
  });

  it('1 gün önce, veritabanının ölçülen değeriyle aynı', () => {
    expect(reminderDueAt('2026-12-13T15:00:00.000Z', 'gun')?.toISOString()).toBe(
      '2026-12-12T15:00:00.000Z'
    );
  });

  it('etkinlik günü = yerel 09:00, yani kışın 06:00Z', () => {
    expect(
      reminderDueAt('2026-12-13T15:00:00.000Z', 'etkinlik_gunu')?.toISOString()
    ).toBe('2026-12-13T06:00:00.000Z');
  });

  /**
   * Türkiye yaz saati uygulamıyor: aynı fark yazın da geçerli. Test bunu
   * sabitliyor — kural değişirse (ya da hesap yerel makinenin dilimine
   * kayarsa) burada düşer.
   */
  it('etkinlik günü yazın da 09:00 yerel (06:00Z)', () => {
    expect(
      reminderDueAt('2026-07-15T18:00:00.000Z', 'etkinlik_gunu')?.toISOString()
    ).toBe('2026-07-15T06:00:00.000Z');
  });

  /**
   * GECE YARISINDAN SONRA BAŞLAYAN ETKİNLİK. 22:00Z, İstanbul'da ERTESİ
   * günün 01:00'i; "etkinlik günü sabahı" o ertesi günün 09:00'ı olmalı.
   * UTC gününe bakan bir hesap bir gün geriyi verirdi.
   */
  it('etkinlik günü, yerel güne göre — UTC gününe göre değil', () => {
    expect(eventMorning('2026-12-13T22:00:00.000Z').toISOString()).toBe(
      '2026-12-14T06:00:00.000Z'
    );
  });

  it('özel zaman aynen dönüyor', () => {
    expect(
      reminderDueAt(
        '2026-12-13T15:00:00.000Z',
        'ozel',
        '2026-12-10T08:30:00.000Z'
      )?.toISOString()
    ).toBe('2026-12-10T08:30:00.000Z');
  });

  it('özel zaman verilmemişse an yok', () => {
    expect(reminderDueAt('2026-12-13T15:00:00.000Z', 'ozel')).toBeNull();
  });
});

describe('reminderAvailability', () => {
  const start = '2026-12-13T15:00:00.000Z';

  it('vakti gelmemiş seçenek kurulabilir', () => {
    const state = reminderAvailability(
      start,
      'hafta',
      null,
      new Date('2026-08-01T00:00:00.000Z')
    );
    expect(state.ok).toBe(true);
  });

  /* `app.reminders_before_write`: "Bu hatırlatmanın zamanı geçmiş." */
  it('geçmişte kalan seçenek kurulamaz', () => {
    const state = reminderAvailability(
      start,
      'hafta',
      null,
      new Date('2026-12-12T00:00:00.000Z')
    );
    expect(state).toEqual({ ok: false, reason: 'Bu zaman geçti.' });
  });

  /**
   * SABAH 09:00 SEÇENEĞİ ERKEN ETKİNLİKTE ELENİYOR. 06:00'da başlayan bir
   * gözlem için "etkinlik günü sabahı" etkinlik başladıktan SONRA çalardı;
   * veritabanı da bunu reddediyor ("Hatırlatma etkinlikten sonraya
   * kurulamaz").
   */
  it('etkinlikten sonraya düşen seçenek kurulamaz', () => {
    const state = reminderAvailability(
      '2026-12-13T03:00:00.000Z', // yerel 06:00
      'etkinlik_gunu',
      null,
      new Date('2026-08-01T00:00:00.000Z')
    );
    expect(state).toEqual({
      ok: false,
      reason: 'Etkinlikten sonraya kurulamaz.',
    });
  });

  it('özel zaman seçilmemişse sebebi yazılı', () => {
    const state = reminderAvailability(
      start,
      'ozel',
      null,
      new Date('2026-08-01T00:00:00.000Z')
    );
    expect(state).toEqual({ ok: false, reason: 'Zaman seçilmedi.' });
  });
});

describe('buildIcs', () => {
  const now = new Date('2026-08-01T10:00:00.000Z');

  it('zorunlu VCALENDAR/VEVENT alanlarını taşıyor', () => {
    const ics = buildIcs(makeEvent(), { now });
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('UID:geminid-2026-erciyes@astrohub');
    expect(ics).toContain('DTSTAMP:20260801T100000Z');
    expect(ics).toContain('DTSTART:20261213T150000Z');
    expect(ics).toContain('END:VCALENDAR');
  });

  /* Bitiş yoksa iki saat varsayılıyor — `DTEND`i hiç yazmamak takvim
     uygulamalarında "bütün gün" ya da "anlık" gösterime düşüyor. */
  it('bitiş saati yoksa iki saat sonrası yazılıyor', () => {
    expect(buildIcs(makeEvent(), { now })).toContain('DTEND:20261213T170000Z');
  });

  it('bitiş saati varsa aynen yazılıyor', () => {
    const ics = buildIcs(
      makeEvent({ endsAt: '2026-12-14T04:00:00.000Z' }),
      { now }
    );
    expect(ics).toContain('DTEND:20261214T040000Z');
  });

  /**
   * RFC 5545 §3.3.11. Kaçışlanmayan bir virgül, takvim uygulamasında
   * alanı ikiye bölüyor: "Erciyes Yaylası, Kayseri" iki ayrı değer olurdu.
   */
  it('virgül, noktalı virgül ve satır sonu kaçışlanıyor', () => {
    const ics = buildIcs(
      makeEvent({
        title: 'Kamp; gözlem, atölye',
        description: 'İlk satır\nikinci satır',
      }),
      { now }
    );
    expect(ics).toContain('SUMMARY:Kamp\\; gözlem\\, atölye');
    expect(ics).toContain('DESCRIPTION:İlk satır\\nikinci satır');
    expect(ics).toContain('LOCATION:Erciyes Yaylası\\, Kayseri');
  });

  /**
   * SATIR KATLAMA OKTET SAYIYOR, KARAKTER DEĞİL. Türkçe harfler UTF-8'de
   * iki oktet; karakter sayan bir katlama 75 oktetlik sınırı sessizce
   * aşardı ve dosya bazı takvim uygulamalarında açılmazdı.
   */
  it('uzun satırlar 75 okteti geçmeyecek şekilde katlanıyor', () => {
    const ics = buildIcs(
      makeEvent({ description: 'Ç'.repeat(200) }),
      { now }
    );
    const encoder = new TextEncoder();
    for (const line of ics.split('\r\n')) {
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    }
    /* Katlama devam satırını boşlukla başlatıyor. */
    expect(ics).toContain('\r\n ');
  });

  it('CRLF ile bitiyor', () => {
    expect(buildIcs(makeEvent(), { now }).endsWith('\r\n')).toBe(true);
  });

  it('adres verilirse URL alanı yazılıyor', () => {
    const ics = buildIcs(makeEvent(), {
      now,
      url: 'https://astrohub.example/etkinlik/geminid-2026-erciyes',
    });
    expect(ics).toContain('URL:https://astrohub.example/etkinlik/');
  });

  it('dosya adı slug\'dan geliyor', () => {
    expect(icsFileName(makeEvent())).toBe('geminid-2026-erciyes.ics');
  });
});

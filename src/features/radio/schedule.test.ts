import { describe, expect, it } from 'vitest';
import {
  currentOccurrence,
  nextOccurrence,
  occurrences,
  weekdayName,
  type ProgramSlot,
} from './schedule';

/**
 * PROGRAM TAKVİMİ.
 *
 * Ölçülen asıl kural: **"Salı 21:00" her zaman 21:00**. Türkiye yaz
 * saati uygulamıyor, yani bugün kış ve yaz aynı UTC farkını veriyor —
 * ama hesap dilime bağlı olmamalı. Test hem kışı hem yazı sabitliyor:
 * biri kayarsa kural bozulmuş demektir.
 *
 * Europe/Istanbul = UTC+3, yani yerel 21:00 = 18:00Z.
 */

function slot(over: Partial<ProgramSlot> = {}): ProgramSlot {
  return {
    id: 's1',
    programId: 'p1',
    weekday: 2, // salı
    localTime: '21:00',
    airsAt: null,
    durationMin: 60,
    startsOn: null,
    endsOn: null,
    isRepeat: false,
    ...over,
  };
}

describe('occurrences — haftalık tekrar', () => {
  it('salı 21:00 yerel, 18:00Z olarak üretiliyor', () => {
    const list = occurrences(
      [slot()],
      new Date('2026-08-03T00:00:00Z'), // pazartesi
      new Date('2026-08-10T00:00:00Z')
    );
    expect(list).toHaveLength(1);
    expect(list[0].start.toISOString()).toBe('2026-08-04T18:00:00.000Z');
    expect(list[0].end.toISOString()).toBe('2026-08-04T19:00:00.000Z');
  });

  /* Kışın da aynı yerel saat — Türkiye yaz saati uygulamıyor. */
  it('kışın da yerel 21:00 (18:00Z)', () => {
    const list = occurrences(
      [slot()],
      new Date('2026-12-07T00:00:00Z'),
      new Date('2026-12-14T00:00:00Z')
    );
    expect(list[0].start.toISOString()).toBe('2026-12-08T18:00:00.000Z');
  });

  it('dört haftalık aralıkta dört yayın üretiyor', () => {
    const list = occurrences(
      [slot()],
      new Date('2026-08-03T00:00:00Z'),
      new Date('2026-08-31T00:00:00Z')
    );
    expect(list).toHaveLength(4);
  });

  /**
   * ARALIK YARI AÇIK. Kapalı olsaydı ardışık iki hafta çağrıldığında
   * sınırdaki yayın iki kez görünürdü — takvimde çift kayıt.
   */
  it('bitiş sınırındaki yayın aralığa dahil değil', () => {
    const tam = new Date('2026-08-04T18:00:00Z');
    expect(
      occurrences([slot()], new Date('2026-08-03T00:00:00Z'), tam)
    ).toHaveLength(0);
    expect(
      occurrences([slot()], tam, new Date('2026-08-05T00:00:00Z'))
    ).toHaveLength(1);
  });

  /**
   * GECE YARISINI AŞAN YAYIN. Yerel 01:00 = 22:00Z ÖNCEKİ gün. Yerel
   * güne göre "çarşamba 01:00" olan yayın, UTC'de salı akşamıdır;
   * UTC gününe bakan bir hesap yanlış güne koyardı.
   */
  it('gece yarısından sonraki yayın yerel güne göre yerleşiyor', () => {
    const list = occurrences(
      [slot({ weekday: 3, localTime: '01:00' })], // çarşamba 01:00
      new Date('2026-08-03T00:00:00Z'),
      new Date('2026-08-10T00:00:00Z')
    );
    expect(list).toHaveLength(1);
    /* Çarşamba 5 Ağustos yerel 01:00 → salı 4 Ağustos 22:00Z */
    expect(list[0].start.toISOString()).toBe('2026-08-04T22:00:00.000Z');
  });

  it('saniyeli yerel saat de okunuyor', () => {
    const list = occurrences(
      [slot({ localTime: '21:00:00' })],
      new Date('2026-08-03T00:00:00Z'),
      new Date('2026-08-10T00:00:00Z')
    );
    expect(list[0].start.toISOString()).toBe('2026-08-04T18:00:00.000Z');
  });

  it('bozuk yerel saat yayın üretmiyor', () => {
    expect(
      occurrences(
        [slot({ localTime: '25:99' })],
        new Date('2026-08-03T00:00:00Z'),
        new Date('2026-08-10T00:00:00Z')
      )
    ).toHaveLength(0);
  });
});

describe('occurrences — sezon aralığı', () => {
  it('sezon başlamadan yayın yok', () => {
    expect(
      occurrences(
        [slot({ startsOn: '2026-09-01' })],
        new Date('2026-08-03T00:00:00Z'),
        new Date('2026-08-10T00:00:00Z')
      )
    ).toHaveLength(0);
  });

  it('sezon bittikten sonra yayın yok', () => {
    expect(
      occurrences(
        [slot({ endsOn: '2026-07-31' })],
        new Date('2026-08-03T00:00:00Z'),
        new Date('2026-08-10T00:00:00Z')
      )
    ).toHaveLength(0);
  });

  /**
   * SEZONUN İLK GÜNÜ DAHİL. Karşılaştırma yerel gün üstünden yapılıyor;
   * `Date` karşılaştırsaydık 00:00 UTC ile yerel gün sınırı arasındaki
   * üç saat ilk günü kaçırırdı.
   */
  it('sezonun ilk günündeki yayın dahil', () => {
    const list = occurrences(
      [slot({ startsOn: '2026-08-04' })],
      new Date('2026-08-03T00:00:00Z'),
      new Date('2026-08-10T00:00:00Z')
    );
    expect(list).toHaveLength(1);
  });

  it('sezonun son günündeki yayın dahil', () => {
    const list = occurrences(
      [slot({ endsOn: '2026-08-04' })],
      new Date('2026-08-03T00:00:00Z'),
      new Date('2026-08-10T00:00:00Z')
    );
    expect(list).toHaveLength(1);
  });
});

describe('occurrences — tek seferlik yayın', () => {
  const tek = slot({
    weekday: null,
    localTime: null,
    airsAt: '2026-08-06T19:30:00Z',
    durationMin: 120,
  });

  it('aralıktaysa üretiliyor', () => {
    const list = occurrences(
      [tek],
      new Date('2026-08-03T00:00:00Z'),
      new Date('2026-08-10T00:00:00Z')
    );
    expect(list).toHaveLength(1);
    expect(list[0].end.toISOString()).toBe('2026-08-06T21:30:00.000Z');
  });

  it('aralık dışındaysa üretilmiyor', () => {
    expect(
      occurrences(
        [tek],
        new Date('2026-08-10T00:00:00Z'),
        new Date('2026-08-17T00:00:00Z')
      )
    ).toHaveLength(0);
  });
});

describe('occurrences — sıralama', () => {
  it('başlangıca göre sıralı, slot sırasına göre değil', () => {
    const list = occurrences(
      [
        slot({ id: 'gec', weekday: 5, localTime: '23:00' }),
        slot({ id: 'erken', weekday: 1, localTime: '08:00' }),
      ],
      new Date('2026-08-03T00:00:00Z'),
      new Date('2026-08-10T00:00:00Z')
    );
    expect(list.map((o) => o.slotId)).toEqual(['erken', 'gec']);
  });
});

describe('currentOccurrence', () => {
  it('yayın süresi içindeyken bulunuyor', () => {
    const found = currentOccurrence(
      [slot()],
      new Date('2026-08-04T18:30:00Z') // yerel 21:30
    );
    expect(found?.slotId).toBe('s1');
  });

  it('yayın bittikten sonra bulunmuyor', () => {
    expect(
      currentOccurrence([slot()], new Date('2026-08-04T19:30:00Z'))
    ).toBeNull();
  });

  /* Bitiş anı dışarıda: 19:00Z'de bir saatlik yayın bitmiştir. */
  it('bitiş anında bulunmuyor', () => {
    expect(
      currentOccurrence([slot()], new Date('2026-08-04T19:00:00Z'))
    ).toBeNull();
  });

  /**
   * GECE YARISINI AŞAN UZUN YAYIN. 23:00 yerel başlayan üç saatlik
   * program, ertesi gün 01:00'de hâlâ sürüyor. Yalnızca "bugüne"
   * bakan bir hesap onu kaçırırdı.
   */
  it('gece yarısını aşan yayın sürerken bulunuyor', () => {
    const found = currentOccurrence(
      [slot({ localTime: '23:00', durationMin: 180 })],
      new Date('2026-08-04T21:00:00Z') // yerel çarşamba 00:00
    );
    expect(found?.slotId).toBe('s1');
  });
});

describe('nextOccurrence', () => {
  it('sıradaki yayını veriyor', () => {
    const next = nextOccurrence([slot()], new Date('2026-08-03T00:00:00Z'));
    expect(next?.start.toISOString()).toBe('2026-08-04T18:00:00.000Z');
  });

  it('yayın sürerken sıradaki HAFTAYA bakıyor', () => {
    const next = nextOccurrence([slot()], new Date('2026-08-04T18:30:00Z'));
    expect(next?.start.toISOString()).toBe('2026-08-11T18:00:00.000Z');
  });

  it('hiç yayın yoksa null', () => {
    expect(
      nextOccurrence([slot({ endsOn: '2026-01-01' })], new Date('2026-08-03T00:00:00Z'))
    ).toBeNull();
  });
});

describe('weekdayName', () => {
  it('ISO gün numaralarını adlandırıyor', () => {
    expect(weekdayName(1)).toBe('Pazartesi');
    expect(weekdayName(7)).toBe('Pazar');
    expect(weekdayName(9)).toBe('');
  });
});

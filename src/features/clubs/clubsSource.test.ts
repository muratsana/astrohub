import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { clubs as seedClubs } from './data';
import { citiesOf, DEFAULT_CLUBS, toClubs, type ClubView } from './clubsSource';

const mockSlugler = [
  'antalya-astronomi-dernegi',
  'ege-universitesi-astronomi-kulubu',
  'ankara-astrofotograf-grubu',
  'bursa-astronomi-dernegi',
  'erciyes-astronomi-kulubu',
  'kapadokya-gokbilim-toplulugu',
];

const silmeSql = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260819144027_mock_topluluklari_sil.sql'
  ),
  'utf8'
);

describe('mock topluluk temizliği', () => {
  it('kod tarafında yedek/mock topluluk kalmadı', () => {
    expect(seedClubs).toEqual([]);
    expect(DEFAULT_CLUBS).toEqual([]);
  });

  it('eski seed toplulukları migration ile public dizinden kaldırılıyor', () => {
    for (const slug of mockSlugler) expect(silmeSql).toContain(`'${slug}'`);
    expect(silmeSql).toContain('deleted_at = coalesce(deleted_at, now())');
    expect(silmeSql).toContain('listed = false');
  });
});

describe('toClubs', () => {
  const row = (over: Record<string, unknown> = {}) => ({
    slug: 'ornek-kulup',
    name: 'Örnek Kulüp',
    kind: 'dernek',
    city: 'Ankara',
    founded_year: 2010,
    member_count: 40,
    summary: 'Özet',
    activities: ['Gözlem gecesi'],
    public_events: true,
    shared_equipment: false,
    website: 'https://ornek.org.tr',
    contact_email: 'bilgi@ornek.org.tr',
    join_url: 'https://ornek.org.tr/katil',
    organizer_name: 'Örnek Kulüp',
    source_name: 'Dernek duyurusu',
    info_checked_on: '2026-07-10',
    verified_at: null,
    listed: true,
    ...over,
  });

  it('veri yokken mock dizin çizilmiyor', () => {
    expect(toClubs(null)).toBe(DEFAULT_CLUBS);
    expect(toClubs([])).toBe(DEFAULT_CLUBS);
    expect(toClubs('bozuk')).toBe(DEFAULT_CLUBS);
    expect(toClubs(null)).toEqual([]);
  });

  it('veritabanı satırı koddaki tohumun yerine geçiyor, üstüne EKLENMİYOR', () => {
    /* `mergeWithSeed` kullanılmıyor: birleştirme yapılsaydı dizinden
       çıkarılan kulüp koddaki kopyasından geri gelirdi. */
    const list = toClubs([row({ slug: 'antalya-astronomi-dernegi' })]);
    expect(list).toHaveLength(1);
    expect(list[0]!.slug).toBe('antalya-astronomi-dernegi');
  });

  it('veritabanı satırında fotoğraf yoksa mock kapak kullanılmıyor', () => {
    const slug = 'antalya-astronomi-dernegi';
    const list = toClubs([row({ slug, photo_paths: [] })]);
    expect(list[0]!.photos).toBeUndefined();
  });

  it('listeden çıkarılan kulüp çizilmiyor', () => {
    const list = toClubs([row(), row({ slug: 'gizli', listed: false })]);
    expect(list.map((c) => c.slug)).toEqual(['ornek-kulup']);
  });

  it('hepsi listeden çıkarılmışsa dizin boş kalır, yedeğe DÜŞMEZ', () => {
    expect(toClubs([row({ listed: false })])).toEqual([]);
  });

  it('adsız satır düşürülüyor', () => {
    /* Tıklanınca 404 veren bir kart, olmayan karttan kötü. */
    expect(toClubs([row(), row({ slug: 'bos', name: '  ' })])).toHaveLength(1);
  });

  it('satır vardı ama hiçbiri çizilebilir değilse yedeğe dönülür', () => {
    expect(toClubs([row({ name: '' }), row({ slug: '' })])).toBe(DEFAULT_CLUBS);
  });

  it('https olmayan adres ve katılım bağlantısı düşürülüyor', () => {
    const [c] = toClubs([
      row({ website: 'javascript:alert(1)', join_url: 'http://ornek.org.tr' }),
    ]);
    expect(c!.website).toBeUndefined();
    expect(c!.joinUrl).toBeUndefined();
  });

  it('doğrulama damgası okunuyor, yokluğu `null`', () => {
    expect(toClubs([row()])[0]!.verifiedAt).toBeNull();
    expect(
      toClubs([row({ verified_at: '2026-08-01T09:00:00+00:00' })])[0]!
        .verifiedAt
    ).toBe('2026-08-01T09:00:00+00:00');
  });

  it('bilinmeyen tür gözlem grubuna düşüyor', () => {
    expect(toClubs([row({ kind: 'uydurma' })])[0]!.kind).toBe('gozlem-grubu');
  });

  it('`null` üye sayısı 0 sayılmıyor', () => {
    /* `Number(null) === 0` tuzağı: "üye sayısı bildirilmemiş" ile
       "üyesi yok" aynı şey değil ve sıralamada ters uçlara düşer. */
    const c = toClubs([row({ member_count: null, founded_year: null })])[0]!;
    expect(c.memberCount).toBeUndefined();
    expect(c.foundedYear).toBeUndefined();
  });

  it('faaliyet listesi bozuksa boş liste', () => {
    expect(toClubs([row({ activities: null })])[0]!.activities).toEqual([]);
  });
});

describe('citiesOf', () => {
  it('şehirleri sayıyor ve Türkçe sıralıyor', () => {
    const kulüpler = [
      { city: 'İzmir' },
      { city: 'Ankara' },
      { city: 'İzmir' },
    ] as ClubView[];
    const list = citiesOf(kulüpler);
    expect(list.map((c) => c.city)).toEqual(
      [...new Set(kulüpler.map((c) => c.city))].sort((a, b) =>
        a.localeCompare(b, 'tr')
      )
    );
    expect(list.reduce((t, c) => t + c.count, 0)).toBe(kulüpler.length);
  });

  it('aynı şehirdeki kulüpler tek satırda toplanıyor', () => {
    const list = citiesOf([
      { city: 'Ankara' },
      { city: 'Ankara' },
    ] as ClubView[]);
    expect(list).toEqual([{ city: 'Ankara', count: 2 }]);
  });
});

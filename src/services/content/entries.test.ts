import { describe, expect, it } from 'vitest';
import {
  EMPTY_DRAFT,
  bodyParagraphs,
  draftFromEntry,
  mapEntryRow,
  mergeWithSeed,
  slugFromTitle,
  validateEntry,
  type ContentEntry,
  type EntryDraft,
} from './entries';

const valid: EntryDraft = {
  ...EMPTY_DRAFT,
  slug: 'webb-teleskobu-yeni-goruntu',
  title: 'Webb teleskobundan yeni görüntü',
  summary: 'Webb, Karina Bulutsusu bölgesinde yeni bir mozaik yayımladı.',
  bodyText: 'Birinci paragraf.\n\nİkinci paragraf.',
};

describe('slugFromTitle', () => {
  it('Türkçe harfleri ASCII karşılığına indirir', () => {
    expect(slugFromTitle('Işık Kirliliği Ölçümü')).toBe('isik-kirliligi-olcumu');
    expect(slugFromTitle('Güneş’in Çekimi')).toBe('gunes-in-cekimi');
  });

  it('baştaki ve sondaki tireleri atar', () => {
    expect(slugFromTitle('  --Deneme--  ')).toBe('deneme');
  });
});

describe('bodyParagraphs', () => {
  it('boş satırdan böler ve boşları atar', () => {
    expect(bodyParagraphs('A\n\nB\n\n\n\nC')).toEqual(['A', 'B', 'C']);
  });

  it('HTML etiketlerini temizler', () => {
    // Panelden yapıştırılan metin biçimlendirme taşıyabiliyor; yayımlanan
    // sayfada ham etiket görünmemeli (§15.4).
    expect(bodyParagraphs('<b>Kalın</b> metin')).toEqual(['Kalın metin']);
  });
});

describe('validateEntry', () => {
  it('geçerli taslağı kabul eder', () => {
    expect(validateEntry(valid)).toBeNull();
  });

  it('kısa başlığı reddeder', () => {
    expect(validateEntry({ ...valid, title: 'Kısa' })).toMatch(/Başlık/);
  });

  it('bozuk adresi reddeder', () => {
    expect(validateEntry({ ...valid, slug: 'Büyük Harf' })).toMatch(/Adres/);
  });

  it('boş gövdeyi reddeder', () => {
    expect(validateEntry({ ...valid, bodyText: '   ' })).toMatch(/Gövde/);
  });

  it('bozuk tarihi reddeder', () => {
    expect(validateEntry({ ...valid, publishedAt: '28.07.2026' })).toMatch(
      /Tarih/
    );
  });

  it('http dışı şemayı reddeder', () => {
    // `javascript:` taşıyan bir bağlantı yayımlanan sayfada tıklanabilir
    // hâle gelirdi.
    expect(
      validateEntry({ ...valid, sourceUrl: 'javascript:alert(1)' })
    ).toMatch(/Kaynak adresi/);
  });

  it('kredisiz görsel kabul etmez', () => {
    // CC BY ve CC BY-SA'nın şartı; ayrıca kaynağı yazılmayan bir görselin
    // telif durumu sonradan izlenemez.
    expect(
      validateEntry({ ...valid, imageUrl: 'https://example.com/a.jpg' })
    ).toMatch(/kredi/);
  });

  it('kredili görseli kabul eder', () => {
    expect(
      validateEntry({
        ...valid,
        imageUrl: 'https://example.com/a.jpg',
        imageCredit: 'NASA',
      })
    ).toBeNull();
  });
});

describe('mapEntryRow', () => {
  const row = {
    id: 'e1',
    kind: 'haber' as const,
    slug: 'x',
    title: 'T',
    summary: 'S',
    body: ['p'],
    category: 'kesif',
    published_at: '2026-07-28',
    status: 'yayinda' as const,
    author: null,
    duration: null,
    level: null,
    tint: null,
    image_url: null,
    image_credit: 'NASA',
    image_licence: null,
    source_name: null,
    source_url: null,
  };

  it('adres yoksa görsel nesnesi üretmez', () => {
    // Boş adresle kredi göstermek, olmayan bir görseli kredilendirmek
    // olurdu — hero'da bu hata bir kez yapıldı.
    expect(mapEntryRow(row).image).toBeNull();
  });

  it('adres varsa kredi ve lisansı taşır', () => {
    const entry = mapEntryRow({
      ...row,
      image_url: 'https://example.com/a.jpg',
      image_licence: 'CC BY 4.0',
    });
    expect(entry.image).toEqual({
      url: 'https://example.com/a.jpg',
      credit: 'NASA',
      licence: 'CC BY 4.0',
    });
  });

  it('boş gövdeyi diziye çevirir', () => {
    expect(mapEntryRow({ ...row, body: null }).body).toEqual([]);
  });
});

describe('mergeWithSeed', () => {
  const seed = [{ slug: 'a' }, { slug: 'b' }];
  const entry = (slug: string): ContentEntry => ({
    id: slug,
    kind: 'haber',
    slug,
    title: slug,
    summary: '',
    body: [],
    bodyBlocks: [],
    category: 'kesif',
    publishedAt: '2026-07-28',
    status: 'yayinda',
    author: null,
    duration: null,
    level: null,
    tint: null,
    image: null,
    source: null,
  });

  it('aynı slug varsa veritabanı kaydı tohumun yerine geçer', () => {
    // Paneldeki düzenleme, uygulamanın içindeki eski metnin üstüne
    // geçmeli — yoksa aynı içerik iki kez görünürdü.
    const merged = mergeWithSeed(seed, [entry('a')], (e) => ({ slug: e.slug }));
    expect(merged.map((m) => m.slug)).toEqual(['a', 'b']);
  });

  it('yeni kayıtları öne ekler, tohumu korur', () => {
    const merged = mergeWithSeed(seed, [entry('c')], (e) => ({ slug: e.slug }));
    expect(merged.map((m) => m.slug)).toEqual(['c', 'a', 'b']);
  });

  it('veritabanı boşken tohum olduğu gibi kalır', () => {
    expect(mergeWithSeed(seed, [], (e) => ({ slug: e.slug }))).toHaveLength(2);
  });
});

describe('draftFromEntry', () => {
  it('paragrafları boş satırla birleştirip forma verir', () => {
    const entry = mapEntryRow({
      id: 'e1',
      kind: 'yazi',
      slug: 'x',
      title: 'T',
      summary: 'S',
      body: ['bir', 'iki'],
      category: 'rehber',
      published_at: '2026-07-28',
      status: 'taslak',
      author: 'A',
      duration: '10 dk',
      level: 'Orta',
      tint: null,
      image_url: null,
      image_credit: null,
      image_licence: null,
      source_name: null,
      source_url: null,
    });
    const draft = draftFromEntry(entry);
    expect(draft.bodyText).toBe('bir\n\niki');
    expect(draft.status).toBe('taslak');
    expect(draft.level).toBe('Orta');
  });
});

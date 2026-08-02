import { describe, it, expect } from 'vitest';
import { csvCell, csvFileName, toCsv } from './csv';

/**
 * CSV DIŞA AKTARMA (Faz 4).
 *
 * Ölçülen asıl şey FORMÜL ENJEKSİYONU: dışa aktarmanın gerçek riski
 * yanlış biçimlendirme değil, kullanıcı verisinin YÖNETİCİNİN
 * elektronik tablosunda çalışması. Saldırı kullanıcıdan yöneticiye,
 * veri yoluyla geçiyor.
 */

describe('csvCell', () => {
  it('düz metin olduğu gibi', () => {
    expect(csvCell('Andromeda')).toBe('Andromeda');
    expect(csvCell(42)).toBe('42');
  });

  it('boş değerler BOŞ hücre — "null" metni değil', () => {
    /* "null" yazan bir hücre, gerçekten o metni taşıyan bir kayıttan
       ayırt edilemezdi. */
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });

  it('virgül, tırnak ve satır sonu tırnaklanıyor (RFC 4180 §2.7)', () => {
    expect(csvCell('Ankara, Türkiye')).toBe('"Ankara, Türkiye"');
    expect(csvCell('12" Newton')).toBe('"12"" Newton"');
    expect(csvCell('iki\nsatır')).toBe('"iki\nsatır"');
  });

  it('noktalı virgül de tırnaklanıyor', () => {
    /* Türkçe yerelde Excel ayırıcı olarak `;` kullanıyor; tırnaklamak
       iki yerelde de doğru dosya üretiyor. */
    expect(csvCell('a;b')).toBe('"a;b"');
  });

  it('FORMÜLE DÖNÜŞEBİLECEK HÜCRELER ETKİSİZLEŞTİRİLİYOR', () => {
    /* Excel/LibreOffice `=`, `+`, `-`, `@` ile başlayan hücreyi formül
       sayıyor. Kullanıcı adı `=HYPERLINK(...)` olan biri varsa, o satırı
       dışa aktaran yönetici dosyayı açtığında hücre ÇALIŞIYOR. */
    expect(csvCell('=HYPERLINK("http://kotu")')).toBe(
      '"\'=HYPERLINK(""http://kotu"")"'
    );
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('-1')).toBe("'-1");
    expect(csvCell('@ad')).toBe("'@ad");
    expect(csvCell('\tsekme')).toBe("'\tsekme");
  });

  it('tarih ISO biçiminde', () => {
    expect(csvCell(new Date(Date.UTC(2026, 7, 2, 12, 0)))).toBe(
      '2026-08-02T12:00:00.000Z'
    );
  });
});

describe('toCsv', () => {
  const sutunlar = [
    { label: 'Başlık', value: (r: { t: string; n: number }) => r.t },
    { label: 'Sayı', value: (r: { t: string; n: number }) => r.n },
  ];

  it('BOM ile başlıyor — Excel Türkçe harfleri bozmasın', () => {
    expect(toCsv([], sutunlar).startsWith('\uFEFF')).toBe(true);
  });

  it('başlık satırı boş listede DE var', () => {
    /* Sütun adları olmayan bir dosya, açan kişiye hangi verinin dışa
       aktarıldığını söylemez. */
    expect(toCsv([], sutunlar)).toBe('\uFEFFBaşlık,Sayı\r\n');
  });

  it('satırlar CRLF ile ayrılıyor', () => {
    const metin = toCsv([{ t: 'M31', n: 3 }], sutunlar);
    expect(metin).toBe('\uFEFFBaşlık,Sayı\r\nM31,3\r\n');
  });

  it('sütun sırası tanımdaki sıra', () => {
    const metin = toCsv([{ t: 'a', n: 1 }], [...sutunlar].reverse());
    expect(metin).toContain('Sayı,Başlık');
    expect(metin).toContain('1,a');
  });
});

describe('csvFileName', () => {
  it('modül ve tarih taşıyor', () => {
    expect(csvFileName('galeri', new Date(Date.UTC(2026, 7, 2)))).toBe(
      'astrohub-galeri-2026-08-02.csv'
    );
  });
});

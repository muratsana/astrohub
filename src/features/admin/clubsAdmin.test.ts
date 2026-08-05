import { describe, it, expect } from 'vitest';
import { describeClubInfoProblem, type ClubInfoDraft } from './clubsAdmin';

/**
 * KULÜP DİZİNİ — form kapısı (§14.7).
 *
 * Kısıtların aynısı veritabanında da var (`0067`). Buradaki kapı ikinci
 * bir güvenlik katmanı DEĞİL — yöneticiye PostgREST'in
 * "violates check constraint clubs_website_check" metni yerine ne
 * yapması gerektiğini söylemek için var. O yüzden test edilen şey
 * mesajın çıkıp çıkmadığı, kaydın engellenip engellenmediği değil.
 */

const gecerli: ClubInfoDraft = {
  name: 'Örnek Astronomi Derneği',
  kind: 'dernek',
  city: 'Ankara',
  foundedOn: '2020-01-15',
  place: 'Ankara',
  topics: ['amator-astronomi'],
  summary:
    'Ankara çevresinde halka açık gözlem etkinlikleri düzenleyen topluluk.',
  website: '',
  contactEmail: 'bilgi@ornek.org.tr',
  joinUrl: '',
  sourceName: '',
  infoCheckedOn: '',
  socialUrl: '',
  whatsappUrl: '',
  publicEvents: true,
  sharedEquipment: false,
};

describe('describeClubInfoProblem', () => {
  it('geçerli taslak kaydedilebilir', () => {
    expect(describeClubInfoProblem(gecerli)).toBeNull();
  });

  it('geçerli değerler kabul ediliyor', () => {
    expect(
      describeClubInfoProblem({
        ...gecerli,
        website: 'https://ornek.org.tr',
        joinUrl: 'https://ornek.org.tr/katil',
        sourceName: 'Dernek duyurusu',
        infoCheckedOn: '2026-01-15',
      })
    ).toBeNull();
  });

  it('http adres reddediliyor', () => {
    /* Dizin dışarı bağlantı veriyor; şifresiz bir adrese yönlendirmek
       ziyaretçiyi araya girilebilir bir bağlantıya taşımak olurdu. */
    expect(
      describeClubInfoProblem({ ...gecerli, website: 'http://ornek.org.tr' })
    ).toMatch(/https/);
    expect(
      describeClubInfoProblem({ ...gecerli, joinUrl: 'javascript:alert(1)' })
    ).toMatch(/https/);
  });

  it('biçimsiz e-posta reddediliyor', () => {
    expect(
      describeClubInfoProblem({ ...gecerli, contactEmail: 'bilgi(at)ornek' })
    ).toMatch(/e-postası/);
  });

  it('bozuk tarih reddediliyor', () => {
    expect(
      describeClubInfoProblem({ ...gecerli, infoCheckedOn: '15.01.2026' })
    ).toMatch(/YYYY-AA-GG/);
  });

  it('ileri tarihli kontrol reddediliyor', () => {
    /* "Son kontrol: gelecek ay" ziyaretçiye olmamış bir işi olmuş gibi
       gösterirdi ve tazelik ölçüsünü anlamsızlaştırırdı. */
    const gelecek = new Date(Date.now() + 86_400_000 * 3)
      .toISOString()
      .slice(0, 10);
    expect(
      describeClubInfoProblem({ ...gecerli, infoCheckedOn: gelecek })
    ).toMatch(/gelecekte/);
  });

  it('bugün kabul ediliyor', () => {
    const bugun = new Date().toISOString().slice(0, 10);
    expect(
      describeClubInfoProblem({ ...gecerli, infoCheckedOn: bugun })
    ).toBeNull();
  });
});

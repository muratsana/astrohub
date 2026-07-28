import { describe, expect, it } from 'vitest';
import { mapProfileRow, validateProfile, type ProfileEdit } from './profile';

const base: ProfileEdit = {
  username: 'murat',
  displayName: 'Murat Sana',
  bio: 'Ankara’dan gözlem yapıyorum.',
  city: 'Ankara',
  websiteUrl: '',
};

describe('validateProfile', () => {
  it('geçerli profili kabul eder', () => {
    expect(validateProfile(base)).toBeNull();
  });

  it('kısa kullanıcı adını reddeder', () => {
    expect(validateProfile({ ...base, username: 'ab' })).toMatch(/en az 3/);
  });

  it('kullanıcı adındaki geçersiz karakteri sessizce atmaz', () => {
    // `sanitizeUsername` zaten temizliyor ama sessizce temizlemek kötü:
    // kullanıcı yazdığının neden kaybolduğunu görmeli.
    const problem = validateProfile({ ...base, username: 'murat sana' });
    expect(problem).toMatch(/yalnızca harf/);
  });

  it('Türkçe harfleri de reddeder — adres alfabesi ASCII', () => {
    expect(validateProfile({ ...base, username: 'gökhan' })).toMatch(
      /yalnızca harf/
    );
  });

  it('boş web adresini sorun saymaz', () => {
    expect(validateProfile({ ...base, websiteUrl: '   ' })).toBeNull();
  });

  it('http(s) dışındaki şemayı reddeder', () => {
    // `javascript:` taşıyan bir bağlantı profil sayfasında tıklanabilir
    // hâle gelirdi.
    expect(
      validateProfile({ ...base, websiteUrl: 'javascript:alert(1)' })
    ).toMatch(/geçersiz/);
  });

  it('geçerli https adresini kabul eder', () => {
    expect(
      validateProfile({ ...base, websiteUrl: 'https://astrofoto.example' })
    ).toBeNull();
  });

  it('çok uzun hakkında metnini reddeder', () => {
    expect(validateProfile({ ...base, bio: 'a'.repeat(401) })).toMatch(/400/);
  });
});

describe('mapProfileRow', () => {
  it('boş alanları null bırakır — "girilmemiş" ile boş dize aynı değil', () => {
    const profile = mapProfileRow({
      id: 'u1',
      username: 'murat',
      display_name: null,
      bio: null,
      city: null,
      website_url: null,
      avatar_path: null,
    });
    expect(profile.displayName).toBeNull();
    expect(profile.city).toBeNull();
    expect(profile.username).toBe('murat');
  });

  it('alan adlarını camelCase biçimine çevirir', () => {
    const profile = mapProfileRow({
      id: 'u1',
      username: 'murat',
      display_name: 'Murat Sana',
      bio: 'iki satır',
      city: 'Ankara',
      website_url: 'https://example.com',
      avatar_path: 'u1/avatar.jpg',
    });
    expect(profile.displayName).toBe('Murat Sana');
    expect(profile.websiteUrl).toBe('https://example.com');
    expect(profile.avatarPath).toBe('u1/avatar.jpg');
  });
});

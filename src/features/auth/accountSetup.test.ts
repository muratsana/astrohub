import { describe, expect, it } from 'vitest';
import {
  isGeneratedUsername,
  isProfileComplete,
  isUsernameLocked,
  missingProfileFields,
} from './accountSetup';
import type { Profile } from '@/services/content/profile';

function profile(over: Partial<Profile> = {}): Profile {
  return {
    id: 'u1',
    username: 'orion',
    displayName: null,
    displayNameVisible: true,
    bio: null,
    city: 'Ankara',
    district: null,
    websiteUrl: null,
    avatarPath: null,
    bannerPath: null,
    accountStatus: 'active',
    suspendedUntil: null,
    statusReason: null,
    termsAcceptedAt: '2026-08-01T00:00:00Z',
    usernameCustomizedAt: null,
    ...over,
  };
}

describe('isGeneratedUsername', () => {
  /*
   * DESEN VERİTABANIYLA AYNI OLMALI (`app.uretilmis_kullanici_adi`).
   * Bu sınav o eşleşmenin bekçisi: desen burada gevşerse, adını gerçekten
   * seçmiş bir kullanıcıya kurulum kapısı açılır.
   */
  it('kayıtta üretilen adı tanır', () => {
    expect(isGeneratedUsername('user_16206d94efc3')).toBe(true);
    expect(isGeneratedUsername('user_07436b532b00')).toBe(true);
  });

  it('seçilmiş adları üretilmiş saymaz', () => {
    expect(isGeneratedUsername('muratsana')).toBe(false);
    expect(isGeneratedUsername('user_murat')).toBe(false);
    /* Uzunluk tam 12 olmalı: 11 ya da 13 karakter bizim ürettiğimiz ad
       değil, kullanıcının seçtiği bir ad olabilir. */
    expect(isGeneratedUsername('user_16206d94efc')).toBe(false);
    expect(isGeneratedUsername('user_16206d94efc3a')).toBe(false);
    /* Onaltılık olmayan karakter: `substr(replace(uuid))` çıktısı asla
       'g' içermez. */
    expect(isGeneratedUsername('user_16206d94efcg')).toBe(false);
  });
});

describe('isProfileComplete', () => {
  it('adı ve şehri olan profil tamamdır', () => {
    expect(isProfileComplete(profile())).toBe(true);
  });

  it('üretilmiş ad taşıyan profil eksiktir', () => {
    expect(isProfileComplete(profile({ username: 'user_16206d94efc3' }))).toBe(
      false
    );
  });

  it('şehri olmayan profil eksiktir', () => {
    expect(isProfileComplete(profile({ city: null }))).toBe(false);
    /* Boşluktan ibaret şehir "girilmiş" sayılmamalı. */
    expect(isProfileComplete(profile({ city: '   ' }))).toBe(false);
  });

  /*
   * PROFİL YOKKEN `true`. Kapı bileşeni profil yüklenmeden çizilmemeli;
   * burada `false` dönseydi her sayfa yenilemesinde kurulum ekranı bir
   * an için yanıp sönerdi.
   */
  it('profil henüz yokken kapıyı açmaz', () => {
    expect(isProfileComplete(null)).toBe(true);
  });
});

describe('missingProfileFields', () => {
  it('eksik alanları sırayla sayar', () => {
    expect(
      missingProfileFields(profile({ username: 'user_16206d94efc3', city: null }))
    ).toEqual(['kullanıcı adı', 'şehir']);
  });

  it('tam profilde boş liste döner', () => {
    expect(missingProfileFields(profile())).toEqual([]);
  });
});

describe('isUsernameLocked', () => {
  it('damga basılmışsa kilitlidir', () => {
    expect(
      isUsernameLocked(profile({ usernameCustomizedAt: '2026-08-01T00:00:00Z' }))
    ).toBe(true);
  });

  it('damga yoksa kilitli değildir', () => {
    expect(isUsernameLocked(profile())).toBe(false);
    expect(isUsernameLocked(null)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { validateClientEnv } from './envCheck';

/** Rolü belirtilen sahte ama biçimce geçerli bir JWT üretir. */
function fakeJwt(role: string): string {
  const b64 = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ iss: 'supabase', role })}.imza`;
}

const VALID = {
  supabaseUrl: 'https://ornekproje.supabase.co',
  supabaseAnonKey: 'sb_publishable_abc123',
  siteUrl: 'https://astrohub.com.tr',
};

describe('validateClientEnv', () => {
  it('geçerli üretim yapılandırmasını hatasız geçirir', () => {
    expect(validateClientEnv(VALID, { production: true })).toEqual([]);
  });

  it('üretim dışında env tanımsızken sessiz kalır (CI/yerel kırılmaz)', () => {
    expect(validateClientEnv({}, { production: false })).toEqual([]);
  });

  it('üretimde üç değişkenin eksikliğini ayrı ayrı bildirir', () => {
    const errors = validateClientEnv({}, { production: true });
    expect(errors).toHaveLength(3);
    expect(errors.join('\n')).toMatch(/VITE_SUPABASE_URL/);
    expect(errors.join('\n')).toMatch(/VITE_SUPABASE_ANON_KEY/);
    expect(errors.join('\n')).toMatch(/VITE_SITE_URL/);
  });

  it('canlıda yaşanan "ttps://" yazım hatasını her ortamda yakalar', () => {
    const errors = validateClientEnv(
      { supabaseUrl: 'ttps://eoqggvosegjbburyuyba.supabase.co' },
      { production: false }
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/geçerli bir https/);
  });

  it('http:// site adresini reddeder', () => {
    const errors = validateClientEnv(
      { siteUrl: 'http://astrohub.com.tr' },
      { production: false }
    );
    expect(errors).toHaveLength(1);
  });

  it('gizli anahtarın (sb_secret_) istemciye gömülmesini durdurur', () => {
    const errors = validateClientEnv(
      { ...VALID, supabaseAnonKey: 'sb_secret_cokgizli' },
      { production: true }
    );
    expect(errors.join('\n')).toMatch(/GİZLİ anahtar/);
  });

  it('service_role JWT anahtarını reddeder', () => {
    const errors = validateClientEnv(
      { ...VALID, supabaseAnonKey: fakeJwt('service_role') },
      { production: true }
    );
    expect(errors.join('\n')).toMatch(/service_role/);
  });

  it('anon rollü eski tip JWT anahtarını kabul eder', () => {
    const errors = validateClientEnv(
      { ...VALID, supabaseAnonKey: fakeJwt('anon') },
      { production: true }
    );
    expect(errors).toEqual([]);
  });

  it('ne publishable ne JWT olan bozuk anahtarı bildirir', () => {
    const errors = validateClientEnv(
      { ...VALID, supabaseAnonKey: 'yanlis-yapistirilmis-deger' },
      { production: true }
    );
    expect(errors.join('\n')).toMatch(/yanlış yapıştırılmış/);
  });

  it('değerlerin başındaki/sonundaki boşluğu tolere eder', () => {
    const errors = validateClientEnv(
      {
        supabaseUrl: '  https://ornekproje.supabase.co  ',
        supabaseAnonKey: ' sb_publishable_abc ',
        siteUrl: ' https://astrohub.com.tr ',
      },
      { production: true }
    );
    expect(errors).toEqual([]);
  });
});

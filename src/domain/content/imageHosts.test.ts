import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { CONTENT_IMAGE_HOSTS, isAllowedImageHost } from './imageHosts';

/**
 * ŞEMA İLE CSP AYRIŞMASIN.
 *
 * İki ayrı yerde iki ayrı liste var: tarayıcının neye izin verdiği
 * (`vercel.json` · `img-src`) ve şemanın neyi kaydettiği
 * (`CONTENT_IMAGE_HOSTS`). Ayrıştıkları anda iki sessiz hatadan biri
 * oluyor:
 *
 *   · Şema izin verip CSP vermiyorsa → görsel üretimde yüklenmez, hata
 *     yalnızca okurun konsolunda görünür.
 *   · CSP izin verip şema vermiyorsa → editör geçerli bir adresi
 *     kaydedemez ve nedenini anlamaz.
 *
 * Beklenen liste burada ELLE YAZILMIYOR; gerçek politikadan okunuyor.
 * Elle yazsaydık bu test de unutulmaya açık ÜÇÜNCÜ bir liste olurdu.
 */
function cspImgSrc(): string[] {
  const root = path.resolve(__dirname, '../../..');
  const config = JSON.parse(
    readFileSync(path.join(root, 'vercel.json'), 'utf8')
  ) as { headers: { source: string; headers: { key: string; value: string }[] }[] };

  const policy = config.headers
    .find((h) => h.source === '/(.*)')
    ?.headers.find((h) => h.key === 'Content-Security-Policy')?.value;
  if (!policy) throw new Error('vercel.json içinde CSP yok');

  const directive = policy
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('img-src '));
  if (!directive) throw new Error('CSP içinde img-src yok');

  return directive.split(/\s+/).slice(1);
}

describe('içerik görseli konakları', () => {
  it('şemanın izin verdiği her konak CSP tarafından da tanınıyor', () => {
    const izinli = new Set(cspImgSrc());
    const kacaklar = CONTENT_IMAGE_HOSTS.filter((host) => !izinli.has(host));
    expect(
      kacaklar,
      'Bu konaklar şemada var ama CSP img-src listesinde yok — görsel üretimde sessizce yüklenmez'
    ).toEqual([]);
  });
});

describe('isAllowedImageHost', () => {
  it('sitenin depolamasını ve tanınan kaynakları kabul eder', () => {
    expect(isAllowedImageHost('https://abc.supabase.co/storage/v1/a.jpg')).toBe(
      true
    );
    expect(isAllowedImageHost('https://upload.wikimedia.org/x.png')).toBe(true);
  });

  it('listede olmayan konağı reddeder', () => {
    expect(isAllowedImageHost('https://rastgele.example/a.jpg')).toBe(false);
  });

  /*
   * Joker SONEK eşleşmesi noktayla birlikte olmalı: `*.supabase.co`
   * kuralı `kotusupabase.co` konağını eşleştirmemeli. Gevşek yazsaydık
   * şema, tarayıcının reddedeceği bir adresi kabul ederdi — yani tam da
   * bu dosyanın önlemeye çalıştığı sessiz kırılma.
   */
  it('joker kuralını benzer görünen konağa uygulamaz', () => {
    expect(isAllowedImageHost('https://kotusupabase.co/a.jpg')).toBe(false);
    expect(isAllowedImageHost('https://supabase.co.saldirgan.example/a.jpg')).toBe(
      false
    );
  });

  it('http ve şemasız adresi reddeder', () => {
    expect(isAllowedImageHost('http://abc.supabase.co/a.jpg')).toBe(false);
    expect(isAllowedImageHost('//abc.supabase.co/a.jpg')).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  HERO_IMAGE_HOSTS,
  describeHeroImageProblem,
  normalizeHeroImageUrl,
} from './siteSettings';

/**
 * HERO GÖRSEL ADRESİ.
 *
 * Ölçülen asıl şey ilk testte: panelin kabul ettiği alan adları CSP'nin
 * `img-src`inin ALT KÜMESİ olmak zorunda. İki liste ayrışırsa hata
 * sessiz — yönetici adresi kaydeder, kayıt başarılı olur, tarayıcı
 * görseli çekmez, `HeroPhoto` da kendini gizleyip sahneyi bırakır. Ne
 * sunucuda hata olur ne günlükte iz; yalnızca "kaydettim ama değişmedi".
 *
 * Bu yüzden test CSP dosyasını GERÇEKTEN okuyor. Elle yazılmış bir kopya
 * listeyi karşılaştırsaydık, ayrışmayı yakalaması gereken şeyin kendisi
 * de ayrışırdı.
 */

describe('CSP eşleşmesi', () => {
  it('panelin izin verdiği her alan adı CSP img-src içinde var', () => {
    const csp = readFileSync(
      resolve(__dirname, '../../../scripts/csp.mjs'),
      'utf8'
    );
    const blok = /'img-src':\s*\[([\s\S]*?)\]/.exec(csp);
    expect(blok, 'csp.mjs içinde img-src bloğu bulunamadı').not.toBeNull();

    const izinli = Array.from(blok![1]!.matchAll(/'([^']+)'/g)).map((m) => m[1]!);
    for (const host of HERO_IMAGE_HOSTS)
      expect(izinli, `${host} CSP img-src dışında`).toContain(`https://${host}`);

    /* Proje depolaması joker olarak geçiyor; panel `.supabase.co` sonekine
       bakıyor ve o kural bu satıra dayanıyor. */
    expect(izinli).toContain('https://*.supabase.co');
  });
});

describe('adres denetimi', () => {
  it('CSP dışı alan adını sebebiyle birlikte reddeder', () => {
    const sorun = describeHeroImageProblem('https://ornek.com/foto.jpg');
    expect(sorun).toContain('ornek.com');
    /* Mesaj yalnızca "geçersiz" demiyor: yönetici hangi kaynaklardan
       görsel koyabileceğini kutunun altında okuyor. */
    expect(sorun).toContain('commons.wikimedia.org');
  });

  it('izinli alan adlarını ve proje depolamasını geçirir', () => {
    expect(
      describeHeroImageProblem(
        'https://commons.wikimedia.org/wiki/Special:FilePath/Ay.jpg'
      )
    ).toBeNull();
    expect(
      describeHeroImageProblem('https://eoqggvosegjbburyuyba.supabase.co/x.webp')
    ).toBeNull();
    /* Boş adres "görsel yok" demek — sorun değil. */
    expect(describeHeroImageProblem('')).toBeNull();
  });

  it('http ve bozuk adresi ayrı ayrı anlatır', () => {
    expect(describeHeroImageProblem('http://commons.wikimedia.org/a.jpg')).toContain(
      'https://'
    );
    expect(describeHeroImageProblem('https://')).toContain('geçerli bir URL');
  });
});

describe('adres normalleştirme', () => {
  it('Commons SAYFA adresini dosya adresine çevirir', () => {
    /* Yöneticinin tarayıcıdan kopyaladığı adres her zaman budur ve bir
       HTML sayfasıdır: <img> içinde hiçbir şey çizmez. */
    expect(
      normalizeHeroImageUrl(
        'https://commons.wikimedia.org/wiki/File:Orion Nebula.jpg'
      )
    ).toBe(
      'https://commons.wikimedia.org/wiki/Special:FilePath/Orion%20Nebula.jpg?width=1800'
    );
  });

  it('genişliksiz dosya adresine genişlik ekler', () => {
    expect(
      normalizeHeroImageUrl(
        'https://commons.wikimedia.org/wiki/Special:FilePath/Ay.jpg'
      )
    ).toBe('https://commons.wikimedia.org/wiki/Special:FilePath/Ay.jpg?width=1800');
  });

  it('genişliği olan adrese dokunmaz', () => {
    const url =
      'https://commons.wikimedia.org/wiki/Special:FilePath/Ay.jpg?width=600';
    expect(normalizeHeroImageUrl(url)).toBe(url);
  });

  it('Commons dışı adresi olduğu gibi bırakır', () => {
    /* Boyut sözleşmesini bilmediğimiz bir adrese parametre eklemek onu
       bozabilirdi — `commonsWidthUrl` de aynı sebeple null dönüyor. */
    const url = 'https://cdn.esahubble.org/archives/images/large/heic.jpg';
    expect(normalizeHeroImageUrl(url)).toBe(url);
  });
});

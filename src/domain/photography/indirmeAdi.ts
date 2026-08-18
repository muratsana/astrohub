/**
 * İNDİRİLEN DOSYANIN ADI.
 *
 * Depolamadaki ad `display.jpg` — kullanıcının indirme klasöründe on
 * tane `display.jpg` yan yana duruyor ve hangisinin hangi fotoğraf
 * olduğu anlaşılmıyor. Ad, kaydın kendisinden türemeli.
 *
 * SANITIZE ŞART: başlık kullanıcı metni ve içinde eğik çizgi, iki nokta
 * ya da nokta nokta olabilir. Dosya adına doğrudan geçirilen böyle bir
 * metin, indirme yolunu kaydın dışına taşımaya çalışan bir girdi hâline
 * gelir. Yalnızca bilinen karakterler geçiyor.
 */

/** Türkçe harfleri dosya adında güvenli karşılıklarına indirir. */
const HARFLER: Record<string, string> = {
  ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i',
  ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u',
};

export function indirmeAdi(
  parcalar: (string | null | undefined)[],
  uzanti = 'jpg'
): string {
  const ham = parcalar
    .filter((p): p is string => Boolean(p && p.trim()))
    .join('-');

  const sade = [...ham]
    .map((c) => HARFLER[c] ?? c)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    /* Uzun başlıklar bazı dosya sistemlerinde sınırı zorluyor; 80
       karakter hem tanınabilir hem güvenli. */
    .slice(0, 80)
    .replace(/-+$/g, '');

  return `${sade || 'astrohub-fotograf'}.${uzanti}`;
}

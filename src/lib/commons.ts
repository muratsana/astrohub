/**
 * WIKIMEDIA COMMONS GÖRSEL ADRESİ.
 *
 * `Special:FilePath` belgelenmiş ve kalıcı bir uç nokta: dosya adını
 * verirsiniz, gerçek dosyaya yönlendirir. Alternatifi olan
 * `upload.wikimedia.org/.../a/ab/...` yolları dosya adının MD5 özetinden
 * türer; onları elle yazmak, özetin doğru hesaplandığına güvenmek demek —
 * bir karakter şaşarsa sessizce kırık görsel çıkar.
 *
 * `width` parametresi Commons'a küçültülmüş kopya ürettiriyor: kart
 * boyutunda 40 megapiksellik bir Hubble mozaiğini indirmek anlamsız.
 *
 * LİSANS. Buradaki her dosya ya kamu malı (NASA/ESA yayınları) ya da
 * CC BY-SA'dır ve kredi arayüzde gösterilir — CC BY-SA'nın şartı budur.
 * Dosya adları elle doğrulandı; doğrulanamayanlar için alan boş bırakılır
 * ve kart kendi yıldız alanını çizer (bkz. RemoteImage).
 */
export function commonsImage(fileName: string, width = 1200): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
    fileName
  )}?width=${width}`;
}

const COMMONS_FILEPATH = 'commons.wikimedia.org/wiki/Special:FilePath/';

/**
 * Var olan bir FilePath adresinin `width` parametresini değiştirir.
 * Commons dışı adreslerde `null` — o adreslerin boyut sözleşmesini
 * bilmiyoruz, parametre eklemek adresi bozabilir.
 */
export function commonsWidthUrl(url: string, width: number): string | null {
  if (!url.includes(COMMONS_FILEPATH)) return null;
  const base = url.split('?')[0];
  return `${base}?width=${width}`;
}

/**
 * Aynı görselin birden çok genişlikteki kopyasından `srcset` üretir
 * (QA P0-04): 86 piksellik bir haber küçüğü için 1200 piksellik kopya
 * indirmek, mobil LCP'yi tek başına katlayan israftı. Tarayıcı buradan
 * yalnızca gerçekten çizeceği boyuta en yakın kopyayı seçer.
 */
export function commonsSrcSet(url: string, widths: number[]): string | null {
  const entries = widths
    .map((w) => {
      const sized = commonsWidthUrl(url, w);
      return sized ? `${sized} ${w}w` : null;
    })
    .filter((v): v is string => v !== null);
  return entries.length > 0 ? entries.join(', ') : null;
}

export interface CommonsCredit {
  url: string;
  credit: string;
  licence: string;
}

/** Doğrulanmış derin uzay görselleri — katalog slug'ına göre. */
export const deepSkyImages: Record<string, CommonsCredit> = {
  'm31-andromeda': {
    url: commonsImage('Andromeda galaxy.jpg'),
    credit: 'Wikimedia Commons — Andromeda Galaksisi',
    licence: 'CC BY-SA',
  },
  'm42-orion': {
    url: commonsImage('Orion Nebula - Hubble 2006 mosaic.jpg'),
    credit: 'NASA, ESA, M. Robberto (STScI/ESA)',
    licence: 'Kamu malı',
  },
  'ngc7000-kuzey-amerika': {
    url: commonsImage('North America Nebula (NGC7000) in Hubble Palette.jpg'),
    credit: 'Wikimedia Commons — NGC 7000 (Hubble paleti)',
    licence: 'CC BY-SA 4.0',
  },
  ngc6888: {
    url: commonsImage('NGC 6888.png'),
    credit: 'Wikimedia Commons — NGC 6888',
    licence: 'CC0 1.0',
  },
  'ngc2237-rozet': {
    url: commonsImage('Rosette Nebula NGC 2237 - C49.png'),
    credit: 'Wikimedia Commons — Rozet Bulutsusu',
    licence: 'CC BY-SA 3.0',
  },
  'ngc6302-kelebek': {
    url: commonsImage('NGC 6302 Hubble 2009.full.jpg'),
    credit: 'NASA, ESA, Hubble SM4 ERO Team',
    licence: 'Kamu malı',
  },
  'ic1396-fil-hortumu': {
    url: commonsImage('Elephant Trunk Nebula.jpg'),
    credit: 'Wikimedia Commons — Fil Hortumu Bulutsusu',
    licence: 'CC BY-SA',
  },
};

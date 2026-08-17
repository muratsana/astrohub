import { describe, it, expect } from 'vitest';
import { parseInline, stripInline, hasInlineMarkup } from './inline';

/**
 * SATIR İÇİ BİÇİMLENDİRME.
 *
 * Bu testlerin ağırlığı "kalın çalışıyor mu"da DEĞİL. Ayrıştırıcı bugüne
 * kadar yazılmış bütün içeriğin üstünde de çalışacak ve o metinleri kimse
 * biçimlendirme niyetiyle yazmadı. Asıl risk yanlış pozitif: bir çarpma
 * işaretinin eğik yazıya, bir dipnotun bağlantıya dönmesi. Aşağıdaki
 * testlerin çoğu tam olarak bunun OLMADIĞINI ölçüyor.
 */

describe('parseInline — biçim tanıma', () => {
  it('kalın ve eğik yazıyı ayırır', () => {
    expect(parseInline('**kalın** ve *eğik*')).toEqual([
      { kind: 'strong', text: 'kalın' },
      { kind: 'text', text: ' ve ' },
      { kind: 'em', text: 'eğik' },
    ]);
  });

  it('biçim yoksa tek düz parça döner', () => {
    expect(parseInline('yalın cümle')).toEqual([
      { kind: 'text', text: 'yalın cümle' },
    ]);
  });

  /*
   * İç ve dış bağlantı AYRI çizilmeli (biri `<Link>`, diğeri `rel` taşıyan
   * `<a>`), bu yüzden kararı ayrıştırıcı veriyor. Çizim tarafında yeniden
   * karar verilseydi kural iki yerde yaşardı.
   */
  it('uygulama içi yolu dış adresten ayırır', () => {
    expect(parseInline('[galeri](/galeri)')).toEqual([
      { kind: 'link', text: 'galeri', href: '/galeri', external: false },
    ]);
    const [dis] = parseInline('[ESA](https://www.esa.int/)');
    expect(dis).toMatchObject({ kind: 'link', external: true });
  });
});

describe('parseInline — yanlış pozitif tehlikesi', () => {
  /* "3*4*5" bir çarpma dizisi; eğik yazı değil. */
  it('sayılar arasındaki yıldızı biçim saymaz', () => {
    expect(parseInline('3*4*5')).toEqual([{ kind: 'text', text: '3*4*5' }]);
  });

  it('kelime ortasındaki yıldızı biçim saymaz', () => {
    expect(parseInline('dosya*adı*uzantı')).toEqual([
      { kind: 'text', text: 'dosya*adı*uzantı' },
    ]);
  });

  /* Yıldızın hemen içi boşluksa madde işareti ya da dipnot yıldızıdır. */
  it('boşlukla açılan yıldızı biçim saymaz', () => {
    expect(parseInline('* madde * değil')).toEqual([
      { kind: 'text', text: '* madde * değil' },
    ]);
  });

  it('dipnot işaretini bağlantı saymaz', () => {
    expect(parseInline('kaynak [1] burada')).toEqual([
      { kind: 'text', text: 'kaynak [1] burada' },
    ]);
  });

  /*
   * GÜVENLİK SINIRI. `javascript:` şeması `href`e girerse tıklamada
   * sayfanın kendi kaynağında betik çalışır. Ayrıştırıcı böyle bir hedefi
   * "temizlemeye" çalışmıyor — bağlantı hiç kurulmuyor, yazı düz metin
   * kalıyor.
   */
  it('güvensiz şemayı bağlantıya çevirmez', () => {
    expect(parseInline('[tıkla](javascript:alert(1))')).toEqual([
      { kind: 'text', text: '[tıkla](javascript:alert(1))' },
    ]);
    expect(parseInline('[tıkla](data:text/html;base64,PHNjcmlwdD4=)')).toEqual([
      { kind: 'text', text: '[tıkla](data:text/html;base64,PHNjcmlwdD4=)' },
    ]);
  });

  /*
   * `//baska-site.example` bir yol DEĞİL: tarayıcı onu şemasız mutlak
   * adres sayıp dış siteye götürür. İç bağlantı sanıp `<Link>` ile
   * çizseydik, uygulama içi göründüğü hâlde siteden çıkaran bir bağlantı
   * olurdu.
   */
  it('şemasız mutlak adresi iç yol saymaz', () => {
    expect(parseInline('[git](//baska-site.example)')).toEqual([
      { kind: 'text', text: '[git](//baska-site.example)' },
    ]);
  });
});

describe('stripInline', () => {
  /*
   * Çıktı meta etiketine ve arama sonucuna giriyor; oralarda biçim
   * çizilmiyor. Sökülmeseydi paylaşım önizlemesinde ham işaret görünürdü.
   */
  it('işaretleri söker, metni bırakır', () => {
    expect(stripInline('**Merhaba** *dünya*')).toBe('Merhaba dünya');
  });

  it('bağlantıda adresi değil metni bırakır', () => {
    expect(stripInline('detaylar [galeride](/galeri)')).toBe(
      'detaylar galeride'
    );
  });

  it('biçimsiz metni olduğu gibi bırakır', () => {
    expect(stripInline('3*4*5 = 60')).toBe('3*4*5 = 60');
  });
});

describe('hasInlineMarkup', () => {
  it('editör önizlemesi yalnız biçim varken açılır', () => {
    expect(hasInlineMarkup('**kalın**')).toBe(true);
    expect(hasInlineMarkup('düz cümle')).toBe(false);
    expect(hasInlineMarkup('3*4*5')).toBe(false);
  });
});

/**
 * ALTI ÇİZİLİ — EN BÜYÜK RİSK YANLIŞ POZİTİF.
 *
 * `__` işareti bu dosyaya sonradan eklendi ve BUGÜNE KADAR YAZILMIŞ tüm
 * içeriğin üstünde çalışacak. Kimse o metinleri altını çizmek niyetiyle
 * yazmadı; `photo__id` gibi bir tanımlayıcı bir anda altı çizili yazıya
 * dönseydi özellik eski içeriği bozmuş olurdu. Sınır kuralları yıldızla
 * birebir aynı ve aşağıda tek tek ölçülüyor.
 */
describe('altı çizili', () => {
  it('işaretlenen metni ayrı parça yapıyor', () => {
    expect(parseInline('Bu __önemli__ bir not.')).toEqual([
      { kind: 'text', text: 'Bu ' },
      { kind: 'underline', text: 'önemli' },
      { kind: 'text', text: ' bir not.' },
    ]);
  });

  it('tanımlayıcının ortasındaki alt çizgiyi biçim saymıyor', () => {
    expect(parseInline('photo__id__x')).toEqual([
      { kind: 'text', text: 'photo__id__x' },
    ]);
  });

  it('işaretin hemen içinde boşluk varsa biçim saymıyor', () => {
    expect(parseInline('__ bosluk __')).toEqual([
      { kind: 'text', text: '__ bosluk __' },
    ]);
  });

  it('kalın işaretiyle çakışmıyor', () => {
    expect(parseInline('**kalın** ve __altı__')).toEqual([
      { kind: 'strong', text: 'kalın' },
      { kind: 'text', text: ' ve ' },
      { kind: 'underline', text: 'altı' },
    ]);
  });

  it('özet metninde işaret sızdırmıyor', () => {
    expect(stripInline('Bu __önemli__ nottur.')).toBe('Bu önemli nottur.');
  });

  it('tek alt çizgiye dokunmuyor', () => {
    expect(parseInline('user_name alanı')).toEqual([
      { kind: 'text', text: 'user_name alanı' },
    ]);
  });
});

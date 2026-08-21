import { describe, expect, it } from 'vitest';
import {
  blocksToParagraphs,
  blocksToText,
  ContentBlockSchema,
  parseContentBlocks,
  textToBlocks,
} from './blocks';

describe('içerik blokları', () => {
  it('geçerli blokları korur', () => {
    const blocks = [
      { type: 'heading' as const, level: 2 as const, text: 'Başlık' },
    ];
    expect(parseContentBlocks(blocks)).toEqual(blocks);
  });

  it('bozuk veya boş json veride eski paragraflara düşer', () => {
    expect(
      parseContentBlocks([{ type: 'script', text: 'x' }], ['Eski'])
    ).toEqual([{ type: 'paragraph', text: 'Eski' }]);
    expect(parseContentBlocks([], ['Eski'])).toHaveLength(1);
  });

  it('blokları eski istemci için düz metne çevirir', () => {
    expect(
      blocksToParagraphs([
        { type: 'heading', level: 2, text: 'Başlık' },
        { type: 'list', style: 'bullet', items: ['Bir', 'İki'] },
      ])
    ).toEqual(['Başlık', 'Bir', 'İki']);
  });

  it('boş satırla ayrılan metni paragraflara dönüştürür', () => {
    expect(textToBlocks('Bir\n\nİki')).toHaveLength(2);
  });
});

/**
 * ZENGİN BLOKLAR (FAZ 7).
 *
 * Üçünün de ortak sınavı aynı: şema neyi KABUL ETMEDİĞİ kadar neyi kabul
 * ettiğiyle de tanımlanıyor, çünkü doğrulama burada bir güvenlik sınırı.
 * `body_blocks` istemciden yazılan bir jsonb kolonu ve veritabanında
 * yalnızca "dizi mi" kısıtı var; blokların içine ne girdiğine karar
 * veren tek yer bu şema.
 */
describe('görsel bloğu', () => {
  const gorsel = {
    type: 'image' as const,
    src: 'https://proje.supabase.co/storage/v1/object/public/photos/ay.jpg',
    alt: 'Dolunay',
  };

  it('https adresli ve alt metinli görseli kabul eder', () => {
    expect(parseContentBlocks([gorsel])).toEqual([gorsel]);
  });

  /*
   * CSP `img-src` bir beyaz liste; dışarıdaki konak üretimde SESSİZCE
   * yüklenmiyor. Şema kabul etseydi editör görseli yayınlar ve kırıldığını
   * hiç öğrenmezdi (gerekçe `imageHosts.ts`).
   */
  it('CSP’nin tanımadığı konağı düşürür', () => {
    expect(
      parseContentBlocks([
        { ...gorsel, src: 'https://rastgele.example/ay.jpg' },
      ])
    ).toEqual([]);
  });

  /*
   * `alt` zorunlu: isteğe bağlı olsaydı boş geçilirdi ve ekran okuyucu
   * kullanan okur için görsel hiç yokmuş gibi olurdu.
   */
  it('alt metni olmayan görseli düşürür', () => {
    expect(parseContentBlocks([{ ...gorsel, alt: '' }], ['Eski'])).toEqual([
      { type: 'paragraph', text: 'Eski' },
    ]);
  });

  /* `hero_slides` ile aynı kural: şemasız ve http adresler dışarıda. */
  it('http ve şemasız adresi düşürür', () => {
    expect(
      parseContentBlocks([
        { ...gorsel, src: 'http://proje.supabase.co/ay.jpg' },
      ])
    ).toEqual([]);
    expect(
      parseContentBlocks([{ ...gorsel, src: '//proje.supabase.co/ay.jpg' }])
    ).toEqual([]);
  });

  it('sitenin statik yazı görsellerini kabul eder', () => {
    expect(
      parseContentBlocks([
        {
          type: 'image',
          src: '/gorseller/teknik/acik-odak.svg',
          alt: 'Açıklık ve odak uzaklığı şeması',
        },
      ])
    ).toEqual([
      {
        type: 'image',
        src: '/gorseller/teknik/acik-odak.svg',
        alt: 'Açıklık ve odak uzaklığı şeması',
      },
    ]);
  });

  /* Yedeğe düşen okur görselin yerinde bir iz görmeli. */
  it('düz metne alt yazıyla, yoksa alt metinle döküyor', () => {
    expect(blocksToParagraphs([gorsel])).toEqual(['Dolunay']);
    expect(blocksToParagraphs([{ ...gorsel, caption: 'Ay, 2026' }])).toEqual([
      'Ay, 2026',
    ]);
  });
});

describe('tablo bloğu', () => {
  const tablo = {
    type: 'table' as const,
    header: ['Ad', 'Çap'],
    rows: [['Newton', '200']],
  };

  it('başlık satırını gövdeden ayrı tutar', () => {
    expect(parseContentBlocks([tablo])).toEqual([tablo]);
  });

  /*
   * Satırlar dikdörtgen olmak zorunda değil: katı kural, içe aktarılan
   * tek bozuk satır yüzünden tablonun tamamını düşürürdü. Çizim eksik
   * hücreleri boşla tamamlıyor.
   */
  it('eksik hücreli satırı düşürmez', () => {
    const egri = { ...tablo, rows: [['Newton', '200'], ['Mak']] };
    expect(parseContentBlocks([egri])).toEqual([egri]);
  });

  it('düz metne hücre sınırını koruyarak dökülür', () => {
    expect(blocksToParagraphs([tablo])).toEqual(['Ad · Çap', 'Newton · 200']);
  });
});

describe('video bloğu', () => {
  const video = {
    type: 'embed' as const,
    provider: 'youtube' as const,
    videoId: 'dQw4w9WgXcQ',
    title: 'Gözlem rehberi',
  };

  it('geçerli kimliği kabul eder', () => {
    expect(parseContentBlocks([video])).toEqual([video]);
  });

  /*
   * KİMLİK SAKLANIYOR, ADRES DEĞİL. Tam URL kabul edilseydi, bu alana
   * yazabilen biri `<iframe src>`i bambaşka bir siteye çevirebilirdi —
   * `tv_broadcasts` ile aynı gerekçe.
   */
  it('adres yapıştırılmış kimliği reddeder', () => {
    expect(
      parseContentBlocks([
        { ...video, videoId: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      ])
    ).toEqual([]);
  });

  it('biçimi tutmayan kimliği reddeder', () => {
    expect(parseContentBlocks([{ ...video, videoId: 'kisa' }])).toEqual([]);
  });

  /* `<iframe>`in erişilebilir adı yoksa ekran okuyucu onu "iframe" okur. */
  it('başlıksız videoyu reddeder', () => {
    expect(parseContentBlocks([{ ...video, title: '' }])).toEqual([]);
  });
});

describe('düz metne dökme — satır içi işaretler', () => {
  /*
   * Çıktı meta açıklamasına ve arama sonucuna giriyor; orada biçim
   * çizilmiyor, dolayısıyla ham işaret sızmamalı.
   */
  it('kalın ve bağlantı işaretlerini söker', () => {
    expect(
      blocksToParagraphs([
        { type: 'paragraph', text: '**Önemli** bir [duyuru](/haber)' },
        { type: 'list', style: 'bullet', items: ['*ilk* madde'] },
      ])
    ).toEqual(['Önemli bir duyuru', 'ilk madde']);
  });
});

describe('mizanpaj blokları', () => {
  const SRC =
    'https://proje.supabase.co/storage/v1/object/public/photos/ay.jpg';

  /*
   * ESKİ KAYITLAR GEÇERLİ KALMALI. `align`/`width` zorunlu olsaydı,
   * alan eklendiği anda yayındaki her görsel bloğu şemadan düşer ve o
   * yazılar panelde düzenlenemez hâle gelirdi.
   */
  it('görselde hizalama ve genişlik isteğe bağlı', () => {
    const eski = { type: 'image', src: SRC, alt: 'M31' };
    expect(ContentBlockSchema.safeParse(eski).success).toBe(true);

    const yeni = {
      type: 'image',
      src: SRC,
      alt: 'M31',
      align: 'right',
      width: 'half',
    };
    expect(ContentBlockSchema.safeParse(yeni).success).toBe(true);
  });

  it('tanımsız hizalama reddediliyor', () => {
    const blok = { type: 'image', src: SRC, alt: 'M31', align: 'justify' };
    expect(ContentBlockSchema.safeParse(blok).success).toBe(false);
  });

  it('galeri en az iki görsel istiyor', () => {
    const tek = {
      type: 'gallery',
      items: [{ src: SRC, alt: 'a' }],
    };
    expect(ContentBlockSchema.safeParse(tek).success).toBe(false);

    const iki = {
      type: 'gallery',
      items: [
        { src: SRC, alt: 'ham' },
        { src: SRC, alt: 'işlenmiş' },
      ],
    };
    expect(ContentBlockSchema.safeParse(iki).success).toBe(true);
  });

  /* `alt` tek görselde zorunlu; galeride gevşetmek erişilebilirliği
     düşürmenin en kolay yolu olurdu. */
  it('galeride alt metni zorunlu', () => {
    const blok = {
      type: 'gallery',
      items: [
        { src: SRC, alt: '' },
        { src: SRC, alt: 'b' },
      ],
    };
    expect(ContentBlockSchema.safeParse(blok).success).toBe(false);
  });

  it('iki sütun bloğu iki gövde istiyor', () => {
    expect(
      ContentBlockSchema.safeParse({ type: 'columns', left: 'a', right: 'b' })
        .success
    ).toBe(true);
    expect(
      ContentBlockSchema.safeParse({ type: 'columns', left: 'a' }).success
    ).toBe(false);
  });

  it('araç bloğu yalnızca site içi bağlantı kabul ediyor', () => {
    const blok = {
      type: 'tool',
      title: 'Kadraj aracı',
      text: 'Kurulumunuzun görüş alanını hesaplayın.',
      href: '/araclar/kadraj',
    };
    expect(ContentBlockSchema.safeParse(blok).success).toBe(true);
    expect(
      ContentBlockSchema.safeParse({ ...blok, href: 'https://example.com' })
        .success
    ).toBe(false);
  });

  it('html bloğu doküman modu bilgisini kabul ediyor', () => {
    expect(
      ContentBlockSchema.safeParse({
        type: 'html',
        mode: 'document',
        html: '<!doctype html><html><body>İçe aktarılan belge</body></html>',
      }).success
    ).toBe(true);
    expect(
      ContentBlockSchema.safeParse({
        type: 'html',
        mode: 'popup',
        html: '<p>Geçersiz</p>',
      }).success
    ).toBe(false);
  });

  /* Özet ve arama bu çıktıyı okuyor: yeni bloklar metinsiz kalırsa
     içerikleri sitede hiç aranamaz olurdu. */
  it('yeni blokların metni özete giriyor', () => {
    const metin = blocksToText([
      {
        type: 'gallery',
        caption: 'Üç aşama',
        items: [
          { src: SRC, alt: 'ham kare' },
          { src: SRC, alt: 'işlenmiş kare' },
        ],
      },
      { type: 'columns', leftTitle: 'Önce', left: 'gürültülü', right: 'temiz' },
      {
        type: 'tool',
        title: 'Kadraj aracı',
        text: 'Görüş alanını hesaplayın.',
        href: '/araclar/kadraj',
      },
    ]);
    expect(metin).toContain('Üç aşama');
    expect(metin).toContain('ham kare');
    expect(metin).toContain('Önce');
    expect(metin).toContain('temiz');
    expect(metin).toContain('Kadraj aracı');
  });
});

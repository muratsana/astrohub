import { describe, expect, it } from 'vitest';
import {
  blocksToParagraphs,
  parseContentBlocks,
  textToBlocks,
} from './blocks';

describe('içerik blokları', () => {
  it('geçerli blokları korur', () => {
    const blocks = [{ type: 'heading' as const, level: 2 as const, text: 'Başlık' }];
    expect(parseContentBlocks(blocks)).toEqual(blocks);
  });

  it('bozuk veya boş json veride eski paragraflara düşer', () => {
    expect(parseContentBlocks([{ type: 'script', text: 'x' }], ['Eski'])).toEqual([
      { type: 'paragraph', text: 'Eski' },
    ]);
    expect(parseContentBlocks([], ['Eski'])).toHaveLength(1);
  });

  it('blokları eski istemci için düz metne çevirir', () => {
    expect(blocksToParagraphs([
      { type: 'heading', level: 2, text: 'Başlık' },
      { type: 'list', style: 'bullet', items: ['Bir', 'İki'] },
    ])).toEqual(['Başlık', 'Bir', 'İki']);
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
      parseContentBlocks([{ ...gorsel, src: 'https://rastgele.example/ay.jpg' }])
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
      parseContentBlocks([{ ...gorsel, src: 'http://proje.supabase.co/ay.jpg' }])
    ).toEqual([]);
    expect(
      parseContentBlocks([{ ...gorsel, src: '//proje.supabase.co/ay.jpg' }])
    ).toEqual([]);
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

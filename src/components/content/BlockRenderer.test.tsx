import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { BlockRenderer } from './BlockRenderer';
import type { ContentBlock } from '@/domain/content/blocks';

/**
 * BLOK ÇİZİMİ.
 *
 * Şema testleri neyin KAYDEDİLEBİLDİĞİNİ ölçüyor; burası kaydedilmiş
 * bloğun ekranda ne olduğunu. İkisi ayrı: geçerli bir blok yanlış
 * çizilebilir ve bu, doğrulamanın yakalayamayacağı bir hata sınıfı —
 * özellikle `<iframe src>` ve dış bağlantı `rel`i gibi, yanlışının
 * sessiz olduğu yerlerde.
 */

function ciz(blocks: ContentBlock[]) {
  return render(
    <MemoryRouter>
      <BlockRenderer blocks={blocks} />
    </MemoryRouter>
  );
}

describe('görsel', () => {
  it('alt metni ve alt yazıyı basar', () => {
    ciz([
      {
        type: 'image',
        src: 'https://proje.supabase.co/ay.jpg',
        alt: 'Dolunay',
        caption: 'Ay, 2026',
        credit: 'A. Yılmaz',
      },
    ]);
    expect(screen.getByAltText('Dolunay')).toBeInTheDocument();
    expect(screen.getByText(/Ay, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/A\. Yılmaz/)).toBeInTheDocument();
  });
});

describe('tablo', () => {
  /*
   * Eksik hücreler boşla tamamlanmazsa tarayıcı satırı kısa çizer ve
   * sütunlar kayar: üçüncü sütundaki değer ikinci sütunun altına düşer.
   */
  it('eksik hücreleri tamamlayarak hizayı korur', () => {
    ciz([
      {
        type: 'table',
        header: ['Ad', 'Çap', 'Odak'],
        rows: [['Newton', '200', '1000'], ['Mak']],
      },
    ]);
    const satirlar = screen.getAllByRole('row');
    // Başlık + iki gövde satırı; her biri üç hücre.
    expect(satirlar).toHaveLength(3);
    expect(within(satirlar[2]).getAllByRole('cell')).toHaveLength(3);
  });

  /* Kaydırılabilir alan klavyeyle de kaydırılabilmeli. */
  it('yatay kayan sarmalayıcı odaklanabilir', () => {
    ciz([{ type: 'table', caption: 'Ekipman', rows: [['a']] }]);
    expect(screen.getByRole('region', { name: 'Ekipman' })).toHaveAttribute(
      'tabindex',
      '0'
    );
  });
});

describe('video', () => {
  it('geçerli kimlikte nocookie adresini kurar', () => {
    const { container } = ciz([
      {
        type: 'embed',
        provider: 'youtube',
        videoId: 'dQw4w9WgXcQ',
        title: 'Gözlem rehberi',
      },
    ]);
    const frame = container.querySelector('iframe');
    expect(frame?.getAttribute('src')).toContain(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
    );
    expect(frame).toHaveAttribute('title', 'Gözlem rehberi');
  });

  /*
   * Kimlik biçimi tutmuyorsa çerçeve HİÇ çizilmemeli. Boş bir iframe
   * bırakmak okura bozuk bir kutu göstermek olurdu — ve adresin nereye
   * gittiği belirsiz kalırdı.
   */
  it('bozuk kimlikte hiç çerçeve çizmez', () => {
    const { container } = ciz([
      {
        type: 'embed',
        provider: 'youtube',
        // Şema bunu reddeder; buraya ancak doğrulamayı atlayan bir yoldan
        // gelebilir. İkinci kapı tam da onun için var.
        videoId: 'bozuk',
        title: 'Yok',
      } as ContentBlock,
    ]);
    expect(container.querySelector('iframe')).toBeNull();
  });
});

describe('araç bloğu', () => {
  it('site içi aracı bağlantılı kart olarak çizer', () => {
    ciz([
      {
        type: 'tool',
        title: 'Kadraj ve Pixel Scale',
        text: 'Kurulumunuzun görüş alanını hesaplayın.',
        href: '/araclar/kadraj',
      },
    ]);
    expect(screen.getByText('Etkileşimli araç')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Aracı aç →' })).toHaveAttribute(
      'href',
      '/araclar/kadraj'
    );
  });
});

describe('ham HTML bloğu', () => {
  it('paket yer tutucularını DOMda korur ama script etiketini basmaz', () => {
    const { container } = ciz([
      {
        type: 'html',
        html: '<div class="ah"><figure data-ah-fig="kare-sayisi"></figure><script>alert(1)</script></div>',
        scriptSrc: '/astrohub/gurultu-gain-poz.js',
      },
    ]);
    expect(container.querySelector('[data-ah-fig="kare-sayisi"]')).toBeTruthy();
    expect(container.querySelector('script')).toBeNull();
  });
});

describe('satır içi biçim', () => {
  it('paragrafta kalın ve eğik çizer', () => {
    ciz([{ type: 'paragraph', text: '**kalın** ve *eğik*' }]);
    expect(screen.getByText('kalın').tagName).toBe('STRONG');
    expect(screen.getByText('eğik').tagName).toBe('EM');
  });

  /*
   * `noopener` olmadan açılan sekme `window.opener` üzerinden bizim
   * sayfamızı başka adrese yönlendirebilir (tabnabbing). Dış bağlantıda
   * bu öznitelik pazarlık konusu değil.
   */
  it('dış bağlantı yeni sekmede ve rel taşıyarak açılır', () => {
    ciz([{ type: 'paragraph', text: '[ESA](https://www.esa.int/)' }]);
    const link = screen.getByRole('link', { name: 'ESA' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  /* İç bağlantı tam sayfa yenilemeden gezinmeli: `<Link>` göreli href basar. */
  it('iç bağlantı uygulama içinde kalır', () => {
    ciz([{ type: 'paragraph', text: '[galeri](/galeri)' }]);
    const link = screen.getByRole('link', { name: 'galeri' });
    expect(link).toHaveAttribute('href', '/galeri');
    expect(link).not.toHaveAttribute('target');
  });
});

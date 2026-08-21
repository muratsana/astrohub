import { describe, expect, it } from 'vitest';
import { htmlToBlocks, importContentFile } from './contentImport';

describe('htmlToBlocks', () => {
  it('başlık, paragraf, alıntı ve listeyi kapalı bloklara çevirir', () => {
    const result = htmlToBlocks(`
      <h1>Gece Planı</h1>
      <p>İlk paragraf.</p>
      <blockquote>Alıntı</blockquote>
      <ol><li>Bir</li><li>İki</li></ol>
    `);
    expect(result.blocks).toEqual([
      { type: 'heading', level: 2, text: 'Gece Planı' },
      { type: 'paragraph', text: 'İlk paragraf.' },
      { type: 'quote', text: 'Alıntı' },
      { type: 'list', style: 'ordered', items: ['Bir', 'İki'] },
    ]);
  });

  it('script çalıştırmaz ve bilinmeyen etiketi görünür uyarıyla paragrafa indirger', () => {
    const result = htmlToBlocks(
      '<custom>Metin</custom><script>alert(1)</script>'
    );
    expect(result.blocks).toEqual([{ type: 'paragraph', text: 'Metin' }]);
    expect(result.warnings).toContain(
      '<custom> paragraf olarak içe aktarıldı.'
    );
    expect(result.warnings).toContain('<script> güvenlik nedeniyle atlandı.');
  });
});

/**
 * DOSYA SEÇİMİ.
 *
 * `.html` dosyası artık kaynak olarak korunur. Paket yazılarındaki
 * `data-ah-fig` ve `data-ah-tool` yer tutucuları kapalı bloklara
 * çevrilirse interaktif araçlar kaybolur.
 */
describe('importContentFile', () => {
  /*
   * `File` YERİNE VEKİL. jsdom'un `File`ı `text()` ve `arrayBuffer()`
   * uygulamıyor (tarayıcıda ikisi de standart `Blob` yöntemi) — gerçek
   * `File` ile bu testler ortamın eksiği yüzünden düşerdi, üretimin değil.
   * Ölçülen şey zaten okuma değil, YÖNLENDİRME: uzantıya göre doğru
   * çözümleyicinin seçilmesi ve HTML yolunda betiğin atlanması.
   */
  function dosya(ad: string, icerik: string): File {
    return {
      name: ad,
      type: 'text/html',
      text: () => Promise.resolve(icerik),
    } as unknown as File;
  }

  it('html dosyasını mizanpaj koruyan doküman blok olarak açar', async () => {
    const sonuc = await importContentFile(
      dosya(
        'yazi.html',
        '<style>.hero{display:grid}</style><h2>Başlık</h2><p>Gövde.</p>'
      )
    );
    expect(sonuc.blocks[0]).toMatchObject({
      type: 'html',
      mode: 'document',
    });
    expect(sonuc.blocks[0]).toHaveProperty(
      'html',
      expect.stringContaining('<style>.hero{display:grid}</style>')
    );
  });

  it('htm uzantısını da tanır', async () => {
    const sonuc = await importContentFile(dosya('eski.htm', '<p>Metin</p>'));
    expect(sonuc.blocks).toHaveLength(1);
  });

  it('astrohub makale gövdesini sayfanın tamamı yerine korur', async () => {
    const sonuc = await importContentFile(
      dosya(
        'gurultu-gain-poz.html',
        '<html><body><nav>Menü</nav><article class="ah"><figure data-ah-fig="kare-sayisi"></figure></article></body></html>'
      )
    );
    expect(sonuc.blocks).toEqual([
      {
        type: 'html',
        html: '<article class="ah"><figure data-ah-fig="kare-sayisi"></figure></article>',
        scriptSrc: '/astrohub/gurultu-gain-poz.js',
      },
    ]);
  });

  it('desteklenmeyen uzantıyı hangi biçimlerin geçtiğini söyleyerek reddeder', async () => {
    await expect(importContentFile(dosya('a.txt', 'x'))).rejects.toThrow(
      /\.html, \.docx ve \.pdf/
    );
  });
});

/**
 * SESSİZ KAYIP TESTLERİ.
 *
 * Hepsi gerçek bir kullanıcı şikâyetinden geliyor: "MD/HTML olarak
 * verdiğim yazıyı düzenlerken içeriği tam göremiyorum." Sebep tek tek
 * aşağıda; ortak yanları kullanıcıya HİÇBİR ŞEY söylenmemesiydi.
 */
describe('içe aktarmada sessiz kayıp', () => {
  it('sarmalayıcı div içindeki yazıyı tek paragrafa çökertmiyor', () => {
    const result = htmlToBlocks(
      '<div><h2>Başlık</h2><p>Birinci.</p><p>İkinci.</p></div>'
    );
    expect(result.blocks).toEqual([
      { type: 'heading', level: 2, text: 'Başlık' },
      { type: 'paragraph', text: 'Birinci.' },
      { type: 'paragraph', text: 'İkinci.' },
    ]);
  });

  it('iç içe sarmalayıcıları da açıyor', () => {
    const result = htmlToBlocks(
      '<article><section><div><p>Derinde.</p></div></section></article>'
    );
    expect(result.blocks).toEqual([{ type: 'paragraph', text: 'Derinde.' }]);
  });

  it('paragraftaki kalın, eğik ve bağlantıyı düz metne indirmiyor', () => {
    const result = htmlToBlocks(
      '<p><strong>Kalın</strong> <em>eğik</em> <u>altı</u> <a href="/haber">bağlantı</a></p>'
    );
    expect(result.blocks).toEqual([
      {
        type: 'paragraph',
        text: '**Kalın** *eğik* __altı__ [bağlantı](/haber)',
      },
    ]);
  });

  it('görseli koruyor', () => {
    const result = htmlToBlocks(
      '<figure><img src="https://upload.wikimedia.org/x.jpg" alt="Orion"><figcaption>Orion Bulutsusu</figcaption></figure>'
    );
    expect(result.blocks).toEqual([
      {
        type: 'image',
        src: 'https://upload.wikimedia.org/x.jpg',
        alt: 'Orion',
        caption: 'Orion Bulutsusu',
      },
    ]);
  });

  it('alt metni olmayan görseli atarken bunu SÖYLÜYOR', () => {
    const result = htmlToBlocks(
      '<img src="https://upload.wikimedia.org/x.jpg">'
    );
    expect(result.blocks).toEqual([]);
    expect(result.warnings.join(' ')).toMatch(/alt metni yok/i);
  });

  it('izinsiz konaktan gelen görseli atarken bunu SÖYLÜYOR', () => {
    const result = htmlToBlocks(
      '<img src="https://baska-site.example/x.jpg" alt="X">'
    );
    expect(result.blocks).toEqual([]);
    expect(result.warnings.join(' ')).toMatch(/izinli bir konaktan değil/i);
  });

  it('tabloyu tek paragrafa yapıştırmıyor', () => {
    const result = htmlToBlocks(
      '<table><tr><th>Filtre</th><th>nm</th></tr><tr><td>L-eXtreme</td><td>7</td></tr></table>'
    );
    expect(result.blocks).toEqual([
      {
        type: 'table',
        caption: undefined,
        header: ['Filtre', 'nm'],
        rows: [['L-eXtreme', '7']],
      },
    ]);
  });

  it('h4 başlığını paragrafa düşürmüyor, uyarı veriyor', () => {
    const result = htmlToBlocks('<h4>Alt başlık</h4>');
    expect(result.blocks).toEqual([
      { type: 'heading', level: 3, text: 'Alt başlık' },
    ]);
    expect(result.warnings.join(' ')).toMatch(/Başlık 3/);
  });

  it('kod bloğunu saklıyor ama biçimin gittiğini söylüyor', () => {
    const result = htmlToBlocks('<pre>siril stack</pre>');
    expect(result.blocks).toEqual([{ type: 'paragraph', text: 'siril stack' }]);
    expect(result.warnings.join(' ')).toMatch(/Kod bloğu/);
  });

  it('ayracın atıldığını söylüyor', () => {
    const result = htmlToBlocks('<p>A</p><hr><p>B</p>');
    expect(result.blocks).toEqual([
      { type: 'paragraph', text: 'A' },
      { type: 'paragraph', text: 'B' },
    ]);
    expect(result.warnings.join(' ')).toMatch(/ayraç/i);
  });

  it('aynı uyarıyı tekrar tekrar yığmıyor', () => {
    const result = htmlToBlocks('<hr><hr><hr>');
    expect(result.warnings.filter((w) => /ayraç/i.test(w))).toHaveLength(1);
  });

  it('yalnızca metin taşıyan sarmalayıcıyı kaybetmiyor', () => {
    const result = htmlToBlocks('<div>Sade metin</div>');
    expect(result.blocks).toEqual([{ type: 'paragraph', text: 'Sade metin' }]);
  });
});

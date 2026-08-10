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
    const result = htmlToBlocks('<custom>Metin</custom><script>alert(1)</script>');
    expect(result.blocks).toEqual([{ type: 'paragraph', text: 'Metin' }]);
    expect(result.warnings).toContain('<custom> paragraf olarak içe aktarıldı.');
    expect(result.warnings).toContain('<script> güvenlik nedeniyle atlandı.');
  });
});

/**
 * DOSYA SEÇİMİ.
 *
 * `htmlToBlocks` en baştan beri vardı ama yalnızca Word dönüşümünün ara
 * adımıydı; kullanıcı `.html` dosyası SEÇEMİYORDU. Plan üç biçim istiyor
 * ve HTML üçünün en güvenlisi: dosya hiçbir zaman render edilmiyor,
 * `DOMParser` ile ayrıştırılıp yalnızca DOM metni alınıyor.
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

  it('html dosyasını blok olarak açar', async () => {
    const sonuc = await importContentFile(
      dosya('yazi.html', '<h2>Başlık</h2><p>Gövde.</p>')
    );
    expect(sonuc.blocks).toEqual([
      { type: 'heading', level: 2, text: 'Başlık' },
      { type: 'paragraph', text: 'Gövde.' },
    ]);
  });

  it('htm uzantısını da tanır', async () => {
    const sonuc = await importContentFile(dosya('eski.htm', '<p>Metin</p>'));
    expect(sonuc.blocks).toHaveLength(1);
  });

  /* İçe aktarılan dosya da render edilmiyor: betik atlanıyor. */
  it('html içindeki betiği atlar', async () => {
    const sonuc = await importContentFile(
      dosya('kotu.html', '<p>Metin</p><script>alert(1)</script>')
    );
    expect(sonuc.blocks).toEqual([{ type: 'paragraph', text: 'Metin' }]);
    expect(sonuc.warnings).toContain('<script> güvenlik nedeniyle atlandı.');
  });

  it('desteklenmeyen uzantıyı hangi biçimlerin geçtiğini söyleyerek reddeder', async () => {
    await expect(importContentFile(dosya('a.txt', 'x'))).rejects.toThrow(
      /\.html, \.docx ve \.pdf/
    );
  });
});

import { describe, expect, it } from 'vitest';
import { htmlToBlocks } from './contentImport';

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

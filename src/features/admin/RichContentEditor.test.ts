import { describe, expect, it } from 'vitest';
import {
  blocksToEditorHtml,
  editorHtmlToBlocks,
} from './richContentFormat';

describe('RichContentEditor dönüşümü', () => {
  it('blokları Word benzeri HTML yüzeyine çevirir', () => {
    expect(
      blocksToEditorHtml([
        { type: 'heading', level: 2, text: 'Başlık' },
        {
          type: 'paragraph',
          text: '**Kalın** *eğik* [link](/haber)',
        },
      ])
    ).toContain('<strong>Kalın</strong>');
  });

  it('editor HTML çıktısını kayıt bloklarına indirger', () => {
    expect(
      editorHtmlToBlocks(
        '<h2>Başlık</h2><p><strong>Kalın</strong> <em>eğik</em> <a href="/haber">link</a></p><ul><li>Bir</li><li>İki</li></ul>'
      )
    ).toEqual([
      { type: 'heading', level: 2, text: 'Başlık' },
      { type: 'paragraph', text: '**Kalın** *eğik* [link](/haber)' },
      { type: 'list', style: 'bullet', items: ['Bir', 'İki'] },
    ]);
  });
});

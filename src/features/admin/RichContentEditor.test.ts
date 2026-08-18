import { describe, expect, it } from 'vitest';
import {
  blocksToEditorHtml,
  editorHtmlToBlocks,
} from './richContentFormat';
import type { ContentBlock } from '@/domain/content/blocks';

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

  it('yazı içi görseli kayıt bloğuna çevirir', () => {
    expect(
      editorHtmlToBlocks(
        '<figure><img src="https://upload.wikimedia.org/ornek.jpg" alt="Beta Pictoris diski"><figcaption>Beta Pictoris</figcaption></figure>'
      )
    ).toEqual([
      {
        type: 'image',
        src: 'https://upload.wikimedia.org/ornek.jpg',
        alt: 'Beta Pictoris diski',
        caption: 'Beta Pictoris',
      },
    ]);
  });
});

describe('mizanpaj bloklarının gidiş-dönüşü', () => {
  const SRC =
    'https://proje.supabase.co/storage/v1/object/public/photos/ay.jpg';

  /*
   * ASIL RİSK BU. Yapı korunmasaydı, yazar bir virgül düzeltip
   * kaydettiğinde galerisi tek tek görsellere dağılırdı — sessiz veri
   * kaybı, eksik özellikten kötü.
   */
  it('galeri editörden geçince galeri kalıyor', () => {
    const blocks: ContentBlock[] = [
      {
        type: 'gallery',
        columns: 3,
        caption: 'Üç aşama',
        items: [
          { src: SRC, alt: 'ham', caption: 'tek kare' },
          { src: SRC, alt: 'yığılmış' },
          { src: SRC, alt: 'işlenmiş' },
        ],
      },
    ];
    const geri = editorHtmlToBlocks(blocksToEditorHtml(blocks));
    expect(geri).toEqual(blocks);
  });

  it('iki sütun editörden geçince iki sütun kalıyor', () => {
    const blocks: ContentBlock[] = [
      {
        type: 'columns',
        leftTitle: 'Önce',
        left: 'gürültülü kare',
        rightTitle: 'Sonra',
        right: 'temiz kare',
      },
    ];
    expect(editorHtmlToBlocks(blocksToEditorHtml(blocks))).toEqual(blocks);
  });

  it('görselin hizası ve genişliği korunuyor', () => {
    const blocks: ContentBlock[] = [
      { type: 'image', src: SRC, alt: 'M31', align: 'right', width: 'half' },
    ];
    expect(editorHtmlToBlocks(blocksToEditorHtml(blocks))).toEqual(blocks);
  });

  /* Bozulmuş bir galeride içerik kaybolmamalı: tek görsele düşen galeri
     düz görsel bloğu oluyor, boş olan tamamen eleniyor. */
  it('tek görsele düşen galeri düz görsele iniyor', () => {
    const html = `<figure data-gallery="1"><figure><img src="${SRC}" alt="tek"></figure></figure>`;
    expect(editorHtmlToBlocks(html)).toEqual([
      { type: 'image', src: SRC, alt: 'tek' },
    ]);
  });

  it('bir tarafı boş iki sütun paragrafa iniyor', () => {
    const html =
      '<div data-columns="1"><section data-side="left"><p>yalnız bu</p></section><section data-side="right"><p></p></section></div>';
    expect(editorHtmlToBlocks(html)).toEqual([
      { type: 'paragraph', text: 'yalnız bu' },
    ]);
  });
});

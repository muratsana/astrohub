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

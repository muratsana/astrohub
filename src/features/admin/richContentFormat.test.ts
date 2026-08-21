import { describe, expect, it } from 'vitest';
import type { ContentBlock } from '@/domain/content/blocks';
import { blocksToEditorHtml, editorHtmlToBlocks } from './richContentFormat';

/**
 * GİDİŞ-DÖNÜŞ, TEK KURAL: bir yazıyı açıp hiçbir şey değiştirmeden
 * kaydetmek içeriği DEĞİŞTİRMEMELİ.
 *
 * Aşağıdaki üç durum bu kuralı kırıyordu; her biri kullanıcının gözünde
 * "yazımın bir kısmı kayboldu" olarak görünüyordu.
 */
function roundTrip(blocks: ContentBlock[]): ContentBlock[] {
  return editorHtmlToBlocks(blocksToEditorHtml(blocks));
}

describe('gidiş-dönüş bütünlüğü', () => {
  it('callout alıntıya çökmüyor; ton ve başlık korunuyor', () => {
    const blocks: ContentBlock[] = [
      {
        type: 'callout',
        tone: 'warning',
        title: 'Dikkat',
        text: 'Montür dengesini kontrol edin.',
      },
    ];
    expect(roundTrip(blocks)).toEqual(blocks);
  });

  it('başlıksız callout başlık alanı uydurmuyor', () => {
    const blocks: ContentBlock[] = [
      { type: 'callout', tone: 'info', text: 'Kısa not.' },
    ];
    expect(roundTrip(blocks)).toEqual(blocks);
  });

  it('altı çizili kaydedince kaybolmuyor', () => {
    const blocks: ContentBlock[] = [
      { type: 'paragraph', text: 'Bu __önemli__ bir uyarıdır.' },
    ];
    expect(blocksToEditorHtml(blocks)).toContain('<u>önemli</u>');
    expect(roundTrip(blocks)).toEqual(blocks);
  });

  it('tablo hücresindeki biçim ve bağlantı korunuyor', () => {
    const blocks: ContentBlock[] = [
      {
        type: 'table',
        header: ['**Filtre**', 'Geçirgenlik'],
        rows: [['[L-eXtreme](/ilan/lextreme-2inch)', '*7 nm*']],
      },
    ];
    expect(roundTrip(blocks)).toEqual(blocks);
  });

  it('alıntı callout’a dönüşmüyor — iki tür ayrı kalıyor', () => {
    const blocks: ContentBlock[] = [{ type: 'quote', text: 'Alıntı.' }];
    expect(roundTrip(blocks)).toEqual(blocks);
  });

  it('araç kartı başlık, açıklama ve bağlantısını koruyor', () => {
    const blocks: ContentBlock[] = [
      {
        type: 'tool',
        title: 'Kadraj ve Pixel Scale',
        text: 'Kurulumunuzun görüş alanını hesaplayın.',
        href: '/araclar/kadraj',
        action: 'Kadrajı aç',
      },
    ];
    expect(roundTrip(blocks)).toEqual(blocks);
  });

  it('ham HTML blok kaydetmede korunuyor', () => {
    const blocks: ContentBlock[] = [
      {
        type: 'html',
        html: '<div class="ah"><figure data-ah-fig="kare-sayisi"></figure></div>',
        scriptSrc: '/astrohub/gurultu-gain-poz.js',
      },
    ];
    expect(roundTrip(blocks)).toEqual(blocks);
  });

  it('doküman modundaki HTML blok kaydetmede korunuyor', () => {
    const blocks: ContentBlock[] = [
      {
        type: 'html',
        mode: 'document',
        html: '<!doctype html><html><body><style>.a{display:grid}</style><main>PDF</main></body></html>',
      },
    ];
    expect(roundTrip(blocks)).toEqual(blocks);
  });
});

describe('callout ayrıştırma', () => {
  it('bilinmeyen tonu bilgi kutusuna düşürüyor', () => {
    expect(
      editorHtmlToBlocks(
        '<aside data-callout data-tone="uydurma"><p>Not</p></aside>'
      )
    ).toEqual([{ type: 'callout', tone: 'info', text: 'Not' }]);
  });

  it('data-callout taşımayan aside paragraf olarak alınıyor', () => {
    expect(editorHtmlToBlocks('<aside><p>Kenar not</p></aside>')).toEqual([
      { type: 'paragraph', text: 'Kenar not' },
    ]);
  });
});

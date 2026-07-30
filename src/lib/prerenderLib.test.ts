import { describe, expect, it } from 'vitest';
// @ts-expect-error — derleme betiğinin saf modülü; tip bildirimi yok.
import { extractHeadTags, composePage, outputFileFor } from '../../scripts/prerender-lib.mjs';

const TEMPLATE = `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="description"
      content="Varsayılan açıklama"
    />
    <title>Astrohub — Varsayılan</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

const RENDERED =
  '<title>Haberler | Astrohub</title>' +
  '<meta name="description" content="Rota açıklaması"/>' +
  '<link rel="canonical" href="https://astrohub.com.tr/haberler"/>' +
  '<script type="application/ld+json">{"@type":"BreadcrumbList"}</script>' +
  '<div class="sayfa">İçerik</div>';

describe('extractHeadTags', () => {
  it('head etiketlerini gövdeden ayıklar', () => {
    const { head, body } = extractHeadTags(RENDERED);
    expect(head).toHaveLength(4);
    expect(body).toBe('<div class="sayfa">İçerik</div>');
  });
});

describe('composePage', () => {
  const page = composePage(TEMPLATE, RENDERED);

  it('rota başlığı şablon başlığının yerine geçer — çift title olmaz', () => {
    expect(page.match(/<title>/g)).toHaveLength(1);
    expect(page).toContain('<title>Haberler | Astrohub</title>');
  });

  it('rota açıklaması varken şablonunki kaldırılır', () => {
    expect(page.match(/name="description"/g)).toHaveLength(1);
    expect(page).toContain('Rota açıklaması');
  });

  it('canonical ve JSON-LD head içine taşınır', () => {
    const headPart = page.slice(0, page.indexOf('</head>'));
    expect(headPart).toContain('rel="canonical"');
    expect(headPart).toContain('application/ld+json');
  });

  it('gövde içeriği #root içine yazılır', () => {
    expect(page).toContain('<div id="root"><div class="sayfa">İçerik</div></div>');
  });

  it('rota meta üretmediyse şablon değerleri korunur', () => {
    const bare = composePage(TEMPLATE, '<div>salt içerik</div>');
    expect(bare).toContain('<title>Astrohub — Varsayılan</title>');
    expect(bare).toContain('Varsayılan açıklama');
  });
});

describe('outputFileFor', () => {
  it('yolları dosya konumuna çevirir', () => {
    expect(outputFileFor('/')).toBe('index.html');
    expect(outputFileFor('/haberler')).toBe('haberler/index.html');
    expect(outputFileFor('/haber/m31-kesfi/')).toBe('haber/m31-kesfi/index.html');
  });
});

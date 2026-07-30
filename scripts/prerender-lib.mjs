/**
 * PRERENDER HTML DÖNÜŞÜMÜ — saf fonksiyonlar (test edilebilir).
 *
 * React 19'un statik prerender çıktısı bir parça (fragment): head'e
 * taşınabilir etiketler (<title>, <meta>, canonical/preload <link>,
 * JSON-LD <script>) gövde akışının içinde gelir çünkü ortada bir <head>
 * yoktur. Burada onlar ayıklanır, şablonun <head>'ine taşınır; şablonun
 * kendi varsayılan başlık/açıklaması rota kendi değerini getirdiyse
 * kaldırılır — aynı sayfada iki title/description, etiketsizlikten
 * kötüdür.
 */

const TITLE_RE = /<title>[\s\S]*?<\/title>/g;
const META_RE = /<meta\s[^>]*\/?>(?:<\/meta>)?/g;
const HOIST_LINK_RE = /<link\s[^>]*rel="(?:canonical|preload)"[^>]*\/?>/g;
const JSONLD_RE = /<script type="application\/ld\+json">[\s\S]*?<\/script>/g;

/** Render çıktısından head'e taşınacak etiketleri ayıklar. */
export function extractHeadTags(rendered) {
  const head = [];
  let body = rendered;

  for (const re of [TITLE_RE, META_RE, HOIST_LINK_RE, JSONLD_RE]) {
    body = body.replace(re, (tag) => {
      head.push(tag);
      return '';
    });
  }

  return { head, body };
}

/**
 * Şablon + render çıktısı → yayınlanacak sayfa.
 *
 * Şablondaki `<div id="root"></div>` içerikle doldurulur; istemci
 * tarafında React aynı ağacı yeniden kurar (createRoot.render içeriği
 * değiştirir — kullanıcı aynı sayfayı gördüğü için geçiş görünmez).
 */
export function composePage(template, rendered) {
  const { head, body } = extractHeadTags(rendered);

  let page = template;

  const routeTitle = head.find((t) => t.startsWith('<title>'));
  if (routeTitle) {
    page = page.replace(TITLE_RE, () => routeTitle);
  }

  const hasRouteDescription = head.some((t) =>
    t.includes('name="description"')
  );
  if (hasRouteDescription) {
    // Şablonun varsayılan açıklaması (çok satırlı olabilir) kaldırılır.
    page = page.replace(
      /<meta\s+name="description"[\s\S]*?\/>/,
      ''
    );
  }

  const headTags = head.filter((t) => !t.startsWith('<title>'));
  page = page.replace('</head>', `${headTags.join('\n')}\n</head>`);

  page = page.replace(
    '<div id="root"></div>',
    `<div id="root">${body}</div>`
  );

  return page;
}

/** `/haber/m31` → `haber/m31/index.html`; kök → `index.html`. */
export function outputFileFor(path) {
  const clean = path.replace(/^\/+|\/+$/g, '');
  return clean === '' ? 'index.html' : `${clean}/index.html`;
}

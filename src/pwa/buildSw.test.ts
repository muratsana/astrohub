import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { shellFiles, renderServiceWorker } from './buildSw';

const emitted = [
  'index.html',
  'manifest.webmanifest',
  'assets/index-a1b2c3.js',
  'assets/index-d4e5f6.css',
  'assets/GalleryPage-9z8y7x.js',
  'assets/vendor-react-112233.js',
  'icon-192.png',
  'icon-512.png',
  'icon-512-maskable.png',
  'apple-touch-icon.png',
  'favicon.svg',
  'robots.txt',
];

describe('ön-önbellek listesi', () => {
  it('kabuk dosyalarını içerir', () => {
    const files = shellFiles(emitted);
    expect(files).toContain('/index.html');
    expect(files).toContain('/manifest.webmanifest');
    expect(files).toContain('/assets/index-a1b2c3.js');
    expect(files).toContain('/assets/index-d4e5f6.css');
  });

  it('rota chunk’larını ön-önbelleğe ALMAZ — kod bölmenin amacı bu', () => {
    const files = shellFiles(emitted);
    expect(files).not.toContain('/assets/GalleryPage-9z8y7x.js');
    expect(files).not.toContain('/assets/vendor-react-112233.js');
  });

  it('PWA ikonlarını içerir', () => {
    const files = shellFiles(emitted);
    expect(files).toContain('/icon-192.png');
    expect(files).toContain('/icon-512-maskable.png');
    expect(files).toContain('/favicon.svg');
  });

  it('robots.txt gibi ilgisiz dosyaları almaz', () => {
    expect(shellFiles(emitted)).not.toContain('/robots.txt');
  });

  it('boş derlemede bile kabuk girdilerini korur', () => {
    const files = shellFiles([]);
    expect(files).toEqual(['/index.html', '/manifest.webmanifest']);
  });

  it('sıralı ve tekrarsızdır', () => {
    const files = shellFiles([...emitted, ...emitted]);
    expect(new Set(files).size).toBe(files.length);
    expect([...files].sort()).toEqual(files);
  });
});

describe('service worker üretimi', () => {
  const template =
    "const BUILD_ID = '__BUILD_ID__';\nconst PRECACHE = __PRECACHE__;\n";

  it('sürüm damgasını ve listeyi yerleştirir', () => {
    const out = renderServiceWorker(template, {
      buildId: 'a1b2c3',
      emittedFiles: emitted,
    });

    expect(out).toContain("const BUILD_ID = 'a1b2c3'");
    expect(out).toContain('"/index.html"');
    expect(out).not.toContain('__PRECACHE__');
    expect(out).not.toContain('__BUILD_ID__');
  });

  it('üretilen liste geçerli JSON’dur', () => {
    const out = renderServiceWorker(template, {
      buildId: 'x',
      emittedFiles: emitted,
    });
    const json = out.slice(out.indexOf('['), out.lastIndexOf(']') + 1);
    expect(() => JSON.parse(json)).not.toThrow();
  });
});

describe('yer tutucu güvenliği', () => {
  /*
   * Bu testin varlık sebebi gerçek bir hata: yer tutucular şablonun açıklama
   * satırında da geçiyordu ve `String.replace` ilk eşleşmeyi (yorumu)
   * değiştirip gerçek sabitleri olduğu gibi bırakıyordu. Derleme yeşil,
   * service worker bozuktu.
   */
  it('yorumda da geçen yer tutucuların hepsini doldurur', () => {
    const tricky = [
      '// Bu şablonda __BUILD_ID__ ve __PRECACHE__ yer tutucuları vardır.',
      "const BUILD_ID = '__BUILD_ID__';",
      'const PRECACHE = __PRECACHE__;',
    ].join('\n');

    const out = renderServiceWorker(tricky, {
      buildId: 'zz9',
      emittedFiles: [],
    });

    expect(out).not.toContain('__BUILD_ID__');
    expect(out).not.toContain('__PRECACHE__');
    expect(out).toContain("const BUILD_ID = 'zz9'");
  });

  it('gerçek şablonda hiçbir yer tutucu kalmaz', () => {
    // jsdom ortamında `import.meta.url` http şemasıyla geliyor; dosya yolu
    // proje köküne göre çözülüyor.
    const template = readFileSync(
      path.resolve(process.cwd(), 'src/pwa/sw-template.js'),
      'utf8'
    );

    const out = renderServiceWorker(template, {
      buildId: 'abc123',
      emittedFiles: ['assets/index-abc123.js', 'index.html'],
    });

    expect(out).not.toContain('__BUILD');
    expect(out).not.toContain('CACHE__');
    expect(out).toContain("astrohub-shell-${BUILD_ID}");
    expect(out).toContain('"/assets/index-abc123.js"');
  });
});

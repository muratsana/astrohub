import { describe, expect, it } from 'vitest';
import {
  buildSitemapXml,
  dbRowsToEntries,
  type SitemapEntry,
} from './sitemap';

describe('dbRowsToEntries', () => {
  it('haber ve yazıyı doğru yola, gerçek yayın tarihiyle eşler', () => {
    const entries = dbRowsToEntries([
      { kind: 'haber', slug: 'yeni-kuyruklu', published_at: '2026-07-29T10:00:00Z' },
      { kind: 'yazi', slug: 'kalibrasyon', published_at: '2026-06-01' },
    ]);
    expect(entries[0]).toMatchObject({
      path: '/haber/yeni-kuyruklu',
      lastmod: '2026-07-29',
    });
    expect(entries[1].path).toBe('/yazi/kalibrasyon');
    expect(entries[1].lastmod).toBe('2026-06-01');
  });
});

describe('buildSitemapXml — veritabanı kayıtlarıyla', () => {
  it('aynı yolu taşıyan DB kaydı tohumun yerine geçer — çift URL olmaz', () => {
    // Tohumda da var olan bir haberin panelden düzenlenmiş hâli.
    const extra: SitemapEntry[] = dbRowsToEntries([
      { kind: 'haber', slug: 'ayni-slug', published_at: '2026-07-20' },
    ]);
    const xml = buildSitemapXml('https://astrohub.com.tr', '2026-07-30', [
      { path: '/haber/ayni-slug', priority: 0.7, changefreq: 'monthly' },
      ...extra,
    ]);
    const occurrences = xml.match(/haber\/ayni-slug<\/loc>/g) ?? [];
    expect(occurrences).toHaveLength(1);
    // Kazanan, gerçek yayın tarihli DB kaydı.
    expect(xml).toContain('<lastmod>2026-07-20</lastmod>');
  });

  it('lastmod verilmeyen tohum girdiler derleme tarihini alır', () => {
    const xml = buildSitemapXml('https://astrohub.com.tr', '2026-07-30');
    expect(xml).toContain('<lastmod>2026-07-30</lastmod>');
  });

  it('DB kaydı sitemap sonuna eklenir ve mutlak URL taşır', () => {
    const xml = buildSitemapXml('https://astrohub.com.tr', '2026-07-30', [
      {
        path: '/haber/yalnizca-db',
        priority: 0.7,
        changefreq: 'monthly',
        lastmod: '2026-07-28',
      },
    ]);
    expect(xml).toContain(
      '<loc>https://astrohub.com.tr/haber/yalnizca-db</loc>'
    );
  });
});

import { describe, expect, it } from 'vitest';
import {
  contentEntries,
  sitemapEntries,
  staticEntries,
  buildSitemapXml,
  dbRowsToEntries,
  type SitemapEntry,
} from './sitemap';
import { cities } from '@/features/location/cities';
import { cityRouteSlug } from '@/features/city/routes';

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

/**
 * İNCE ŞEHİR SAYFASI SITEMAP'E GİRMİYOR (§15.3) — ve prerender'dan DÜŞMÜYOR.
 *
 * İki liste bilerek farklı: `contentEntries` 81 şehri de veriyor
 * (hepsinin statik HTML'i olmalı), `sitemapEntries` ince olanları eliyor
 * (dizine sunulmuyorlar). Aradaki farkın YÖNÜ de kilitleniyor — ters
 * olsaydı ince sayfalar HTML'siz kalır, kullanıcı SPA kabuğu görürdü.
 */
describe('ince şehir sayfası', () => {
  const prerenderYollari = new Set(
    [...staticEntries, ...contentEntries()].map((e) => e.path)
  );
  const sitemapYollari = new Set(sitemapEntries().map((e) => e.path));

  it('sitemap prerender listesinden DAR', () => {
    expect(sitemapYollari.size).toBeLessThan(prerenderYollari.size);
  });

  it('sitemap prerender listesinin ALT KÜMESİ', () => {
    /* Sitemap'te olup prerender edilmeyen bir adres, arama motoruna
       var olmayan bir sayfa göstermek olurdu. */
    for (const yol of sitemapYollari) {
      expect(prerenderYollari.has(yol), yol).toBe(true);
    }
  });

  it('81 şehrin hepsi PRERENDER ediliyor', () => {
    for (const city of cities) {
      expect(prerenderYollari.has(`/${cityRouteSlug(city.id)}`), city.name).toBe(
        true
      );
    }
  });

  it('şehirlerin bir kısmı sitemap dışında', () => {
    const sitemapteki = cities.filter((c) =>
      sitemapYollari.has(`/${cityRouteSlug(c.id)}`)
    );
    expect(sitemapteki.length).toBeGreaterThan(0);
    expect(sitemapteki.length).toBeLessThan(cities.length);
  });

  it('üretilen XML elenen şehri içermiyor', () => {
    const xml = buildSitemapXml('https://astrohub.com.tr', '2026-08-02');
    const elenen = cities.find(
      (c) => !sitemapYollari.has(`/${cityRouteSlug(c.id)}`)
    )!;
    expect(elenen).toBeDefined();
    expect(xml).not.toContain(`/${cityRouteSlug(elenen.id)}<`);
  });
});

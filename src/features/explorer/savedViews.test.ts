import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  describeViewProblem,
  normalizeQuery,
  viewSearch,
  type SavedView,
} from './savedViews';

/**
 * KAYDEDİLMİŞ GÖRÜNÜMLER (Faz 4).
 *
 * Ölçülen iki şey var:
 *
 *  1. NORMALLEŞTİRME. Aynı görünüm iki farklı yazımla iki kayıt hâline
 *     gelmemeli — kullanıcı arama kutusuna yazıp silince "değişmiş" bir
 *     görünüm kaydetmiş olmamalı.
 *  2. GÖÇÜN KURALLARI. `is_shared`in kullanıcıya kapalı olması ve
 *     varsayılanın tekil olması ürün kararları; SQL'de yazılı ve burada
 *     kilitleniyor. Kaldırılırsa test düşüyor.
 */

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/0069_kaydedilmis_gorunumler.sql'),
  'utf8'
);

const gorunum = (over: Partial<SavedView> = {}): SavedView => ({
  id: 'v1',
  module: 'galeri',
  name: 'Andromeda',
  query: 'ara=m31',
  isDefault: false,
  isShared: false,
  isMine: true,
  ...over,
});

describe('normalizeQuery', () => {
  it('baştaki `?` atılıyor', () => {
    /* Kayıt bir adres değil, bir sorgu durumu. İki yazım aynı görünüm
       için iki ayrı kayıt üretmemeli. */
    expect(normalizeQuery('?ara=m31')).toBe('ara=m31');
    expect(normalizeQuery('ara=m31')).toBe('ara=m31');
  });

  it('boş parametreler eleniyor', () => {
    expect(normalizeQuery('?ara=&tur=galaksi')).toBe('tur=galaksi');
    expect(normalizeQuery('?ara=%20%20&tur=galaksi')).toBe('tur=galaksi');
  });

  it('sıra korunuyor — alfabetik sıralanmıyor', () => {
    /* Kullanıcının kurduğu sıra adres çubuğunda göründüğü sıradır;
       kaydı açtığında aynı adresi görmek onu şaşırtmaz. */
    expect(normalizeQuery('?sirala=yeni&ara=m31')).toBe('sirala=yeni&ara=m31');
  });

  it('çoklu seçim korunuyor', () => {
    expect(normalizeQuery('?tur=galaksi&tur=bulutsu')).toBe(
      'tur=galaksi&tur=bulutsu'
    );
  });

  it('boş girdi boş dize', () => {
    expect(normalizeQuery('')).toBe('');
    expect(normalizeQuery('?')).toBe('');
  });
});

describe('viewSearch', () => {
  it('adres parçasını `?` ile geri veriyor', () => {
    expect(viewSearch(gorunum())).toBe('?ara=m31');
  });

  it('boş sorgu için `?` yazmıyor', () => {
    /* `/galeri?` ile `/galeri` aynı sayfa ama adres çubuğunda farklı
       görünür; boş bir soru işareti bırakmak özensizlik. */
    expect(viewSearch(gorunum({ query: '' }))).toBe('');
  });
});

describe('describeViewProblem', () => {
  it('geçerli ad kabul ediliyor', () => {
    expect(describeViewProblem('Andromeda', 'ara=m31', [])).toBeNull();
  });

  it('boş ad reddediliyor', () => {
    expect(describeViewProblem('   ', 'ara=m31', [])).toMatch(/ad verin/);
  });

  it('uzun ad reddediliyor', () => {
    expect(describeViewProblem('x'.repeat(61), '', [])).toMatch(/60 karakter/);
  });

  it('kendi görünümlerinde aynı ad reddediliyor — büyük/küçük harf fark etmez', () => {
    const mevcut = [gorunum({ name: 'Andromeda' })];
    expect(describeViewProblem('andromeda', '', mevcut)).toMatch(/zaten var/);
    expect(describeViewProblem('ANDROMEDA', '', mevcut)).toMatch(/zaten var/);
  });

  it('BAŞKASININ paylaşılan görünümüyle aynı ad serbest', () => {
    /* Paylaşılan görünüm yöneticinin koyduğu bir şey; kullanıcının
       kendi listesinde aynı adı kullanmasını engellemek, onun
       kontrolünde olmayan bir sebeple reddetmek olurdu. */
    const mevcut = [gorunum({ name: 'Andromeda', isMine: false, isShared: true })];
    expect(describeViewProblem('Andromeda', '', mevcut)).toBeNull();
  });

  it('çok uzun sorgu reddediliyor', () => {
    expect(describeViewProblem('Ad', 'x'.repeat(2001), [])).toMatch(/uzun/);
  });
});

describe('0069 — ürün kararları SQL’de yazılı', () => {
  it('`is_shared` kapısı bir TETİKLEYİCİDE, politikada değil', () => {
    /* RLS satıra izin verir, SÜTUNA değil: "kullanıcı kendi satırını
       yazabilir ama bu sütununu yazamaz" politikayla ifade edilemez. */
    expect(sql).toContain('app.saved_views_guard()');
    expect(sql).toContain('saved_views_before_write');
    expect(sql).toMatch(/is_shared is distinct from old\.is_shared/);
  });

  it('varsayılan kısmi tekil indeksle zorlanıyor', () => {
    expect(sql).toMatch(
      /create unique index[\s\S]*saved_views_default_uq[\s\S]*where is_default/
    );
  });

  it('varsayılan atama RPC `security invoker` — RLS aşılmıyor', () => {
    /* `security definer` yazsaydık başkasının görünümünü varsayılan
       yapma kapısı açılırdı. */
    const rpc = sql.slice(
      sql.indexOf('create or replace function public.set_default_view'),
      sql.indexOf('revoke all on function public.set_default_view')
    );
    expect(rpc).toContain('security invoker');
    expect(rpc).toContain('set search_path');
  });

  it('RPC `anon`a kapalı', () => {
    expect(sql).toMatch(
      /revoke all on function public\.set_default_view\(uuid\) from public, anon/
    );
  });

  it('okuma politikası paylaşılanı ve kendi satırını kapsıyor', () => {
    expect(sql).toMatch(
      /create policy saved_views_read[\s\S]*is_shared or user_id = \(select auth\.uid\(\)\)/
    );
  });

  it('her `auth.uid()` çağrısı `(select …)` ile sarmalanmış', () => {
    /* 0043'te ölçülen sorun: sarmalanmayan `auth.uid()` satır BAŞINA
       değerlendiriliyor ve planı bozuyor. Sayarak ölçmek desen
       yakalamaktan güvenli — "sarmalanmamış tek bir çağrı bile yok"
       ancak iki sayı eşitse doğru. */
    /* YORUMLAR ÖNCE ÇIKARILIYOR: dosyanın başlığı kuralı ANLATIRKEN
       sarmalanmamış `auth.uid()` yazıyor ve ham metinde sayılırsa test
       kendi açıklamasına takılıyor (0066'da aynı tuzağa düşülmüştü). */
    const kod = sql
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/--[^\n]*/g, ' ');
    const tum = kod.match(/auth\.uid\(\)/g) ?? [];
    const sarmalanmis = kod.match(/\(select auth\.uid\(\)\)/g) ?? [];
    expect(tum.length).toBeGreaterThan(0);
    expect(sarmalanmis).toHaveLength(tum.length);
  });
});

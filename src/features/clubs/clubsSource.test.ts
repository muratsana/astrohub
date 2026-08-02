import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { clubs as seedClubs } from './data';
import { citiesOf, DEFAULT_CLUBS, toClubs } from './clubsSource';

/**
 * KULÜP DİZİNİ — TOHUM HİZASI VE OKUMA (§14.7).
 *
 * ══════════════════════════════════════════════════════════════════════
 * TOHUM TESTİ NEDEN VAR
 *
 * `0058`in `home_modules` tohumu elle yazılmıştı ve koddan ayrıştı;
 * ayrışmayı fark etmek `0061`i yazmayı gerektirdi. `0067`nin tohumu
 * `data.ts` OKUNARAK üretildi ve bu test hizayı kilitliyor: koddaki
 * listeye bir kulüp eklenip göç dosyası unutulursa test düşüyor.
 *
 * Ölçülen ikinci şey: tohumun DOĞRULAMA alanlarına hiç dokunmadığı.
 * Tohumla "doğrulanmış" demek, rozeti ilk günde yalan hâline getirirdi.
 */

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/0067_kulup_dizini_ve_dogrulama.sql'),
  'utf8'
);

/** `insert ... (` ile `)\nvalues` arasındaki sütun listesi. */
const sutunlar = sql
  .slice(
    sql.indexOf('insert into public.clubs (') + 'insert into public.clubs ('.length,
    sql.indexOf('\n)\nvalues')
  )
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/** `values` ile `on conflict` arasındaki tohum gövdesi. */
const tohum = sql.slice(
  sql.indexOf('\nvalues\n'),
  sql.indexOf('on conflict (slug)')
);

/** Bir kulübün tohum satırı — sonraki satır başlangıcına kadar. */
function satir(slug: string): string {
  const bas = tohum.indexOf(`('${slug}'`);
  expect(bas, `${slug} tohumda yok`).toBeGreaterThan(-1);
  const kalan = tohum.slice(bas + 1);
  const son = kalan.search(/\n {2}\('/);
  return son === -1 ? kalan : kalan.slice(0, son);
}

describe('0067 tohumu `data.ts` ile hizalı', () => {
  it('koddaki her kulüp tohumda var, adı ve şehriyle', () => {
    for (const c of seedClubs) {
      const s = satir(c.slug);
      expect(s, `${c.slug} adı`).toContain(`'${c.name.replace(/'/g, "''")}'`);
      expect(s, `${c.slug} şehri`).toContain(`'${c.city}'`);
      expect(s, `${c.slug} türü`).toContain(`'${c.kind}'`);
    }
  });

  it('tohumda fazladan kulüp yok', () => {
    /* Ters yön: göç dosyasına kodda karşılığı olmayan bir kulüp
       eklenirse dizinde düzenlenemeyen bir kayıt olurdu. */
    const slugler = [...tohum.matchAll(/\n {2}\('([a-z0-9-]+)'/g)].map((m) => m[1]);
    expect(slugler.sort()).toEqual(seedClubs.map((c) => c.slug).sort());
  });

  it('kuruluş yılı ve üye sayısı kodla aynı — bildirilmeyen `null`', () => {
    for (const c of seedClubs) {
      const s = satir(c.slug);
      expect(s, `${c.slug} kuruluş`).toContain(
        c.foundedYear ? String(c.foundedYear) : 'null'
      );
      expect(s, `${c.slug} üye`).toContain(
        c.memberCount ? String(c.memberCount) : 'null'
      );
    }
  });

  it('kaynak adı ve güncellik tarihi kodla aynı', () => {
    for (const c of seedClubs) {
      const s = satir(c.slug);
      expect(s, `${c.slug} kaynak`).toContain(`'${c.source.name}'`);
      expect(s, `${c.slug} tarih`).toContain(`'${c.source.lastVerifiedAt}'::date`);
    }
  });

  it('faaliyetler kodla aynı', () => {
    for (const c of seedClubs) {
      const s = satir(c.slug);
      for (const a of c.activities) expect(s, `${c.slug}: ${a}`).toContain(a);
    }
  });

  it('tohum doğrulama alanlarına DOKUNMUYOR', () => {
    /* Rozet ilk günde yalan olmamalı: `verified_at`/`verified_by` insert
       sütun listesinde hiç geçmemeli. `manager_user_id` de öyle —
       yönetici bağı editoryal bir karar, tohumun işi değil. */
    expect(sutunlar).not.toContain('verified_at');
    expect(sutunlar).not.toContain('verified_by');
    expect(sutunlar).not.toContain('manager_user_id');
  });

  it('iletişim ve katılım alanları tohumda boş', () => {
    /* Bu kayıtlar gerçek kurumlara ait; olmayan bir e-posta uydurmak
       ziyaretçiyi var olmayan bir adrese yazmaya yollamak olurdu. */
    expect(sutunlar).not.toContain('contact_email');
    expect(sutunlar).not.toContain('join_url');
  });

  it('doğrulayan olmadan doğrulama kısıtı tabloda', () => {
    expect(sql).toContain('constraint clubs_verified_pair');
  });

  it('yazma politikası yalnızca yöneticide — kulüp yöneticisinde değil', () => {
    /* `manager_user_id` bir bağ, bir yetki değil: dizin editoryal.
       Politika `app.is_admin()` dışında bir koşul taşımamalı. */
    const politika = sql.slice(
      sql.indexOf('create policy clubs_write'),
      sql.indexOf('grant select on public.clubs')
    );
    expect(politika).toContain('using (app.is_admin())');
    expect(politika).not.toContain('manager_user_id');
  });
});

describe('toClubs', () => {
  const row = (over: Record<string, unknown> = {}) => ({
    slug: 'ornek-kulup',
    name: 'Örnek Kulüp',
    kind: 'dernek',
    city: 'Ankara',
    founded_year: 2010,
    member_count: 40,
    summary: 'Özet',
    activities: ['Gözlem gecesi'],
    public_events: true,
    shared_equipment: false,
    website: 'https://ornek.org.tr',
    contact_email: 'bilgi@ornek.org.tr',
    join_url: 'https://ornek.org.tr/katil',
    organizer_name: 'Örnek Kulüp',
    source_name: 'Dernek duyurusu',
    info_checked_on: '2026-07-10',
    verified_at: null,
    listed: true,
    ...over,
  });

  it('veri yokken koddaki dizin çiziliyor', () => {
    expect(toClubs(null)).toBe(DEFAULT_CLUBS);
    expect(toClubs([])).toBe(DEFAULT_CLUBS);
    expect(toClubs('bozuk')).toBe(DEFAULT_CLUBS);
  });

  it('veritabanı satırı koddaki tohumun yerine geçiyor, üstüne EKLENMİYOR', () => {
    /* `mergeWithSeed` kullanılmıyor: birleştirme yapılsaydı dizinden
       çıkarılan kulüp koddaki kopyasından geri gelirdi. */
    const list = toClubs([row({ slug: 'antalya-astronomi-dernegi' })]);
    expect(list).toHaveLength(1);
    expect(list[0]!.slug).toBe('antalya-astronomi-dernegi');
  });

  it('listeden çıkarılan kulüp çizilmiyor', () => {
    const list = toClubs([row(), row({ slug: 'gizli', listed: false })]);
    expect(list.map((c) => c.slug)).toEqual(['ornek-kulup']);
  });

  it('hepsi listeden çıkarılmışsa dizin boş kalır, yedeğe DÜŞMEZ', () => {
    expect(toClubs([row({ listed: false })])).toEqual([]);
  });

  it('adsız satır düşürülüyor', () => {
    /* Tıklanınca 404 veren bir kart, olmayan karttan kötü. */
    expect(toClubs([row(), row({ slug: 'bos', name: '  ' })])).toHaveLength(1);
  });

  it('satır vardı ama hiçbiri çizilebilir değilse yedeğe dönülür', () => {
    expect(toClubs([row({ name: '' }), row({ slug: '' })])).toBe(DEFAULT_CLUBS);
  });

  it('https olmayan adres ve katılım bağlantısı düşürülüyor', () => {
    const [c] = toClubs([
      row({ website: 'javascript:alert(1)', join_url: 'http://ornek.org.tr' }),
    ]);
    expect(c!.website).toBeUndefined();
    expect(c!.joinUrl).toBeUndefined();
  });

  it('doğrulama damgası okunuyor, yokluğu `null`', () => {
    expect(toClubs([row()])[0]!.verifiedAt).toBeNull();
    expect(
      toClubs([row({ verified_at: '2026-08-01T09:00:00+00:00' })])[0]!.verifiedAt
    ).toBe('2026-08-01T09:00:00+00:00');
  });

  it('bilinmeyen tür gözlem grubuna düşüyor', () => {
    expect(toClubs([row({ kind: 'uydurma' })])[0]!.kind).toBe('gozlem-grubu');
  });

  it('`null` üye sayısı 0 sayılmıyor', () => {
    /* `Number(null) === 0` tuzağı: "üye sayısı bildirilmemiş" ile
       "üyesi yok" aynı şey değil ve sıralamada ters uçlara düşer. */
    const c = toClubs([row({ member_count: null, founded_year: null })])[0]!;
    expect(c.memberCount).toBeUndefined();
    expect(c.foundedYear).toBeUndefined();
  });

  it('faaliyet listesi bozuksa boş liste', () => {
    expect(toClubs([row({ activities: null })])[0]!.activities).toEqual([]);
  });
});

describe('citiesOf', () => {
  it('şehirleri sayıyor ve Türkçe sıralıyor', () => {
    const list = citiesOf(DEFAULT_CLUBS);
    expect(list.map((c) => c.city)).toEqual(
      [...new Set(DEFAULT_CLUBS.map((c) => c.city))].sort((a, b) =>
        a.localeCompare(b, 'tr')
      )
    );
    expect(list.reduce((t, c) => t + c.count, 0)).toBe(DEFAULT_CLUBS.length);
  });

  it('aynı şehirdeki kulüpler tek satırda toplanıyor', () => {
    const list = citiesOf([
      ...DEFAULT_CLUBS.filter((c) => c.city === 'Ankara'),
      { ...DEFAULT_CLUBS[0]!, slug: 'ikinci', city: 'Ankara' },
    ]);
    expect(list).toEqual([{ city: 'Ankara', count: 2 }]);
  });
});

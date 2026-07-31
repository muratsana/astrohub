#!/usr/bin/env node
/**
 * KİMLİK TABLOSU BÜTÜNLÜĞÜ — GoTrue'nun okuyamayacağı satır var mı?
 *
 * ÜRETİMDE YAŞANDI. `auth.users` tablosuna elle SQL ile bir satır
 * eklenmişti. GoTrue (Supabase'in kimlik servisi) o tablodaki token
 * kolonlarını Go tarafında `string` olarak okuyor; şemada
 * `NOT NULL DEFAULT ''` olmaları gerekirken NULL kalmışlardı. Sonuç:
 *
 *     Scan error on column index 3, name "confirmation_token":
 *     converting NULL to string is unsupported
 *
 * Bu hata kullanıcıyı e-postayla arayan HER sorguyu düşürüyordu. Yani
 * hem Google girişi hem şifreli giriş kırıktı — hesap aylardır vardı ve
 * `last_sign_in_at` bir kez bile dolmamıştı. Kimse fark etmemişti çünkü
 * arayüzde hata görünmüyor: Supabase başarısız dönüşü adresin sonuna
 * yazıyor, site de onu sessizce yutuyor.
 *
 * BU DENETİM YALNIZCA GERÇEK VERİTABANINA KARŞI ANLAMLI. Yerel bir test
 * veritabanında satır zaten olmaz; bozukluk üretim verisinde doğuyor.
 * CI'da tek başına çalıştırmak yanlış bir güven verir — periyodik olarak
 * ÜRETİME karşı koşturulmalı:
 *
 *     DATABASE_URL='<üretim>' node scripts/check-auth-integrity.mjs
 *
 * NEDEN KISIT DEĞİL DE DENETİM. Doğal çözüm kolonlara `not null default ''`
 * koymak olurdu, ama `auth` şeması Supabase'e ait: GoTrue kendi
 * migration'larını çalıştırıyor ve elle konan bir kısıt bir sonraki
 * sürüm yükseltmesinde çakışabilir. Şemaya dokunmadan bozukluğu görünür
 * kılmak daha güvenli.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const url = process.env.DATABASE_URL;

if (!url) {
  console.error(
    'DATABASE_URL tanımlı değil.\n' +
      'Bu denetim üretim veritabanına karşı çalıştırılmalı.'
  );
  process.exit(1);
}

async function sql(text) {
  const { stdout } = await run(
    'psql',
    [url, '-X', '-q', '-t', '-A', '-F', '|', '-v', 'ON_ERROR_STOP=1', '-c', text],
    { maxBuffer: 32 * 1024 * 1024 }
  );
  return stdout.trim();
}

/**
 * GoTrue'nun `string` olarak okuduğu kolonlar.
 *
 * Liste GoTrue'nun kullanıcı modelinden geliyor. Yeni bir sürüm kolon
 * eklerse bu liste eksik kalır — ama eksik bir liste yanlış bir listeden
 * iyidir: buradakiler bilinen ve yaşanmış olanlar.
 */
const STRING_COLUMNS = [
  'confirmation_token',
  'recovery_token',
  'email_change_token_new',
  'email_change',
  'email_change_token_current',
  'phone_change',
  'phone_change_token',
  'reauthentication_token',
];

const problems = [];

/*
 * HANGİ KOLONLARIN VAR OLDUĞU ÖNCE SORULUYOR.
 *
 * GoTrue şeması sürümden sürüme değişiyor: `email_change_token_new` gibi
 * kolonlar sonradan eklendi ve eski kurulumlarda yok. Listeyi olduğu gibi
 * sorgulamak, kolonun bulunmadığı her ortamda denetimi ÇÖKERTİYOR —
 * yerel test veritabanında tam olarak bu oldu. Çöken bir denetim,
 * bulmadığı sorunu bildiremez.
 */
const existing = new Set(
  (
    await sql(`
      select column_name from information_schema.columns
      where table_schema = 'auth' and table_name = 'users'
        and column_name = any (array[${STRING_COLUMNS.map((c) => `'${c}'`).join(',')}])
    `)
  )
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
);

const checked = STRING_COLUMNS.filter((column) => existing.has(column));
if (checked.length === 0) {
  console.error('auth.users içinde beklenen token kolonlarının hiçbiri yok.');
  process.exit(1);
}

/* ── 1. NULL token kolonu ─────────────────────────────────────────── */
const nullCheck = checked
  .map(
    (column) =>
      `select '${column}' as kolon, count(*) as adet from auth.users where ${column} is null`
  )
  .join(' union all ');

for (const line of (await sql(nullCheck)).split('\n').filter(Boolean)) {
  const [column, count] = line.split('|');
  if (Number(count) > 0) {
    problems.push(
      `auth.users.${column}: ${count} satırda NULL — GoTrue bu satırı okuyamaz`
    );
  }
}

/** Tablo bu şemada var mı? Kolonlarda olduğu gibi, yoksa denetim atlanır. */
async function tableExists(schema, table) {
  const found = await sql(
    `select 1 from information_schema.tables
      where table_schema = '${schema}' and table_name = '${table}'`
  );
  return found.trim() === '1';
}

const atlanan = [];

/* ── 2. Kimliksiz kullanıcı ────────────────────────────────────────
 * Her kullanıcının en az bir `auth.identities` satırı olmalı. Elle
 * eklenen satırlarda bu da unutuluyor ve kullanıcı hiçbir yolla giriş
 * yapamıyor — tabloda görünüyor ama işe yaramıyor. */
if (await tableExists('auth', 'identities')) {
  const orphan = await sql(`
    select coalesce(string_agg(u.email, ', '), '')
    from auth.users u
    where not exists (select 1 from auth.identities i where i.user_id = u.id)
  `);
  if (orphan) {
    problems.push(`kimliği olmayan kullanıcı: ${orphan} — hiçbir yolla giriş yapamaz`);
  }
} else {
  atlanan.push('auth.identities');
}

/* ── 3. Profili olmayan kullanıcı ──────────────────────────────────
 * `app.handle_new_user()` tetikleyicisi her yeni kullanıcı için profil
 * açıyor. Elle eklenen satır tetikleyiciyi atlarsa profil oluşmuyor ve
 * kullanıcı adı, görünen ad, kota — hepsi boşa düşüyor. */
if (await tableExists('public', 'profiles')) {
  const noProfile = await sql(`
    select coalesce(string_agg(u.email, ', '), '')
    from auth.users u
    where not exists (select 1 from public.profiles p where p.id = u.id)
  `);
  if (noProfile) {
    problems.push(`profili olmayan kullanıcı: ${noProfile}`);
  }
} else {
  atlanan.push('public.profiles');
}

/* ── Rapor ─────────────────────────────────────────────────────────── */
const total = await sql('select count(*) from auth.users');

if (problems.length > 0) {
  console.error(`\nKimlik tablosunda ${problems.length} sorun (${total} kullanıcı):\n`);
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  console.error(
    '\nNULL token kolonları şöyle düzeltilir:\n' +
      '  update auth.users set confirmation_token = coalesce(confirmation_token, \'\'), … ;\n' +
      '\nKalıcı çözüm: kullanıcıyı elle SQL ile ekleme. Supabase panelinde\n' +
      'Authentication → Users → Add user, GoTrue üzerinden gittiği için\n' +
      'kolonları doğru dolduruyor.'
  );
  process.exit(1);
}

/* Atlananlar SESSİZ KALMIYOR: hangi denetimin çalışmadığını bilmeden
   "sağlam" demek, ölçülmemiş olanı ölçülmüş saymaktır. */
const notlar = [
  checked.length < STRING_COLUMNS.length
    ? `${STRING_COLUMNS.length - checked.length} kolon bu şemada yok`
    : null,
  atlanan.length > 0 ? `atlanan tablo: ${atlanan.join(', ')}` : null,
].filter(Boolean);

console.log(
  `Kimlik tablosu sağlam · ${total} kullanıcı, ${checked.length} kolon denetlendi` +
    (notlar.length > 0 ? ` (${notlar.join('; ')})` : '')
);

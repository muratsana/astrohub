#!/usr/bin/env node
/**
 * RLS MATRİSİ — satır seviyesi güvenliğin gerçekten uyguladığı kuralları
 * ölçer (T-204).
 *
 * NEDEN OKUMAK YETMEZ. RLS politikaları tek tek makul görünür; tehlike
 * ARALARINDAKİ BOŞLUKTADIR. Bir tabloda `for all` yazılmış geniş bir
 * politika, aynı tablodaki dar `select` politikasını anlamsız kılabilir.
 * Bir tabloda RLS açık ama hiç politika yoksa herkese kapalıdır — bu
 * bazen kasıtlı (`edge_rate_limits`), bazen unutulmuş bir tablodur ve
 * ikisi kaynağa bakınca aynı görünür. Tek ayırt edici şey davranışı
 * ÖLÇMEK.
 *
 * ROL TAKLİDİ NASIL ÇALIŞIYOR. Supabase'de `auth.uid()`, isteğin JWT
 * talebinden okunuyor. Burada aynısı elle kuruluyor:
 *
 *     set local role authenticated;
 *     set local request.jwt.claims = '{"sub":"<user-id>"}';
 *
 * `set local` işlem sonunda geri alınıyor, yani her kontrol yalıtık.
 * Postgres süper kullanıcısı RLS'i atlar; bu yüzden her kontrol rolü
 * DEĞİŞTİRDİKTEN sonra çalışıyor.
 *
 * KULLANIM
 *   DATABASE_URL='postgresql://…' node scripts/check-rls.mjs
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const url = process.env.DATABASE_URL;

if (!url) {
  console.error('DATABASE_URL tanımlı değil.');
  process.exit(1);
}

const ALICE = '11111111-1111-1111-1111-111111111111';
const BOB = '22222222-2222-2222-2222-222222222222';
const ALICE_PHOTO = 'aaaaaaaa-0000-0000-0000-00000000a001';
const ALICE_DRAFT = 'aaaaaaaa-0000-0000-0000-00000000a002';

async function sql(text) {
  const { stdout } = await run(
    'psql',
    [url, '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-c', text],
    { maxBuffer: 32 * 1024 * 1024 }
  );
  return stdout.trim();
}

/**
 * Rol taklidiyle tek bir sorgu — sonucu ya değer ya hata.
 *
 * İKİ AYRI GUC YAZILIYOR ve bu bir fazlalık değil: `auth.uid()`
 * tanımı Supabase sürümüne göre değişiyor. Üretimdeki sürüm
 * `request.jwt.claims` JSON'undan `sub` alanını okuyor; bu kutudaki
 * `supabase/postgres` imajı ise eski GoTrue geleneğini izleyip doğrudan
 * `request.jwt.claim.sub` GUC'una bakıyor. Yalnızca birini yazmak,
 * denetimin ortama göre sessizce yanlış sonuç vermesi demekti —
 * `auth.uid()` NULL dönünce HER kontrol "göremiyor" diye geçerdi ve
 * matris yeşil görünürken hiçbir şey ölçmemiş olurdu.
 */
async function asRole(role, userId, query) {
  const claims = userId ? `'{"sub":"${userId}","role":"${role}"}'` : `'{}'`;
  const body = [
    'begin;',
    `set local role ${role};`,
    `set local request.jwt.claims = ${claims};`,
    userId
      ? `set local request.jwt.claim.sub = '${userId}';`
      : `set local request.jwt.claim.sub = '';`,
    query,
    'rollback;',
  ].join('\n');

  try {
    const out = await run(
      'psql',
      [url, '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-c', body],
      { maxBuffer: 32 * 1024 * 1024 }
    );
    return { ok: true, value: out.stdout.trim() };
  } catch (cause) {
    return { ok: false, error: (cause.stderr || cause.message).trim() };
  }
}

const results = [];

function record(name, passed, detail) {
  results.push({ name, passed, detail });
}

/**
 * Beklenen satır sayısını doğrular.
 *
 * "GÖREMEZ" beklentisinde (0 satır) YETKİ HATASI DA GEÇERLİ SAYILIYOR.
 * Bu bir gevşetme değil, tersi: `permission denied` tablonun rolden
 * tamamen alındığı anlamına geliyor (0003 grant sertleştirmesi) ve RLS'in
 * satır süzmesinden DAHA güçlü. İkisini ayrı sonuç saymak, daha güvenli
 * olan yapılandırmayı başarısız göstermek olurdu.
 */
async function expectCount(name, role, userId, query, expected) {
  const result = await asRole(role, userId, query);

  if (!result.ok) {
    const denied = /permission denied/i.test(result.error);
    if (expected === 0 && denied) {
      record(name, true, 'tablo yetkisi hiç verilmemiş (RLS öncesi kapı)');
    } else {
      record(name, false, `sorgu hata verdi: ${result.error.slice(0, 120)}`);
    }
    return;
  }

  const value = Number(result.value.split('\n').pop());
  record(name, value === expected, `beklenen ${expected}, gelen ${value}`);
}

/**
 * Yazma girişiminin ENGELLENMESİNİ doğrular.
 *
 * RLS iki farklı şekilde engelliyor ve ikisi de geçerli sonuç:
 *
 *   INSERT        → `with check` ihlali HATA fırlatıyor.
 *   UPDATE/DELETE → hata YOK; politika satırı görünmez yapıyor ve ifade
 *                   sıfır satır etkileyerek başarıyla dönüyor.
 *
 * İkincisini "işlem geçti" saymak bu denetimin ilk sürümünde iki yanlış
 * kırmızı üretti. Doğrusu ETKİLENEN SATIR SAYISINA bakmak: sıfırsa
 * saldırgan hiçbir şeye dokunamamış demektir.
 *
 * Sayıyı psql'in komut etiketinden ("UPDATE 0") okumak kırılgandı —
 * `-q` bayrağı o satırı bastırıyor. Bunun yerine ifade bir CTE'ye
 * sarılıp `returning` ile gerçekten sayılıyor; psql bayraklarından
 * bağımsız.
 */
async function expectDenied(name, role, userId, mutation) {
  const wrapped = `with attempt as (${mutation} returning 1) select count(*) from attempt;`;
  const result = await asRole(role, userId, wrapped);

  if (!result.ok) {
    const blocked =
      /row-level security|permission denied|violates row-level/i.test(result.error);
    record(name, blocked, blocked ? 'RLS engelledi' : result.error.slice(0, 120));
    return;
  }

  const rows = Number(result.value.split('\n').pop());
  record(
    name,
    rows === 0,
    rows === 0 ? 'sıfır satır etkilendi' : `${rows} satır etkilendi`
  );
}

/* ── Kurulum ─────────────────────────────────────────────────────────
 * Sahte kullanıcılar ve iki fotoğraf: biri yayımlanmış, biri taslak.
 * Taslak kritik — yayımlanmamış içeriğin başkasına görünmemesi gerekiyor
 * ve bunu ancak veriyle sınayabiliriz.
 */
await sql(`
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
  values ('${ALICE}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','alice@rls.test','x',now(),now()),
         ('${BOB}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','bob@rls.test','x',now(),now())
  on conflict (id) do nothing;

  insert into public.astro_photos
    (id, user_id, slug, title, photo_type, status, display_path, copyright_confirmed, published_at)
  values ('${ALICE_PHOTO}','${ALICE}','rls-yayimda','Yayımda','deep-sky','published',
          '${ALICE}/${ALICE_PHOTO}/display.jpg', true, now()),
         ('${ALICE_DRAFT}','${ALICE}','rls-taslak','Taslak','deep-sky','draft', null, false, null)
  on conflict (id) do nothing;

  insert into public.photo_exact_locations (photo_id, latitude, longitude)
  values ('${ALICE_PHOTO}', 39.9, 32.8)
  on conflict (photo_id) do nothing;

  insert into public.memberships (user_id, status)
  values ('${ALICE}', 'active')
  on conflict (user_id) do nothing;
`);

/* ── FOTOĞRAF GÖRÜNÜRLÜĞÜ ─────────────────────────────────────────── */

await expectCount(
  'anon yayımlanmış fotoğrafı görür',
  'anon',
  null,
  `select count(*) from public.astro_photos where id = '${ALICE_PHOTO}';`,
  1
);

/* Taslak, sahibinden başkasına GÖRÜNMEMELİ: yayımlanmamış içerik
   kullanıcının henüz paylaşmadığı iştir. */
await expectCount(
  'anon taslağı GÖREMEZ',
  'anon',
  null,
  `select count(*) from public.astro_photos where id = '${ALICE_DRAFT}';`,
  0
);

await expectCount(
  "Bob, Alice'in taslağını GÖREMEZ",
  'authenticated',
  BOB,
  `select count(*) from public.astro_photos where id = '${ALICE_DRAFT}';`,
  0
);

await expectCount(
  'Alice kendi taslağını görür',
  'authenticated',
  ALICE,
  `select count(*) from public.astro_photos where id = '${ALICE_DRAFT}';`,
  1
);

/* ── KONUM MAHREMİYETİ (§15.3) ────────────────────────────────────────
 * Tam koordinat ayrı tabloda tutuluyor; fotoğraf herkese açık olsa bile
 * çekim yerinin metrelik hassasiyeti sahibinin bilgisi. Bir gözlem
 * noktasının tam yeri, o noktayı kullanan kişinin nerede olduğu demek. */

await expectCount(
  'anon tam koordinatı GÖREMEZ',
  'anon',
  null,
  `select count(*) from public.photo_exact_locations;`,
  0
);

await expectCount(
  "Bob, Alice'in tam koordinatını GÖREMEZ",
  'authenticated',
  BOB,
  `select count(*) from public.photo_exact_locations;`,
  0
);

await expectCount(
  'Alice kendi koordinatını görür',
  'authenticated',
  ALICE,
  `select count(*) from public.photo_exact_locations;`,
  1
);

/* ── ÜYELİK VE FATURA ─────────────────────────────────────────────── */

await expectCount(
  'anon üyelik kaydı GÖREMEZ',
  'anon',
  null,
  `select count(*) from public.memberships;`,
  0
);

await expectCount(
  "Bob, Alice'in üyeliğini GÖREMEZ",
  'authenticated',
  BOB,
  `select count(*) from public.memberships;`,
  0
);

await expectCount(
  'Alice kendi üyeliğini görür',
  'authenticated',
  ALICE,
  `select count(*) from public.memberships;`,
  1
);

await expectCount(
  'anon fatura kaydı GÖREMEZ',
  'anon',
  null,
  `select count(*) from public.billing_transactions;`,
  0
);

/* ── YAZMA ─────────────────────────────────────────────────────────── */

await expectDenied(
  'anon fotoğraf ekleyemez',
  'anon',
  null,
  `insert into public.astro_photos (user_id, slug, title, photo_type, status)
   values ('${ALICE}','anon-deneme','Deneme','deep-sky','draft')`
);

await expectDenied(
  "Bob, Alice adına fotoğraf ekleyemez",
  'authenticated',
  BOB,
  `insert into public.astro_photos (user_id, slug, title, photo_type, status)
   values ('${ALICE}','bob-deneme','Deneme','deep-sky','draft')`
);

/* Yetki yükseltme — en pahalı açık. Kullanıcı kendine rol veremiyorsa
   admin yüzeyinin tamamı kapalı kalıyor. */
await expectDenied(
  'Bob kendine yönetici rolü VEREMEZ',
  'authenticated',
  BOB,
  `insert into public.user_roles (user_id, role) values ('${BOB}', 'admin')`
);

await expectDenied(
  "Bob, Alice'in üyeliğini değiştiremez",
  'authenticated',
  BOB,
  `update public.memberships set status = 'active' where user_id = '${ALICE}'`
);

await expectDenied(
  "Bob, Alice'in fotoğrafını silemez",
  'authenticated',
  BOB,
  `delete from public.astro_photos where id = '${ALICE_PHOTO}'`
);

/* ── SAYAÇ TABLOSU TAMAMEN KAPALI ──────────────────────────────────
 * `edge_rate_limits` RLS açık ve HİÇ politikası yok: yalnızca
 * service_role'ün çağırdığı SECURITY DEFINER fonksiyon yazıyor.
 * Okunabilir olsaydı, oran limitine ne kadar kaldığını görmek onu
 * atlatmayı planlamayı kolaylaştırırdı. */

await expectCount(
  'anon oran limiti sayacını GÖREMEZ',
  'anon',
  null,
  `select count(*) from public.edge_rate_limits;`,
  0
);

await expectCount(
  'oturum açmış kullanıcı da sayacı GÖREMEZ',
  'authenticated',
  BOB,
  `select count(*) from public.edge_rate_limits;`,
  0
);

/* ── Temizlik ─────────────────────────────────────────────────────── */
await sql(`
  delete from public.astro_photos where user_id in ('${ALICE}','${BOB}');
  delete from public.memberships where user_id in ('${ALICE}','${BOB}');
  delete from auth.users where email like '%@rls.test';
`);

/* ── Rapor ─────────────────────────────────────────────────────────── */
const failed = results.filter((r) => !r.passed);

for (const result of results) {
  console.log(`  ${result.passed ? '✓' : '✗'} ${result.name}${result.passed ? '' : ` — ${result.detail}`}`);
}

console.log(
  `\nRLS matrisi · ${results.length - failed.length}/${results.length} geçti`
);

if (failed.length > 0) process.exit(1);

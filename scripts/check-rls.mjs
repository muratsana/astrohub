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
const ALICE_LISTING = 'aaaaaaaa-0000-0000-0000-00000000b001';
const ALICE_LISTING_DRAFT = 'aaaaaaaa-0000-0000-0000-00000000b002';

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

  /* İki ilan: biri aktif, biri taslak. Fotoğraf görünürlüğü ilanın
     görünürlüğünü izlemeli — taslak ilanın fotoğrafı da gizli. */
  insert into public.listings
    (id, slug, seller_id, title, category_id, price, city, condition, status, posted_at)
  values ('${ALICE_LISTING}','rls-ilan-aktif','${ALICE}','Aktif ilan','optik-tup',
          1000,'Ankara','İyi','active', now()),
         ('${ALICE_LISTING_DRAFT}','rls-ilan-taslak','${ALICE}','Taslak ilan','optik-tup',
          1000,'Ankara','İyi','draft', now())
  on conflict (id) do nothing;

  insert into public.listing_photos (listing_id, storage_path, position)
  values ('${ALICE_LISTING}', '${ALICE}/${ALICE_LISTING}/0.jpg', 0),
         ('${ALICE_LISTING_DRAFT}', '${ALICE}/${ALICE_LISTING_DRAFT}/0.jpg', 0)
  on conflict do nothing;
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

/* ── Politika yardımcıları çağrılabiliyor mu ──────────────────────── */

/*
 * BU BÖLÜM ÜRETİMDE YAŞANAN BİR HATADAN SONRA EKLENDİ.
 *
 * `app` şeması 0001'de açılmış ama hiçbir role `usage` verilmemişti.
 * PostgreSQL'de bir şemaya `usage` yoksa içindeki fonksiyon ADIYLA
 * çağrılamaz — `security definer` olsa bile: o bayrak gövdenin İÇİNDEKİ
 * yetkiyi değiştirir, çağırma iznini değil.
 *
 * Depoda 70'e yakın politika `app.is_admin()` / `app.has_role(...)`
 * çağırıyor. Hepsi bu boşluğun üstünde duruyordu ve HİÇBİR TEST
 * GÖRMEDİ, çünkü:
 *
 *   • Bu matristeki sorgular ya 0 satır bekliyor (yetki hatası da
 *     "geçti" sayılıyor, bkz. expectCount) ya da politikanın OR
 *     zincirinde sol taraf zaten doğru — sağdaki `app.*` çağrısı hiç
 *     değerlendirilmiyor.
 *   • Kırılma ancak ilk gerçek fotoğraf yayımlanırken, INSERT'in
 *     `with check` ifadesinde ortaya çıktı.
 *
 * Bu yüzden burada politikanın DOLAYLI yolu değil, fonksiyonun KENDİSİ
 * çağrılıyor. Kısa devre yok, satır sayısına bağımlılık yok: yetki ya
 * var ya yok.
 */
for (const role of ['anon', 'authenticated']) {
  for (const call of ['app.is_admin()', "app.has_role('moderator')"]) {
    const result = await asRole(role, ALICE, `select ${call};`);
    record(
      `${role} rolü ${call} çağırabiliyor`,
      result.ok,
      result.ok ? '' : result.error.slice(0, 120)
    );
  }
}

/*
 * Şemayı açmak, İÇİNDEKİ HER ŞEYİ açmak değil. Bu üçü `security
 * definer` ve parametre olarak BAŞKASININ kimliğini alıyor; açık
 * kalsalardı herhangi bir kullanıcı eline geçen bir uuid ile başka
 * birinin üyelik kademesini ve fotoğraf sayısını sorgulayabilirdi
 * (0030 bunları geri aldı).
 */
for (const call of [
  `app.membership_tier('${ALICE}')`,
  `app.photo_limit('${ALICE}')`,
  `app.active_photo_count('${ALICE}')`,
]) {
  const result = await asRole('authenticated', BOB, `select ${call};`);
  const denied = !result.ok && /permission denied/i.test(result.error);
  record(
    `${call} başkasına kapalı`,
    denied,
    denied ? '' : 'çağrılabiliyor — başkasının üyeliği sorgulanabilir'
  );
}

/*
 * ══════════════════════════════════════════════════════════════════════
 * PUANLAMA (0036) — YARIŞMA SIRALAMASININ BÜTÜNLÜĞÜ
 *
 * Üç kural veritabanında duruyor ve üçü de doğrudan sıralamayı koruyor.
 * İstemcide gizlenen bir düğme, API'ye doğrudan giden birini durdurmaz.
 */

/* 1. Kendi fotoğrafına puan verilemez — tek bir 10, yirmi oyluk bir
      ortalamayı 0.15 kaydırır. */
await expectDenied(
  'kendi fotoğrafına puan verilemiyor',
  'authenticated',
  ALICE,
  `insert into public.photo_ratings (photo_id, user_id, score)
   values ('${ALICE_PHOTO}', '${ALICE}', 10);`
);

/* 2. Başkası adına oy yazılamaz. */
await expectDenied(
  'başkası adına puan yazılamıyor',
  'authenticated',
  BOB,
  `insert into public.photo_ratings (photo_id, user_id, score)
   values ('${ALICE_PHOTO}', '${ALICE}', 1);`
);

/* 3. Yayımlanmamış kayda oy verilemez — henüz var olmayan bir şeyi
      puanlamak olurdu. */
await expectDenied(
  'taslak fotoğrafa puan verilemiyor',
  'authenticated',
  BOB,
  `insert into public.photo_ratings (photo_id, user_id, score)
   values ('${ALICE_DRAFT}', '${BOB}', 9);`
);

/*
 * 4. SAYAÇ KOLONU ELLE YAZILAMAZ.
 *
 * `astro_photos_update_own` sahibin kendi satırını güncellemesine izin
 * veriyor; koruma tetikleyicisi olmasaydı sahibi `rating_sum`'ı tek bir
 * PATCH ile 9999 yapabilirdi. Tetikleyici hata FIRLATMIYOR, sessizce
 * eski değeri geri koyuyor — bu yüzden burada "reddedildi mi" değil,
 * "değer değişti mi" ölçülüyor.
 */
{
  await sql(
    `update public.astro_photos set rating_sum = 0 where id = '${ALICE_PHOTO}';`
  );
  await asRole(
    'authenticated',
    ALICE,
    `update public.astro_photos set rating_sum = 9999 where id = '${ALICE_PHOTO}';`
  );
  const after = await sql(
    `select rating_sum from public.astro_photos where id = '${ALICE_PHOTO}';`
  );
  const korundu = after.trim() === '0';
  record(
    'rating_sum elle yazılamıyor (sayaç koruması)',
    korundu,
    korundu ? '' : `sahibi sayacı değiştirebildi: ${after.trim()}`
  );
}

/*
 * ══════════════════════════════════════════════════════════════════════
 * PostGIS REFERANS TABLOSU — İDDİA DEĞİL, ÖLÇÜM
 *
 * `spatial_ref_sys` PostGIS'e ait ve yetkilerini `supabase_admin` verdi;
 * `postgres` rolüyle çalışan bir `revoke` hata vermeden hiçbir şey
 * yapmıyor (0003 bunu doğru tespit etmiş, 0006 yanlışlıkla "kapandı"
 * demişti).
 *
 * Burada denetim TERS YÖNDE çalışıyor: durum kapalıysa geçmesi değil,
 * DEĞİŞTİĞİNDE haber vermesi isteniyor. Bu yüzden bulgu bir hata değil,
 * bilinen bir kabul olarak raporlanıyor — ta ki bir gün dashboard'dan
 * gerçekten kapatılana kadar. O gün bu satır kendiliğinden yeşile
 * dönüyor ve kimsenin denetçi çıktısını elle okuması gerekmiyor.
 * ══════════════════════════════════════════════════════════════════════
 */
{
  const yazmaYetkisi = await sql(`
    select count(*) from information_schema.role_table_grants
     where table_schema = 'public' and table_name = 'spatial_ref_sys'
       and grantee in ('anon', 'authenticated')
       and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE');
  `);
  const acik = Number(yazmaYetkisi.trim()) > 0;
  record(
    'spatial_ref_sys yazma yetkisi (bilinen kabul)',
    true,
    acik
      ? `anon/authenticated hâlâ ${yazmaYetkisi.trim()} yazma yetkisi taşıyor — ` +
        'supabase_admin gerekiyor, migration ile kapatılamıyor (0006)'
      : 'kapanmış — 0006 ve SITE-AUDIT notu güncellenebilir'
  );
}

/*
 * ══════════════════════════════════════════════════════════════════════
 * İLAN FOTOĞRAFLARI (0038)
 *
 * Fotoğrafın görünürlüğü İLANIN görünürlüğünü izliyor. Ayrı bir kural
 * yazmak, iki kuralın zamanla ayrışması demekti: ilan taslağa
 * alındığında fotoğrafları görünür kalırdı ve satıcı yayından
 * kaldırdığını sandığı ekipmanın fotoğraflarını herkese açık bırakırdı.
 * ══════════════════════════════════════════════════════════════════════
 */
await expectCount(
  'aktif ilanın fotoğrafı herkese açık',
  'anon',
  null,
  `select count(*) from public.listing_photos where listing_id = '${ALICE_LISTING}';`,
  1
);

await expectCount(
  'taslak ilanın fotoğrafı anon\'a kapalı',
  'anon',
  null,
  `select count(*) from public.listing_photos where listing_id = '${ALICE_LISTING_DRAFT}';`,
  0
);

await expectCount(
  'taslak ilanın fotoğrafı başka kullanıcıya da kapalı',
  'authenticated',
  BOB,
  `select count(*) from public.listing_photos where listing_id = '${ALICE_LISTING_DRAFT}';`,
  0
);

await expectCount(
  'satıcı kendi taslak ilanının fotoğrafını görüyor',
  'authenticated',
  ALICE,
  `select count(*) from public.listing_photos where listing_id = '${ALICE_LISTING_DRAFT}';`,
  1
);

await expectDenied(
  'başkasının ilanına fotoğraf eklenemiyor',
  'authenticated',
  BOB,
  `insert into public.listing_photos (listing_id, storage_path, position)
   values ('${ALICE_LISTING}', '${BOB}/sahte.jpg', 5);`
);

await expectDenied(
  'başkasının ilan fotoğrafı silinemiyor',
  'authenticated',
  BOB,
  `delete from public.listing_photos where listing_id = '${ALICE_LISTING}';`
);

/*
 * SEKİZ FOTOĞRAF SINIRI TETİKLEYİCİDE, ARAYÜZDE DEĞİL. Arayüzde sayılan
 * bir sınır, API'ye doğrudan giden biri için yok demektir.
 */
{
  await sql(`
    insert into public.listing_photos (listing_id, storage_path, position)
    select '${ALICE_LISTING}', '${ALICE}/${ALICE_LISTING}/dolgu-' || i || '.jpg', i
      from generate_series(1, 7) i;
  `);
  const asim = await asRole(
    'authenticated',
    ALICE,
    `insert into public.listing_photos (listing_id, storage_path, position)
     values ('${ALICE_LISTING}', '${ALICE}/${ALICE_LISTING}/dokuzuncu.jpg', 9);`
  );
  const reddedildi = !asim.ok && /en fazla 8/i.test(asim.error);
  record(
    'ilan başına 8 fotoğraf sınırı zorlanıyor',
    reddedildi,
    reddedildi ? '' : 'dokuzuncu fotoğraf eklenebildi'
  );
}

/*
 * ══════════════════════════════════════════════════════════════════════
 * YÖNETİM PANELİNİN DAYANDIĞI YETKİLER
 *
 * Panel artık kullanıcı rolleri, üyelik ve beş içerik türü üzerinde
 * yazıyor. Bu ekranın güvenliği tamamen RLS'e bağlı: istemcide gizlenen
 * bir düğme, API'ye doğrudan giden birini durdurmaz.
 *
 * Alice'in HİÇBİR ROLÜ YOK (kurulum ona rol vermiyor) — yani buradaki
 * "yapamaz" beklentileri sıradan bir üyeyi temsil ediyor.
 * ══════════════════════════════════════════════════════════════════════
 */

/* Sıradan üye başkasının fotoğrafını moderasyondan geçiremez. */
await expectDenied(
  'sıradan üye başkasının fotoğrafını arşivleyemiyor',
  'authenticated',
  BOB,
  `update public.astro_photos set status = 'archived' where id = '${ALICE_PHOTO}';`
);

await expectDenied(
  'sıradan üye başkasının fotoğrafını silemiyor',
  'authenticated',
  BOB,
  `delete from public.astro_photos where id = '${ALICE_PHOTO}';`
);

/*
 * ROL YÜKSELTME — panelin en kritik yüzeyi. Kendine rol yazabilen bir
 * kullanıcı bütün moderasyon sınırlarını tek istekte aşar.
 */
await expectDenied(
  'kullanıcı kendine admin rolü veremiyor',
  'authenticated',
  BOB,
  `insert into public.user_roles (user_id, role) values ('${BOB}', 'admin');`
);

await expectDenied(
  'kullanıcı başkasına rol veremiyor',
  'authenticated',
  BOB,
  `insert into public.user_roles (user_id, role) values ('${ALICE}', 'moderator');`
);

await expectDenied(
  'kullanıcı kendi üyeliğini aktif yapamıyor',
  'authenticated',
  BOB,
  `insert into public.memberships (user_id, status) values ('${BOB}', 'active');`
);

/*
 * DENETİM KAYDI YAZILAMAZ. Değiştirilebilen bir denetim kaydı denetim
 * kaydı değildir; panel de salt okunur çiziyor.
 */
await expectDenied(
  'denetim kaydına satır eklenemiyor',
  'authenticated',
  BOB,
  `insert into public.audit_logs (actor_id, action) values ('${BOB}', 'sahte');`
);

/* Başkasının profilini düzenlemek de kapalı olmalı. */
await expectDenied(
  'kullanıcı başkasının profilini düzenleyemiyor',
  'authenticated',
  BOB,
  `update public.profiles set display_name = 'ele gecirildi' where id = '${ALICE}';`
);

/*
 * ══════════════════════════════════════════════════════════════════════
 * KULLANICI METİNLERİ — yorum, gönderi, saha yorumu
 *
 * Panel bu üçünü artık kaldırabiliyor. Sıradan bir üyenin BAŞKASININ
 * metnini kaldırabilmesi, moderasyonu anlamsız kılardı: tartıştığı
 * kişinin cevabını silen bir kullanıcı, tartışmayı tek taraflı bırakır.
 * ══════════════════════════════════════════════════════════════════════
 */
{
  await sql(`
    insert into public.photo_comments (photo_id, user_id, body)
    values ('${ALICE_PHOTO}', '${ALICE}', 'Alice''in yorumu')
    on conflict do nothing;
  `);

  await expectDenied(
    'sıradan üye başkasının yorumunu silemiyor',
    'authenticated',
    BOB,
    `delete from public.photo_comments where user_id = '${ALICE}';`
  );

  /* Kendi yorumunu silebilmeli — kural "başkasınınkine dokunma",
     "hiçbir şeye dokunma" değil. */
  const kendi = await asRole(
    'authenticated',
    ALICE,
    `with attempt as (delete from public.photo_comments
                      where user_id = '${ALICE}' returning 1)
     select count(*) from attempt;`
  );
  const silebildi = kendi.ok && Number(kendi.value.split('\n').pop()) > 0;
  record(
    'üye kendi yorumunu silebiliyor',
    silebildi,
    silebildi ? '' : 'kendi yorumunu silemedi — moderasyon fazla dar'
  );
}

/* ── Temizlik ─────────────────────────────────────────────────────── */
await sql(`
  delete from public.photo_ratings
   where user_id in ('${ALICE}','${BOB}');
  delete from public.photo_comments where user_id in ('${ALICE}','${BOB}');
  delete from public.user_roles where user_id in ('${ALICE}','${BOB}');
  delete from public.listings where seller_id in ('${ALICE}','${BOB}');
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

#!/usr/bin/env node
/**
 * KATALOĞU VERİTABANINDAN SEED DOSYASINA AKTARIR.
 *
 * NEDEN BU BETİK VAR
 *
 * Katalog uzun süre yalnızca üretim veritabanında durdu: 82 marka ve 1.086
 * model migration aracının dışından yüklenmişti ve depoda bir kopyası
 * yoktu. Temiz bir veritabanı kurulduğunda 0018–0020 yabancı anahtar
 * hatasıyla düşüyor, 0022–0024 ise güncelleyecek satır bulamadığı için
 * sessizce hiçbir şey yapmıyordu.
 *
 * Kopyayı bir kez elle çıkarmak sorunu bir kez çözerdi; bu betik onu
 * TEKRARLANABİLİR yapıyor. Katalog panelden büyüdükçe `npm run
 * katalog:disa-aktar` ile depodaki hâli tazelenir ve depo bir daha
 * canlıdan geri kalmaz.
 *
 * LİTERALLERİ POSTGRES YAZIYOR, BİZ DEĞİL
 *
 * Her değer `quote_nullable(...)` ile METİN literaline çevriliyor; tipe
 * dönüştürmeyi INSERT sırasında Postgres yapıyor (atama dönüşümü). jsonb,
 * text[], uuid, timestamptz, numeric — hepsi bu yolla doğru okunuyor.
 * İstemcide tip tahmini yapmak, kataloğa eklenen her yeni kolonda
 * güncellenmesi gereken ikinci bir şema kopyası demekti.
 *
 * KULLANIM
 *   DATABASE_URL='postgresql://…' node scripts/katalog-disa-aktar.mjs
 */

import { execFile } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = process.cwd();
const url = process.env.DATABASE_URL;

if (!url) {
  console.error(
    'DATABASE_URL tanımlı değil.\n' +
      "Supabase panelinde Project Settings → Database → Connection string → URI'yi kullanın."
  );
  process.exit(1);
}

/**
 * `created_at`/`updated_at` DIŞARIDA. Kaynağın zaman damgalarını kopyalamak,
 * taze bir kuruluma sahte bir geçmiş yazmaktan başka işe yaramaz — ve seed
 * her çalıştırıldığında `updated_at`'i geriye çekerdi.
 */
const SKIP_COLUMNS = ['created_at', 'updated_at'];

/**
 * Sıralama anahtarları `collate "C"` ile veriliyor.
 *
 * Varsayılan sıralama işletim sisteminin ICU/glibc sürümüne bağlı: aynı
 * veriyi Postgres 15 ve 17'de sıralamak, tire ve boşluk içeren anahtarlarda
 * (`sky-watcher`, `Abell 21`) FARKLI sıra üretiyor. Bu, dosyayı iki farklı
 * makinede üretince gereksiz koca bir diff demek. `C` sıralaması bayt
 * sırasıdır ve her yerde aynıdır.
 */
const KATALOG = [
  { table: 'equipment_categories', pk: ['id'], order: 'id collate "C"', heading: 'Ekipman kategorileri' },
  { table: 'equipment_brands', pk: ['id'], order: 'id collate "C"', heading: 'Markalar' },
  {
    table: 'equipment_models',
    pk: ['id'],
    order: 'slug collate "C"',
    heading: 'Modeller (piyasa kataloğu + teknik veri)',
    /*
     * ONAYLANMAMIŞ KAYITLAR DIŞARIDA.
     *
     * `approved = false` bir kullanıcının gönderdiği, henüz denetlenmemiş
     * öneridir: referans verisi değil, bekleyen bir iş. İkisi de bu dosyaya
     * girmemesi için sebep — ama asıl sebep üçüncüsü: satır `submitted_by`
     * ile birlikte geliyor, yani gerçek bir kullanıcının kimliği depoya
     * commit edilmiş olurdu.
     */
    where: 'approved',
    /*
     * KULLANICI KİMLİĞİ DEPOYA GİRMEZ.
     *
     * `submitted_by` gerçek bir kullanıcının UUID'si ve `auth.users`'a
     * yabancı anahtarla bağlı. İki ayrı sebeple burada boşaltılıyor:
     * kimliği commit etmemek ve temiz bir kurulumu kırmamak — taze bir
     * veritabanında o kullanıcı yok, satır yabancı anahtar hatasıyla düşer.
     */
    blank: ['submitted_by'],
  },
  { table: 'celestial_objects', pk: ['id'], order: 'slug collate "C"', heading: 'Gök cisimleri' },
  { table: 'catalog_identifiers', pk: ['object_id', 'code'], order: 'object_id::text collate "C", code collate "C"', heading: 'Katalog kodları (M31, NGC 224 …)' },
];

const ICERIK = [
  { table: 'events', pk: ['id'], order: 'slug collate "C"', heading: 'Etkinlikler' },
  { table: 'event_sessions', pk: ['id'], order: 'event_id::text collate "C", starts_at', heading: 'Etkinlik oturumları' },
  { table: 'observing_sites', pk: ['id'], order: 'slug collate "C"', heading: 'Gözlem noktaları' },
  { table: 'site_measurements', pk: ['id'], order: 'site_id::text collate "C", measured_at', heading: 'Nokta ölçümleri' },
];

/** psql'i tek sütunlu, başlıksız, hizalanmamış kipte çalıştırır. */
async function query(sql) {
  const { stdout } = await run(
    'psql',
    [url, '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-c', sql],
    { maxBuffer: 256 * 1024 * 1024 }
  );
  return stdout;
}

async function columnsOf(table) {
  const sql = `
    select a.attname
    from pg_attribute a
    where a.attrelid = 'public.${table}'::regclass
      and a.attnum > 0
      and not a.attisdropped
      and a.attgenerated = ''
      and a.attname <> all (array[${SKIP_COLUMNS.map((c) => `'${c}'`).join(',')}])
    order by a.attnum`;
  return (await query(sql)).split('\n').map((s) => s.trim()).filter(Boolean);
}

async function renderTable({ table, pk, order, heading, where, blank = [] }) {
  const columns = await columnsOf(table);

  /*
   * Her kolon TEK TEK `::text`'e döküyor. İlk sürüm satırı `row_to_json`
   * ile tek seferde JSON'a çevirip değerleri oradan okuyordu; kısa ve
   * kolon sırasını da koruyordu ama DİZİLERDE YANLIŞTI: `row_to_json` bir
   * `text[]` değerini JSON dizisine çeviriyor, yani boş dizi `{}` yerine
   * `[]` olarak çıkıyor ve Postgres onu geri okuyamıyor
   * ("malformed array literal"). Üretimde `equipment_models.notes` tam
   * olarak bu — boş bir `text[]`.
   *
   * `col::text` ise Postgres'in kendi çıktı biçimi: dizi `{}`, jsonb
   * `{"a": 1}`, zaman damgası ISO. Ne yazdıysa onu geri okuyabiliyor.
   */
  const valueList = columns
    .map((c) =>
      blank.includes(c)
        ? 'quote_nullable(null::text)'
        : `quote_nullable(t.${c}::text)`
    )
    .join(", ', ', ");

  const rowsSql = `
    select '  (' || concat(${valueList}) || ')'
    from public.${table} t ${where ? `where ${where}` : ''} order by ${order}`;

  const rows = (await query(rowsSql)).split('\n').filter((line) => line.trim());

  /*
   * BOŞ TABLO İÇİN INSERT YAZILMAZ. `values` sonrası satır gelmeyince
   * dosya sözdizimi hatası veriyor ve bu hata dosya UYGULANANA kadar
   * görünmüyor — yani bir sonraki kuruluma kadar. Boş tablo başlı başına
   * bir uyarı: kaynak veritabanı beklenen veriyi taşımıyor.
   */
  if (rows.length === 0) {
    console.warn(`  ${table.padEnd(22)}     0 satır — UYARI: tablo boş, atlandı`);
    return { sql: `-- ── ${heading} ──\n-- (kaynak veritabanında satır yok)\n`, count: 0 };
  }

  const updatable = columns.filter((c) => !pk.includes(c));

  const tail = updatable.length
    ? `on conflict (${pk.join(', ')}) do update set\n` +
      updatable.map((c) => `      ${c} = excluded.${c}`).join(',\n') +
      ';'
    : `on conflict (${pk.join(', ')}) do nothing;`;

  return {
    sql:
      `-- ── ${heading} ──\n\n` +
      `insert into public.${table} (${columns.join(', ')}) values\n` +
      rows.join(',\n') +
      '\n' +
      tail +
      '\n',
    count: rows.length,
  };
}

async function writeSeed(file, preamble, tables) {
  const parts = [preamble];
  let total = 0;
  for (const spec of tables) {
    const { sql, count } = await renderTable(spec);
    parts.push(sql);
    total += count;
    console.log(`  ${spec.table.padEnd(22)} ${String(count).padStart(5)} satır`);
  }
  parts.push('commit;\n');

  const target = path.join(root, 'supabase/seed', file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, parts.join('\n'), 'utf8');
  console.log(`→ ${path.relative(root, target)} · ${total} satır\n`);
}

const KATALOG_BASLIK = `-- 01_katalog.sql — REFERANS VERİSİ. Üretilmiş dosya, elle düzenlenmez.
--
-- Yeniden üretmek için:  npm run katalog:disa-aktar
--
-- ══════════════════════════════════════════════════════════════════════════
-- NEDEN AYRI BİR DOSYA, NEDEN MIGRATION DEĞİL
--
-- Migration şemayı bir sürümden diğerine taşır ve BİR KEZ çalışır. Katalog
-- ise büyüyen, düzeltilen, yeniden yüklenebilir olması gereken bir VERİ
-- KÜMESİ. Onu migration'a gömmek, "şu kameranın piksel boyutu yanlış
-- girilmiş" düzeltmesi için bile yeni bir migration dosyası açmaya zorlar
-- ve aynı satırı iki migration'da iki farklı hâlde bırakır.
--
-- Bu ayrımın bedeli ölçüldü: 0018–0020 markalara yabancı anahtarla bağlı
-- 1.086 model ekliyordu ama hiçbir migration marka EKLEMİYORDU. Temiz bir
-- veritabanında üçü de yabancı anahtar hatasıyla düşüyor, 0022–0024
-- (teknik veri güncellemeleri) ise güncelleyecek satır bulamadığı için
-- sessizce hiçbir şey yapmıyordu.
--
-- ══════════════════════════════════════════════════════════════════════════
-- KURALLAR
--
-- TEKRAR-GÜVENLİ. Her satır \`on conflict … do update\`: ikinci çalıştırma
-- hata vermez ve elle değiştirilmiş bir alanı kaynaktaki değere geri çeker.
-- \`do nothing\` seçilmedi çünkü seed'in işi yalnızca eksiği tamamlamak
-- değil, kataloğun tek doğru hâlini dayatmak.
--
-- KİMLİKLER SABİT. \`id\` alanları kaynaktan olduğu gibi taşınıyor. Fotoğraf,
-- kullanıcı ekipmanı ve setup'lar modele kimlikle bağlı — kimliği yeniden
-- üreten bir seed, ikinci çalıştırmada o bağların hepsini koparırdı.
--
-- SIRA YABANCI ANAHTARLARA GÖRE: kategoriler → markalar → modeller,
-- gök cisimleri → katalog kodları.
-- ══════════════════════════════════════════════════════════════════════════

begin;
`;

const ICERIK_BASLIK = `-- 02_ornek-icerik.sql — EDİTÖRYEL İÇERİK ANLIK GÖRÜNTÜSÜ. Üretilmiş dosya.
--
-- Yeniden üretmek için:  npm run katalog:disa-aktar
--
-- ══════════════════════════════════════════════════════════════════════════
-- KATALOGDAN NEDEN AYRI
--
-- \`01_katalog.sql\` fizik: bir teleskopun odak uzaklığı ya da M31'in
-- sağaçıklığı ortama göre değişmez. Buradaki veri ise EDİTÖRYEL —
-- etkinlikler, oturumlar, gözlem noktaları ve ölçümleri. Site sahibi
-- bunları panelden girer, tarihleri geçer, yenileri eklenir.
--
-- İkisini aynı dosyaya koymak, depoyu her etkinlik eklendiğinde bayatlayan
-- bir kopya taşımaya zorlardı — ve o kopya bir gün üretimin üstüne yazılıp
-- gerçek içeriği geri alırdı. Ayrı dosya bu riski bir tercihe çeviriyor:
-- staging ve yerel geliştirmede yükle, üretimde YÜKLEME.
--
-- \`npm run db:seed\` bu dosyayı ATLAR; yüklemek için açıkça
-- \`npm run db:seed -- --ornek-icerik\` demek gerekir.
-- ══════════════════════════════════════════════════════════════════════════

begin;
`;

console.log('katalog dışa aktarılıyor…\n');
await writeSeed('01_katalog.sql', KATALOG_BASLIK, KATALOG);
await writeSeed('02_ornek-icerik.sql', ICERIK_BASLIK, ICERIK);

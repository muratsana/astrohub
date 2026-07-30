#!/usr/bin/env node
/**
 * SEED DOSYALARINI BİR VERİTABANINA UYGULAR.
 *
 * Bu betik eskiden `src/features/*​/data.ts` içindeki demo dizilerinden SQL
 * ÜRETİYORDU ve ürettiği dosyayı hiçbir şey UYGULAMIYORDU. İki sorun
 * birden vardı:
 *
 *   · Üretilen dosya kataloğun demo alt kümesiydi (43 marka, 129 model);
 *     üretimde ise 82 marka ve 1.086 model var. Aynı tablolara
 *     `on conflict do update` ile yazdığı için canlıya uygulansa 129
 *     modeli demo değerlerine geri çekerdi.
 *   · Kimse uygulamadığı için depo, kurulabilir bir veritabanı tarif
 *     etmiyordu.
 *
 * Artık kataloğun tek kaynağı veritabanının kendisi: `katalog-disa-aktar`
 * onu seed dosyasına yazar, bu betik de bir veritabanına uygular.
 * `data.ts` dizileri işlerini sürdürüyor — Supabase yapılandırılmadığında
 * uygulamanın çevrimdışı gösterdiği içerik onlar.
 *
 * KULLANIM
 *   DATABASE_URL='postgresql://…' node scripts/seed.mjs
 *   DATABASE_URL='postgresql://…' node scripts/seed.mjs --ornek-icerik
 */

import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
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

/*
 * Editöryel anlık görüntü VARSAYILAN OLARAK UYGULANMAZ. Etkinlik ve gözlem
 * noktası verisi site sahibinin panelden girdiği içerik; depodaki kopya
 * yüklendiği anda bayat. Yanlışlıkla üretime uygulanması, gerçek içeriği
 * bir anlık görüntüyle geri almak olurdu — bu yüzden açıkça istenmeli.
 */
const files = ['01_katalog.sql'];
if (process.argv.includes('--ornek-icerik')) files.push('02_ornek-icerik.sql');

for (const file of files) {
  const target = path.join(root, 'supabase/seed', file);
  try {
    await access(target);
  } catch {
    console.error(`bulunamadı: ${path.relative(root, target)}`);
    process.exit(1);
  }

  process.stdout.write(`${file} uygulanıyor… `);
  try {
    /*
     * `ON_ERROR_STOP=1` şart: onsuz psql hatalı ifadeyi atlayıp devam eder
     * ve yarım yüklenmiş bir katalogla "başarılı" çıkış kodu döner. Dosyalar
     * kendi `begin`/`commit`'lerini taşıyor; hata hâlinde işlem geri alınır.
     */
    await run('psql', [url, '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-f', target], {
      maxBuffer: 256 * 1024 * 1024,
    });
    console.log('tamam');
  } catch (cause) {
    console.log('BAŞARISIZ');
    console.error(cause.stderr || cause.message);
    process.exit(1);
  }
}

console.log(
  files.length === 1
    ? '\nKatalog uygulandı. Editöryel örnek içerik için: --ornek-icerik'
    : '\nKatalog ve örnek içerik uygulandı.'
);

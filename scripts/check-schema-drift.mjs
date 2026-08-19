#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════
 * ŞEMA KAYMASI KAPISI — kodun istediği alan migration'da var mı?
 * ═══════════════════════════════════════════════════════════════════════
 *
 * NEDEN VAR
 *
 * Bir kolon koda girdi, migration yazıldı, ama migration prod'a
 * UYGULANMADI. Sonuç canlıda yaşandı: yükleme "Could not find the
 * 'thumb_crop' column of 'astro_photos' in the schema cache" ile kırıldı,
 * galeri "bağlantı kurulamadı" dedi. Kod ile veritabanı arasındaki bu
 * boşluk derleme zamanında GÖRÜNMÜYOR — TypeScript Postgres'i bilmiyor.
 *
 * Bu kapı boşluğun BİR YARISINI kapatıyor ve veritabanı bağlantısı
 * istemiyor: kodun okuduğu/yazdığı her alanın depodaki migration'larda
 * TANIMLI olduğunu doğruluyor. Yani "migration yazmayı unuttum" hatası
 * CI'da düşüyor.
 *
 * Diğer yarısı — "yazdım ama uygulamadım" — yalnızca canlı şema
 * sorgulanarak görülebiliyor; onun için `npm run db:migrations` ile
 * uygulanan sürümler listeleniyor. Dağıtım kontrol listesi bu ikisini
 * birlikte istiyor.
 *
 * NASIL ÖLÇÜYOR
 *
 * Kaynaktaki `SELECT` dizeleri ve `.update({...})`/`.insert({...})`
 * yükleri değil — bakımı kırılgan olurdu. Bunun yerine BİLİNEN kritik
 * alanların listesi burada duruyor; her biri için hem kodda kullanıldığı
 * hem migration'larda tanımlandığı doğrulanıyor. Yeni bir alan eklerken
 * listeye bir satır eklemek, o alanın migration'ının unutulmamasını
 * garanti ediyor.
 *
 * Kullanım: node scripts/check-schema-drift.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const MIGRATIONS = 'supabase/migrations';
const SRC = 'src';

/**
 * Kodun veritabanından beklediği alanlar.
 *
 * `kod`: kaynakta bu dizeyi arayıp alanın gerçekten kullanıldığını
 * doğruluyoruz (ölü bir kayıt listeyi şişirmesin).
 * `migration`: migration'larda bu dizeyi arıyoruz.
 */
const BEKLENEN = [
  {
    ad: 'astro_photos.thumb_crop',
    kod: 'thumb_crop',
    migration: /alter table public\.astro_photos[\s\S]*?thumb_crop/i,
  },
  {
    ad: 'photo_capture_sessions tablosu',
    kod: 'photo_capture_sessions',
    migration: /create table if not exists public\.photo_capture_sessions/i,
  },
  {
    ad: 'photo_exposures.session_id',
    kod: 'session_id',
    migration: /alter table public\.photo_exposures[\s\S]*?session_id/i,
  },
  {
    ad: 'download_events tablosu',
    kod: 'download_events',
    migration: /create table if not exists public\.download_events/i,
  },
  {
    ad: 'asset_derivatives tablosu',
    kod: 'asset_derivatives',
    migration: /create table if not exists public\.asset_derivatives/i,
  },
  {
    ad: 'equipment_models.canonical_model_id',
    kod: 'canonical_model_id',
    migration: /alter table public\.equipment_models[\s\S]*?canonical_model_id/i,
  },
  {
    ad: 'equipment_merge_log tablosu',
    kod: 'equipment_merge_log',
    migration: /create table if not exists public\.equipment_merge_log/i,
  },
];

function dosyalariTopla(kok, uzantilar) {
  const cikti = [];
  for (const giris of readdirSync(kok, { withFileTypes: true })) {
    const tam = path.join(kok, giris.name);
    if (giris.isDirectory()) cikti.push(...dosyalariTopla(tam, uzantilar));
    else if (uzantilar.some((u) => giris.name.endsWith(u))) cikti.push(tam);
  }
  return cikti;
}

const migrationMetni = dosyalariTopla(MIGRATIONS, ['.sql'])
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');

const kodMetni = dosyalariTopla(SRC, ['.ts', '.tsx'])
  .filter((f) => !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'))
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');

const hatalar = [];
const satirlar = [];

for (const alan of BEKLENEN) {
  const kodda = kodMetni.includes(alan.kod);
  const migrationda = alan.migration.test(migrationMetni);

  satirlar.push(
    `${alan.ad.padEnd(34)} kod ${kodda ? '✓' : '—'}  migration ${migrationda ? '✓' : '✗'}`
  );

  if (kodda && !migrationda) {
    hatalar.push(
      `${alan.ad}: kod bu alanı kullanıyor ama ${MIGRATIONS} altında tanımı yok. ` +
        'Migration yazılmadan dağıtım canlıyı kırar.'
    );
  }
}

console.log(satirlar.join('\n'));
console.log('');

if (hatalar.length) {
  console.error(`Şema kayması kapısı DÜŞTÜ · ${hatalar.length} bulgu:`);
  for (const h of hatalar) console.error(`  ✗ ${h}`);
  process.exit(1);
}

console.log(
  `Şema kayması kapısı geçildi · ${BEKLENEN.length} alan kod ve migration'da hizalı.\n` +
    'Hatırlatma: migration yazmak yetmez — dağıtımdan önce `npm run db:push` ile uygulanmalı.'
);

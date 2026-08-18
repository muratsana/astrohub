#!/usr/bin/env node
/**
 * PATCH TAKİP TABLOSU GÜNCELLEYİCİ.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN BİR BETİK
 *
 * 18 Ağustos yama paketi iki dosyayı birden "canlı doğruluk kaynağı"
 * ilan ediyor: `IMPLEMENTATION_PROGRESS.md` (insan okuyor) ve
 * `PROGRESS_TRACKER.csv` (tablo aracı okuyor). 91 madde × iki dosya ×
 * her durum değişimi, elle düzenlendiğinde kaçınılmaz olarak ayrışır —
 * ve ayrıştıkları anda ikisi de doğruluk kaynağı olmaktan çıkar.
 *
 * Tek giriş noktası bunu yapısal olarak imkânsız kılıyor: durum bir
 * yerde değişiyor, iki dosyaya birden yazılıyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * VERIFIED KENDİLİĞİNDEN YAZILMAZ
 *
 * Yama paketi açıkça yazıyor: `VERIFIED` yalnızca kullanıcı
 * doğrulamasıyla verilir. Betik bu değeri ancak `--kullanici-onayi`
 * bayrağıyla ve onayın KİM tarafından, NE ZAMAN verildiği yazıldığında
 * kabul ediyor.
 *
 * Bayrak bir formalite değil, kaydın kendisi: "kullanıcı canlıda
 * kontrol etti" cümlesi tabloda bir yerde durmadığı sürece VERIFIED,
 * TESTED'ın süslü bir eşanlamlısına dönerdi.
 *
 * Kullanım:
 *   node scripts/patch-tracker.mjs A01 CODED --commit abc1234 \
 *     --evidence "npm run test:all" --note "Form state korunuyor"
 *   node scripts/patch-tracker.mjs A01 VERIFIED \
 *     --kullanici-onayi "18.08.2026 · canlıda kontrol edildi"
 *   node scripts/patch-tracker.mjs --list P0
 *   node scripts/patch-tracker.mjs --ekle E09 P1 E Navbar "İş başlığı" "Detay" "Kabul kriteri"
 *
 * ══════════════════════════════════════════════════════════════════════
 * YENİ MADDE DE AYNI KAPIDAN GİRİYOR
 *
 * Yama paketi 91 maddeyle geldi ama iş listesi donmuş değil: kullanıcı
 * çalışma sürerken yeni istek veriyor. O istekleri yalnızca sohbete
 * yazmak, tablonun "canlı doğruluk kaynağı" olma iddiasını sessizce
 * bitirirdi — pano 91 maddeyi tamamlanmış gösterirken yapılacak beş iş
 * daha olurdu.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const MD = 'IMPLEMENTATION_PROGRESS.md';
const CSV = 'PROGRESS_TRACKER.csv';

const DURUMLAR = [
  'TODO',
  'IN_PROGRESS',
  'CODED',
  'TESTED',
  'READY_FOR_USER',
  'VERIFIED',
  'BLOCKED',
];

/* CSV alanları virgül ve tırnak taşıyor (açıklama metinleri uzun).
   Kendi ayrıştırıcımız RFC 4180'in ihtiyacımız olan kısmını uyguluyor:
   çift tırnakla kaçış ve alan içi virgül. Hazır bir bağımlılık eklemek
   tek dosyalık bir iş için fazlaydı. */
function csvSatiriAyristir(satir) {
  const alanlar = [];
  let alan = '';
  let tirnakta = false;
  for (let i = 0; i < satir.length; i += 1) {
    const c = satir[i];
    if (tirnakta) {
      if (c === '"') {
        if (satir[i + 1] === '"') {
          alan += '"';
          i += 1;
        } else tirnakta = false;
      } else alan += c;
    } else if (c === '"') tirnakta = true;
    else if (c === ',') {
      alanlar.push(alan);
      alan = '';
    } else alan += c;
  }
  alanlar.push(alan);
  return alanlar;
}

function csvAlanYaz(deger) {
  return /[",\n]/.test(deger) ? `"${deger.replace(/"/g, '""')}"` : deger;
}

function oku(yol) {
  return readFileSync(yol, 'utf8');
}

function listele(filtre) {
  const satirlar = oku(CSV).split('\n').slice(1).filter(Boolean);
  for (const satir of satirlar) {
    const a = csvSatiriAyristir(satir);
    if (filtre && a[1] !== filtre && a[8] !== filtre) continue;
    console.log(`${a[0]}\t${a[1]}\t${a[8].padEnd(15)}\t${a[4]}`);
  }
}

function guncelle(id, durum, { commit, evidence, note, onay }) {
  if (durum === 'VERIFIED' && !onay) {
    throw new Error(
      'VERIFIED için --kullanici-onayi "<kim, ne zaman>" gerekir; bu betik kendi başına doğrulama yazmaz.'
    );
  }
  if (!DURUMLAR.includes(durum)) {
    throw new Error(`Geçersiz durum: ${durum}. Geçerli: ${DURUMLAR.join(', ')}`);
  }

  /* ── CSV ── */
  const csvHam = oku(CSV);
  const bom = csvHam.startsWith('﻿') ? '﻿' : '';
  const csvSatirlar = csvHam.replace(/^﻿/, '').split('\n');
  let bulundu = false;
  const yeniCsv = csvSatirlar.map((satir, i) => {
    if (i === 0 || !satir.trim()) return satir;
    const a = csvSatiriAyristir(satir);
    if (a[0] !== id) return satir;
    bulundu = true;
    a[8] = durum;
    if (note !== undefined) a[9] = note;
    if (commit !== undefined) a[10] = commit;
    if (evidence !== undefined) a[11] = evidence;
    if (onay !== undefined) a[12] = onay;
    return a.map(csvAlanYaz).join(',');
  });
  if (!bulundu) throw new Error(`CSV'de ${id} yok.`);
  writeFileSync(CSV, bom + yeniCsv.join('\n'));

  /* ── Markdown ── */
  const mdSatirlar = oku(MD).split('\n');
  let mdBulundu = false;
  const yeniMd = mdSatirlar.map((satir) => {
    if (!satir.startsWith(`| ${id} |`)) return satir;
    mdBulundu = true;
    /* İlk ve son eleman boş (satır `|` ile başlayıp bitiyor); onları
       koruyup aradaki hücreleri yazıyoruz. */
    const h = satir.split('|');
    h[6] = ` ${durum} `;
    if (commit !== undefined) h[7] = ` ${commit} `;
    if (evidence !== undefined) h[8] = ` ${evidence} `;
    if (onay !== undefined) h[9] = ` ${onay} `;
    return h.join('|');
  });
  if (!mdBulundu) throw new Error(`Markdown tablosunda ${id} yok.`);
  writeFileSync(MD, yeniMd.join('\n'));

  console.log(`${id} → ${durum}${commit ? ` (${commit})` : ''}`);
}

/**
 * Yeni madde ekler. Var olan ID'yi EZMİYOR: kazara aynı kimliği ikinci
 * kez eklemek, tabloda iki farklı işi aynı satırda birleştirirdi.
 */
function ekle(id, oncelik, sprint, modul, is, detay, kriter) {
  const csvHam = oku(CSV);
  const bom = csvHam.startsWith('﻿') ? '﻿' : '';
  const csvSatirlar = csvHam.replace(/^﻿/, '').split('\n');
  if (csvSatirlar.some((r) => csvSatiriAyristir(r)[0] === id)) {
    throw new Error(`${id} zaten var.`);
  }

  const alanlar = [
    id, oncelik, sprint, modul, is, detay, kriter,
    'Kullanıcı isteği', 'TODO', '', '', '', 'Bekliyor',
  ];
  /* Dosya sonundaki boş satır korunuyor: CSV'yi satır sonu olmadan
     bırakmak, bir sonraki eklemede iki kaydı birleştirir. */
  const son = csvSatirlar[csvSatirlar.length - 1] === '' ? csvSatirlar.pop() : null;
  csvSatirlar.push(alanlar.map(csvAlanYaz).join(','));
  if (son !== null) csvSatirlar.push(son);
  writeFileSync(CSV, bom + csvSatirlar.join('\n'));

  const mdSatirlar = oku(MD).split('\n');
  let sonTablo = -1;
  for (let i = 0; i < mdSatirlar.length; i += 1) {
    if (/^\| [A-Z]\d+ \|/.test(mdSatirlar[i])) sonTablo = i;
  }
  if (sonTablo < 0) throw new Error('Markdown tablosu bulunamadı.');
  mdSatirlar.splice(
    sonTablo + 1,
    0,
    `| ${id} | ${oncelik} | ${sprint} | ${modul} | ${is} | TODO |  |  | Bekliyor |`
  );
  writeFileSync(MD, mdSatirlar.join('\n'));

  console.log(`${id} eklendi · ${oncelik} · ${modul} · ${is}`);
}

const argv = process.argv.slice(2);
if (argv[0] === '--ekle') {
  const [, id, oncelik, sprint, modul, is, detay, kriter] = argv;
  if (!id || !oncelik || !sprint || !modul || !is) {
    console.error(
      'Kullanım: patch-tracker.mjs --ekle <ID> <P0|P1|P2> <Sprint> <Modül> "<İş>" "<Detay>" "<Kriter>"'
    );
    process.exit(1);
  }
  ekle(id, oncelik, sprint, modul, is, detay ?? '', kriter ?? '');
} else if (argv[0] === '--list') {
  listele(argv[1]);
} else {
  const [id, durum] = argv;
  if (!id || !durum) {
    console.error(
      'Kullanım: patch-tracker.mjs <ID> <DURUM> [--commit X] [--evidence Y] [--note Z]'
    );
    process.exit(1);
  }
  const bayrak = (ad) => {
    const i = argv.indexOf(`--${ad}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  guncelle(id, durum, {
    commit: bayrak('commit'),
    evidence: bayrak('evidence'),
    note: bayrak('note'),
    onay: bayrak('kullanici-onayi'),
  });
}

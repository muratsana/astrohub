#!/usr/bin/env node
/**
 * YAMA İLERLEME SAYFASI — PROGRESS_TRACKER.csv'den üretilir.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN ÜRETİLİYOR, ELLE YAZILMIYOR
 *
 * 91 maddelik bir tabloyu elle bir HTML'e geçirmek, üçüncü güncellemede
 * gerçekten ayrışır ve o andan sonra sayfa ilerlemeyi değil, ilerlemenin
 * eski bir fotoğrafını gösterir. Sayfa CSV'den türeyince "acaba güncel
 * mi" sorusu ortadan kalkıyor: tek kaynak CSV, sayfa onun görünüşü.
 *
 * ══════════════════════════════════════════════════════════════════════
 * FAZLAR CSV'DE DEĞİL, BURADA
 *
 * Yama paketi maddeleri sprint harfleriyle (A–H, Extra) veriyor; sprint
 * "hangi denetim oturumunda bulundu" demek, "hangi sırayla yapılacak"
 * demek değil. Uygulama sırası ayrı bir karar ve burada duruyor.
 *
 * Sıra bağımlılığa göre: önce canlıda kırık olanlar, sonra üzerine iş
 * bina edilecek veri modeli ve medya mimarisi, en sonda onların üstüne
 * oturan özellikler (paylaşım kiti thumbnail kadrajını kullanıyor,
 * künye çekim sezonlarını kullanıyor).
 */

import { readFileSync, writeFileSync } from 'node:fs';

const CSV = 'PROGRESS_TRACKER.csv';
const CIKTI = 'docs/patch-2026-08-18/ilerleme.html';

const FAZLAR = [
  {
    ad: 'Zemin',
    ozet: 'Takip tablosu, git hijyeni, dal temizliği',
    ids: ['H05', 'H06', 'H07', 'H08', 'H09', 'H10', 'H11', 'H12'],
  },
  {
    ad: 'Canlıda kırık olanlar',
    ozet: 'Kullanıcının bugün çarptığı hatalar',
    /* X07 (uzun form taslak standardı) buraya ait: A01/A02'yi çözen
       `formDraft` modülü tam olarak o standardın kendisi. Ayrı bir faza
       koymak, aynı işi iki yerde anlatmak olurdu. */
    ids: ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A12', 'A13', 'A14', 'X07'],
  },
  {
    ad: 'Hesap ve kimlik',
    ozet: 'Üst çubuk, oturum, public profil',
    ids: [
      'E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07', 'E08',
      'E09', 'E10', 'E11', 'E12',
    ],
  },
  {
    ad: 'Çekim sezonları',
    ozet: 'Künyenin veri modeli — üstüne iş bina edilecek',
    ids: ['C01', 'C02', 'C03', 'C04', 'C05', 'C06'],
  },
  {
    ad: 'Medya mimarisi',
    ozet: 'Türev registry, immutable orijinal, EXIF, GC',
    ids: ['C10', 'C11', 'C12', 'C13', 'C14', 'X01', 'X02', 'X03', 'X05'],
  },
  {
    ad: 'Thumbnail kadrajı',
    ozet: 'Kadraj editörü — medya mimarisinin üstüne oturuyor',
    ids: ['C07', 'C08', 'C09', 'C15'],
  },
  {
    ad: 'Fotoğraf indirme',
    ozet: 'İndir menüsü, annotated çıktı, dosya adları',
    ids: ['B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07'],
  },
  {
    ad: 'Paylaşım kiti',
    ozet: 'Instagram çıktıları — kadraj ve sezon verisini kullanıyor',
    ids: [
      'D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07',
      'D08', 'D09', 'D10', 'D11', 'D12', 'D13', 'D14',
    ],
  },
  {
    ad: 'Ekipman ve katalog',
    ozet: 'Setup düzenleme, canonical merge, dedup migration',
    ids: ['F01', 'F02', 'F03', 'F04', 'F05', 'F06', 'F07', 'F08'],
  },
  {
    ad: 'İlanlar ve kalan arayüz',
    ozet: 'İlan fotoğrafları, benzer fotoğraf kartları, puanlama',
    ids: ['A07', 'A08', 'A09', 'A10', 'A11', 'G01', 'G02', 'G03'],
  },
  {
    ad: 'QA ve kapanış',
    ozet: 'Persona matrisi, canlı audit, kullanıcı doğrulaması',
    ids: ['H01', 'H02', 'H03', 'H04', 'H13', 'H14', 'H15', 'X04', 'X06'],
  },
];

const DURUM_SIRA = [
  'VERIFIED',
  'TESTED',
  'CODED',
  'READY_FOR_USER',
  'IN_PROGRESS',
  'BLOCKED',
  'TODO',
];

const DURUM_ETIKET = {
  VERIFIED: 'Doğrulandı',
  TESTED: 'Test edildi',
  CODED: 'Kodlandı',
  READY_FOR_USER: 'Onay bekliyor',
  IN_PROGRESS: 'Sürüyor',
  BLOCKED: 'Bloke',
  TODO: 'Sırada',
};

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

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const ham = readFileSync(CSV, 'utf8').replace(/^﻿/, '');
const satirlar = ham.split('\n').filter((s) => s.trim().length > 0).slice(1);

const kayitlar = satirlar.map((s) => {
  const a = csvSatiriAyristir(s);
  return {
    id: a[0],
    oncelik: a[1],
    modul: a[3],
    is: a[4],
    kriter: a[6],
    durum: a[8] || 'TODO',
    not: a[9],
    commit: a[10],
    kanit: a[11],
    onay: a[12],
  };
});

const indeks = new Map(kayitlar.map((k) => [k.id, k]));

/*
 * Faz tablosunda geçmeyen bir madde SESSİZCE KAYBOLMAMALI. Fazlar elle
 * yazıldı; bir gün yeni bir ID eklenirse sayfada hiç görünmemesi,
 * ilerleme sayfasının en temel vaadini bozardı.
 */
const yerlesmis = new Set(FAZLAR.flatMap((f) => f.ids));
const artakalan = kayitlar.filter((k) => !yerlesmis.has(k.id));
if (artakalan.length > 0) {
  FAZLAR.push({
    ad: 'Fazlara yerleşmemiş',
    ozet: 'Faz tablosuna eklenmesi gereken maddeler',
    ids: artakalan.map((k) => k.id),
  });
}

const sayim = (liste) => {
  const s = Object.fromEntries(DURUM_SIRA.map((d) => [d, 0]));
  for (const k of liste) s[k.durum] = (s[k.durum] ?? 0) + 1;
  return s;
};

/** Bitmiş sayılan: doğrulanmış ya da en azından test geçmiş. */
const bitmis = (liste) =>
  liste.filter((k) => k.durum === 'VERIFIED' || k.durum === 'TESTED').length;

const toplamSayim = sayim(kayitlar);
const serit = DURUM_SIRA.filter((d) => toplamSayim[d] > 0)
  .map(
    (d) =>
      `<span class="serit-parca durum-${d}" style="flex:${toplamSayim[d]}" title="${DURUM_ETIKET[d]}: ${toplamSayim[d]}"></span>`
  )
  .join('');

const fazBloklari = FAZLAR.map((faz, i) => {
  const liste = faz.ids.map((id) => indeks.get(id)).filter(Boolean);
  if (liste.length === 0) return '';
  const b = bitmis(liste);
  const oran = Math.round((b / liste.length) * 100);
  const satirlar = liste
    .map(
      (k) => `
        <tr data-durum="${k.durum}" data-oncelik="${esc(k.oncelik)}">
          <td class="mono">${esc(k.id)}</td>
          <td><span class="oncelik o-${esc(k.oncelik)}">${esc(k.oncelik)}</span></td>
          <td class="modul">${esc(k.modul)}</td>
          <td class="is">
            <span class="is-baslik">${esc(k.is)}</span>
            ${k.not ? `<span class="is-not">${esc(k.not)}</span>` : ''}
          </td>
          <td><span class="rozet durum-${k.durum}">${DURUM_ETIKET[k.durum] ?? k.durum}</span></td>
          <td class="mono kanit">${k.commit ? `<code>${esc(k.commit)}</code>` : '<span class="bos">—</span>'}${
            k.kanit ? `<span class="kanit-metin">${esc(k.kanit)}</span>` : ''
          }</td>
        </tr>`
    )
    .join('');

  return `
    <section class="faz" id="faz-${i + 1}">
      <header class="faz-basi">
        <div class="faz-kimlik">
          <span class="faz-no mono">FAZ ${String(i + 1).padStart(2, '0')}</span>
          <h2>${esc(faz.ad)}</h2>
          <p>${esc(faz.ozet)}</p>
        </div>
        <div class="faz-olcu">
          <span class="faz-oran mono">${b}<span class="bolu">/</span>${liste.length}</span>
          <div class="faz-cubuk"><span style="width:${oran}%"></span></div>
        </div>
      </header>
      <div class="tablo-sar">
        <table>
          <thead>
            <tr><th>ID</th><th>Öncelik</th><th>Modül</th><th>İş</th><th>Durum</th><th>Kanıt</th></tr>
          </thead>
          <tbody>${satirlar}</tbody>
        </table>
      </div>
    </section>`;
}).join('');

const ozetKutulari = DURUM_SIRA.filter((d) => toplamSayim[d] > 0)
  .map(
    (d) => `
      <button class="ozet durum-${d}" data-filtre="${d}" type="button">
        <span class="ozet-sayi mono">${toplamSayim[d]}</span>
        <span class="ozet-ad">${DURUM_ETIKET[d]}</span>
      </button>`
  )
  .join('');

const html = `<title>Astrohub Yama Panosu</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
<style>
/*
  Renkler Astrohub'ın kendi belirteçlerinden alındı (src/index.css).
  Pano ürünün parçası gibi görünmeli; ayrı bir palet, aynı işin iki
  farklı yerde iki farklı kimlikle anlatılması olurdu.
*/
:root {
  --ground: #ecefea;
  --yuzey: #e2e6e0;
  --yuzey-2: #d4dad3;
  --metin: #12181a;
  --sonuk: #465151;
  --cizgi: rgba(18, 24, 26, 0.16);
  --cizgi-guclu: rgba(18, 24, 26, 0.34);
  --vurgu: #9b5000;
  --soguk: #1c5b7a;
  --iyi: #12704a;
  --uyari: #875c0d;
  --kotu: #a93325;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --ground: #090c0e;
    --yuzey: #0d1114;
    --yuzey-2: #131a1e;
    --metin: #e6ebe8;
    --sonuk: #93a0a3;
    --cizgi: rgba(230, 235, 232, 0.13);
    --cizgi-guclu: rgba(230, 235, 232, 0.28);
    --vurgu: #ff9d2e;
    --soguk: #6ea8c7;
    --iyi: #4bbd85;
    --uyari: #e0a132;
    --kotu: #e2604f;
  }
}
:root[data-theme="dark"] {
  --ground: #090c0e;
  --yuzey: #0d1114;
  --yuzey-2: #131a1e;
  --metin: #e6ebe8;
  --sonuk: #93a0a3;
  --cizgi: rgba(230, 235, 232, 0.13);
  --cizgi-guclu: rgba(230, 235, 232, 0.28);
  --vurgu: #ff9d2e;
  --soguk: #6ea8c7;
  --iyi: #4bbd85;
  --uyari: #e0a132;
  --kotu: #e2604f;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--ground);
  color: var(--metin);
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  font-size: 15px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
.mono {
  font-family: 'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace;
  font-variant-numeric: tabular-nums;
}
.kabuk { max-width: 1180px; margin: 0 auto; padding: 40px 24px 96px; }

header.tepe { display: flex; flex-direction: column; gap: 6px; margin-bottom: 28px; }
.goz { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: var(--vurgu); font-weight: 600; }
h1 { font-size: clamp(26px, 4vw, 38px); line-height: 1.15; margin: 0; text-wrap: balance; letter-spacing: -.02em; }
.alt { color: var(--sonuk); max-width: 64ch; margin: 0; }

.serit { display: flex; height: 10px; border-radius: 999px; overflow: hidden; margin: 22px 0 14px; background: var(--yuzey-2); }
.serit-parca { display: block; min-width: 3px; }

.ozetler { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 34px; }
.ozet {
  display: flex; align-items: baseline; gap: 7px;
  border: 1px solid var(--cizgi); background: var(--yuzey);
  color: var(--metin); border-radius: 10px; padding: 7px 12px;
  cursor: pointer; font: inherit; transition: border-color .15s, transform .15s;
}
.ozet:hover { border-color: var(--cizgi-guclu); }
.ozet:focus-visible { outline: 2px solid var(--vurgu); outline-offset: 2px; }
.ozet[aria-pressed="true"] { border-color: currentColor; }
.ozet-sayi { font-size: 17px; font-weight: 600; }
.ozet-ad { font-size: 12.5px; color: var(--sonuk); }

.faz { margin-bottom: 40px; border-top: 1px solid var(--cizgi); padding-top: 20px; }
.faz-basi { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end; justify-content: space-between; margin-bottom: 14px; }
.faz-no { font-size: 11px; letter-spacing: .12em; color: var(--sonuk); }
.faz h2 { font-size: 20px; margin: 2px 0 2px; letter-spacing: -.01em; }
.faz-kimlik p { margin: 0; color: var(--sonuk); font-size: 13.5px; }
.faz-olcu { display: flex; align-items: center; gap: 12px; min-width: 190px; }
.faz-oran { font-size: 14px; color: var(--sonuk); }
.faz-oran .bolu { opacity: .45; padding: 0 2px; }
.faz-cubuk { flex: 1; height: 5px; border-radius: 999px; background: var(--yuzey-2); overflow: hidden; }
.faz-cubuk span { display: block; height: 100%; background: var(--iyi); }

.tablo-sar { overflow-x: auto; border: 1px solid var(--cizgi); border-radius: 12px; background: var(--yuzey); }
table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
th {
  text-align: left; font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase;
  color: var(--sonuk); font-weight: 600; padding: 10px 12px; border-bottom: 1px solid var(--cizgi);
  white-space: nowrap;
}
td { padding: 10px 12px; border-bottom: 1px solid var(--cizgi); vertical-align: top; }
tbody tr:last-child td { border-bottom: 0; }
tbody tr[hidden] { display: none; }
.modul { color: var(--sonuk); white-space: nowrap; }
.is { min-width: 300px; }
.is-baslik { display: block; }
.is-not { display: block; color: var(--sonuk); font-size: 12px; margin-top: 3px; }
.kanit { white-space: nowrap; }
.kanit code { font-size: 12px; }
.kanit-metin { display: block; color: var(--sonuk); font-size: 11.5px; white-space: normal; max-width: 34ch; margin-top: 3px; }
.bos { color: var(--sonuk); opacity: .5; }

.oncelik { font-size: 11px; font-weight: 600; letter-spacing: .04em; padding: 2px 6px; border-radius: 5px; border: 1px solid var(--cizgi-guclu); }
.o-P0 { color: var(--kotu); border-color: color-mix(in srgb, var(--kotu) 45%, transparent); }
.o-P1 { color: var(--uyari); border-color: color-mix(in srgb, var(--uyari) 45%, transparent); }
.o-P2 { color: var(--sonuk); }

.rozet { display: inline-block; font-size: 11.5px; font-weight: 500; padding: 3px 8px; border-radius: 999px; white-space: nowrap; border: 1px solid; }
.durum-VERIFIED { color: var(--iyi); border-color: color-mix(in srgb, var(--iyi) 45%, transparent); background: color-mix(in srgb, var(--iyi) 12%, transparent); }
.durum-TESTED { color: var(--soguk); border-color: color-mix(in srgb, var(--soguk) 45%, transparent); background: color-mix(in srgb, var(--soguk) 12%, transparent); }
.durum-CODED { color: var(--vurgu); border-color: color-mix(in srgb, var(--vurgu) 45%, transparent); background: color-mix(in srgb, var(--vurgu) 12%, transparent); }
.durum-READY_FOR_USER { color: var(--vurgu); border-color: color-mix(in srgb, var(--vurgu) 45%, transparent); }
.durum-IN_PROGRESS { color: var(--uyari); border-color: color-mix(in srgb, var(--uyari) 45%, transparent); background: color-mix(in srgb, var(--uyari) 12%, transparent); }
.durum-BLOCKED { color: var(--kotu); border-color: color-mix(in srgb, var(--kotu) 45%, transparent); background: color-mix(in srgb, var(--kotu) 12%, transparent); }
.durum-TODO { color: var(--sonuk); border-color: var(--cizgi-guclu); }

span.serit-parca.durum-VERIFIED { background: var(--iyi); }
span.serit-parca.durum-TESTED { background: var(--soguk); }
span.serit-parca.durum-CODED { background: var(--vurgu); }
span.serit-parca.durum-READY_FOR_USER { background: color-mix(in srgb, var(--vurgu) 60%, transparent); }
span.serit-parca.durum-IN_PROGRESS { background: var(--uyari); }
span.serit-parca.durum-BLOCKED { background: var(--kotu); }
span.serit-parca.durum-TODO { background: var(--yuzey-2); border-right: 1px solid var(--cizgi); }

footer { margin-top: 44px; padding-top: 18px; border-top: 1px solid var(--cizgi); color: var(--sonuk); font-size: 12.5px; }
footer p { margin: 0 0 5px; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>

<div class="kabuk">
  <header class="tepe">
    <span class="goz">18 Ağustos 2026 yama paketi</span>
    <h1>Astrohub Yama Panosu</h1>
    <p class="alt">
      91 madde, on bir faza bölündü. Sıra bağımlılığa göre: önce canlıda kırık
      olanlar, sonra üzerine iş bina edilecek veri modeli ve medya mimarisi, en
      sonda onların üstüne oturan özellikler. Bu sayfa
      <code class="mono">PROGRESS_TRACKER.csv</code>'den üretiliyor.
    </p>
    <div class="serit">${serit}</div>
    <div class="ozetler">${ozetKutulari}</div>
  </header>

  ${fazBloklari}

  <footer>
    <p><strong>Doğrulandı</strong> durumunu yalnızca kullanıcı verir; takip betiği bu değeri kendi başına yazmayı reddediyor.</p>
    <p><strong>Test edildi</strong>: kod yazıldı, regresyon testi eklendi ve <code class="mono">npm run test:all</code> geçti.</p>
    <p>Kaynak: <code class="mono">PROGRESS_TRACKER.csv</code> · <code class="mono">IMPLEMENTATION_PROGRESS.md</code></p>
  </footer>
</div>

<script>
  /* Durum kutuları süzgeç: bir duruma basınca yalnızca o durumdaki
     satırlar kalıyor, tekrar basınca süzgeç kalkıyor. */
  const kutular = document.querySelectorAll('.ozet');
  let etkin = null;
  function uygula() {
    for (const tr of document.querySelectorAll('tbody tr')) {
      tr.hidden = etkin !== null && tr.dataset.durum !== etkin;
    }
    for (const k of kutular) {
      k.setAttribute('aria-pressed', String(k.dataset.filtre === etkin));
    }
    for (const faz of document.querySelectorAll('.faz')) {
      const gorunur = faz.querySelectorAll('tbody tr:not([hidden])').length;
      faz.hidden = gorunur === 0;
    }
  }
  for (const k of kutular) {
    k.setAttribute('aria-pressed', 'false');
    k.addEventListener('click', () => {
      etkin = etkin === k.dataset.filtre ? null : k.dataset.filtre;
      uygula();
    });
  }
</script>
`;

writeFileSync(CIKTI, html);

const b = bitmis(kayitlar);
console.log(
  `${CIKTI} yazıldı · ${kayitlar.length} madde · ${b} bitmiş · ${FAZLAR.length} faz`
);

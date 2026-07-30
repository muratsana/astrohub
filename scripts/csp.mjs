#!/usr/bin/env node
/**
 * İÇERİK GÜVENLİĞİ POLİTİKASI (CSP) — üretir ve doğrular (T-507).
 *
 * DURUM NE İDİ: hiç CSP yoktu. Plan "Report-Only'den zorunluya geçir"
 * diyordu ama ölçünce Report-Only başlığının da olmadığı görüldü;
 * politika sıfırdan yazıldı.
 *
 * CSP NE YAPAR, NE YAPMAZ. Bir XSS açığını KAPATMAZ; sömürülmesini
 * zorlaştırır. İkinci savunma hattıdır, birincinin yerine geçmez.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SATIR İÇİ BETİK NEDEN KİLİTLENEMİYOR — ÖLÇÜLDÜ
 *
 * İlk sürüm `script-src 'self' 'sha256-…'` yazıyordu: `index.html`
 * içindeki tema başlatıcının hash'i politikaya konmuştu ve satır içi
 * her şey engellenecekti. Gerçek tarayıcıda sınandı ve YEDİ ROTADA
 * 16 İHLAL üretti. Prerender edilmiş sayfalarda hash'lenemeyecek üç tür
 * satır içi betik var:
 *
 *   1. `window.__staticRouterHydrationData = JSON.parse("…")`
 *      react-router'ın statik hidrasyon verisi — SAYFA BAŞINA farklı.
 *   2. `$RB=[]; $RV=function(a){…}` ve `requestAnimationFrame(…)`
 *      React 19'un Suspense açığa çıkarma çalışma zamanı; `prerender`
 *      bunları boundary çözüldükçe kendisi yazıyor.
 *   3. JSON-LD blokları — Chromium bunları da `script-src-elem` altında
 *      DEĞERLENDİRİYOR. ("Veri bloğu, engellenmez" varsayımı yanlıştı;
 *      denetim tam olarak bunu yakaladı.)
 *
 * 421 sayfanın her biri için ayrı hash yazmak header'ı onlarca kilobayta
 * çıkarırdı. Nonce ise her isteğin sunucudan geçmesini gerektirir —
 * statik CDN dağıtımının tamamını iptal eder.
 *
 * Bu yüzden `script-src` satır içine izin veriyor. Ama HÂLÂ ÇALIŞIYOR:
 * dış kaynaklı betik engelleniyor. Enjekte edilmiş bir
 * `<script src="https://kotu.site/x.js">` çalışmaz.
 *
 * VE ASIL DEĞER SIZDIRMA TARAFINDA. Saldırgan satır içi betik
 * çalıştırmayı başarsa bile:
 *   · `connect-src` — veriyi kendi sunucusuna gönderemez
 *   · `form-action` — formu dışarı yönlendiremez
 *   · `base-uri`    — `<base>` ile tüm göreli adresleri çeviremez
 *   · `object-src`  — eklenti tabanlı yolları kullanamaz
 *
 * Hash'i "güvenlik var" görüntüsü için bırakmak, siteyi kırarken hiçbir
 * şey korumamak olurdu. Satır içi izni bilerek ve gerekçesiyle veriliyor.
 * ══════════════════════════════════════════════════════════════════════
 *
 * KULLANIM
 *   node scripts/csp.mjs           # vercel.json'a yazar
 *   node scripts/csp.mjs --check   # yalnızca doğrular (CI)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const configFile = path.join(root, 'vercel.json');

/**
 * Kaynak listeleri ÖLÇÜLEREK çıkarıldı: kodda geçen her dış adres
 * tarandı, her biri gerekçesiyle yazıldı, sonuç gerçek tarayıcıda
 * doğrulandı (`npm run check:csp`). Liste eksikse özellik sessizce
 * çalışmaz; fazlaysa koruma zayıflar.
 */
const DIRECTIVES = {
  /* Varsayılan kapalı: aşağıda açıkça izin verilmeyen her şey engellenir. */
  'default-src': ["'self'"],

  /* Satır içi zorunlu (yukarıdaki gerekçe); DIŞ KAYNAK YASAK. */
  'script-src': ["'self'", "'unsafe-inline'"],

  /* React'in `style={{…}}` nitelikleri satır içi stil sayılıyor ve
     ölçüsü çalışma anında hesaplanan yerlerde (ilerleme çubuğu)
     kullanılıyor. Stil enjeksiyonunun zararı betikle kıyaslanamaz. */
  'style-src': ["'self'", "'unsafe-inline'"],

  /* `data:` — ikonlar ve yer tutucular.
     `blob:` — canvas ile üretilen küçültme önizlemesi.
     cartocdn/djlorenz — ışık kirliliği haritasının karo katmanları.
     wikimedia/esahubble — tohum içeriğin görselleri. */
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https://*.supabase.co',
    'https://*.basemaps.cartocdn.com',
    'https://djlorenz.github.io',
    'https://commons.wikimedia.org',
    'https://upload.wikimedia.org',
    'https://cdn.esahubble.org',
  ],

  /* Fontlar self-host — dış kaynak yok. */
  'font-src': ["'self'"],

  /* Radyo parçaları depolamadan; `blob:` yerel önizleme için. */
  'media-src': ["'self'", 'blob:', 'https://*.supabase.co'],

  /* Supabase: veritabanı, kimlik doğrulama, depolama, kenar fonksiyonları.
     Open-Meteo: yedek hava servisi (meteoblue vekil üzerinden gidiyor). */
  'connect-src': ["'self'", 'https://*.supabase.co', 'https://api.open-meteo.com'],

  /* YouTube yayın gömme (nocookie) ve Spotify parça gömme. */
  'frame-src': ['https://www.youtube-nocookie.com', 'https://open.spotify.com'],

  /* Servis çalışanı. */
  'worker-src': ["'self'"],

  /* Eklenti yok; klasik bir XSS yolunu kapatır. */
  'object-src': ["'none'"],

  /* `<base>` ile tüm göreli adreslerin yönü değiştirilemesin. */
  'base-uri': ["'self'"],

  /* Form verisi yalnızca kendi sunucumuza gidebilir. */
  'form-action': ["'self'"],

  /* Clickjacking — `X-Frame-Options`'ın modern karşılığı. */
  'frame-ancestors': ["'self'"],

  /* Karışık içerik yükseltmesi. */
  'upgrade-insecure-requests': [],
};

export function buildPolicy() {
  return Object.entries(DIRECTIVES)
    .map(([name, sources]) => [name, ...sources].join(' ').trim())
    .join('; ');
}

const policy = buildPolicy();
const config = JSON.parse(readFileSync(configFile, 'utf8'));

const globalHeaders = config.headers.find((h) => h.source === '/(.*)');
if (!globalHeaders) {
  console.error("vercel.json içinde '/(.*)' başlık bloğu yok.");
  process.exit(1);
}

const existing = globalHeaders.headers.find(
  (h) => h.key === 'Content-Security-Policy'
);

if (process.argv.includes('--check')) {
  if (!existing || existing.value !== policy) {
    console.error(
      'vercel.json içindeki CSP güncel değil.\n' +
        'Düzeltmek için: node scripts/csp.mjs'
    );
    process.exit(1);
  }
  console.log(`CSP güncel · ${Object.keys(DIRECTIVES).length} yönerge`);
} else {
  if (existing) existing.value = policy;
  else
    globalHeaders.headers.push({
      key: 'Content-Security-Policy',
      value: policy,
    });
  writeFileSync(configFile, JSON.stringify(config, null, 2) + '\n');
  console.log(`CSP yazıldı · ${Object.keys(DIRECTIVES).length} yönerge`);
}

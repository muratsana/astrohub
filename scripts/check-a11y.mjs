/**
 * ERİŞİLEBİLİRLİK DENETİMİ — gerçek tarayıcıda ölçülen (T-406 / QA GUI-10, GUI-11).
 *
 * Sınıf adlarından çıkarım yapmak yanıltıcı: bir düğmenin son ölçüsü
 * padding, satır yüksekliği, `flex-1` ve üst kabın yüksekliğinden çıkıyor.
 * Bu yüzden ölçüm önizleme derlemesi üzerinde, mobil genişlikte, gerçek
 * `getBoundingClientRect` ile yapılıyor.
 *
 * Üç kural denetlenir. Dokunma hedefinde tek eşik kullanmak yanlış sonuç
 * veriyor, çünkü isabet güçlüğü ölçüden değil METİN OLUP OLMAMASINDAN
 * geliyor: 27px yüksekliğinde ama 80px genişliğinde bir filtre rozetine
 * parmakla basmak kolay; 32×32 bir ikon düğmesine değil.
 *
 *   1. İKON KONTROLÜ — 44×44 (WCAG 2.5.5). Metni olmayan, yalnızca ikon
 *      taşıyan düğme/bağlantı. Genişletecek metni olmadığı için hedefi
 *      açıkça büyütmek gerekiyor: carousel noktaları, ok düğmeleri, mod
 *      anahtarları (denetimin GUI-10'da işaret ettiği sınıf).
 *   2. HER KONTROL — 24×24 (WCAG 2.2 AA, ölçüt 2.5.8). Metni olan düğme,
 *      bağlantı, seçici, onay kutusu. Footer'ın dokuz gezinme bağlantısını
 *      44px yapmak footer'ı üç katına çıkarırdı ve standart bunu istemiyor.
 *      Satır içi (paragraf içindeki) bağlantılar tamamen muaf.
 *   3. ERİŞİLEBİLİR AD — yalnızca ikon taşıyan kontrolün adı olmalı
 *      (aria-label, title ya da sr-only metin). Adsız ikon, ekran
 *      okuyucuda "button" diye okunur.
 *
 * Denetlenen rotalar temsili: kabuk (üst çubuk, mobil nav, rıhtım), hero
 * carousel'i, liste ve araç ekranları.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser, NETWORK_NOISE } from './browser.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = `file://${path.join(root, 'dist-preview', 'index.html')}`;

/** Mobil genişlik: dokunma hedefi sorunları burada ortaya çıkar. */
const VIEWPORT = { width: 390, height: 844 };

const ROUTES = ['/', '/galeri', '/etkinlikler', '/araclar/fov', '/forum'];

/** Metni olmayan ikon kontrolleri — WCAG 2.5.5. */
const MIN_ICON = 44;
/** Metni olan her kontrol — WCAG 2.2 AA, ölçüt 2.5.8. */
const MIN_ANY = 24;

const browser = await launchBrowser();
const context = await browser.newContext({ viewport: VIEWPORT });
const page = await context.newPage();

page.on('pageerror', (error) => {
  if (!NETWORK_NOISE.test(String(error))) {
    console.error('sayfa hatası:', String(error).slice(0, 200));
    process.exitCode = 1;
  }
});

await page.goto(BASE, { waitUntil: 'load' });
await page.waitForTimeout(1200);

const smallTargets = [];
const namelessIcons = [];

for (const route of ROUTES) {
  await page.evaluate((r) => {
    location.hash = `#${r}`;
  }, route);
  await page.waitForFunction(
    () => !document.querySelector('[data-route-loading]'),
    { timeout: 10_000 }
  );
  await page.waitForTimeout(400);

  const findings = await page.evaluate(([minIcon, minAny]) => {
    const small = [];
    const nameless = [];

    const controls = document.querySelectorAll(
      'button, a[href], [role="button"], [role="tab"], input[type="checkbox"], input[type="radio"], select'
    );

    for (const el of controls) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue; // gizli

      /*
       * `.sr-only`: yalnızca ekran okuyucu için; odaklanınca (ör. "içeriğe
       * atla") normal ölçüsüne kavuşur. Gizli hâlini 1×1 diye raporlamak
       * yanlış pozitif olur.
       */
      if (el.classList.contains('sr-only')) continue;

      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;

      const label = (el.getAttribute('aria-label') ?? '').trim();
      const title = (el.getAttribute('title') ?? '').trim();
      const srOnly = el.querySelector('.sr-only')?.textContent?.trim() ?? '';
      const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      const hasIcon = el.querySelector('svg') !== null;
      const name = label || title || srOnly || text;

      const id =
        el.tagName.toLowerCase() +
        (el.className && typeof el.className === 'string'
          ? '.' + el.className.split(/\s+/).slice(0, 2).join('.')
          : '');

      if (hasIcon && !name) nameless.push(id);

      /*
       * Satır içi metin bağlantısı muaf: `display: inline` olan ve metni
       * olan bağlantı, bir paragrafın parçasıdır (WCAG istisnası).
       */
      const isLink = el.tagName === 'A';
      if (isLink && style.display === 'inline' && text && !hasIcon) continue;

      // Metni olmayan ikon kontrolü 44px'e, metni olan her şey 24px'e tabi.
      const min = hasIcon && !text ? minIcon : minAny;

      if (rect.width < min || rect.height < min) {
        small.push(
          `[${min}px] ${id} · ${Math.round(rect.width)}×${Math.round(rect.height)} · ` +
            `"${(name || '—').slice(0, 30)}"`
        );
      }
    }
    return { small, nameless };
  }, [MIN_ICON, MIN_ANY]);

  for (const item of findings.small) smallTargets.push(`${route} → ${item}`);
  for (const item of findings.nameless) namelessIcons.push(`${route} → ${item}`);
}

await browser.close();

if (namelessIcons.length > 0) {
  console.error(`\nErişilebilir adı olmayan ikon kontrolü (${namelessIcons.length}):`);
  for (const item of new Set(namelessIcons)) console.error(`  ${item}`);
}

if (smallTargets.length > 0) {
  console.error(`\nDokunma hedefi eşiğinin altında (${smallTargets.length}):`);
  for (const item of new Set(smallTargets)) console.error(`  ${item}`);
}

if (namelessIcons.length > 0 || smallTargets.length > 0) {
  process.exit(1);
}

console.log(
  `erişilebilirlik denetimi tamam · ${ROUTES.length} rota · adsız ikon yok · ` +
    `ikon kontrolleri ≥${MIN_ICON}px, geri kalan ≥${MIN_ANY}px`
);

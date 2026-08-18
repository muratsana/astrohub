import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const BASE = (process.env.AUDIT_BASE_URL || 'https://astrohub.com.tr').replace(/\/$/, '');
const OUT = path.resolve('audit-artifacts');
mkdirSync(OUT, { recursive: true });

const findings = [];
let seq = 1;
const add = (severity, category, route, title, detail = '', evidence = '') => {
  findings.push({ id: `AUD-${String(seq++).padStart(3, '0')}`, severity, category, route, title, detail, evidence });
};
const visible = (el) => {
  const r = el.getBoundingClientRect();
  const s = getComputedStyle(el);
  return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
};

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, locale: 'tr-TR' });
const page = await context.newPage();

const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push({ url: page.url(), text: m.text() }); });
page.on('pageerror', (e) => consoleErrors.push({ url: page.url(), text: e.message }));

async function go(route) {
  const url = `${BASE}${route}`;
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(700);
  if (response && response.status() >= 400) add('critical', 'navigation', route, `HTTP ${response.status()}`, url);
  return response;
}

async function shot(name) {
  const p = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: p, fullPage: true });
  return p;
}

async function auditPage(route, width = 1440) {
  await page.setViewportSize({ width, height: 950 });
  await go(route);
  const metrics = await page.evaluate(() => {
    const body = document.body;
    const doc = document.documentElement;
    const overflow = Math.max(body.scrollWidth, doc.scrollWidth) - window.innerWidth;
    const isVisible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    const unnamedButtons = [...document.querySelectorAll('button')].filter((b) => {
      if (!isVisible(b)) return false;
      const name = (b.getAttribute('aria-label') || b.getAttribute('title') || b.textContent || '').trim();
      return !name;
    }).length;
    const unnamedLinks = [...document.querySelectorAll('a[href]')].filter((a) => {
      if (!isVisible(a)) return false;
      const name = (a.getAttribute('aria-label') || a.getAttribute('title') || a.textContent || '').trim();
      return !name;
    }).length;
    const unlabeledInputs = [...document.querySelectorAll('input:not([type="hidden"]), select, textarea')].filter((el) => {
      if (!isVisible(el)) return false;
      if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) return false;
      if (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) return false;
      return !el.closest('label');
    }).length;
    const h1 = document.querySelector('h1')?.textContent?.trim() || '';
    return { overflow, unnamedButtons, unnamedLinks, unlabeledInputs, h1 };
  });
  if (metrics.overflow > 2) add('high', 'responsive', route, `Yatay taşma: ${metrics.overflow}px`, `${width}px viewport`);
  if (metrics.unnamedButtons) add('medium', 'accessibility-ui', route, `${metrics.unnamedButtons} görünür butonun erişilebilir adı yok`, `${width}px viewport`);
  if (metrics.unnamedLinks) add('medium', 'accessibility-ui', route, `${metrics.unnamedLinks} görünür bağlantının erişilebilir adı yok`, `${width}px viewport`);
  if (metrics.unlabeledInputs) add('medium', 'form-usability', route, `${metrics.unlabeledInputs} görünür form kontrolünün etiketi yok`, `${width}px viewport`);
  if (!metrics.h1) add('low', 'information-architecture', route, 'Sayfada H1 bulunamadı', `${width}px viewport`);
}

const publicRoutes = ['/', '/galeri', '/etkinlikler', '/forum', '/ilanlar', '/saha', '/araclar', '/bu-gece', '/giris', '/kayit'];
for (const route of publicRoutes) {
  for (const width of [390, 1440]) await auditPage(route, width);
}

await page.setViewportSize({ width: 1280, height: 900 });
await go('/kayit');
const reg = {
  email: page.locator('#email'),
  pass: page.locator('#password'),
  confirm: page.locator('#confirmPassword'),
};
if (await reg.email.count()) {
  await reg.email.fill('audit.recovery@example.com');
  await reg.pass.fill('Audit-Test-12345');
  await reg.confirm.fill('Audit-Test-12345');
  const terms = page.getByRole('link', { name: /Kullanım Koşulları/i }).first();
  if (await terms.count()) {
    await terms.click();
    await page.waitForTimeout(400);
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const preserved = await page.locator('#email').inputValue().catch(() => '');
    if (preserved !== 'audit.recovery@example.com') {
      const evidence = await shot('register-terms-back-state-lost');
      add('high', 'recovery', '/kayit', 'Kullanım Koşulları okununca kayıt formundaki girilmiş veriler kayboluyor', 'Kullanıcı formu doldurup Kullanım Koşulları bağlantısına gidiyor ve browser Back ile dönüyor; e-posta alanı eski değerini korumuyor.', evidence);
    }
  }

  await go('/kayit');
  await reg.email.fill('audit.privacy@example.com');
  await reg.pass.fill('Audit-Test-12345');
  await reg.confirm.fill('Audit-Test-12345');
  const privacy = page.getByRole('link', { name: /KVKK Aydınlatma Metni/i }).first();
  if (await privacy.count()) {
    await privacy.click();
    await page.waitForTimeout(400);
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const preserved = await page.locator('#email').inputValue().catch(() => '');
    if (preserved !== 'audit.privacy@example.com') {
      const evidence = await shot('register-kvkk-back-state-lost');
      add('high', 'recovery', '/kayit', 'KVKK metni okununca kayıt formundaki girilmiş veriler kayboluyor', 'Kullanıcı yasal metni okumak için formdan ayrılıp geri döndüğünde form state korunmuyor.', evidence);
    }
  }

  await go('/kayit');
  await page.getByRole('button', { name: /^Üye Ol$/i }).click();
  await page.waitForTimeout(250);
  const errors = await page.locator('[role="alert"], [aria-invalid="true"]').count();
  if (!errors) add('high', 'form-feedback', '/kayit', 'Boş kayıt formu görünür doğrulama geri bildirimi üretmedi');
}

await go('/giris');
if (await page.locator('#email').count()) {
  await page.locator('#email').fill('yanlis-email');
  await page.locator('#password').fill('x');
  await page.getByRole('button', { name: /^Giriş Yap$/i }).click();
  await page.waitForTimeout(300);
  const invalid = await page.locator('#email').getAttribute('aria-invalid');
  if (invalid !== 'true') add('medium', 'form-feedback', '/giris', 'Geçersiz e-posta sonrası e-posta alanı aria-invalid=true olmuyor');
  await page.locator('#email').fill('normal@example.com');
  const passStillThere = await page.locator('#password').inputValue();
  if (!passStillThere) add('medium', 'recovery', '/giris', 'E-posta hatasını düzeltirken şifre alanı sıfırlanıyor');
}

await go('/galeri/yukle');
const uploadUrl = page.url();
const uploadText = (await page.locator('body').innerText()).slice(0, 1600);
if (!/giris/i.test(uploadUrl) && !/giriş yap|üye ol|oturum/i.test(uploadText)) {
  add('high', 'authentication-ux', '/galeri/yukle', 'Anonim kullanıcı fotoğraf yükleme akışında ne yapacağına dair açık yönlendirme almıyor', `URL: ${uploadUrl}`);
}

await page.setViewportSize({ width: 390, height: 844 });
await go('/galeri?ara=m31');
const filterButton = page.getByRole('button', { name: /Filtreler/i }).first();
if (await filterButton.count()) {
  await filterButton.click();
  await page.waitForTimeout(200);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const still = page.url().includes('ara=m31');
  if (!still) add('medium', 'recovery', '/galeri', 'Mobil filtre çekmecesi kapatılınca mevcut filtre state kayboluyor');
} else {
  add('medium', 'responsive', '/galeri', '390px genişlikte filtre çekmecesi giriş düğmesi bulunamadı');
}

await page.setViewportSize({ width: 1440, height: 950 });
await go('/');
const internalLinks = await page.evaluate((base) => {
  const u = new URL(base);
  const isVisible = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  return [...document.querySelectorAll('a[href]')]
    .filter(isVisible)
    .map((a) => a.href)
    .filter((href) => { try { const x = new URL(href); return x.origin === u.origin; } catch { return false; } })
    .map((href) => new URL(href).pathname + new URL(href).search)
    .filter((x, i, arr) => arr.indexOf(x) === i)
    .slice(0, 35);
}, BASE);
for (const route of internalLinks) {
  const response = await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => null);
  if (!response) { add('high', 'navigation', route, 'Dahili bağlantı yüklenemedi/zaman aşımına uğradı'); continue; }
  if (response.status() >= 400) add('high', 'navigation', route, `Dahili bağlantı HTTP ${response.status()} dönüyor`);
  await page.waitForTimeout(150);
  const body = await page.locator('body').innerText().catch(() => '');
  if (/\b404\b/.test(body.slice(0, 600))) add('high', 'navigation', route, 'Dahili bağlantı uygulama içi 404 sayfasına gidiyor');
}

if (process.env.AUDIT_TEST_EMAIL && process.env.AUDIT_TEST_PASSWORD) {
  await go('/giris');
  await page.locator('#email').fill(process.env.AUDIT_TEST_EMAIL);
  await page.locator('#password').fill(process.env.AUDIT_TEST_PASSWORD);
  await page.getByRole('button', { name: /^Giriş Yap$/i }).click();
  await page.waitForTimeout(1500);
  if (/\/giris(?:$|\?)/.test(new URL(page.url()).pathname)) {
    add('critical', 'authentication', '/giris', 'Audit test kullanıcısı canlı sitede giriş yapamadı', (await page.locator('body').innerText()).slice(0, 600));
  } else {
    for (const route of ['/panel', '/hesap', '/bildirimler', '/mesajlar', '/galeri/yukle']) {
      await auditPage(route, 390);
      await auditPage(route, 1440);
    }
    await go('/galeri/yukle');
    const fileInput = page.locator('#file-input');
    if (await fileInput.count()) {
      await fileInput.setInputFiles(path.resolve('public/icon-512.png'));
      await page.waitForTimeout(700);
      const next = page.getByRole('button', { name: /İleri|Devam/i }).last();
      if (await next.count()) {
        await next.click();
        await page.waitForTimeout(500);
        const back = page.getByRole('button', { name: /Geri/i }).last();
        if (!(await back.count())) add('high', 'recovery', '/galeri/yukle', 'Fotoğraf yükleme sihirbazında sonraki adımdan önceki adıma dönecek görünür Geri kontrolü yok');
        else {
          await back.click();
          await page.waitForTimeout(300);
          const fileName = await page.locator('#file-name').inputValue().catch(() => '');
          if (!fileName) add('high', 'recovery', '/galeri/yukle', 'Sihirbazda Geri yapınca seçilmiş dosya/state kayboluyor');
        }
      }
    }
  }
}

for (const item of consoleErrors.slice(0, 30)) {
  if (/favicon|ERR_BLOCKED_BY_CLIENT/i.test(item.text)) continue;
  add('medium', 'runtime', new URL(item.url).pathname, 'Browser console/page error', item.text.slice(0, 500));
}

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || a.id.localeCompare(b.id));
writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ base: BASE, generatedAt: new Date().toISOString(), findings }, null, 2));
const md = [
  '# Astrohub canlı ürün/UX auditi', '',
  `Hedef: ${BASE}`, `Tarih: ${new Date().toISOString()}`, `Bulgu: ${findings.length}`, '',
  ...findings.flatMap((f) => [`## ${f.id} · ${f.severity.toUpperCase()} · ${f.title}`, `- Kategori: ${f.category}`, `- Rota: ${f.route}`, f.detail ? `- Detay: ${f.detail}` : '', f.evidence ? `- Kanıt: ${f.evidence}` : '', ''].filter(Boolean))
].join('\n');
writeFileSync(path.join(OUT, 'report.md'), md);
console.log(md);
await browser.close();

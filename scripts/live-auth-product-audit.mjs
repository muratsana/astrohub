import { chromium } from 'playwright';
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const BASE = 'https://astrohub.com.tr';
const EMAIL = 'muratsana+astrohub-audit-20260818@gmail.com';
const PASSWORD = `Ah-${randomBytes(18).toString('base64url')}!9x`;
const OUT = path.resolve('audit-auth-artifacts');
mkdirSync(OUT, { recursive: true });

const findings = [];
let seq = 1;
function add(severity, category, route, title, detail = '', evidence = '') {
  findings.push({ id: `AUTH-${String(seq++).padStart(3, '0')}`, severity, category, route, title, detail, evidence });
}
async function shot(page, name) {
  const target = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: target, fullPage: true });
  return target;
}
async function go(page, route) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(700);
}
async function pageAudit(page, route, width) {
  await page.setViewportSize({ width, height: width < 600 ? 844 : 950 });
  await go(page, route);
  const data = await page.evaluate(() => {
    const max = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth);
    const overflowing = [...document.querySelectorAll('body *')].filter((el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || r.width <= 0 || r.height <= 0) return false;
      return r.right > innerWidth + 2 || r.left < -2;
    }).slice(0, 10).map((el) => ({
      tag: el.tagName.toLowerCase(),
      id: el.id || '',
      cls: typeof el.className === 'string' ? el.className.slice(0, 160) : '',
      text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120),
      left: Math.round(el.getBoundingClientRect().left),
      right: Math.round(el.getBoundingClientRect().right),
      width: Math.round(el.getBoundingClientRect().width),
    }));
    return { overflow: max - innerWidth, overflowing, h1: document.querySelector('h1')?.textContent?.trim() || '' };
  });
  if (data.overflow > 2) add('high', 'responsive', route, `${width}px görünümde ${data.overflow}px yatay taşma`, JSON.stringify(data.overflowing));
  if (!data.h1) add('low', 'information-architecture', route, 'H1 yok');
}

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'tr-TR' });
const page = await context.newPage();
const badResponses = [];
page.on('response', (r) => {
  if (r.status() >= 400) badResponses.push({ status: r.status(), method: r.request().method(), url: r.url(), page: page.url() });
});
page.on('pageerror', (e) => add('medium', 'runtime', new URL(page.url()).pathname, 'Sayfa JavaScript hatası', e.message));

// 1) Gerçek kullanıcı gibi kayıt ol. Şifre yalnız bu Node sürecinin RAM'inde.
await go(page, '/kayit');
if (!(await page.locator('#email').count())) throw new Error('Kayıt formu bulunamadı');
await page.locator('#email').fill(EMAIL);
await page.locator('#password').fill(PASSWORD);
await page.locator('#confirmPassword').fill(PASSWORD);
const checks = page.locator('form input[type="checkbox"]');
for (let i = 0; i < await checks.count(); i++) await checks.nth(i).check();
await page.getByRole('button', { name: /^Üye Ol$/i }).click();
await page.waitForTimeout(1800);
const regBody = await page.locator('body').innerText();
if (/zaten.*kayıt|already registered|already been registered/i.test(regBody)) {
  console.log(`AUDIT_ACCOUNT_EXISTS ${EMAIL}`);
} else if (!/e-postanı doğrula|e-postanı doğruladıktan|kaydın alındı/i.test(regBody)) {
  const ev = await shot(page, 'signup-unexpected');
  add('critical', 'authentication', '/kayit', 'Test hesabı kayıt sonucu beklenmeyen durumda', regBody.slice(0, 900), ev);
}
console.log(`AUDIT_SIGNUP_SUBMITTED ${EMAIL}`);

// 2) Doğrulama bağlantısını dışarıdaki audit yöneticisinin açabilmesi için bekle.
// Her 10 saniyede bir giriş denenir; şifre loglanmaz veya diske yazılmaz.
let loggedIn = false;
for (let attempt = 0; attempt < 24 && !loggedIn; attempt++) {
  await page.waitForTimeout(attempt === 0 ? 10000 : 8000);
  await go(page, '/giris');
  await page.locator('#email').fill(EMAIL);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: /^Giriş Yap$/i }).click();
  await page.waitForTimeout(1500);
  loggedIn = !new URL(page.url()).pathname.startsWith('/giris');
  if (!loggedIn) console.log(`AUDIT_WAIT_EMAIL_CONFIRMATION attempt=${attempt + 1} email=${EMAIL}`);
}
if (!loggedIn) {
  const ev = await shot(page, 'email-confirmation-timeout');
  add('critical', 'authentication', '/giris', 'E-posta doğrulaması süresinde tamamlanmadı', EMAIL, ev);
  writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ findings }, null, 2));
  await browser.close();
  process.exit(2);
}
console.log(`AUDIT_NORMAL_USER_LOGGED_IN ${EMAIL}`);

// 3) Normal üye akışları — veri oluşturan son submit'ler yapılmaz.
for (const route of ['/panel', '/hesap', '/bildirimler', '/mesajlar', '/galeri/yukle', '/etkinlik/yeni', '/saha/yeni']) {
  await pageAudit(page, route, 390);
  await pageAudit(page, route, 1440);
}

// Fotoğraf yükleme sihirbazı: dosya seç → ileri → geri. Yayınlama yapılmaz.
await page.setViewportSize({ width: 1280, height: 900 });
await go(page, '/galeri/yukle');
const input = page.locator('#file-input');
if (await input.count()) {
  await input.setInputFiles(path.resolve('public/icon-512.png'));
  await page.waitForTimeout(600);
  const next = page.getByRole('button', { name: /İleri|Devam/i }).last();
  if (await next.count()) {
    await next.click();
    await page.waitForTimeout(500);
    const back = page.getByRole('button', { name: /Geri/i }).last();
    if (!(await back.count())) {
      add('high', 'recovery', '/galeri/yukle', 'Yükleme sihirbazında önceki adıma dönüş kontrolü yok');
    } else {
      await back.click();
      await page.waitForTimeout(300);
      if (!(await page.locator('#file-input').count())) add('high', 'recovery', '/galeri/yukle', 'Geri dönüş sonrası dosya adımı kayboluyor');
    }
  } else add('high', 'workflow', '/galeri/yukle', 'Dosya seçildikten sonra ilerleme kontrolü bulunamadı');
} else add('high', 'workflow', '/galeri/yukle', 'Oturum açık üyede fotoğraf dosyası seçme kontrolü bulunamadı');

// Yanlış/eksik yeni içerik formundan recovery: validasyon sonrası form alanları korunmalı.
for (const route of ['/etkinlik/yeni', '/saha/yeni']) {
  await go(page, route);
  const textInput = page.locator('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])').first();
  if (await textInput.count()) {
    await textInput.fill('AUDIT STATE SHOULD SURVIVE');
    const submit = page.locator('form button[type="submit"]').last();
    if (await submit.count()) {
      await submit.click();
      await page.waitForTimeout(350);
      const retained = await textInput.inputValue().catch(() => '');
      if (retained !== 'AUDIT STATE SHOULD SURVIVE') add('high', 'recovery', route, 'Form doğrulama hatasından sonra girilmiş veri siliniyor');
    }
  }
}

// 4) Admin rolü dışarıdan yalnız bu test hesabına eklenecek. Normal kullanıcı
// turu bu noktada tamamlandı; şimdi /admin erişimi açılana kadar beklenir.
console.log(`AUDIT_WAIT_ADMIN_ROLE ${EMAIL}`);
let adminReady = false;
for (let i = 0; i < 24 && !adminReady; i++) {
  await page.waitForTimeout(7000);
  await go(page, '/admin');
  const body = (await page.locator('body').innerText()).slice(0, 1800);
  adminReady = !/yetkiniz yok|yetkisiz|erişim.*yok|giriş yap|403/i.test(body) && !new URL(page.url()).pathname.startsWith('/giris');
  if (!adminReady) console.log(`AUDIT_WAIT_ADMIN_ROLE attempt=${i + 1} email=${EMAIL}`);
}
if (!adminReady) {
  add('critical', 'admin-test', '/admin', 'Geçici admin rolü zamanında görünmedi');
} else {
  console.log(`AUDIT_ADMIN_ROLE_ACTIVE ${EMAIL}`);
  for (const route of ['/admin', '/admin/users', '/admin/photos', '/admin/events']) {
    await pageAudit(page, route, 390);
    await pageAudit(page, route, 1440);
  }
}

// Ağ hatalarını endpoint ile raporla; aynı endpoint tekrarlarını tekilleştir.
const uniq = new Map();
for (const r of badResponses) {
  if (/favicon/i.test(r.url)) continue;
  const key = `${r.status}|${r.method}|${r.url}`;
  uniq.set(key, r);
}
for (const r of uniq.values()) {
  add(r.status >= 500 ? 'high' : 'medium', 'network', new URL(r.page).pathname, `HTTP ${r.status} · ${r.method}`, r.url);
}

const order = { critical: 0, high: 1, medium: 2, low: 3 };
findings.sort((a, b) => order[a.severity] - order[b.severity] || a.id.localeCompare(b.id));
const result = { target: BASE, email: EMAIL, generatedAt: new Date().toISOString(), findings };
writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(result, null, 2));
const md = ['# Astrohub authenticated product audit', '', `Test hesabı: ${EMAIL}`, `Bulgu: ${findings.length}`, '', ...findings.flatMap((f) => [`## ${f.id} · ${f.severity.toUpperCase()} · ${f.title}`, `- ${f.category} · ${f.route}`, f.detail ? `- ${f.detail}` : '', f.evidence ? `- Kanıt: ${f.evidence}` : '', ''].filter(Boolean))].join('\n');
writeFileSync(path.join(OUT, 'report.md'), md);
console.log(md);
await browser.close();

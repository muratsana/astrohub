import { chromium } from 'playwright';
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const BASE = 'https://astrohub.com.tr';
const EMAIL = 'muratsana+astrohub-audit-run2-20260818@gmail.com';
const PASSWORD = `Ah-${randomBytes(18).toString('base64url')}!9x`;
const USERNAME = `audit_${Date.now().toString(36)}`;
const OUT = path.resolve('audit-auth-artifacts');
mkdirSync(OUT, { recursive: true });
const findings = [];
let seq = 1;
const add = (severity, category, route, title, detail = '', evidence = '') => findings.push({ id: `AUTH-${String(seq++).padStart(3,'0')}`, severity, category, route, title, detail, evidence });
async function shot(page, name) { const p = path.join(OUT, `${name}.png`); await page.screenshot({path:p, fullPage:true}); return p; }
async function go(page, route) { await page.goto(`${BASE}${route}`, {waitUntil:'domcontentloaded', timeout:30000}); await page.waitForTimeout(700); }
async function safe(name, fn) { try { await fn(); } catch (e) { add('high','runner-observed', new URL(page.url()).pathname, name, e instanceof Error ? e.message : String(e), await shot(page, `failure-${seq}`).catch(()=>'')); } }
async function pageAudit(page, route, width) {
  await page.setViewportSize({width,height:width<600?844:950}); await go(page,route);
  const d=await page.evaluate(()=>{const els=[...document.querySelectorAll('body *')]; const visible=(e)=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'}; const over=els.filter(e=>visible(e)&&(e.getBoundingClientRect().right>innerWidth+2||e.getBoundingClientRect().left< -2)).slice(0,12).map(e=>({tag:e.tagName.toLowerCase(),id:e.id||'',cls:typeof e.className==='string'?e.className.slice(0,130):'',text:(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,90),left:Math.round(e.getBoundingClientRect().left),right:Math.round(e.getBoundingClientRect().right)})); return {overflow:Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-innerWidth,over,h1:document.querySelector('h1')?.textContent?.trim()||''};});
  if(d.overflow>2){const ev=await shot(page,`overflow-${route.replace(/\W+/g,'-')}-${width}`);add('high','responsive',route,`${width}px görünümde ${d.overflow}px yatay taşma`,JSON.stringify(d.over),ev)}
  if(!d.h1)add('low','information-architecture',route,'H1 yok');
}

const browser=await chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:1280,height:900},locale:'tr-TR'});
const page=await context.newPage();
const bad=[];
page.on('response',r=>{if(r.status()>=400)bad.push({status:r.status(),method:r.request().method(),url:r.url(),page:page.url()})});
page.on('pageerror',e=>add('medium','runtime',new URL(page.url()).pathname,'JavaScript sayfa hatası',e.message));

await go(page,'/kayit');
await page.locator('#email').fill(EMAIL); await page.locator('#password').fill(PASSWORD); await page.locator('#confirmPassword').fill(PASSWORD);
const checks=page.locator('form input[type="checkbox"]'); for(let i=0;i<await checks.count();i++) await checks.nth(i).check();
await page.getByRole('button',{name:/^Üye Ol$/i}).click(); await page.waitForTimeout(1500);
console.log(`AUDIT_SIGNUP_SUBMITTED ${EMAIL}`);

let logged=false;
for(let i=0;i<30&&!logged;i++){await page.waitForTimeout(i===0?8000:7000); await go(page,'/giris'); await page.locator('#email').fill(EMAIL); await page.locator('#password').fill(PASSWORD); await page.getByRole('button',{name:/^Giriş Yap$/i}).click(); await page.waitForTimeout(1200); logged=!new URL(page.url()).pathname.startsWith('/giris'); if(!logged)console.log(`AUDIT_WAIT_EMAIL_CONFIRMATION attempt=${i+1} email=${EMAIL}`)}
if(!logged){add('critical','authentication','/giris','Test kullanıcısı giriş yapamadı'); writeFileSync(path.join(OUT,'report.json'),JSON.stringify({findings},null,2)); await browser.close(); process.exit(0)}
console.log(`AUDIT_NORMAL_USER_LOGGED_IN ${EMAIL}`);

await safe('Yeni kullanıcı profil tamamlama akışı tamamlanamadı', async()=>{
  const dialog=page.getByRole('dialog',{name:/Hesabınızı tamamlayın/i});
  if(await dialog.count()){
    await page.locator('#setup-username').fill(USERNAME);
    await page.locator('#setup-city').fill('Ankara');
    const province=page.getByRole('button',{name:/^Ankara\s+il geneli$/i}).first();
    await province.waitFor({state:'visible',timeout:10000});
    await province.click();
    const save=page.getByRole('button',{name:/Kaydet ve devam et/i});
    await page.waitForFunction(()=>{const b=[...document.querySelectorAll('button')].find(x=>(x.textContent||'').includes('Kaydet ve devam et'));return !!b && !b.disabled;},{timeout:10000});
    await save.click();
    await dialog.waitFor({state:'detached',timeout:12000});
    console.log(`AUDIT_PROFILE_SETUP_COMPLETE ${EMAIL}`);
  }
});

for(const route of ['/panel','/hesap','/bildirimler','/mesajlar','/galeri/yukle','/etkinlik/yeni','/saha/yeni']) { await safe(`Sayfa auditi başarısız: ${route}`,()=>pageAudit(page,route,390)); await safe(`Sayfa auditi başarısız: ${route}`,()=>pageAudit(page,route,1440)); }

await safe('Fotoğraf yükleme ileri/geri recovery testi tamamlanamadı', async()=>{
  await page.setViewportSize({width:1280,height:900}); await go(page,'/galeri/yukle');
  const input=page.locator('#file-input'); if(!(await input.count())) throw new Error('file-input bulunamadı');
  await input.setInputFiles(path.resolve('public/icon-512.png')); await page.waitForTimeout(900);
  const next=page.getByRole('button',{name:/^İleri/i}).last();
  if(!(await next.count())) {add('high','workflow','/galeri/yukle','Dosya seçildikten sonra İleri kontrolü yok'); return;}
  if(await next.isDisabled()){add('high','workflow','/galeri/yukle','Dosya seçildikten sonra İleri kontrolü etkinleşmiyor',await page.locator('body').innerText().then(t=>t.slice(0,900)));return;}
  await next.click(); await page.waitForTimeout(500);
  const back=page.getByRole('button',{name:/Geri/i}).last(); if(!(await back.count())){add('high','recovery','/galeri/yukle','İkinci adımdan geri dönüş kontrolü yok');return;}
  await back.click(); await page.waitForTimeout(350);
  const filename=await page.locator('#file-name').inputValue().catch(()=> ''); if(!filename)add('high','recovery','/galeri/yukle','Geri dönüşte seçilmiş dosya bilgisi kayboluyor');
});

for(const route of ['/etkinlik/yeni','/saha/yeni']) await safe(`Form recovery testi: ${route}`,async()=>{await go(page,route);const inp=page.locator('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])').first();if(await inp.count()){await inp.fill('AUDIT STATE SHOULD SURVIVE');const submit=page.locator('form button[type="submit"]').last();if(await submit.count()){await submit.click();await page.waitForTimeout(350);if(await inp.inputValue().catch(()=> '')!=='AUDIT STATE SHOULD SURVIVE')add('high','recovery',route,'Doğrulama hatasından sonra girilmiş veri siliniyor')}}});

console.log(`AUDIT_WAIT_ADMIN_ROLE ${EMAIL}`);
let admin=false;
for(let i=0;i<30&&!admin;i++){await page.waitForTimeout(5000);await go(page,'/admin');const body=(await page.locator('body').innerText()).slice(0,1800);admin=!/yetkiniz yok|yetkisiz|erişim.*yok|giriş yap|403/i.test(body)&&!new URL(page.url()).pathname.startsWith('/giris');if(!admin)console.log(`AUDIT_WAIT_ADMIN_ROLE attempt=${i+1} email=${EMAIL}`)}
if(!admin)add('critical','admin-test','/admin','Geçici admin rolü görünmedi'); else {console.log(`AUDIT_ADMIN_ROLE_ACTIVE ${EMAIL}`);for(const route of ['/admin']){await safe('Admin mobil audit',()=>pageAudit(page,route,390));await safe('Admin desktop audit',()=>pageAudit(page,route,1440));}}

const uniq=new Map();for(const r of bad){if(/favicon/i.test(r.url))continue;uniq.set(`${r.status}|${r.method}|${r.url}`,r)}for(const r of uniq.values())add(r.status>=500?'high':'medium','network',new URL(r.page).pathname,`HTTP ${r.status} · ${r.method}`,r.url);
const order={critical:0,high:1,medium:2,low:3};findings.sort((a,b)=>order[a.severity]-order[b.severity]||a.id.localeCompare(b.id));
const result={target:BASE,email:EMAIL,generatedAt:new Date().toISOString(),findings};writeFileSync(path.join(OUT,'report.json'),JSON.stringify(result,null,2));
const md=['# Astrohub authenticated product audit','',`Test hesabı: ${EMAIL}`,`Bulgu: ${findings.length}`,'',...findings.flatMap(f=>[`## ${f.id} · ${f.severity.toUpperCase()} · ${f.title}`,`- ${f.category} · ${f.route}`,f.detail?`- ${f.detail}`:'',f.evidence?`- Kanıt: ${f.evidence}`:'',''].filter(Boolean))].join('\n');writeFileSync(path.join(OUT,'report.md'),md);console.log(md);await browser.close();
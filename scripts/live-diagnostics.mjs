import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const BASE = 'https://astrohub.com.tr';
const OUT = path.resolve('audit-artifacts');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox','--disable-dev-shm-usage'] });
const context = await browser.newContext({ viewport:{width:390,height:844}, locale:'tr-TR' });
const page = await context.newPage();
const records=[];
const bad=[];
page.on('response', r => {
  if (r.status() >= 400) bad.push({
    status:r.status(), method:r.request().method(), resourceType:r.request().resourceType(),
    url:r.url(), page:page.url()
  });
});

async function visit(route,width){
  await page.setViewportSize({width,height:width<600?844:950});
  await page.goto(`${BASE}${route}`,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForTimeout(1400);
  const d=await page.evaluate(()=>{
    const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'};
    const overflowing=[...document.querySelectorAll('body *')].filter(e=>{
      if(!visible(e)) return false;
      const r=e.getBoundingClientRect();
      return r.right>innerWidth+2 || r.left< -2;
    }).map(e=>{
      const r=e.getBoundingClientRect();
      let parent=e.parentElement; const chain=[];
      for(let i=0;parent&&i<3;i++,parent=parent.parentElement) chain.push(`${parent.tagName.toLowerCase()}${parent.id?'#'+parent.id:''}.${typeof parent.className==='string'?parent.className.split(/\s+/).slice(0,3).join('.'):''}`);
      return {tag:e.tagName.toLowerCase(),id:e.id||'',cls:typeof e.className==='string'?e.className.slice(0,220):'',text:(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,180),left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width),position:getComputedStyle(e).position,overflowX:getComputedStyle(e).overflowX,parentChain:chain};
    }).slice(0,30);
    return {viewport:innerWidth,bodyScroll:document.body.scrollWidth,docScroll:document.documentElement.scrollWidth,overflow:Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-innerWidth,overflowing};
  });
  let screenshot='';
  if(d.overflow>2){screenshot=path.join(OUT,`diag-${route.replace(/\W+/g,'-')}-${width}.png`);await page.screenshot({path:screenshot,fullPage:true});}
  records.push({route,width,...d,screenshot});
}

for(const r of ['/','/etkinlikler','/saha','/galeri','/ilanlar']){await visit(r,390);await visit(r,1440);}
writeFileSync(path.join(OUT,'diagnostics.json'),JSON.stringify({records,badResponses:[...new Map(bad.map(x=>[`${x.status}|${x.method}|${x.url}`,x])).values()]},null,2));
console.log(JSON.stringify({records:records.filter(x=>x.overflow>2),badResponses:[...new Map(bad.map(x=>[`${x.status}|${x.method}|${x.url}`,x])).values()]},null,2));
await browser.close();
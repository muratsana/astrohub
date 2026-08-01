/**
 * UÇTAN UCA TESTLER (§17.1).
 *
 * Birim testleri bileşenleri jsdom'da tek tek render eder; burada gerçek
 * tarayıcıda, gerçek derlemeyle, gerçek gezinme yapılır. İkisinin
 * yakaladığı hata sınıfı farklıdır:
 *
 *   birim   → mantık, biçimlendirme, erişilebilirlik nitelikleri
 *   e2e     → yönlendirme, kod bölme, kalıcı durum, düzen, paketleme
 *
 * Neden `dist-preview` (tek dosya, hash router)?
 * Sunucu gerektirmez. `dist` klasörünü `file://` ile açmak history API'li
 * router'da çalışmaz (derin bağlantılar 404 verir) ve bir HTTP sunucusu
 * kurmak testi ortamın portlarına bağımlı hâle getirir. Tek dosya derlemesi
 * aynı uygulama kodunu çalıştırır — yalnızca router modu farklıdır.
 *
 * Her senaryo bağımsızdır: kendi adresine gider, kendi doğrulamasını yapar.
 * Bir senaryonun başarısızlığı diğerlerini durdurmaz; sonunda tüm
 * başarısızlıklar birlikte raporlanır — tek tek düzeltip yeniden çalıştırmak
 * gece boyunca çok tur demek.
 */
import { existsSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { launchBrowser, NETWORK_NOISE, includesTr } from './browser.mjs';

const FILE = path.resolve('dist-preview/index.html');
if (!existsSync(FILE)) {
  console.error('dist-preview/index.html yok — önce `npm run build:preview`.');
  process.exit(1);
}

const BASE = pathToFileURL(FILE).href;
const browser = await launchBrowser();
const context = await browser.newContext({
  viewport: { width: 1440, height: 950 },
});
const page = await context.newPage();

const pageErrors = [];
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  if (NETWORK_NOISE.test(m.text())) return;
  pageErrors.push(`konsol: ${m.text()}`);
});
page.on('pageerror', (e) => pageErrors.push(`sayfa hatası: ${e.message}`));

const failures = [];
let passed = 0;

/** Bir senaryoyu çalıştırır; hata fırlatırsa kaydeder ve devam eder. */
async function scenario(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.log(`  ✗ ${name} — ${error.message}`);
  } finally {
    /*
     * Senaryo yarıda kaldıysa açık kalan bir katman (komut paleti, çekmece)
     * sonraki senaryoların tıklamalarını yer ve tek bir hata zincirleme on
     * hataya dönüşür. Her senaryodan sonra katmanlar kapatılır.
     */
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(150);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** Hash router'da bir adrese gider ve boyamayı bekler. */
async function goto(route) {
  await page.evaluate((r) => {
    location.hash = `#${r}`;
  }, route);

  /*
   * "h1 geldi mi" tek başına yetmez: gezinme anında önceki sayfanın h1'i
   * hâlâ DOM'da olduğu için bekleme anında geçiyor, ardından lazy chunk
   * inerken iskelet boyanıyor ve h1 bir an KAYBOLUYOR. Test o boşluğa
   * denk geldiğinde kararsız biçimde düşüyordu.
   *
   * Doğru koşul iki parçalı: adres istenen rotaya geçmiş olmalı VE rota
   * iskeleti (`data-route-loading`) ekranda olmamalı. İkisi sağlandığında
   * ekranda duran h1 gerçekten yeni rotanın başlığıdır.
   */
  await page.waitForFunction(
    (r) => {
      const hash = location.hash.replace(/^#/, '') || '/';
      if (hash !== r) return false;
      if (document.querySelector('[data-route-loading]')) return false;
      return document.querySelector('h1') !== null;
    },
    route,
    { timeout: 10_000 }
  );
  await page.waitForTimeout(150);
}

async function heading() {
  // Beklemeli okuma: geçici bir boşluk assertion'ı düşürmesin.
  const el = await page.waitForSelector('h1', { timeout: 10_000 });
  return (await el.textContent())?.trim() ?? '';
}

/**
 * Sayfada beklenen metnin GÖRÜNMESİNİ bekler ve gövde metnini döndürür.
 *
 * Gezinmeden hemen sonra `body.innerText`i bir kez okumak kararsızdı:
 * rota chunk'ı inip bileşen boyandıktan sonra bile veriye bağlı bölümler
 * bir tur sonra geliyor. CI'da bu yarış iki ayrı senaryoyu düşürdü
 * (şehir başlığı, çerez envanteri) — yerelde chunk hızlı indiği için
 * hiç görünmemişti.
 *
 * Metin gelmezse yine düşer; ama artık "henüz gelmedi" ile "hiç yok"
 * ayrımı 10 saniyeye bağlı, tek karelik şansa değil.
 */
async function waitForText(needle, label = needle) {
  try {
    await page.waitForFunction(
      // `includesTr` ile aynı kural: Türkçe duyarlı küçük harfe indirip ara.
      (t) => (document.body.innerText || '').toLocaleLowerCase('tr-TR').includes(t),
      needle,
      { timeout: 10_000 }
    );
  } catch {
    throw new Error(`sayfada beklenen metin görünmedi: ${label}`);
  }
  return page.evaluate(() => document.body.innerText);
}

await page.goto(BASE, { waitUntil: 'load' });
await page.waitForTimeout(1500);

console.log('\nE2E senaryoları\n');

/* ══════════════════════ Gezinme ══════════════════════ */

await scenario('ana sayfa hero başlığıyla açılır', async () => {
  await goto('/');
  assert((await heading()).length > 5, 'h1 boş');
});

await scenario('üst menüden galeriye gidilir', async () => {
  await goto('/');
  const link = await page.$('a[href="#/galeri"]');
  assert(link !== null, 'galeri bağlantısı bulunamadı');
  await link.click();
  await page.waitForTimeout(600);
  assert(
    includesTr(await heading(), 'galeri'),
    `beklenmeyen başlık: ${await heading()}`
  );
});

await scenario('bilinmeyen adres 404 sayfası gösterir', async () => {
  await goto('/boyle-bir-sayfa-yok');
  await waitForText('404', '404 sayfası');
});

await scenario('tanımsız şehir sayfası 404 verir', async () => {
  await goto('/atlantis-astronomi-etkinlikleri');
  await waitForText('404', 'uydurma şehir sayfası 404');
});

await scenario('tanımlı şehir sayfası açılır', async () => {
  await goto('/ankara-astronomi-etkinlikleri');
  assert(
    includesTr(await heading(), 'ankara'),
    `şehir başlığı gelmedi: ${await heading()}`
  );
});

/* ══════════════════════ Arama ══════════════════════ */

await scenario('⌘K arama katmanını açar ve M31 sonuç döndürür', async () => {
  await goto('/');
  await page.keyboard.press('Control+K');
  await page.waitForSelector('[role="dialog"][aria-label="Komut paleti"]', {
    timeout: 4000,
  });

  const input = await page.$('input[aria-label="Komut ya da arama terimi"]');
  assert(input !== null, 'arama girişi bulunamadı');
  await input.type('M31', { delay: 20 });
  await page.waitForTimeout(400);

  const results = await page.$$('[role="option"]');
  assert(results.length > 0, 'M31 için sonuç yok (boşluksuz eşleşme bozuldu)');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
});

/* ══════════════════════ Hesaplayıcılar ══════════════════════ */

await scenario('FOV hesaplayıcı girdi değişince sonucu günceller', async () => {
  await goto('/araclar/fov');

  const before = await page.evaluate(() => document.body.innerText);
  await page.fill('#fl', '1000');
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => document.body.innerText);

  assert(before !== after, 'odak uzaklığı değişti ama sonuç aynı kaldı');
  assert(after.includes('″/px'), 'piksel ölçeği sonucu görünmüyor');
});

await scenario('mozaik planlayıcı örtüşme artınca panel sayısını artırır', async () => {
  await goto('/araclar/mosaic');

  // 250mm ön ayarında kadraj 5°'yi aşıyor ve çoğu hedef tek kareye sığıyor;
  // panel bölünmesini görmek için uzun odak seçiliyor.
  await page.fill('#mosaic-fl', '1600');
  await page.fill('#mosaic-tw', '300');
  await page.fill('#mosaic-th', '200');
  await page.fill('#mosaic-overlap', '0');
  await page.waitForTimeout(300);
  const low = await page.$eval('[aria-label*="mozaik düzeni"]', (el) =>
    el.getAttribute('aria-label')
  );

  await page.fill('#mosaic-overlap', '40');
  await page.waitForTimeout(300);
  const high = await page.$eval('[aria-label*="mozaik düzeni"]', (el) =>
    el.getAttribute('aria-label')
  );

  assert(low !== high, `örtüşme panel düzenini değiştirmedi (${low})`);
});

await scenario('setup uyumluluk yanlış backfocus’ta hata verir', async () => {
  await goto('/araclar/setup-uyumluluk');

  await page.fill('#setup-spacer', '30');
  await page.waitForTimeout(300);
  const text = await page.evaluate(() => document.body.innerText);

  assert(
    includesTr(text, 'kurulamaz') || includesTr(text, 'ara halka ekleyin'),
    'backfocus hatası raporlanmadı'
  );
});

await scenario('karanlık takvimi ay değiştirince yeniden hesaplar', async () => {
  await goto('/araclar/takvim');

  /*
   * Gövde metninin tamamını karşılaştırmak kırılgan: sayfanın üst kısmı
   * (durum çubuğu, başlık) ay değişince aynı kalıyor ve fark ilk 400
   * karakterde görünmüyordu. Ay etiketi doğrudan okunuyor.
   */
  const monthLabel = () =>
    page.$eval('button[aria-label="Önceki ay"] + span', (el) =>
      (el.textContent ?? '').trim()
    );

  const before = await monthLabel();
  const grid = await page.evaluate(() => document.body.innerText.length);

  await page.click('button[aria-label="Sonraki ay"]');
  await page.waitForTimeout(800);

  const after = await monthLabel();
  assert(before !== after, `ay etiketi değişmedi (${before})`);
  assert(grid > 0, 'takvim boş');

  // Geri gelince başlangıç ayına dönmeli — durum tutarlı ilerlemeli.
  await page.click('button[aria-label="Önceki ay"]');
  await page.waitForTimeout(800);
  assert((await monthLabel()) === before, 'geri gidince aynı aya dönmedi');
});

/* ══════════════════ Işık kirliliği haritası ══════════════════ */

await scenario('ışık kirliliği haritası kontrolleri adresi değiştirir', async () => {
  await goto('/araclar/isik-kirliligi');

  const text = await page.evaluate(() => document.body.innerText);
  assert(includesTr(text, 'ışık kirliliği haritası'), 'harita bölümü yok');

  /*
   * Tek dosya önizleme dış istek yapamaz, dolayısıyla çerçeve hiç
   * yüklenmiyor ve yerine dürüst bir açıklama çıkıyor. Testin koruduğu
   * şey tam olarak bu: kırık bir çerçeve ya da sessiz boşluk değil,
   * sebebini söyleyen bir metin.
   */
  assert(
    includesTr(text, 'bu derlemede harita yüklenmiyor'),
    'ağsız derlemede açıklama gösterilmedi'
  );

  /* Kontroller çerçeveden bağımsız: harita yüklenmese de sürgüler
     çalışmalı, çünkü ürettikleri adres "yeni sekmede aç" bağlantısını da
     besliyor. */
  const linkHref = () =>
    page.$eval('a[href*="lightpollutionmap.app"]', (el) =>
      el.getAttribute('href')
    );

  const before = await linkHref();
  assert(before.includes('zoom=6'), `başlangıç yakınlaştırması yanlış: ${before}`);

  await page.$eval('#lp-zoom', (el) => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    ).set;
    setter.call(el, '9');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(300);

  const after = await linkHref();
  assert(after.includes('zoom=9'), `sürgü adresi güncellemedi: ${after}`);
  assert(
    after.startsWith('https://lightpollutionmap.app/'),
    `adres sağlayıcı dışına çıktı: ${after}`
  );
});

/* ══════════════════════ Forum ══════════════════════ */

await scenario('forum konusundan detaya gidilir', async () => {
  await goto('/forum');
  const link = await page.$('a[href^="#/forum/"]:not([href="#/forum/yeni"])');
  assert(link !== null, 'konu bağlantısı yok');
  await link.click();
  await page.waitForTimeout(700);
  assert((await heading()).length > 5, 'konu başlığı gelmedi');
});

await scenario('yeni konu formu HTML etiketlerini önizlemede temizler', async () => {
  await goto('/forum/yeni');
  await page.fill('#thread-title', '<b>Guide hatası</b> meridyen sonrası');
  await page.waitForTimeout(300);

  const text = await page.evaluate(() => document.body.innerText);
  assert(!text.includes('<b>'), 'etiket önizlemede temizlenmedi');
  assert(text.includes('Guide hatası'), 'önizleme metni görünmüyor');
});

/* ══════════════════════ İlan ver ══════════════════════ */

await scenario('ilan formu eksikleri yazarken bildirir, tamamlanınca açılır', async () => {
  /*
   * Bu akışın kilitlenmesi gerekiyor çünkü servis katmanı (createListing)
   * arayüzünden aylarca önce yazılmıştı ve "hazır" sanılıyordu. Test
   * doğrulamanın yayımlamadan ÖNCE görünür olmasını koruyor: kullanıcı
   * düğmeye basıp hata almak yerine neyin eksik olduğunu yazarken görmeli.
   */
  await goto('/ilan/yeni');

  let text = await page.evaluate(() => document.body.innerText);
  assert(includesTr(text, 'ilan ver'), 'ilan formu açılmadı');
  assert(
    includesTr(text, 'başlık en az'),
    `boş formda başlık uyarısı yok: ${text.slice(0, 200)}`
  );

  await page.fill('#l-title', 'Sky-Watcher Esprit 100ED apokromatik refraktör');
  await page.fill('#l-price', '48500');
  /*
   * ŞEHİR ARTIK SERBEST METİN DEĞİL (§4.1). Alan `provinces` listesinden
   * beslenen bir `select`; liste asenkron geldiği için seçenek DOM'a
   * girene kadar bekleniyor. Önizleme derlemesinde veritabanı yok,
   * dolayısıyla burada görünen tohum yedeği — ölçülen şey listenin
   * dolduğu ve seçimin form durumuna geçtiği.
   */
  await page.waitForFunction(
    () =>
      Array.from(document.querySelectorAll('#l-city option')).some(
        (o) => o.value === 'Ankara'
      ),
    null,
    { timeout: 5000 }
  );
  await page.selectOption('#l-city', 'Ankara');
  await page.fill(
    '#l-desc',
    '2023 yılında alındı, yaklaşık 40 gece kullanıldı. Optikte çizik yok, kutusu ve faturası duruyor.'
  );
  await page.waitForTimeout(300);

  text = await page.evaluate(() => document.body.innerText);
  assert(
    includesTr(text, 'yayımlanmaya hazır'),
    'form tamamlanınca hazır durumu görünmedi'
  );

  // Önizleme yayımlanacak künyenin aynısını göstermeli.
  assert(text.includes('48.500'), 'önizlemede fiyat biçimlenmedi');

  // Oturum yokken düğme kaybolmuyor, girişe yönlendiriyor: yazdığını
  // kaybetmemek için form temizlenmiyor.
  const buttons = await page.$$eval('button', (list) =>
    list.map((b) => b.textContent?.trim() ?? '')
  );
  assert(
    buttons.some((b) => b === 'Giriş yap' || b === 'İlanı yayımla'),
    `yayımla düğmesi yok: ${buttons.join(' | ')}`
  );
});

/* ══════════════════════ Etkinlikler ══════════════════════ */

await scenario('etkinliklerde takvim görünümüne geçilir', async () => {
  await goto('/etkinlikler');
  const [, calendarButton] = await page.$$(
    '[aria-label="Görünüm biçimi"] button'
  );
  assert(calendarButton !== undefined, 'takvim düğmesi yok');

  await calendarButton.click();
  await page.waitForTimeout(500);
  const text = await page.evaluate(() => document.body.innerText);
  assert(includesTr(text, 'etkinlik başlıyor'), 'takvim ızgarası gelmedi');
});

await scenario('etkinlik haritası yakınlık listesi üretir', async () => {
  await goto('/etkinlikler/harita');
  const text = await page.evaluate(() => document.body.innerText);
  assert(includesTr(text, 'size en yakın'), 'yakınlık listesi yok');
  assert(/\d+\s*km/.test(text), 'mesafe değeri basılmadı');
});

/* ══════════════════════ Setup planlayıcı ══════════════════════ */

await scenario('ekipman modülü setup builder ile açılır', async () => {
  // Varsayılan sekme katalog değil builder olmalı: modül bir ürün listesi
  // değil planlama aracı.
  await goto('/ekipman');

  const text = await page.evaluate(() => document.body.innerText);
  assert(includesTr(text, 'setup oluştur'), 'builder sekmesi yok');
  assert(includesTr(text, 'temel bileşenler'), 'bileşen grupları çizilmedi');
  assert(includesTr(text, 'genel durum'), 'analiz paneli yok');

  // Zorunlu bileşenler eksikken analiz bunu söylemeli, sessiz kalmamalı.
  assert(includesTr(text, 'veri yetersiz'), 'eksik veri durumu bildirilmedi');
});

await scenario('katalog sekmesi listeyi tek seferde dökmez', async () => {
  await goto('/ekipman?sekme=katalog');

  const text = await page.evaluate(() => document.body.innerText);
  assert(includesTr(text, 'bir kategori seçin'), 'kategori seçimi istenmiyor');

  // Kategori seçilmeden model kartı çizilmemeli.
  const cards = await page.evaluate(
    () => document.querySelectorAll('a[href*="/ekipman/"]').length
  );
  assert(cards < 10, `kategori seçilmeden ${cards} kart çizildi`);
});

/* ══════════════════════ Ekipman karşılaştırma ══════════════════════ */

await scenario('ekipman karşılaştırma seçimi adres çubuğunda taşınır', async () => {
  // Karşılaştırma seçimi URL'de duruyor; forumda bağlantı paylaşınca aynı
  // tablo açılmalı. Bu, birim testinin göremeyeceği bir yönlendirme davranışı.
  await goto('/ekipman/karsilastir?m=zwo-asi2600mm,zwo-asi533mc');

  const text = await page.evaluate(() => document.body.innerText);
  // `includesTr` yalnızca samanlığı küçültüyor; aranan metin zaten küçük
  // harf verilmeli. "ASI" gibi parçalar Türkçe küçültmede noktasız ı'ya
  // dönüştüğü için harfsiz parçalarla eşleştiriyoruz.
  assert(includesTr(text, '2600mm pro'), 'ilk model tabloda yok');
  assert(includesTr(text, '533mc pro'), 'ikinci model tabloda yok');

  const columns = await page.evaluate(
    () => document.querySelectorAll('table thead th').length
  );
  assert(columns === 3, `beklenen 3 sütun, gelen ${columns}`);

  // Farklı olan satırların işaretlenmesi tablonun asıl işi.
  assert(includesTr(text, 'fark'), 'farklı satır işaretlenmemiş');
});

await scenario('bilinmeyen model karşılaştırmayı boşaltmıyor', async () => {
  await goto('/ekipman/karsilastir?m=zwo-asi2600mm,olmayan-model');

  const text = await page.evaluate(() => document.body.innerText);
  assert(includesTr(text, '2600mm pro'), 'çalışan model de kayboldu');
});

/* ══════════════════════ Fotoğraf sürümleri ══════════════════════ */

await scenario('sürüm karşılaştırma sürgüsü klavyeyle sürülür', async () => {
  await goto('/fotograf/ic434-at-basi-sho');

  const slider = await page.$('[role="slider"]');
  assert(slider !== null, 'sürüm sürgüsü yok');

  const before = await slider.getAttribute('aria-valuenow');
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(150);
  const after = await slider.getAttribute('aria-valuenow');

  assert(before !== after, `sürgü klavyeyle hareket etmedi (${before})`);
});

/* ══════════════════════ Radyo (kalıcı oynatıcı) ══════════════════════ */

await scenario('radyo rıhtımı rota değişiminde ayakta kalır', async () => {
  await goto('/radyo');

  const playButton = await page.$(
    'button[aria-label*="Çal"], button[aria-label*="çal"]'
  );
  if (playButton) {
    await playButton.click();
    await page.waitForTimeout(400);
  }

  // Rıhtım varsa gezinmeden sonra da DOM'da kalmalı (provider router dışında).
  const dockBefore = await page.$$eval('audio', (els) => els.length);
  await goto('/galeri');
  const dockAfter = await page.$$eval('audio', (els) => els.length);

  assert(
    dockAfter >= dockBefore,
    `gezinme <audio> öğesini söktü (${dockBefore} → ${dockAfter})`
  );
});

/* ══════════════════════ Tema ══════════════════════ */

await scenario('tema değişimi kalıcıdır', async () => {
  await goto('/');
  const toggle = await page.$('button[aria-label^="Tema:"]');
  assert(toggle !== null, 'tema düğmesi bulunamadı');

  const readTheme = () =>
    page.evaluate(() => document.documentElement.getAttribute('data-theme'));

  const before = await readTheme();
  await toggle.click();
  await page.waitForTimeout(300);
  const after = await readTheme();
  assert(before !== after, 'tema değişmedi');

  const stored = await page.evaluate(() =>
    localStorage.getItem('astrohub:theme')
  );
  assert(stored !== null, 'tema tercihi saklanmadı');

  /*
   * Düğme üç kademeli: açık → koyu → saha → açık. Üç tıklama başlangıca
   * döndürür ve aynı anda döngünün kapandığını da kanıtlar — iki kademe
   * kalsaydı tur asla tamamlanmazdı.
   */
  await toggle.click();
  await page.waitForTimeout(200);
  await toggle.click();
  await page.waitForTimeout(200);
  assert(
    (await readTheme()) === before,
    'üç tıklamada başlangıç temasına dönülmedi'
  );
});

/* ══════════════════════ Çerez tercihleri ══════════════════════ */

await scenario('çerez sayfası saklanan veriyi listeler ve siler', async () => {
  const written = await page.evaluate(() => {
    localStorage.setItem('astrohub:view:galeri', 'list');
    return localStorage.getItem('astrohub:view:galeri');
  });
  assert(written === 'list', 'test verisi yazılamadı');

  await goto('/cerezler');

  // Envanter localStorage'dan okunur; satırın boyanmasını bekle.
  await waitForText('görünüm tercihleri', 'çerez envanteri satırı');

  const clearAll = await page.$$('button');
  const target = [];
  for (const button of clearAll) {
    const label = (await button.textContent()) ?? '';
    if (includesTr(label, 'tüm yerel verileri sil')) target.push(button);
  }
  assert(target.length > 0, 'toplu silme düğmesi yok');

  await target[0].click();
  await page.waitForTimeout(300);

  const remaining = await page.evaluate(() =>
    Object.keys(localStorage).filter((k) => k.startsWith('astrohub:')).length
  );
  assert(remaining === 0, `silme sonrası ${remaining} anahtar kaldı`);
});

/* ══════════════════════ Erişilebilirlik: içeriğe atla ══════════════════════ */

await scenario('"içeriğe atla" bağlantısı ilk odaklanabilir öğedir', async () => {
  await goto('/');

  /*
   * `Tab` tuşuyla test etmek, o anda odağın nerede olduğuna bağlı ve
   * senaryolar arası sızıntıya açık. Onun yerine belgedeki odaklanabilir
   * öğelerin SIRASI kontrol ediliyor: atlama bağlantısı ilk sırada
   * olmazsa klavye kullanıcısı tüm menüyü geçmek zorunda kalır (§6.7).
   */
  const first = await page.evaluate(() => {
    const focusable = document.querySelectorAll(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const el = focusable[0];
    return el ? { text: el.textContent?.trim() ?? '', href: el.getAttribute('href') } : null;
  });

  assert(first !== null, 'odaklanabilir öğe bulunamadı');
  assert(
    first.href === '#icerik' || includesTr(first.text, 'içeriğe atla'),
    `ilk odaklanabilir öğe beklenmedik: "${first.text}"`
  );

  // Odaklandığında gerçekten görünür olmalı (sr-only + focus:not-sr-only).
  const visible = await page.evaluate(() => {
    const link = document.querySelector('a[href="#icerik"]');
    if (!link) return false;
    link.focus();
    const rect = link.getBoundingClientRect();
    return rect.width > 20 && rect.height > 10;
  });
  assert(visible, 'atlama bağlantısı odakta görünür olmuyor');
});

/* ══════════════════════ Navigasyon her genişlikte ══════════════════════ */

/*
 * Üst çubuk hiçbir genişlikte gezinme girişsiz kalmamalı.
 *
 * Bu senaryo bir hata raporundan doğdu: dar bir görünüm alanında (gömülü
 * önizleme paneli) düz menü `xl` altında gizlendiği için üst çubukta
 * yalnızca Giriş/Kaydol kalıyordu. Alt çubuk `fixed` olduğu için o bağlamda
 * görünmüyordu — yani "navigasyon var ama başka yerde" savunması pratikte
 * doğru değildi. Ölçüt: her genişlikte ya düz menü ya da modül düğmesi
 * ÜST çubukta görünür olacak.
 */
await scenario('üst çubukta her genişlikte gezinme girişi var', async () => {
  const widths = [390, 768, 1024, 1280, 1440];
  const missing = [];

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await goto('/');

    const ok = await page.evaluate(() => {
      const header = document.querySelector('header');
      if (!header) return false;
      const shown = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };
      const flatNav = header.querySelector('nav[aria-label="Ana navigasyon"]');
      const drawerButton = header.querySelector(
        'button[aria-label="Modül haritasını aç"]'
      );
      return shown(flatNav) || shown(drawerButton);
    });

    if (!ok) missing.push(width);
  }

  await page.setViewportSize({ width: 1440, height: 950 });
  assert(
    missing.length === 0,
    `üst çubukta gezinme girişi yok: ${missing.join(', ')} px`
  );
});

/* ══════════════════════ Görsel kayıt (§17.2) ══════════════════════ */

/*
 * PİKSEL KARŞILAŞTIRMASI YAPILMIYOR — bilinçli.
 *
 * Görsel regresyon testi ancak referans görüntüler aynı ortamda üretildiğinde
 * anlamlı: yazı tipi sürümü, alt piksel yumuşatma ve GPU farkı, hiçbir şey
 * değişmemişken bile binlerce piksel fark üretir. CI ortamı sabitlenmeden
 * commit edilen referanslar, sürekli kırmızı yanan ve bir süre sonra kimsenin
 * bakmadığı bir teste dönüşür.
 *
 * Bunun yerine ekran görüntüleri üretiliyor: gözle inceleme ve hata
 * raporlarına ek için. Yatay taşma gibi ölçülebilir düzen hataları
 * `check-preview.mjs` içinde sayısal olarak denetleniyor — asıl koruma orada.
 */
const SHOTS = path.resolve('dist-preview/screens');
mkdirSync(SHOTS, { recursive: true });

const shotRoutes = ['/', '/galeri', '/etkinlikler', '/araclar/mosaic', '/forum'];
const shotWidths = [390, 1024, 1440];
let shots = 0;

for (const width of shotWidths) {
  await page.setViewportSize({ width, height: 900 });
  for (const route of shotRoutes) {
    await goto(route);
    const name = route === '/' ? 'ana' : route.replace(/\//g, '-').slice(1);
    await page.screenshot({
      path: path.join(SHOTS, `${name}-${width}.png`),
      fullPage: false,
    });
    shots++;
  }
}

await browser.close();

/* ══════════════════════ Rapor ══════════════════════ */

const all = [...pageErrors, ...failures];
console.log('');

if (all.length > 0) {
  console.error(`E2E BAŞARISIZ (${passed} geçti, ${failures.length} düştü):`);
  for (const item of all) console.error(`  · ${item}`);
  process.exit(1);
}

console.log(
  `E2E tamam · ${passed} senaryo geçti, sayfa hatası yok · ${shots} ekran görüntüsü dist-preview/screens/`
);

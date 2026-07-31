/**
 * ORTAK TARAYICI KURULUMU.
 *
 * `check-preview.mjs` ve `e2e.mjs` aynı Chromium bulma mantığını
 * kullanıyordu; ikisinde ayrı ayrı durması, ortam değişkeni ya da yol
 * düzeni değiştiğinde birinin sessizce bozulması demekti.
 */
import { chromium } from 'playwright';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

/**
 * Ortamda hazır kurulu bir Chromium varsa onu kullan. Playwright'ın kendi
 * indirdiği sürüm bulunmadığında (kurumsal/sandbox ortamlar) kurulum
 * beklemek yerine mevcut ikiliye düşülür.
 */
export function findChromium() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!root || !existsSync(root)) return undefined;

  for (const dir of readdirSync(root)) {
    for (const candidate of [
      path.join(root, dir, 'chrome-linux', 'chrome'),
      path.join(root, dir, 'chrome-linux', 'headless_shell'),
      path.join(root, dir),
    ]) {
      if (existsSync(candidate) && !candidate.endsWith(dir)) return candidate;
    }
  }
  return undefined;
}

/**
 * Testlerde kullanılan ortak tarayıcı örneği.
 *
 * `options.direct` VEKİLİ DEVRE DIŞI BIRAKIR. Chromium ortamdaki
 * `HTTPS_PROXY` değişkenini kendiliğinden kullanıyor; yerel bir sunucuya
 * (`127.0.0.1`) giden istek de oraya yönleniyor ve gezinme zaman aşımına
 * uğruyor. Diğer denetimler `file://` üzerinden çalıştığı için bunu hiç
 * görmedi; CSP denetimi gerçek başlık göndermek zorunda olduğu için HTTP
 * sunucusu kullanıyor ve vekili atlaması gerekiyor.
 */
export async function launchBrowser(options = {}) {
  const executablePath = findChromium();
  return chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      ...(options.direct ? ['--no-proxy-server'] : []),
    ],
  });
}

/**
 * Dış servise ulaşamamak uygulama hatası değildir.
 *
 * Önizleme `file://` üzerinden açılıyor ve hava servisi (Open-Meteo) çağrısı
 * ağı olmayan/kısıtlı ortamlarda başarısız oluyor. Beklenen davranış zaten
 * bu: değerler "—" gösterilir ve sayfa çalışmaya devam eder.
 */
export const NETWORK_NOISE =
  /ERR_TUNNEL_CONNECTION_FAILED|ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|Failed to fetch|net::ERR_/;

/**
 * Türkçe duyarlı karşılaştırma. JS'in varsayılan `toLowerCase()` metodu
 * "İ" harfini "i" değil "i̇" (i + birleşen nokta) yapar; bu yüzden
 * "İlanlar" başlığı naif bir `/ilan/i` testiyle eşleşmez.
 */
export function includesTr(haystack, needle) {
  return haystack.toLocaleLowerCase('tr-TR').includes(needle);
}

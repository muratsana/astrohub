/**
 * SERVICE WORKER ÜRETİMİ.
 *
 * Şablondaki yer tutucuları derleme çıktısıyla doldurur. Vite eklentisi
 * (bkz. `vite.config.ts`) bu saf fonksiyonu çağırır — böylece mantık
 * eklentinin içinde gömülü kalmaz ve test edilebilir olur.
 */

export interface ServiceWorkerOptions {
  /** Önbellek adına giren sürüm damgası. */
  buildId: string;
  /** Derlemede üretilen dosya adları (dist köküne göre, baştaki / olmadan). */
  emittedFiles: string[];
}

/**
 * Ön-önbelleğe alınacak dosyalar.
 *
 * Yalnızca **kabuk** girer: index.html, giriş JS/CSS'i ve PWA varlıkları.
 * Tüm chunk'ları ön-önbelleğe almak, ilk ziyarette 40'tan fazla dosyayı
 * kullanıcı istemeden indirmek olurdu — kod bölmenin amacını tersine
 * çevirir. Gezilen rota chunk'ları çalışma anında (cache-first) birikir.
 */
export function shellFiles(emittedFiles: string[]): string[] {
  const shell = new Set<string>(['/index.html', '/manifest.webmanifest']);

  for (const file of emittedFiles) {
    // Giriş paketleri: index-*.js / index-*.css (chunk'lar hariç)
    if (/^assets\/index-[^/]+\.(js|css)$/.test(file)) shell.add(`/${file}`);
    // PWA ikonları ve favicon
    if (/^(icon-[^/]+\.png|apple-touch-icon\.png|favicon\.svg)$/.test(file)) {
      shell.add(`/${file}`);
    }
  }

  return [...shell].sort();
}

/** Şablondaki yer tutucular. Tek yerde tanımlı: şablon ve üretici ayrışmasın. */
const BUILD_ID_TOKEN = ['__BUILD', 'ID__'].join('_');
const PRECACHE_TOKEN = ['__PRE', 'CACHE__'].join('');

/**
 * Şablonu gerçek değerlerle doldurur.
 *
 * `replaceAll` kullanılıyor ve sonuç DOĞRULANIYOR. İlk sürümde `replace`
 * vardı; yer tutucular şablonun açıklama satırında da geçtiği için ilk
 * eşleşme yorumdu ve gerçek sabitler dokunulmadan kaldı. Derleme başarılı
 * göründü, üretilen service worker `const PRECACHE = __PRECACHE__` diyerek
 * tarayıcıda söz dizimi hatası verdi — yani çevrimdışı desteği sessizce
 * yoktu. Bu yüzden artık kalan yer tutucu derlemeyi düşürür.
 */
export function renderServiceWorker(
  template: string,
  { buildId, emittedFiles }: ServiceWorkerOptions
): string {
  const precache = shellFiles(emittedFiles);

  const out = template
    .replaceAll(BUILD_ID_TOKEN, buildId)
    .replaceAll(PRECACHE_TOKEN, JSON.stringify(precache, null, 2));

  if (out.includes(BUILD_ID_TOKEN) || out.includes(PRECACHE_TOKEN)) {
    throw new Error(
      'Service worker şablonunda doldurulmamış yer tutucu kaldı — üretilen dosya çalışmaz.'
    );
  }

  return out;
}

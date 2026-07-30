/**
 * DERLEME ZAMANI ORTAM DOĞRULAMASI (T-003).
 *
 * Bu dosya, canlıda bir kez gerçekten yaşanmış bir sınıf hatayı kalıcı
 * olarak imkânsız kılar: `VITE_SUPABASE_URL` üretimde `ttps://...` yazılmış
 * (baştaki h eksik), anon anahtarının adı `ITE_...` girilmiş ve site aylarca
 * "yapılandırılmamış" modda tohum veriyle yayında kalmıştı. İstemci koduna
 * göre bu geçerli bir durumdu (graceful degradation); yanlışı ancak derleme
 * anında yakalayabiliriz.
 *
 * Kurallar iki katmanlıdır:
 *
 *   · **Biçim** — değişken tanımlıysa her ortamda doğru biçimde olmalı.
 *     Bozuk değerle derleme, değersiz derlemeden daha kötüdür.
 *   · **Zorunluluk** — yalnızca gerçek üretim dağıtımında (`production`)
 *     üç değişken de şarttır. CI ve yerel derlemeler env'siz çalışmaya
 *     devam eder; önizleme/test akışları kırılmaz.
 *
 * Ayrıca gizli anahtar sızıntısına karşı nöbet tutar: `sb_secret_` önekli
 * veya rolü `anon`/`authenticated` olmayan bir JWT, `VITE_` önekiyle
 * istemci paketine gömülmek üzereyse derleme durdurulur. Bu hata sınıfının
 * bedeli (service_role anahtarının herkese açık JS'e gömülmesi) tüm RLS
 * korumasının anlamsızlaşmasıdır.
 */

export interface ClientEnv {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  siteUrl?: string;
}

export interface EnvCheckOptions {
  /** Gerçek üretim dağıtımı mı? (Vercel'de `VERCEL_ENV === 'production'`.) */
  production: boolean;
}

function parseHttpsUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/** Base64url gövdeyi çözer; çözülemiyorsa null (hata fırlatmaz). */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * İstemciye gömülecek ortam değişkenlerini doğrular; sorunları insan
 * diliyle listeler. Boş liste = derleme devam edebilir.
 */
export function validateClientEnv(
  env: ClientEnv,
  { production }: EnvCheckOptions
): string[] {
  const errors: string[] = [];
  const supabaseUrl = env.supabaseUrl?.trim();
  const anonKey = env.supabaseAnonKey?.trim();
  const siteUrl = env.siteUrl?.trim();

  if (production) {
    if (!supabaseUrl)
      errors.push(
        'VITE_SUPABASE_URL tanımlı değil — üretim dağıtımı veritabanı olmadan çıkamaz.'
      );
    if (!anonKey)
      errors.push(
        'VITE_SUPABASE_ANON_KEY tanımlı değil — üretim dağıtımı kimlik doğrulama olmadan çıkamaz.'
      );
    if (!siteUrl)
      errors.push(
        'VITE_SITE_URL tanımlı değil — canonical/OG etiketleri ve sitemap üretilemez.'
      );
  }

  if (supabaseUrl && !parseHttpsUrl(supabaseUrl)) {
    errors.push(
      `VITE_SUPABASE_URL geçerli bir https:// adresi değil: "${supabaseUrl}". ` +
        '(Örn. baştaki "h" düşmüş olabilir: "ttps://...".)'
    );
  }

  if (siteUrl && !parseHttpsUrl(siteUrl)) {
    errors.push(`VITE_SITE_URL geçerli bir https:// adresi değil: "${siteUrl}".`);
  }

  if (anonKey) {
    if (anonKey.startsWith('sb_secret_')) {
      errors.push(
        'VITE_SUPABASE_ANON_KEY bir GİZLİ anahtar (sb_secret_...) içeriyor. ' +
          'Bu anahtar istemci paketine gömülür ve herkese açık olur; ' +
          'publishable (sb_publishable_...) veya anon anahtarı kullanın.'
      );
    } else if (!anonKey.startsWith('sb_publishable_')) {
      const payload = decodeJwtPayload(anonKey);
      const role = payload?.role;
      if (payload && role !== 'anon' && role !== 'authenticated') {
        errors.push(
          `VITE_SUPABASE_ANON_KEY'nin rolü "${String(role)}" — anon değil. ` +
            'service_role anahtarı ASLA istemciye konmaz (§15.1).'
        );
      }
      if (!payload) {
        errors.push(
          'VITE_SUPABASE_ANON_KEY ne sb_publishable_ önekli ne de çözülebilir ' +
            'bir JWT — değer yanlış yapıştırılmış olabilir.'
        );
      }
    }
  }

  return errors;
}

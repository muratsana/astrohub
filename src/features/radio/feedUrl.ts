/**
 * PODCAST RSS ADRESİ — dinleyicinin abone olacağı bağlantı (§10.4).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN SİTE ADRESİ DEĞİL, FONKSİYON ADRESİ
 *
 * `/radyo/podcast/<slug>.xml` daha güzel görünürdü ve bir REWRITE
 * gerektirirdi. `vercel.json`daki rewrite listesi rota ağacından
 * ÜRETİLİYOR (`scripts/vercel-rewrites.mjs`, CI'da `--check` ile
 * doğrulanıyor); elle bir satır eklemek bir sonraki üretimde sessizce
 * silinir ve feed adresi bir gün 404 dönerdi — üstelik abonelerin
 * uygulamasında, kimse görmeden.
 *
 * Fonksiyonun kendi genel adresi kalıcı ve doğrudan: podcast dizinleri
 * (Apple, Spotify) herhangi bir HTTPS adresini kabul ediyor, "güzel"
 * olmasını istemiyorlar.
 *
 * ══════════════════════════════════════════════════════════════════════
 * YAPILANDIRMA YOKSA `null`
 *
 * Önizleme derlemesinde Supabase adresi yok. `null` dönüyor ve çağıran
 * taraf bağlantıyı HİÇ çizmiyor — çalışmayan bir "RSS" düğmesi,
 * olmayan bir düğmeden kötü.
 */
export function podcastFeedUrl(slug: string): string | null {
  const base = import.meta.env.VITE_SUPABASE_URL?.trim();
  if (!base || !slug) return null;
  return `${base.replace(/\/+$/, '')}/functions/v1/podcast-rss?seri=${encodeURIComponent(slug)}`;
}

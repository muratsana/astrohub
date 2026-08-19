import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * ═══════════════════════════════════════════════════════════════════════
 * PRIMALUCELAB EAGLE SERİ KAPSAMI (F05)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * NEDEN BU TEST VAR
 *
 * Katalogda uzun süre tek bir "Eagle 5" kaydı vardı: nesil yok, üretim
 * durumu "bilinmiyor", kaynak yok. Kullanıcı bu ekipmanı künyesine
 * eklediğinde ne hangi sürümü kullandığı ne de cihazın hâlâ satılıp
 * satılmadığı görünüyordu.
 *
 * Seri, üreticinin kendi sayfalarından çıkarıldı (19.08.2026):
 *   - primalucelab.com — satıştaki EAGLE6 ailesi
 *   - primalucelabusa.com — "DISCONTINUED" etiketli eski nesiller
 *   - primalucelab.com/info/downloads.html — arşivdeki yazılım paketleri
 *     (EAGLE3, EAGLE4, EAGLE LE, EAGLE CORE'un varlığının üretici kanıtı)
 *
 * BU TESTİN KORUDUĞU ŞEY, İSİM LİSTESİ DEĞİL PROVENANS. Katalog
 * veritabanından yeniden üretildiğinde (`npm run katalog:disa-aktar`)
 * bu satırların üretim durumu ve kaynak bağlantısı kaybolursa test
 * düşüyor — çünkü kaynaksız bir künye alanı, kullanıcıya nereden
 * geldiğini söyleyemediğimiz bir iddiadır.
 */

const SEED = readFileSync('supabase/seed/01_katalog.sql', 'utf8');

/** Seed satırının ilgilendiğimiz alanları — kaba ama kırılgan olmayan okuma. */
interface EagleSatiri {
  slug: string;
  model: string;
  durum: string;
  kaynakli: boolean;
}

function eagleSatirlari(): EagleSatiri[] {
  const cikti: EagleSatiri[] = [];
  for (const satir of SEED.split('\n')) {
    const eslesme = /^ {2}\('[^']+', '(primalucelab-eagle[^']*)', /.exec(satir);
    if (!eslesme) continue;

    /*
     * Model adı slug'dan hemen sonraki dördüncü alan. Alanları tek tek
     * ayrıştırmak yerine bilinen sabitleri arıyoruz: kaçış kurallarıyla
     * uğraşan bir CSV/SQL ayrıştırıcısı bu testin değerinden büyük olurdu.
     */
    const model = /, 'kontrol', '([^']+)', /.exec(satir)?.[1] ?? '';
    const durum =
      /'(guncel|uretimi-durduruldu|eski-model|bilinmiyor)', NULL, NULL, '\[/.exec(
        satir
      )?.[1] ?? 'bilinmiyor';

    cikti.push({
      slug: eslesme[1],
      model,
      durum,
      /* Boş `sources` dizisi `'[]'` olarak yazılıyor. */
      kaynakli: !satir.includes("', '[]', "),
    });
  }
  return cikti;
}

/** Üreticinin bugün sattığı nesil. */
const SATISTA = [
  'primalucelab-eagle6',
  'primalucelab-eagle6-s',
  'primalucelab-eagle6-pro',
  'primalucelab-eagle6-xtm',
];

/** Üreticinin "DISCONTINUED" dediği nesiller. */
const ESKI = [
  'primalucelab-eagle-core',
  'primalucelab-eagle-le',
  'primalucelab-eagle2',
  'primalucelab-eagle2-pro',
  'primalucelab-eagle3',
  'primalucelab-eagle3-pro',
  'primalucelab-eagle4',
  'primalucelab-eagle4-s',
  'primalucelab-eagle4-pro',
  'primalucelab-eagle5-s',
  'primalucelab-eagle5-pro',
  'primalucelab-eagle5-xtm',
];

describe('PrimaLuceLab EAGLE seri kapsamı (F05)', () => {
  const satirlar = eagleSatirlari();
  const slugSet = new Set(satirlar.map((s) => s.slug));

  it('satıştaki dört EAGLE6 modeli katalogda ve "güncel"', () => {
    for (const slug of SATISTA) {
      const satir = satirlar.find((s) => s.slug === slug);
      expect(satir, `${slug} katalogda yok`).toBeDefined();
      expect(satir?.durum, `${slug} üretim durumu`).toBe('guncel');
    }
  });

  it('üretimden kalkan nesiller korunuyor ve legacy işaretli', () => {
    for (const slug of ESKI) {
      const satir = satirlar.find((s) => s.slug === slug);
      expect(satir, `${slug} katalogda yok`).toBeDefined();
      expect(satir?.durum, `${slug} üretim durumu`).toBe('uretimi-durduruldu');
    }
  });

  it('hiçbir EAGLE kaydı "bilinmiyor" durumda kalmıyor', () => {
    const belirsiz = satirlar.filter((s) => s.durum === 'bilinmiyor');
    expect(belirsiz.map((s) => s.slug)).toEqual([]);
  });

  it('her EAGLE kaydı en az bir kaynak bağlantısı taşıyor', () => {
    const kaynaksiz = satirlar.filter((s) => !s.kaynakli);
    expect(kaynaksiz.map((s) => s.slug)).toEqual([]);
  });

  it('sürümü belirsiz eski "Eagle 5" kaydı silinmedi', () => {
    /*
     * Bu satırı bir kullanıcı künyesinde kullanıyor. Doğru modeli
     * eklemek, yanlış olanı SİLMEK anlamına gelmiyor: silinseydi o
     * kullanıcının ekipman listesindeki satır sessizce kaybolurdu.
     * Kayıt duruyor, ama artık üretim durumu ve kaynağı var.
     */
    expect(slugSet.has('primalucelab-eagle5')).toBe(true);
    const satir = satirlar.find((s) => s.slug === 'primalucelab-eagle5');
    expect(satir?.model).toBe('Eagle 5');
    expect(satir?.durum).toBe('uretimi-durduruldu');
    expect(satir?.kaynakli).toBe(true);
  });

  it('seride 17 kayıt var — 16 otantik model + sürümü belirsiz miras kayıt', () => {
    expect(satirlar).toHaveLength(SATISTA.length + ESKI.length + 1);
  });
});

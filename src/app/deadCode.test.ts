import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * ═══════════════════════════════════════════════════════════════════════
 * ÖLÜ KOD SAYACI (H13)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Hiçbir yerden import edilmeyen kaynak dosyalar. Bu dosya `adoption`
 * sayacıyla aynı desende çalışıyor ve aynı sebeple: bitmemiş işi doğrudan
 * kırmızı kapıyla göstermek, kapının tamamen kapatılmasına yol açar.
 *
 * SAYAÇ İKİ YÖNLÜ:
 *   · Listedeki bir dosya bağlanır ya da silinirse test düşer → liste
 *     güncellenir, borç görünür biçimde azalır.
 *   · Listede olmayan YENİ bir dosya ölü kalırsa test düşer → ölü kod
 *     sessizce birikemez.
 *
 * NEDEN HEPSİ SİLİNMEDİ. Aşağıdakiler yarım değil, TAMAMLANMIŞ ama
 * bağlanmamış bileşenler. Silmek çalışan bir işi yok etmek olurdu;
 * sessizce bırakmak ise H13'ün şikâyet ettiği şey. Liste ikisinin
 * ortasında duruyor: iş korunuyor ama görünür ve sayılıyor.
 *
 * Kesin olarak devri geçmiş olanlar (yerine başka bir şey konmuş)
 * SİLİNDİ — `TargetsPage` gibi: `/hedefler` artık gökyüzü kataloğuna
 * yönleniyor, sayfanın çağrılma ihtimali yok.
 */
const BAGLANMAMIS = [
  // Yönetici CSV dışa aktarma düğmesi — explorer'a bağlanmayı bekliyor.
  'features/explorer/CsvExportButton.tsx',
  // Kayıtlı görünüm menüsü — explorer'a bağlanmayı bekliyor.
  'features/explorer/SavedViewsMenu.tsx',
  // Ana sayfa "karanlık gökyüzü" şeridi — modül listesine bağlanmayı bekliyor.
  'features/home/sections/DarkSkyStrip.tsx',
];

const SRC = path.resolve(__dirname, '..');
const KOK = path.resolve(SRC, '..');

/**
 * Giriş noktaları: kaynak içinden kimse import etmez, araç zinciri
 * çağırır (Vite, Vitest, tsconfig, servis çalışanı derleyicisi).
 */
const GIRISLER = new Set([
  'main.tsx',
  'App.tsx',
  'entry-prerender.tsx',
  'vite-env.d.ts',
  'test/setup.ts',
  'pwa/buildSw.ts',
]);

/**
 * TESTLER DE REFERANSTIR. Bir modülün testi varsa o modül bilinçli,
 * izlenen koddur — bağlama işi kalmış olabilir ama "unutulmuş" değildir.
 * Testleri taramanın dışında bırakmak, test edilen her domain modülünü
 * yanlışlıkla ölü göstermişti.
 */
function dosyalar(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) dosyalar(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

describe('ölü kod sayacı (H13)', () => {
  it('listede olmayan yeni bir dosya ölü kalamaz', () => {
    const hepsi = dosyalar(SRC);
    /* Yapılandırma dosyaları da referans sayılıyor: `buildSw` yalnızca
       `vite.config.ts` içinden anılıyor. */
    const yapilandirma = ['vite.config.ts', 'vitest.config.ts', 'tsconfig.app.json']
      .map((f) => path.join(KOK, f))
      .filter((f) => {
        try {
          readFileSync(f);
          return true;
        } catch {
          return false;
        }
      });

    /*
     * Her dosya için tüm metni yeniden birleştirmek 554 dosyada saniyeler
     * sürüyordu. Bunun yerine metinler BİR KEZ okunuyor; bir modülün
     * referanslı olup olmadığı, kendi dosyası ve BU KAPI dışındaki
     * metinlerde adının geçip geçmediğine bakılarak belirleniyor.
     *
     * Kapının kendisi dışarıda çünkü aşağıdaki `BAGLANMAMIS` listesi o
     * adları içeriyor — kapı kendi listesini "canlı referans" sayıp
     * hepsini gizliyordu.
     */
    const kapi = path.join(SRC, 'app/deadCode.test.ts');
    const metinler = new Map<string, string>();
    for (const f of [...hepsi, ...yapilandirma]) {
      if (f === kapi) continue;
      metinler.set(f, readFileSync(f, 'utf8'));
    }

    const olu: string[] = [];
    for (const dosya of hepsi) {
      const bagil = path.relative(SRC, dosya).replace(/\\/g, '/');
      if (GIRISLER.has(bagil) || /\.test\.tsx?$/.test(bagil)) continue;
      if (/\.d\.ts$/.test(bagil)) continue;

      const ad = path.basename(bagil).replace(/\.(ts|tsx)$/, '');
      /* Modül adı BAŞKA bir dosyada geçiyor mu — import biçiminden
         bağımsız (mutlak, göreli, dinamik). Ad benzersiz olmadığında
         yanlış "canlı" verebilir; bu bilinçli bir denge: kapı ölü kodu
         KAÇIRABİLİR ama canlı kodu yanlışlıkla ölü ilan etmez. */
      const desen = new RegExp(
        `\\b${ad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`
      );
      let canli = false;
      for (const [yol, metin] of metinler) {
        if (yol === dosya) continue;
        if (desen.test(metin)) {
          canli = true;
          break;
        }
      }
      if (!canli) olu.push(bagil);
    }

    /* Sayaç iki yönlü: liste ile gerçek TAM eşleşmeli. Bir dosya
       bağlandığında ya da silindiğinde burası da güncellenir. */
    expect(olu.sort()).toEqual([...BAGLANMAMIS].sort());
  });

  it('bağlanmamış liste büyümüyor — borç sabit ya da azalır', () => {
    /* Bu sınır bilinçli: üçten fazla bağlanmamış dosya, "sonra
       bağlarız" borcunun birikmeye başladığı anlamına gelir. */
    expect(BAGLANMAMIS.length).toBeLessThanOrEqual(3);
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * ═══════════════════════════════════════════════════════════════════════
 * ÜÇ MARKANIN TELESKOP KAPSAMI: ASKAR, BRESSER, GSO
 * ═══════════════════════════════════════════════════════════════════════
 *
 * NEDEN BU TEST VAR
 *
 * Üç marka katalogda vardı ama teleskoplar YARIM ve KAYNAKSIZDI: 111
 * kayıttan neredeyse tamamı "bilinmiyor" üretim durumundaydı ve hiçbirinin
 * kaynak bağlantısı yoktu. Dahası birkaç sayı yanlıştı — GSO 8" RC odak
 * uzaklığı 1624 mm yazıyordu, üretici 1600 mm diyor; Askar 50P 250 mm
 * yazıyordu, üretici 190 mm diyor; Bresser MC-152 1900 mm yazıyordu,
 * üretici 2250 mm diyor.
 *
 * Kaynaklar (19.08.2026 taraması):
 *   - gs-telescope.com ürün ağacı → 37 GSO teleskobu, spec tablolarıyla
 *   - sharpstar-optics.com/Products (Askar bölümü) → 37 Askar ürünü
 *   - bresser.com yedi teleskop kategorisi → 130 BRESSER markalı SKU
 *
 * BU TESTİN KORUDUĞU ŞEY İKİ TANE:
 *
 * 1. PROVENANS. Katalog veritabanından yeniden üretildiğinde
 *    (`npm run katalog:disa-aktar`) bir teleskobun üretim durumu ya da
 *    kaynak bağlantısı kaybolursa test düşüyor. Kaynaksız bir teknik
 *    değer, nereden geldiğini söyleyemediğimiz bir iddiadır.
 *
 * 2. DÜZELTİLEN SAYILAR. Yukarıdaki üç yanlış değer buraya çakıldı;
 *    biri geri gelirse test düşüyor.
 */

const SEED = readFileSync('supabase/seed/01_katalog.sql', 'utf8');

interface ModelSatiri {
  slug: string;
  marka: string;
  kategori: string;
  model: string;
  odak: number | null;
  aciklik: number | null;
  durum: string;
  kaynakli: boolean;
  /** Doluysa bu satır başka bir kayda birleştirilmiş mükerrer (F03). */
  birlestirilmis: boolean;
}

/**
 * Seed satırındaki SQL literallerini sırayla ayırır.
 *
 * Tek bir dev düzenli ifade yerine küçük bir çözümleyici: seed dosyası
 * `quote_nullable` çıktısı taşıyor, yani `NULL`, `'metin'` ve ters bölü
 * içeren değerlerde `E'metin'` biçimleri karışık geliyor. Bunları desenle
 * kovalamak, alan sırası değişmese bile sessiz yanlış okumaya açık.
 */
function literalleriAyir(satir: string): (string | null)[] {
  const govde = satir.trim().replace(/^\(/, '').replace(/\),?$/, '');
  const cikti: (string | null)[] = [];
  let i = 0;

  while (i < govde.length) {
    while (govde[i] === ' ' || govde[i] === ',') i++;
    if (i >= govde.length) break;

    if (govde.startsWith('NULL', i)) {
      cikti.push(null);
      i += 4;
      continue;
    }

    /* `E'…'` kaçış dizesi: içeride `\\` ve `\'` olabilir. */
    const kacisli = govde[i] === 'E';
    if (kacisli) i++;
    if (govde[i] !== "'") return cikti; /* beklenmedik biçim — okumayı bırak */
    i++;

    let deger = '';
    while (i < govde.length) {
      if (kacisli && govde[i] === '\\') {
        deger += govde[i] + govde[i + 1];
        i += 2;
        continue;
      }
      if (govde[i] === "'") {
        if (govde[i + 1] === "'") {
          deger += "'";
          i += 2;
          continue;
        }
        i++;
        break;
      }
      deger += govde[i];
      i++;
    }
    cikti.push(deger);
  }
  return cikti;
}

/**
 * `equipment_models` bloğu: başlık satırından `on conflict`e kadar.
 *
 * Seed dosyasında beş tablo var ve hepsinin satırları aynı `  ('uuid', …`
 * biçiminde başlıyor. Blok sınırı çizilmezse gök cisimleri de model
 * sanılır — ilk sürüm tam olarak buna takıldı.
 */
const BLOK = (() => {
  const baslik = /insert into public\.equipment_models \(([^)]+)\) values\n/.exec(SEED);
  if (!baslik) throw new Error('seed dosyasında equipment_models başlığı yok');
  const bas = baslik.index + baslik[0].length;
  const son = SEED.indexOf('\non conflict', bas);
  if (son < 0) throw new Error('equipment_models bloğunun sonu bulunamadı');
  return { kolon: baslik[1].split(', '), govde: SEED.slice(bas, son) };
})();

const KOLON = BLOK.kolon;

function modelSatirlari(): ModelSatiri[] {
  const cikti: ModelSatiri[] = [];
  const al = (a: (string | null)[], ad: string) => a[KOLON.indexOf(ad)] ?? null;

  for (const satir of BLOK.govde.split('\n')) {
    if (!/^ {2}\('[0-9a-f-]{36}', /.test(satir)) continue;
    const a = literalleriAyir(satir);
    if (a.length !== KOLON.length) {
      throw new Error(`kolon sayısı uyuşmadı (${a.length}/${KOLON.length}): ${satir.slice(0, 80)}`);
    }
    const sayi = (ad: string) => {
      const v = al(a, ad);
      return v === null ? null : Number(v);
    };
    const kaynak = al(a, 'sources');
    cikti.push({
      slug: al(a, 'slug') ?? '',
      marka: al(a, 'brand_id') ?? '',
      kategori: al(a, 'category_id') ?? '',
      model: al(a, 'model') ?? '',
      odak: sayi('focal_length_mm'),
      aciklik: sayi('aperture_mm'),
      durum: al(a, 'production_status') ?? 'bilinmiyor',
      kaynakli: kaynak !== null && kaynak !== '[]',
      birlestirilmis: al(a, 'canonical_model_id') !== null,
    });
  }
  return cikti;
}

const MARKALAR = ['askar', 'bresser', 'gso'] as const;

describe('Askar / Bresser / GSO teleskop kapsamı', () => {
  const hepsi = modelSatirlari();
  /*
   * BİRLEŞTİRİLMİŞ MÜKERRERLER DIŞARIDA (F03). `canonical_model_id` dolu
   * satır, kanonik kayda taşınmış bir mükerrerdir: eski değerlerini geri
   * alma için OLDUĞU GİBİ saklıyor ve arayüzde görünmüyor. Onları burada
   * denetlemek, kasten korunan eski veriyi hata sanmak olurdu.
   */
  const teleskoplar = hepsi.filter(
    (m) =>
      MARKALAR.includes(m.marka as (typeof MARKALAR)[number]) &&
      m.kategori === 'optik-tup' &&
      !m.birlestirilmis
  );

  it('ayrıştırıcı seed dosyasını gerçekten okuyor', () => {
    /* Desen bozulursa liste boşalır ve alttaki testler sahte geçer. */
    expect(hepsi.length).toBeGreaterThan(1000);
    expect(teleskoplar.length).toBeGreaterThanOrEqual(130);
  });

  it('her teleskop en az bir kaynak bağlantısı taşıyor', () => {
    const kaynaksiz = teleskoplar.filter((m) => !m.kaynakli);
    expect(kaynaksiz.map((m) => m.slug)).toEqual([]);
  });

  it('hiçbir teleskop "bilinmiyor" üretim durumunda kalmıyor', () => {
    const belirsiz = teleskoplar.filter((m) => m.durum === 'bilinmiyor');
    expect(belirsiz.map((m) => m.slug)).toEqual([]);
  });

  it('üç markanın da satıştaki teleskopları var', () => {
    for (const marka of MARKALAR) {
      const guncel = teleskoplar.filter((m) => m.marka === marka && m.durum === 'guncel');
      expect(guncel.length, `${marka} güncel teleskop`).toBeGreaterThanOrEqual(20);
    }
  });

  it('odak/açıklık dolu olan her teleskobun oranı fiziksel aralıkta', () => {
    /*
     * f/1'in altı ya da f/20'nin üstü, bu üç markanın ürün gamında yok.
     * Aralık dışı bir değer, birim karışması ya da kolon kayması demektir —
     * eskiden 1624/203 yerine 1600/200 yazılması gibi sessiz hatalar
     * buradan değil, aşağıdaki çıpalardan yakalanıyor; bu test kaba
     * bozulmayı yakalıyor.
     */
    const bozuk = teleskoplar
      .filter((m) => m.odak !== null && m.aciklik !== null)
      .filter((m) => m.odak! / m.aciklik! < 1 || m.odak! / m.aciklik! > 20)
      .map((m) => `${m.slug}: ${m.odak}/${m.aciklik}`);
    expect(bozuk).toEqual([]);
  });

  /*
   * ÜRETİCİDEN OKUNAN ÇIPALAR. Üçü de katalogda YANLIŞTI; doğrusu
   * üreticinin kendi sayfasından alındı.
   */
  it.each([
    ['gso-rc-8', 1600, 200, 'gs-telescope.com: 8" F/8 RC = 200 mm / 1600 mm'],
    ['gso-classical-cassegrain-8', 2400, 200, 'gs-telescope.com: 8" F/12 CC = 200 mm / 2400 mm'],
    ['askar-50p', 190, 50, 'sharpstar-optics.com: 50P = 50 mm / 190 mm'],
    ['askar-sqa130', 624, 130, 'sharpstar-optics.com: SQA130 = 130 mm / 624 mm'],
    ['bresser-messier-mc-152-2250', 2250, 152, 'bresser.com: Messier MC-152/2250'],
  ])('%s üreticinin verdiği ölçüyü taşıyor', (slug, odak, aciklik, kaynak) => {
    const m = teleskoplar.find((x) => x.slug === slug);
    expect(m, `${slug} katalogda yok — ${kaynak}`).toBeDefined();
    expect(m?.odak, kaynak).toBe(odak);
    expect(m?.aciklik, kaynak).toBe(aciklik);
  });

  it('GSO ürün ağacındaki her seri katalogda temsil ediliyor', () => {
    const gso = teleskoplar.filter((m) => m.marka === 'gso').map((m) => m.model);
    for (const parca of [
      'Dobsonian-C',
      'Dobsonian-D',
      'Truss Dobsonian',
      'Reflector',
      'Newtonian',
      'RC scope',
      'Truss RC',
      'Lightweight RC',
      'Classic Cassegrain',
    ]) {
      expect(gso.some((m) => m.includes(parca)), `GSO ${parca}`).toBe(true);
    }
  });

  it('Askar serilerinin hepsi katalogda', () => {
    const askar = teleskoplar.filter((m) => m.marka === 'askar').map((m) => m.model);
    for (const parca of ['SQA', 'PHQ', 'FRA', 'APO', 'Flat-Field', 'FMA', 'N160', 'N210']) {
      expect(askar.some((m) => m.includes(parca)), `Askar ${parca}`).toBe(true);
    }
  });

  it('Bresser optikleri yalnızca BRESSER markalı ürünlerden geliyor', () => {
    /*
     * bresser.com Explore Scientific, Lunt ve Vixen de satıyor. O ürünler
     * BRESSER markası altına girerse katalog, üreticisi başka olan bir
     * teleskobu Bresser'in sanır.
     */
    const yabanci = teleskoplar
      .filter((m) => m.marka === 'bresser')
      .filter((m) => /explore scientific|lunt|vixen/i.test(m.model));
    expect(yabanci.map((m) => m.model)).toEqual([]);
  });
});

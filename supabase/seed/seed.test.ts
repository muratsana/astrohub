import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * SEED DOSYALARININ YAPISAL DENETİMİ — veritabanı gerektirmez.
 *
 * Dosyalar üretilmiş, ama üretilmiş olmak doğru olmayı garanti etmiyor:
 * ilk sürüm değerleri `row_to_json` üzerinden geçiriyordu ve `text[]`
 * kolonlarını JSON dizisine çevirdiği için boş dizi `{}` yerine `[]`
 * yazıyordu. Postgres bunu geri okuyamıyor. Hata YALNIZCA dosya
 * uygulandığında görünüyordu — yani bir sonraki kuruluma kadar sessizdi.
 *
 * Buradaki testler o sınıfın tamamını CI'a taşıyor: kolon sayısı ile değer
 * sayısı tutuyor mu, dizi literalleri Postgres biçiminde mi, dosya işlem
 * içinde mi kapanıyor. Hiçbiri veritabanı istemiyor, hepsi her koşuda
 * çalışıyor.
 */

const SEED_DIR = path.join(process.cwd(), 'supabase/seed');

function read(file: string): string {
  return readFileSync(path.join(SEED_DIR, file), 'utf8');
}

interface Statement {
  table: string;
  columns: string[];
  rows: string[];
}

/** `insert into public.x (a, b) values` bloklarını ve satırlarını ayırır. */
function statements(sql: string): Statement[] {
  const found: Statement[] = [];
  const header = /^insert into public\.(\w+) \(([^)]*)\) values$/gm;

  let match: RegExpExecArray | null;
  while ((match = header.exec(sql)) !== null) {
    const rest = sql.slice(match.index + match[0].length);
    const body = rest.split(/\non conflict /)[0];
    found.push({
      table: match[1],
      columns: match[2].split(',').map((c) => c.trim()),
      rows: body.split('\n').filter((line) => line.trim().startsWith('(')),
    });
  }
  return found;
}

/**
 * Bir VALUES satırını üst düzey virgüllerden böler.
 *
 * Naif `split(',')` işe yaramaz: değerlerin içinde virgül var (jsonb
 * nesneleri, diziler, Türkçe cümleler). Tırnak durumu takip ediliyor ve
 * SQL'in kaçış kuralı (`''`) gözetiliyor.
 */
function splitValues(row: string): string[] {
  const line = row.trim().replace(/,$/, '').slice(1, -1);
  const values: string[] = [];
  let current = '';
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === "'" && line[i + 1] === "'") {
        current += "''";
        i++;
        continue;
      }
      if (ch === "'") inQuote = false;
      current += ch;
    } else if (ch === "'") {
      inQuote = true;
      current += ch;
    } else if (ch === ',') {
      values.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  values.push(current.trim());
  return values;
}

const FILES = ['01_katalog.sql', '02_ornek-icerik.sql'];

describe.each(FILES)('%s', (file) => {
  const sql = read(file);
  const blocks = statements(sql);

  it('en az bir insert bloğu taşıyor', () => {
    expect(blocks.length).toBeGreaterThan(0);
  });

  /*
   * Asıl koruma bu. Kolon ve değer sayısı ayrışırsa Postgres ya hata verir
   * ya da — daha kötüsü — sayılar denk gelip DEĞERLER YANLIŞ KOLONA gider.
   */
  it('her satırda kolon sayısı kadar değer var', () => {
    for (const block of blocks) {
      block.rows.forEach((row, index) => {
        const values = splitValues(row);
        expect(
          values.length,
          `${block.table} satır ${index + 1}: ${values.length} değer, ${block.columns.length} kolon`
        ).toBe(block.columns.length);
      });
    }
  });

  /*
   * DİZİ KOLONLARI POSTGRES BİÇİMİNDE YAZILMALI (`{...}`), JSON biçiminde
   * (`[...]`) değil. Bu tam olarak üretimde çıkan hataydı: dışa aktarıcı
   * değerleri `row_to_json` üzerinden geçiriyor, o da `text[]` değerini
   * JSON dizisine çeviriyordu; boş dizi `{}` yerine `[]` olarak yazılıyor
   * ve Postgres onu geri okuyamıyordu.
   *
   * Liste elle tutuluyor çünkü seed dosyasında tip bilgisi yok. Yeni bir
   * dizi kolonu eklenip buraya yazılmazsa test onu korumaz — ama yanlış
   * yazılan bir kolon da sessiz kalmaz: aşağıdaki kolonlar kataloğun dizi
   * taşıyan tüm kolonları ve hepsi korunuyor.
   */
  const ARRAY_COLUMNS: Record<string, string[]> = {
    equipment_models: ['notes'],
    events: ['observed_targets', 'rules'],
    observing_sites: ['warnings'],
  };

  it('dizi kolonları Postgres dizi biçiminde yazılıyor', () => {
    for (const block of blocks) {
      const arrays = ARRAY_COLUMNS[block.table] ?? [];
      const indexes = arrays
        .map((name) => ({ name, index: block.columns.indexOf(name) }))
        .filter((c) => c.index >= 0);
      if (indexes.length === 0) continue;

      for (const row of block.rows) {
        const values = splitValues(row);
        for (const { name, index } of indexes) {
          const value = values[index];
          if (value === 'NULL') continue;
          expect(
            value.startsWith("'{") && value.endsWith("}'"),
            `${block.table}.${name} = ${value.slice(0, 40)} — dizi '{…}' olmalı`
          ).toBe(true);
        }
      }
    }
  });

  it('tek bir işlem içinde uygulanıyor', () => {
    expect(sql.trimStart().startsWith('begin;')).toBe(false);
    expect(sql).toContain('\nbegin;\n');
    expect(sql.trimEnd().endsWith('commit;')).toBe(true);
  });

  /*
   * `do update` şart: seed'in işi yalnızca eksiği tamamlamak değil,
   * kataloğun tek doğru hâlini dayatmak. `do nothing`e kayan bir blok,
   * elle bozulmuş bir satırı sessizce olduğu gibi bırakırdı.
   */
  it('tekrar-güvenli yazıyor', () => {
    for (const block of blocks) {
      expect(sql).toMatch(
        new RegExp(`insert into public\\.${block.table} [\\s\\S]*?on conflict \\([^)]+\\) do update set`)
      );
    }
  });
});

describe('katalog kapsamı', () => {
  /*
   * Sayılar üretimde ölçüldü. Kasıtlı bir değişiklik bu testi düşürür ve
   * güncellenmesi gerekir — bu bilinçli: kataloğun yarısının sessizce
   * kaybolduğu bir dışa aktarma, tam olarak böyle fark edilir.
   */
  it('beklenen tabloları ve satır büyüklüklerini taşıyor', () => {
    const blocks = statements(read('01_katalog.sql'));
    const counts = Object.fromEntries(
      blocks.map((b) => [b.table, b.rows.length])
    );

    expect(Object.keys(counts).sort()).toEqual([
      'catalog_identifiers',
      'celestial_objects',
      'equipment_brands',
      'equipment_categories',
      'equipment_models',
    ]);

    expect(counts.equipment_models).toBeGreaterThanOrEqual(1000);
    expect(counts.equipment_brands).toBeGreaterThanOrEqual(80);
    expect(counts.celestial_objects).toBeGreaterThanOrEqual(150);
    expect(counts.catalog_identifiers).toBeGreaterThanOrEqual(300);
  });

  /*
   * Yabancı anahtar sırası: modeller markalardan SONRA gelmeli. Bu sıranın
   * bozulması, kataloğun depoya hiç girememesinin asıl sebebiydi —
   * 0018–0020 markalara bağlı model ekliyordu ama markalar hiç eklenmiyordu.
   */
  it('yabancı anahtar sırası korunuyor', () => {
    const sql = read('01_katalog.sql');
    const at = (table: string) => sql.indexOf(`insert into public.${table} (`);

    expect(at('equipment_categories')).toBeLessThan(at('equipment_brands'));
    expect(at('equipment_brands')).toBeLessThan(at('equipment_models'));
    expect(at('celestial_objects')).toBeLessThan(at('catalog_identifiers'));
  });
});

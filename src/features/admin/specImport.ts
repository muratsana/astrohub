import { getSupabase } from '@/services/supabase/client';
import { isConnectionStandard } from '@/domain/equipment/connections';

/**
 * TOPLU TEKNİK VERİ İÇE AKTARMA.
 *
 * NEDEN VAR: piyasa listesinden 972 model geldi ama listede tek bir
 * sayısal alan yok — piksel boyutu, odak uzaklığı, yük kapasitesi,
 * backfocus, görüntü çemberi. Bunları tek tek panelden girmek yüzlerce
 * saat, tahminle doldurmak ise yasak: uyumluluk motoru tam olarak o
 * değerlerle hesap yapıyor ve yaklaşık bir sayı hata vermez, sessizce
 * yanlış sonuç üretir.
 *
 * Bu modül aradaki yolu açıyor: üretici sayfasından ya da bir tablodan
 * kopyalanan satırlar yapıştırılıyor, eşleşme ve doğrulama burada
 * yapılıyor, YAZMADAN ÖNCE ne olacağı gösteriliyor.
 *
 * ÜÇ KURAL
 *
 * 1. DOSYADA OLMAYAN ALANA DOKUNULMAZ. Boş bir hücre "bu değeri sil"
 *    demek değil, "bu dosya bu alan hakkında bir şey söylemiyor" demek.
 *    Aksi hâlde dar bir tablo yüklemek, elde olan veriyi siler.
 * 2. EŞLEŞMEYEN SATIR SESSİZCE ATLANMAZ. Katalogda karşılığı olmayan
 *    her satır ayrı listelenir; "412 satırdan 380'i yazıldı" demek,
 *    kalan 32'nin nereye gittiğini sormayı gerektirir.
 * 3. ÖNİZLEMESİZ YAZMA YOK. Ayrıştırma sonucu önce ekranda görünür;
 *    yanlış sütun eşlemesi ancak sonuçta fark ediliyor.
 */

/* ── Sütun eşlemesi ────────────────────────────────────────────────── */

/** Veritabanı kolonu → kabul edilen başlık adları. */
const COLUMN_ALIASES: Record<string, string[]> = {
  slug: ['slug', 'kod'],
  brand: ['marka', 'brand'],
  model: ['model', 'ürün', 'urun'],
  focal_length_mm: ['odak', 'odak uzaklığı', 'focal', 'focal length', 'fl'],
  aperture_mm: ['açıklık', 'aciklik', 'aperture', 'çap', 'cap'],
  pixel_size_um: ['piksel', 'piksel boyutu', 'pixel size', 'pixel'],
  payload_capacity_kg: ['yük', 'yük kapasitesi', 'payload', 'capacity'],
  weight_kg: ['ağırlık', 'agirlik', 'weight'],
  clear_aperture_mm: ['net açıklık', 'clear aperture'],
  image_circle_mm: ['görüntü çemberi', 'goruntu cemberi', 'image circle'],
  optical_length_mm: ['optik uzunluk', 'optical length'],
  required_backfocus_mm: ['backfocus', 'back focus', 'gereken backfocus'],
  flange_distance_mm: ['flanş', 'flans', 'flange', 'flange distance'],
  optic_factor: ['çarpan', 'carpan', 'factor', 'reducer factor'],
  filter_thickness_mm: ['filtre kalınlığı', 'filter thickness'],
  prism_size_mm: ['prizma', 'prism', 'prism size'],
  connection_input: ['giriş', 'giris', 'input', 'connection input'],
  connection_output: ['çıkış', 'cikis', 'output', 'connection output'],
  release_year: ['çıkış yılı', 'cikis yili', 'release year'],
  production_status: ['üretim', 'uretim', 'production', 'status'],
};

/** Sayısal olarak ayrıştırılacak kolonlar. */
const NUMERIC_COLUMNS = new Set([
  'focal_length_mm',
  'aperture_mm',
  'pixel_size_um',
  'payload_capacity_kg',
  'weight_kg',
  'clear_aperture_mm',
  'image_circle_mm',
  'optical_length_mm',
  'required_backfocus_mm',
  'flange_distance_mm',
  'optic_factor',
  'filter_thickness_mm',
  'prism_size_mm',
  'release_year',
]);

const PRODUCTION_STATUSES = new Set([
  'guncel',
  'uretimi-durduruldu',
  'eski-model',
  'bilinmiyor',
]);

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/\(.*?\)/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Başlık adını veritabanı kolonuna çevirir; tanınmazsa null. */
export function matchColumn(header: string): string | null {
  const clean = normalizeHeader(header);
  for (const [column, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.includes(clean)) return column;
  }
  return null;
}

/* ── Ayrıştırma ────────────────────────────────────────────────────── */

/**
 * Ayırıcıyı ilk satırdan tahmin eder.
 *
 * Tablodan kopyalanan veri sekmeyle, dışa aktarılan dosya virgülle
 * ya da noktalı virgülle gelir. Kullanıcıya "hangi biçim" diye sormak,
 * cevabı zaten veride duran bir soruyu sormaktır.
 */
export function detectDelimiter(headerLine: string): string {
  const counts = [
    { d: '\t', n: (headerLine.match(/\t/g) ?? []).length },
    { d: ';', n: (headerLine.match(/;/g) ?? []).length },
    { d: ',', n: (headerLine.match(/,/g) ?? []).length },
  ];
  counts.sort((a, b) => b.n - a.n);
  return counts[0].n > 0 ? counts[0].d : '\t';
}

/**
 * Sayıyı ayrıştırır — birim ekiyle ve ondalık virgülle birlikte.
 *
 * "550 mm", "3,76 µm", "f/5.5" gibi değerler üretici sayfalarından
 * doğrudan kopyalanıyor; kullanıcıdan temizlemesini beklemek, işi ona
 * geri vermek olur. Ayrıştırılamayan değer HATA olarak raporlanır,
 * sessizce 0 yazılmaz.
 */
export function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,-]/g, '').replace(',', '.');
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

export interface ImportRow {
  /** 1 tabanlı — kullanıcı hangi satırın sorunlu olduğunu görebilsin. */
  line: number;
  /** Katalogla eşleşmek için kullanılan anahtar. */
  slug?: string;
  brand?: string;
  model?: string;
  /** Yalnızca dosyada BULUNAN alanlar. */
  values: Record<string, string | number>;
  problems: string[];
}

export interface ParseResult {
  /** Tanınan başlıklar — kolon adlarıyla. */
  columns: string[];
  /** Tanınmayan başlıklar; yok sayıldıkları açıkça söylenir. */
  ignoredHeaders: string[];
  rows: ImportRow[];
  /** Hiç sorun taşımayan satır sayısı. */
  clean: number;
}

export function parseSpecTable(text: string): ParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { columns: [], ignoredHeaders: [], rows: [], clean: 0 };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = lines[0].split(delimiter).map((h) => h.trim());
  const mapped = headers.map(matchColumn);
  const columns = mapped.filter((c): c is string => c !== null);
  const ignoredHeaders = headers.filter((_, i) => mapped[i] === null);

  const rows: ImportRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cells = lines[i].split(delimiter);
    const row: ImportRow = { line: i + 1, values: {}, problems: [] };

    headers.forEach((_, index) => {
      const column = mapped[index];
      if (!column) return;
      const raw = (cells[index] ?? '').trim();
      /* Boş hücre "sil" demek değil, "bu dosya bunu söylemiyor" demek. */
      if (!raw) return;

      if (column === 'slug') row.slug = raw;
      else if (column === 'brand') row.brand = raw;
      else if (column === 'model') row.model = raw;
      else if (NUMERIC_COLUMNS.has(column)) {
        const value = parseNumber(raw);
        if (value === null) {
          row.problems.push(`${column}: "${raw}" sayıya çevrilemedi`);
        } else if (value <= 0 && column !== 'release_year') {
          row.problems.push(`${column}: ${value} — sıfır ya da negatif olamaz`);
        } else {
          row.values[column] = value;
        }
      } else if (
        column === 'connection_input' ||
        column === 'connection_output'
      ) {
        if (!isConnectionStandard(raw)) {
          row.problems.push(`${column}: "${raw}" bilinen bir bağlantı değil`);
        } else {
          row.values[column] = raw;
        }
      } else if (column === 'production_status') {
        if (!PRODUCTION_STATUSES.has(raw)) {
          row.problems.push(`production_status: "${raw}" geçersiz`);
        } else {
          row.values[column] = raw;
        }
      }
    });

    if (!row.slug && !(row.brand && row.model)) {
      row.problems.push('Eşleşme için slug ya da marka+model gerekli');
    }
    if (Object.keys(row.values).length === 0 && row.problems.length === 0) {
      row.problems.push('Yazılacak alan yok — tüm hücreler boş');
    }

    rows.push(row);
  }

  return {
    columns,
    ignoredHeaders,
    rows,
    clean: rows.filter((r) => r.problems.length === 0).length,
  };
}

/* ── Yazma ─────────────────────────────────────────────────────────── */

export interface ImportOutcome {
  updated: number;
  /** Katalogda karşılığı bulunamayan satırlar. */
  unmatched: ImportRow[];
  /** Doğrulamadan geçemeyen satırlar. */
  rejected: ImportRow[];
  errors: string[];
}

/**
 * Ayrıştırılmış satırları katalog kayıtlarına yazar.
 *
 * `data_confidence` 'tek-kaynak' olarak işaretleniyor: değer tek bir
 * dosyadan geldi ve ikinci bir kaynakla karşılaştırılmadı. Bunu
 * 'dogrulanmis' saymak, yapılmamış bir doğrulamayı yapılmış göstermek
 * olurdu; yönetici ikinci kaynağı gördüğünde satır içi düzenlemeden
 * yükseltir.
 */
export async function applySpecImport(
  rows: ImportRow[]
): Promise<ImportOutcome> {
  const outcome: ImportOutcome = {
    updated: 0,
    unmatched: [],
    rejected: [],
    errors: [],
  };

  const usable = rows.filter((r) => r.problems.length === 0);
  outcome.rejected = rows.filter((r) => r.problems.length > 0);

  if (usable.length === 0) return outcome;

  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  const supabase = await promise;
  const today = new Date().toISOString().slice(0, 10);

  for (const row of usable) {
    /* Eşleşme önce slug ile: marka+model yazımı üretici sayfasından
       kopyalandığında boşluk ve büyük harf farkları taşıyor. */
    let query = supabase.from('equipment_models').select('slug').limit(2);
    if (row.slug) {
      query = query.eq('slug', row.slug);
    } else {
      query = query
        .ilike('model', row.model!)
        .eq('brand_id', row.brand!.toLocaleLowerCase('tr-TR'));
    }

    const { data, error } = await query;
    if (error) {
      outcome.errors.push(`Satır ${row.line}: ${error.message}`);
      continue;
    }

    const matches = (data ?? []) as { slug: string }[];
    if (matches.length === 0) {
      outcome.unmatched.push(row);
      continue;
    }
    if (matches.length > 1) {
      /* Birden fazla eşleşme belirsizlik demek; hangisine yazılacağını
         tahmin etmek, yanlış modele veri yazma riskidir. */
      outcome.unmatched.push({
        ...row,
        problems: [...row.problems, 'Birden fazla model eşleşti — slug verin'],
      });
      continue;
    }

    const { error: writeError } = await supabase
      .from('equipment_models')
      .update({
        ...row.values,
        data_confidence: 'tek-kaynak',
        verified_at: today,
      })
      .eq('slug', matches[0].slug);

    if (writeError) {
      outcome.errors.push(`Satır ${row.line}: ${writeError.message}`);
      continue;
    }
    outcome.updated += 1;
  }

  return outcome;
}

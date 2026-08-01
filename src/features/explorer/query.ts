import { compareTr, normalizeTr } from '@/lib/text';

/**
 * ═══════════════════════════════════════════════════════════════════════
 * DATA EXPLORER — ortak sorgu durumu (Faz 4)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ÖLÇÜLEN DURUM
 *
 * On liste sayfası vardı ve her biri kendi filtre durumunu `useState` ile
 * tutuyordu. Sonuçları:
 *
 *   · Hiçbiri URL'ye yazmıyordu — yani filtrelenmiş bir liste
 *     PAYLAŞILAMIYOR, geri düğmesi filtreyi geri almıyor, sayfa
 *     yenilenince seçim uçuyordu.
 *   · Hiçbirinde debounce yoktu; her tuş vuruşunda bütün liste yeniden
 *     süzülüyordu.
 *   · Sıralama on sayfadan yalnızca üçünde vardı.
 *   · Aktif filtreleri gösteren bir chip şeridi ya da "hepsini temizle"
 *     hiçbirinde yoktu.
 *
 * Ana görev belgesi §7 bunu adıyla yasaklıyor: "Her modül aynı arama/filtre
 * motorunu kullanmalı; ayrı ve tutarsız filtre bileşenleri
 * üretilmemelidir."
 *
 * ─────────────────────────────────────────────────────────────────────
 * BU DOSYA SAF
 *
 * React yok, URL yok — yalnızca `URLSearchParams` ile sorgu nesnesi
 * arasındaki çeviri ve süzme/sıralama yardımcıları. Sebebi test
 * edilebilirlik: filtre mantığının doğruluğu bir bileşenin render
 * ağacından bağımsız ölçülebilmeli.
 *
 * Bağlama (`useSearchParams`, debounce) `useExplorer.ts` içinde.
 *
 * ─────────────────────────────────────────────────────────────────────
 * SUNUCU TARAFI HAZIR AMA AÇIK DEĞİL
 *
 * `ExplorerQuery` sayfa ve sayfa boyutu taşıyor; süzme şu an İSTEMCİDE
 * yapılıyor çünkü kataloglar zaten tamamı belleğe inen listeler (tohum
 * dizisi ya da birkaç yüz satır). Sunucu tarafı sayfalama, veri hacmi
 * onu gerektirdiğinde `applyQuery` yerine bir PostgREST sorgusu
 * kurularak açılır — sorgu durumunun ŞEKLİ o güne hazır, ama bugün
 * çalışan şey istemci tarafı ve rapor bunu böyle söylüyor.
 */

/** Bir facet'in tanımı — hangi parametre, hangi alan, hangi etiket. */
export interface FacetSpec<T> {
  /** URL parametre adı (`tur`, `sehir`, `durum`…). */
  param: string;
  /** Chip'te görünen insan okunur ad. */
  label: string;
  /** Kayıttan bu facet'in değer(ler)ini çıkarır. */
  valueOf: (item: T) => string | string[] | null | undefined;
  /** Değer → görünen etiket. Verilmezse değerin kendisi. */
  labelOf?: (value: string) => string;
}

/** Bir sıralama seçeneği. */
export interface SortSpec<T> {
  /** URL değeri (`yeni`, `eski`, `ad`…). */
  value: string;
  label: string;
  compare: (a: T, b: T) => number;
}

export interface ExplorerSpec<T> {
  /** Tam metin aramanın tarayacağı alanlar. */
  searchFields: (item: T) => (string | null | undefined)[];
  facets: FacetSpec<T>[];
  sorts: SortSpec<T>[];
  /** Varsayılan sıralama — `sorts` içinde bir `value`. */
  defaultSort: string;
  /** Sayfa başına kayıt; 0 ise sayfalama yok. */
  pageSize?: number;
}

export interface ExplorerQuery {
  q: string;
  /** param → seçili değerler. Çoklu seçim. */
  facets: Record<string, string[]>;
  sort: string;
  page: number;
}

/* URL'de kullanılan sabit parametre adları. */
export const PARAM_Q = 'ara';
export const PARAM_SORT = 'sirala';
export const PARAM_PAGE = 'sayfa';

/**
 * URL parametrelerinden sorgu durumu okur.
 *
 * BİLİNMEYEN DEĞER SESSİZCE DÜŞÜRÜLÜYOR: `?sirala=çorba` gibi bir
 * parametre hata ekranı göstermeyi hak etmiyor, ama tanımsız bir
 * sıralamayla boş liste göstermeyi de hak etmiyor. Varsayılana dönüyor.
 */
export function parseQuery<T>(
  params: URLSearchParams,
  spec: ExplorerSpec<T>
): ExplorerQuery {
  const facets: Record<string, string[]> = {};
  for (const f of spec.facets) {
    /* Çoklu seçim virgülle: `?tur=bulutsu,galaksi`. Tekrarlanan
       parametre (`?tur=a&tur=b`) da destekleniyor — paylaşılan
       bağlantılar iki biçimde de gelebiliyor. */
    const raw = params.getAll(f.param).flatMap((v) => v.split(','));
    const temiz = [...new Set(raw.map((v) => v.trim()).filter(Boolean))];
    if (temiz.length) facets[f.param] = temiz;
  }

  const sortParam = params.get(PARAM_SORT);
  const sort = spec.sorts.some((s) => s.value === sortParam)
    ? (sortParam as string)
    : spec.defaultSort;

  const pageRaw = Number(params.get(PARAM_PAGE));
  const page = Number.isFinite(pageRaw) && pageRaw > 1 ? Math.trunc(pageRaw) : 1;

  return { q: params.get(PARAM_Q)?.trim() ?? '', facets, sort, page };
}

/**
 * Sorgu durumunu URL parametrelerine yazar.
 *
 * VARSAYILAN DEĞERLER YAZILMIYOR. Boş arama, varsayılan sıralama ve
 * birinci sayfa parametre üretmiyor — yoksa hiçbir şey seçmemiş
 * kullanıcının adresi `?ara=&sirala=yeni&sayfa=1` gibi görünür ve
 * paylaşılan bağlantı gereksiz gürültü taşır.
 */
export function toParams<T>(
  query: ExplorerQuery,
  spec: ExplorerSpec<T>,
  taban?: URLSearchParams
): URLSearchParams {
  /* Taban parametreler korunuyor: aynı sayfada explorer dışında bir
     parametre olabilir (ör. `?gece=`), onu silmek başka bir özelliği
     bozar. */
  const p = new URLSearchParams(taban);
  p.delete(PARAM_Q);
  p.delete(PARAM_SORT);
  p.delete(PARAM_PAGE);
  for (const f of spec.facets) p.delete(f.param);

  if (query.q.trim()) p.set(PARAM_Q, query.q.trim());
  if (query.sort !== spec.defaultSort) p.set(PARAM_SORT, query.sort);
  if (query.page > 1) p.set(PARAM_PAGE, String(query.page));
  for (const f of spec.facets) {
    const v = query.facets[f.param];
    if (v?.length) p.set(f.param, v.join(','));
  }
  return p;
}

export const EMPTY_QUERY: ExplorerQuery = { q: '', facets: {}, sort: '', page: 1 };

/** Kullanıcı herhangi bir seçim yaptı mı? */
export function hasActiveFilters(query: ExplorerQuery): boolean {
  return (
    query.q.trim() !== '' ||
    Object.values(query.facets).some((v) => v.length > 0)
  );
}

export interface Chip {
  /** Hangi facet — `PARAM_Q` ise arama terimi chip'i. */
  param: string;
  value: string;
  label: string;
}

/**
 * Aktif filtreleri chip listesine çevirir.
 *
 * Arama terimi de bir chip: kullanıcı sonuçların neden az olduğunu
 * ararken çoğu zaman arama kutusuna değil filtre listesine bakıyor.
 */
export function activeChips<T>(
  query: ExplorerQuery,
  spec: ExplorerSpec<T>
): Chip[] {
  const chips: Chip[] = [];
  if (query.q.trim()) {
    chips.push({ param: PARAM_Q, value: query.q, label: `"${query.q}"` });
  }
  for (const f of spec.facets) {
    for (const v of query.facets[f.param] ?? []) {
      chips.push({
        param: f.param,
        value: v,
        label: `${f.label}: ${f.labelOf?.(v) ?? v}`,
      });
    }
  }
  return chips;
}

/** Tek bir chip'i kaldırır. */
export function removeChip(query: ExplorerQuery, chip: Chip): ExplorerQuery {
  if (chip.param === PARAM_Q) return { ...query, q: '', page: 1 };
  const kalan = (query.facets[chip.param] ?? []).filter((v) => v !== chip.value);
  const facets = { ...query.facets };
  if (kalan.length) facets[chip.param] = kalan;
  else delete facets[chip.param];
  return { ...query, facets, page: 1 };
}

/** Bir facet değerini açar/kapatır (çoklu seçim). */
export function toggleFacet(
  query: ExplorerQuery,
  param: string,
  value: string
): ExplorerQuery {
  const mevcut = query.facets[param] ?? [];
  const kalan = mevcut.includes(value)
    ? mevcut.filter((v) => v !== value)
    : [...mevcut, value];
  const facets = { ...query.facets };
  if (kalan.length) facets[param] = kalan;
  else delete facets[param];
  /* Sayfa 1'e dönüyor: filtre daraldığında kullanıcının bulunduğu 7.
     sayfa artık var olmayabilir ve boş liste "sonuç yok" gibi okunur. */
  return { ...query, facets, page: 1 };
}

/** Kayıt arama terimiyle eşleşiyor mu — Türkçe normalize edilmiş. */
export function matchesSearch<T>(
  item: T,
  q: string,
  spec: ExplorerSpec<T>
): boolean {
  const terim = normalizeTr(q);
  if (!terim) return true;
  const alan = normalizeTr(spec.searchFields(item).filter(Boolean).join(' '));

  /*
   * BOŞLUK AYIRT EDİCİ BİR BİLGİ DEĞİL.
   *
   * Katalog kodları hem "M 31" hem "M31" diye yazılıyor ve hangisinin
   * yazıldığı kullanıcıya göre değişiyor — "NGC 7000" ile "ngc7000"
   * aynı hedef. Boşluksuz hâller de karşılaştırılıyor.
   *
   * Yalnızca boşluksuz karşılaştırma yapmak YETMEZ: o zaman "orion
   * bulutsu" yazan biri "Orion Bulutsusu"nu bulamaz, çünkü boşluksuz
   * hâlde "orionbulutsu" aranır ve alanda "orionbulutsusu" olsa bile
   * araya giren kelimeler eşleşmeyi bozar. İki yol birlikte:
   * kelime kelime VEYA tamamen boşluksuz.
   */
  const kelimeceEsler = terim
    .split(' ')
    .every((kelime) => alan.includes(kelime));
  if (kelimeceEsler) return true;

  const sik = (v: string) => v.replace(/\s+/g, '');
  return sik(alan).includes(sik(terim));
}

/** Kayıt facet seçimlerine uyuyor mu — facet'ler VE, değerler VEYA. */
export function matchesFacets<T>(
  item: T,
  query: ExplorerQuery,
  spec: ExplorerSpec<T>
): boolean {
  for (const f of spec.facets) {
    const secili = query.facets[f.param];
    if (!secili?.length) continue;
    const ham = f.valueOf(item);
    const degerler = (Array.isArray(ham) ? ham : [ham]).filter(
      (v): v is string => typeof v === 'string' && v !== ''
    );
    /*
     * FACET'LER ARASINDA "VE", DEĞERLER ARASINDA "VEYA".
     *
     * Kullanıcı "Bulutsu + Galaksi" seçtiğinde ikisinden BİRİ olanı
     * bekler (aynı soru, iki cevap); "Bulutsu + İstanbul" seçtiğinde
     * ikisini BİRDEN bekler (iki ayrı soru). Tek bir mantıkla
     * birleştirmek ikisinden birini yanlış yapardı.
     */
    if (!degerler.some((v) => secili.includes(v))) return false;
  }
  return true;
}

export interface ExplorerResult<T> {
  /** Sayfalanmış sonuç. */
  items: T[];
  /** Sayfalama ÖNCESİ toplam eşleşme. */
  total: number;
  page: number;
  pageCount: number;
}

/** Süz → sırala → sayfala. */
export function applyQuery<T>(
  source: readonly T[],
  query: ExplorerQuery,
  spec: ExplorerSpec<T>
): ExplorerResult<T> {
  const suzulmus = source.filter(
    (item) => matchesSearch(item, query.q, spec) && matchesFacets(item, query, spec)
  );

  const sirala = spec.sorts.find((s) => s.value === query.sort);
  const sirali = sirala ? [...suzulmus].sort(sirala.compare) : suzulmus;

  const boyut = spec.pageSize ?? 0;
  if (boyut <= 0) {
    return { items: sirali, total: sirali.length, page: 1, pageCount: 1 };
  }

  const pageCount = Math.max(1, Math.ceil(sirali.length / boyut));
  /* Sayfa aralık dışıysa SON sayfaya çekiliyor: filtre daraldığında
     kullanıcının bulunduğu sayfa yok olabilir ve boş liste "sonuç yok"
     gibi okunur. */
  const page = Math.min(Math.max(1, query.page), pageCount);
  return {
    items: sirali.slice((page - 1) * boyut, page * boyut),
    total: sirali.length,
    page,
    pageCount,
  };
}

/**
 * Her facet değerinin kaç kayda denk geldiği.
 *
 * SAYIM O FACET'İN KENDİ SEÇİMİ HARİÇ yapılıyor. "Bulutsu (12)" yazıp
 * bulutsu seçilince sayının 12'de kalması gerekir; o facet'i de
 * uygularsak diğer değerlerin hepsi 0 görünür ve kullanıcı seçimini
 * değiştiremez — tipik "faceted search" hatası.
 */
export function facetCounts<T>(
  source: readonly T[],
  query: ExplorerQuery,
  spec: ExplorerSpec<T>,
  param: string
): Map<string, number> {
  const f = spec.facets.find((x) => x.param === param);
  const sayim = new Map<string, number>();
  if (!f) return sayim;

  const digerleri: ExplorerQuery = {
    ...query,
    facets: Object.fromEntries(
      Object.entries(query.facets).filter(([k]) => k !== param)
    ),
  };

  for (const item of source) {
    if (!matchesSearch(item, query.q, spec)) continue;
    if (!matchesFacets(item, digerleri, spec)) continue;
    const ham = f.valueOf(item);
    for (const v of Array.isArray(ham) ? ham : [ham]) {
      if (typeof v !== 'string' || v === '') continue;
      sayim.set(v, (sayim.get(v) ?? 0) + 1);
    }
  }
  return sayim;
}

/** Metin alanına göre Türkçe alfabetik sıralayıcı üretir. */
export function byText<T>(pick: (item: T) => string): (a: T, b: T) => number {
  return (a, b) => compareTr(pick(a), pick(b));
}

/**
 * Sayısal alana göre sıralayıcı — `null` DEĞERLER SONA.
 *
 * Belge "null değerlerin kontrollü konumu" diyor. Eksik değeri 0 saymak
 * en yaygın hata: puanı olmayan bir kayıt "en düşük puanlı" diye
 * listenin dibine yazılır ve orada gerçek bir sıfır gibi okunur.
 */
export function byNumber<T>(
  pick: (item: T) => number | null | undefined,
  dir: 'asc' | 'desc' = 'desc'
): (a: T, b: T) => number {
  return (a, b) => {
    const x = pick(a);
    const y = pick(b);
    const xYok = x === null || x === undefined || Number.isNaN(x);
    const yYok = y === null || y === undefined || Number.isNaN(y);
    if (xYok && yYok) return 0;
    if (xYok) return 1;
    if (yYok) return -1;
    return dir === 'asc' ? x - y : y - x;
  };
}

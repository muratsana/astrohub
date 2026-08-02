import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  applyQuery,
  facetCounts,
  parseQuery,
  removeChip as removeChipPure,
  toParams,
  toggleFacet as toggleFacetPure,
  setRange as setRangePure,
  activeChips,
  hasActiveFilters,
  PARAM_Q,
  type Chip,
  type ExplorerQuery,
  type ExplorerResult,
  type ExplorerSpec,
  type RangeValue,
} from './query';

/**
 * ═══════════════════════════════════════════════════════════════════════
 * DATA EXPLORER — React bağlaması (Faz 4)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Saf mantık `query.ts` içinde ve orada test ediliyor. Burada yalnızca
 * iki iş var: durumu URL'ye bağlamak ve arama kutusunu geciktirmek.
 *
 * ─────────────────────────────────────────────────────────────────────
 * DURUM URL'DE, `useState`TE DEĞİL
 *
 * On liste sayfası filtresini `useState` ile tutuyordu. Bunun üç sonucu
 * vardı ve üçü de kullanıcının gördüğü şeyler:
 *   · Filtrelenmiş bir liste paylaşılamıyordu.
 *   · Geri düğmesi filtreyi geri almıyor, sayfadan çıkarıyordu.
 *   · Sayfa yenilenince bütün seçim uçuyordu.
 *
 * URL tek doğruluk kaynağı olunca üçü birden çözülüyor ve tarayıcının
 * geri/ileri davranışı bedava geliyor.
 *
 * ─────────────────────────────────────────────────────────────────────
 * ARAMA KUTUSU İKİ DEĞERLİ
 *
 * `searchInput` her tuş vuruşunda güncelleniyor (kutu takılmasın),
 * `query.q` ise gecikmeli. Tek değer olsaydı ya kutu geride kalırdı ya
 * da her harf bir geçmiş kaydı üretirdi.
 *
 * `replace: true`: filtre değiştirmek bir GEZİNME değil. Her tuş vuruşu
 * geçmişe kayıt eklerse geri düğmesi kullanıcıyı sayfadan çıkarmak
 * yerine harf harf geri sarar.
 */

/** Arama gecikmesi. 250 ms yazarken takılma hissi vermeyen üst sınır. */
const DEBOUNCE_MS = 250;

export interface Explorer<T> extends ExplorerResult<T> {
  query: ExplorerQuery;
  /** Kutuya yazılan ham değer — gecikmesiz. */
  searchInput: string;
  setSearch: (value: string) => void;
  clearSearch: () => void;
  setSort: (value: string) => void;
  setPage: (value: number) => void;
  toggleFacet: (param: string, value: string) => void;
  /** Aralık sınırını ya da "boşlar dahil" işaretini değiştirir. */
  setRange: (param: string, value: Partial<RangeValue>) => void;
  removeChip: (chip: Chip) => void;
  clearAll: () => void;
  chips: Chip[];
  hasFilters: boolean;
  /** Bir facet'in değer sayıları — seçim kendi sayımını sıfırlamaz. */
  counts: (param: string) => Map<string, number>;
}

export function useExplorer<T>(
  source: readonly T[],
  spec: ExplorerSpec<T>
): Explorer<T> {
  const [params, setParams] = useSearchParams();
  const query = useMemo(() => parseQuery(params, spec), [params, spec]);

  const [searchInput, setSearchInput] = useState(query.q);

  /*
   * URL DIŞARIDAN DEĞİŞİRSE KUTU DA DEĞİŞMELİ: geri düğmesi, paylaşılan
   * bağlantı ya da "hepsini temizle". Kullanıcı yazarken tetiklenmiyor
   * çünkü o durumda `query.q` zaten kutudaki değere eşitleniyor.
   */
  const sonYazilan = useRef(query.q);
  useEffect(() => {
    if (query.q !== sonYazilan.current) {
      sonYazilan.current = query.q;
      setSearchInput(query.q);
    }
  }, [query.q]);

  const yaz = useCallback(
    (next: ExplorerQuery) => {
      setParams(toParams(next, spec, params), { replace: true });
    },
    [params, setParams, spec]
  );

  const setSearch = useCallback((value: string) => {
    setSearchInput(value);
  }, []);

  /* Gecikmeli yazma. Bağımlılıkta `yaz` var ama `query` yok: `query`
     eklenirse URL her değişimde zamanlayıcı yeniden kurulur ve gecikme
     hiç dolmaz. */
  useEffect(() => {
    if (searchInput === query.q) return;
    const t = setTimeout(() => {
      sonYazilan.current = searchInput;
      yaz({ ...query, q: searchInput, page: 1 });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, query.q]);

  const result = useMemo(
    () => applyQuery(source, query, spec),
    [source, query, spec]
  );

  return {
    ...result,
    query,
    searchInput,
    setSearch,
    clearSearch: useCallback(() => {
      setSearchInput('');
      sonYazilan.current = '';
      yaz({ ...query, q: '', page: 1 });
    }, [query, yaz]),
    setSort: useCallback(
      (value: string) => yaz({ ...query, sort: value, page: 1 }),
      [query, yaz]
    ),
    setPage: useCallback((value: number) => yaz({ ...query, page: value }), [query, yaz]),
    toggleFacet: useCallback(
      (param: string, value: string) => yaz(toggleFacetPure(query, param, value)),
      [query, yaz]
    ),
    setRange: useCallback(
      (param: string, value: Partial<RangeValue>) =>
        yaz(setRangePure(query, param, value)),
      [query, yaz]
    ),
    removeChip: useCallback(
      (chip: Chip) => {
        if (chip.param === PARAM_Q) setSearchInput('');
        yaz(removeChipPure(query, chip));
      },
      [query, yaz]
    ),
    clearAll: useCallback(() => {
      setSearchInput('');
      sonYazilan.current = '';
      /* Sıralama KORUNUYOR: "hepsini temizle" filtreleri temizler,
         kullanıcının sıralama tercihini değil. */
      yaz({ q: '', facets: {}, ranges: {}, sort: query.sort, page: 1 });
    }, [query.sort, yaz]),
    chips: useMemo(() => activeChips(query, spec), [query, spec]),
    hasFilters: hasActiveFilters(query),
    counts: useCallback(
      (param: string) => facetCounts(source, query, spec, param),
      [source, query, spec]
    ),
  };
}

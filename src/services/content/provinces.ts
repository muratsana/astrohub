import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';
import { cities as seedCities, type City } from '@/features/location/cities';

/**
 * TÜRKİYE İLLERİ — tek merkezî kaynak (Faz 1.1).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN VERİTABANI, KOD DEĞİL
 *
 * Şehir listesi `features/location/cities.ts` içinde SABİTTİ ve yalnızca
 * 15 il taşıyordu. Aynı anda pazaryeri, forum, kulüpler ve gözlem
 * noktaları kendi şehir METİNLERİNİ tutuyordu — "Ankara" altı ayrı
 * yerde, altı ayrı yazımla bulunabiliyordu. Bir kullanıcı "Muğla",
 * diğeri "Mugla" yazınca filtre ikisini birden bulamıyordu.
 *
 * Artık 81 il `provinces` tablosunda (0040) ve buradan okunuyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TOHUM YEDEĞİ KALDI AMA ROLÜ DEĞİŞTİ
 *
 * `cities.ts` artık "şehir listesi" değil, YAPILANDIRMA YOKKEN çalışan
 * bir yedek. Tek dosya önizlemede ve testte veritabanı yok; orada 15
 * ille açılan bir seçici, hiç açılmayan bir seçiciden iyi. Yedeğe
 * düşüldüğü `source` alanıyla açıkça bildiriliyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ARAMA İKİ YÖNLÜ
 *
 * Kullanıcı "cankiri" yazınca "Çankırı"yı, "Çankırı" yazınca da
 * bulmalı. Bu yüzden hem sorgu hem kayıt aynı normalizasyondan geçiyor
 * (`normalizeTr`) — veritabanındaki `search_name` kolonu da aynı
 * kuralla üretildi.
 *
 * TÜRKÇE I/İ TUZAĞI: `'I'.toLowerCase()` JavaScript'te 'i' verir, oysa
 * Türkçede 'ı' olmalı. `toLocaleLowerCase('tr-TR')` önce çalışıyor.
 */

export interface Province {
  /** Plaka kodu — kanonik ve değişmez kimlik. */
  code: number;
  name: string;
  slug: string;
  searchName: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
}

const HARFLER: Record<string, string> = {
  ı: 'i', ş: 's', ğ: 'g', ü: 'u', ö: 'o', ç: 'c', â: 'a', î: 'i', û: 'u',
};

/** Veritabanındaki `app.tr_normalize` ile AYNI kuralı uygular. */
export function normalizeTr(input: string): string {
  return input
    .toLocaleLowerCase('tr-TR')
    .replace(/[ışğüöçâîû]/g, (c) => HARFLER[c] ?? c);
}

/** Arama terimi bir ile uyuyor mu — baştan eşleşme önce gelir. */
export function matchesProvince(p: Province, term: string): boolean {
  const t = normalizeTr(term.trim());
  return t === '' || p.searchName.includes(t);
}

/**
 * Aramada sıralama: baştan eşleşenler önce.
 *
 * "an" yazan biri Ankara'yı Adıyaman'dan önce görmeli; ikisi de
 * eşleşiyor ama biri başlangıç.
 */
export function rankProvinces(list: Province[], term: string): Province[] {
  const t = normalizeTr(term.trim());
  if (t === '') return list;
  return [...list].sort((a, b) => {
    const ai = a.searchName.startsWith(t) ? 0 : 1;
    const bi = b.searchName.startsWith(t) ? 0 : 1;
    return ai !== bi ? ai - bi : a.searchName.localeCompare(b.searchName);
  });
}

interface Row {
  code: number;
  name: string;
  slug: string;
  search_name: string;
  latitude: number | string;
  longitude: number | string;
  is_active: boolean;
}

/**
 * Tohum şehirleri il modeline çevirir.
 *
 * Plaka kodu YOK — tohumda gerçek kod bilgisi yok ve uydurmak, kod
 * üzerinden eşleşen bir sorgunun sessizce yanlış ile bağlanması demek.
 * Negatif değer veriliyor ki gerçek bir plakayla asla karışmasın.
 */
function seedToProvinces(): Province[] {
  return seedCities.map((c: City, i) => ({
    code: -(i + 1),
    name: c.name,
    slug: c.id,
    searchName: normalizeTr(c.name),
    latitude: c.latitude,
    longitude: c.longitude,
    isActive: true,
  }));
}

export interface ProvinceResult {
  items: Province[];
  /** `db` gerçek liste, `seed` yapılandırma yok ya da okuma düştü. */
  source: 'db' | 'seed';
}

let cache: ProvinceResult | null = null;
let inflight: Promise<ProvinceResult> | null = null;

/**
 * 81 ili getirir.
 *
 * TEK İSTEK: liste sürüm başına sabit ve her şehir seçici onu istiyor.
 * Önbelleklenmeseydi bir sayfada dört seçici dört ayrı istek atardı.
 */
export async function fetchProvinces(): Promise<ProvinceResult> {
  if (cache) return cache;
  if (inflight) return inflight;

  inflight = (async (): Promise<ProvinceResult> => {
    if (!isSupabaseConfigured) {
      return { items: seedToProvinces(), source: 'seed' };
    }
    try {
      const promise = getSupabase();
      if (!promise) return { items: seedToProvinces(), source: 'seed' };
      const supabase = await promise;
      const { data, error } = await supabase
        .from('provinces')
        .select('code, name, slug, search_name, latitude, longitude, is_active')
        .order('sort_order');

      if (error || !data || data.length === 0) {
        return { items: seedToProvinces(), source: 'seed' };
      }

      return {
        items: (data as Row[]).map((r) => ({
          code: r.code,
          name: r.name,
          slug: r.slug,
          searchName: r.search_name,
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
          isActive: r.is_active,
        })),
        source: 'db',
      };
    } catch {
      /* Ağ hatası listeyi boş bırakmamalı: şehir seçici olmadan
         etkinlik, ilan ve hava durumu akışları kullanılamaz. */
      return { items: seedToProvinces(), source: 'seed' };
    } finally {
      inflight = null;
    }
  })();

  cache = await inflight;
  return cache;
}

/** Testler için — modül düzeyi önbelleği sıfırlar. */
export function resetProvinceCache(): void {
  cache = null;
  inflight = null;
}

import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';
import { cities as seedCities, type City } from '@/features/location/cities';
import { normalizeTr } from '@/lib/text';

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

/**
 * Normalizasyon `lib/text.ts`te (Faz 4.1). Buradaki kopya kaldırıldı;
 * kural veritabanındaki `app.tr_normalize` ile birebir aynı kalmalı ve
 * iki kopyanın ayrışması "cankiri" arayanın Çankırı'yı bulamaması demek.
 */
export { normalizeTr };

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
 * PLAKA KODU ARTIK GERÇEK. Eskiden tohumda kod bilgisi yoktu ve burada
 * negatif sayılar üretiliyordu — "uydurma bir kod, gerçek bir plakayla
 * karışmasın" diye. Sonucu görünmez ama ağırdı: ilçeler `province_code`
 * ile sorgulandığı için, yedeğe düşen her ortamda İLÇE SEÇİCİ SESSİZCE
 * BOŞ KALIYORDU. `cities.ts` 81 ili plakasıyla taşıdığından kod artık
 * uydurulmuyor; yedek yol da tam çalışıyor.
 */
function seedToProvinces(): Province[] {
  return seedCities.map((c: City) => ({
    code: c.code,
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
 * SORGU BU SÜREDE DÖNMEZSE TOHUM YEDEĞİNE GEÇİLİYOR.
 *
 * Ölçülerek bulundu: önizleme derlemesinde il seçici BOŞ açılıyordu.
 * Sebep hata değil, SESSİZLİKTİ — `fetch` yanıt vermiyordu (o ortamda
 * dış çıkış kesik) ve düşme payı yalnızca hata dalında kuruluydu.
 * Yanıtsız bir istekte hata dalı hiç çalışmaz; söz sonsuza kadar bekler
 * ve seçici hiçbir zaman dolmaz. Şebekesi kopmuş bir kullanıcıda aynısı
 * olurdu: şehir seçemediği için ilan veremez, profilini düzenleyemezdi.
 *
 * Beş saniye: yavaş mobil bağlantıda gerçek yanıtın gelmesine yetecek
 * kadar uzun, kullanıcıyı boş bir seçiciyle baş başa bırakmayacak kadar
 * kısa. Zaman aşımı isteği İPTAL ETMİYOR; geç gelen yanıt bir sonraki
 * çağrıda kullanılabilsin diye önbellek yalnızca gerçek sonuçla
 * doldurulur.
 */
const FETCH_TIMEOUT_MS = 5000;

const TIMED_OUT = Symbol('provinces-timeout');

/** `ms` sonra çözülen işaret; kazanan istek olursa zamanlayıcı iptal edilir. */
function timeoutAfter(ms: number): {
  promise: Promise<typeof TIMED_OUT>;
  cancel: () => void;
} {
  let handle: ReturnType<typeof setTimeout>;
  const promise = new Promise<typeof TIMED_OUT>((resolve) => {
    handle = setTimeout(() => resolve(TIMED_OUT), ms);
  });
  return { promise, cancel: () => clearTimeout(handle) };
}

/**
 * 81 ili getirir.
 *
 * TEK İSTEK: liste sürüm başına sabit ve her şehir seçici onu istiyor.
 * Önbelleklenmeseydi bir sayfada dört seçici dört ayrı istek atardı.
 */
export async function fetchProvinces(): Promise<ProvinceResult> {
  if (cache) return cache;
  if (inflight) return inflight;

  /*
   * `inflight` yerine yerel bir söz bekleniyor ve temizlik `cache`
   * yazıldıktan SONRA yapılıyor. Eski sırada `finally` içindeki
   * `inflight = null`, `cache` atanmadan önce çalışıyordu: tam o
   * aralıkta gelen ikinci çağrı ne önbelleği ne uçuşan isteği görür,
   * ikinci bir sorgu başlatırdı. Görünür bir hata değildi; sıranın
   * doğrusu bu.
   */
  const request = (async (): Promise<ProvinceResult> => {
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
    }
  })();

  /*
   * ══════════════════════════════════════════════════════════════════
   * ZAMAN AŞIMI `inflight`İN İÇİNDE, DIŞINDA DEĞİL.
   *
   * İlk yazımda yarış burada, `fetchProvinces` gövdesinde kuruluydu ve
   * `inflight` çıplak isteği taşıyordu. Sonuç: koruma YALNIZCA İLK
   * ÇAĞRIYI kapsıyordu. Sayfada iki tüketici var (konum sağlayıcısı ve
   * form seçicisi); ikincisi `if (inflight) return inflight` dalına
   * düşüp hiç çözülmeyen sözü bekliyordu.
   *
   * Tarayıcıda ölçülerek görüldü: zaman aşımı eklendikten SONRA bile
   * ilan formundaki seçici yedi saniye sonra hâlâ boştu. Yarış ortak
   * söze taşındı — artık kim beklerse beklesin aynı korumayı alıyor.
   */
  const guarded = (async (): Promise<ProvinceResult> => {
    const timer = timeoutAfter(FETCH_TIMEOUT_MS);
    try {
      const raced = await Promise.race([request, timer.promise]);

      if (raced === TIMED_OUT) {
        /*
         * ZAMAN AŞIMI ÖNBELLEĞE YAZILMIYOR. Yazılsaydı, ağı bir saniye
         * sonra geri gelen kullanıcı oturum boyunca 15 ille kalırdı —
         * sayfayı yenilemeden 81'e dönemezdi. İstek de iptal edilmiyor:
         * geç gelen gerçek liste önbelleğe konuyor, bir sonraki seçici
         * onu buluyor.
         */
        void request.then((late) => {
          if (late.source === 'db') cache = late;
        });
        return { items: seedToProvinces(), source: 'seed' };
      }

      cache = raced;
      return raced;
    } finally {
      timer.cancel();
      inflight = null;
    }
  })();

  inflight = guarded;
  return guarded;
}

/** Testler için — modül düzeyi önbelleği sıfırlar. */
export function resetProvinceCache(): void {
  cache = null;
  inflight = null;
}

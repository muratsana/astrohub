import { useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';
import { normalizeTr } from '@/lib/text';

/**
 * İLÇELER — il/ilçe bazlı konum (§4.1).
 *
 * ══════════════════════════════════════════════════════════════════════
 * İLÇE LİSTESİ PAKETE GİRMİYOR, İL SEÇİLİNCE İSTENİYOR
 *
 * 974 ilçe kodda taşınsaydı ilk yüklenen JS'e ~60 kB eklerdi ve bütçe
 * (200 kB) zaten 199'da. Üstelik gereksiz: kullanıcı tek bir ilin
 * ilçelerini görüyor, 974'ünü değil. Seçim yapıldıkça o ilin listesi
 * çekiliyor ve modül düzeyinde önbelleğe alınıyor — aynı il ikinci kez
 * seçilince istek gitmiyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * "EN İNCE TESPİT" NE DEMEK — VE NE DEMEK DEĞİL
 *
 * Üç kademe var ve hassasiyetleri FARKLI:
 *
 *   1. İL merkezi        → onlarca km yanılabilir
 *   2. İLÇE merkezi      → birkaç km yanılabilir
 *   3. CİHAZ konumu      → ÖLÇÜM; metre mertebesinde
 *
 * İlçe seçimi bir YAKLAŞIKLIK, cihaz konumu bir ÖLÇÜM. Arayüz ikisini
 * ayrı gösteriyor ve ilçe seçildiğinde "merkez koordinatı" olduğunu
 * söylüyor — çünkü gözlem yeri ilçe merkezinde değil, çoğu zaman
 * şehirden uzakta.
 *
 * Mahalle kademesi EKLENMEDİ: elli bine yakın satır, astronomik hiçbir
 * fark üretmeden (birkaç yüz metre) sorguyu ve bakımı büyütürdü. Daha
 * ince bir nokta gerektiğinde doğru cevap cihaz konumu, daha ince bir
 * idari liste değil.
 */

export interface District {
  provinceCode: number;
  name: string;
  slug: string;
  searchName: string;
  /** İlçe MERKEZİ. Bilinmiyorsa `null` — o zaman il merkezi kullanılır. */
  latitude: number | null;
  longitude: number | null;
}

interface Row {
  province_code: number;
  name: string;
  slug: string;
  search_name: string;
  latitude: number | string | null;
  longitude: number | string | null;
}

/* İl başına önbellek: aynı il ikinci kez seçilince istek gitmiyor. */
const cache = new Map<number, District[]>();

function sayi(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function fetchDistricts(provinceCode: number): Promise<District[]> {
  const hit = cache.get(provinceCode);
  if (hit) return hit;
  if (!isSupabaseConfigured) return [];

  const promise = getSupabase();
  if (!promise) return [];
  const supabase = await promise;

  const { data, error } = await supabase
    .from('districts')
    .select('province_code, name, slug, search_name, latitude, longitude')
    .eq('province_code', provinceCode)
    .eq('is_active', true)
    .order('search_name');
  if (error) return [];

  const items = ((data ?? []) as Row[]).map((r) => ({
    provinceCode: r.province_code,
    name: r.name,
    slug: r.slug,
    searchName: r.search_name,
    latitude: sayi(r.latitude),
    longitude: sayi(r.longitude),
  }));
  cache.set(provinceCode, items);
  return items;
}

export interface DistrictsState {
  items: District[];
  loading: boolean;
}

/**
 * Bir ilin ilçeleri.
 *
 * `provinceCode` yoksa boş liste ve `loading: false` — "il seçilmedi"
 * ile "ilçe yok" ayrı durumlar ve arayüz ikisini ayrı anlatıyor.
 */
export function useDistricts(provinceCode: number | undefined): DistrictsState {
  const [items, setItems] = useState<District[]>(() =>
    provinceCode ? (cache.get(provinceCode) ?? []) : []
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!provinceCode) {
      setItems([]);
      setLoading(false);
      return;
    }

    const hit = cache.get(provinceCode);
    if (hit) {
      setItems(hit);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    void fetchDistricts(provinceCode).then((list) => {
      if (!active) return;
      setItems(list);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [provinceCode]);

  return { items, loading };
}

/**
 * Arama — ili içinde, Türkçe katlamalı.
 *
 * `normalizeTr` kullanılıyor, `toLocaleLowerCase('tr')` DEĞİL: Türkçe
 * yerelde `'ÇANKAYA'` küçültülünce beklenen sonucu verir ama `'IĞDIR'`
 * gibi bir girdide `I` → `ı` olur ve `search_name` sütunundaki `i` ile
 * eşleşmez. Katlama iki tarafta da aynı kuralla yapılıyor.
 */
export function filterDistricts(items: District[], query: string): District[] {
  const q = normalizeTr(query.trim());
  if (!q) return items;
  return items.filter((d) => normalizeTr(d.name).includes(q));
}

/** İki nokta arası yaklaşık uzaklık (km) — ilçe eşleştirmesi için. */
function kabaMesafe(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number
): number {
  /* Küçük mesafelerde düzlem yaklaşımı yeterli ve haversine'den ucuz:
     974 ilçe için trigonometrik çağrı sayısını dörtte bire indiriyor.
     Boylam farkı enlemle daralıyor, o düzeltme uygulanıyor. */
  const dLat = aLat - bLat;
  const dLon = (aLon - bLon) * Math.cos(((aLat + bLat) / 2) * (Math.PI / 180));
  return Math.sqrt(dLat * dLat + dLon * dLon) * 111.32;
}

export interface NearestDistrict {
  district: District;
  distanceKm: number;
}

/**
 * Cihaz konumuna EN YAKIN ilçe merkezi.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BU BİR TERS KODLAMA DEĞİL, BİR YAKINLIK TAHMİNİ
 *
 * Gerçek ters kodlama (reverse geocoding) noktanın hangi idari SINIR
 * içinde kaldığını söyler; bu fonksiyon en yakın MERKEZİ söylüyor.
 * İkisi çoğu yerde aynı cevabı verir ama sınır bölgelerinde ayrışır:
 * bir ilçenin kenarındaki nokta, komşu ilçenin merkezine daha yakın
 * olabilir.
 *
 * Sınır poligonları saklanmadığı için (yüzlerce megabayt) doğrusu bu
 * değil; ama etiketi ÜRETİLEN bir cevap olarak sunuyoruz, ölçülen bir
 * cevap olarak değil. `distanceKm` de dönüyor ki arayüz "yaklaşık"
 * diyebilsin ve uzaklık büyükse hiç iddia etmesin.
 */
export function nearestDistrict(
  items: District[],
  latitude: number,
  longitude: number
): NearestDistrict | null {
  let best: NearestDistrict | null = null;
  for (const d of items) {
    if (d.latitude === null || d.longitude === null) continue;
    const distanceKm = kabaMesafe(latitude, longitude, d.latitude, d.longitude);
    if (!best || distanceKm < best.distanceKm) best = { district: d, distanceKm };
  }
  return best;
}

/**
 * Yakınlık tahmininin güvenilir sayıldığı azami uzaklık.
 *
 * 40 km: Türkiye'de ilçe merkezleri arası tipik açıklığın üstünde bir
 * değer. Bunun ötesinde en yakın merkez, noktanın gerçekten o ilçede
 * olduğunu göstermiyor — arayüz o zaman ilçe adı YAZMIYOR, yalnızca
 * ili söylüyor. Sessizce yanlış bir ilçe yazmaktansa hiç yazmamak.
 */
export const NEAREST_DISTRICT_LIMIT_KM = 40;

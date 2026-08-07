import { useQuery } from '@tanstack/react-query';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';
import {
  gokyuzundenKadraja,
  kadrajIcinde,
  kadrajYaricapiDerece,
  type CozumGeometrisi,
  type KadrajNoktasi,
} from '@/domain/astronomy/plateProjection';

/**
 * KADRAJDAKİ KATALOG CİSİMLERİ — açıklamalı görüntünün verisi.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN SUNUCUDA ARANIYOR
 *
 * "Bu karede ne var" sorusunun cevabı 16.663 nesnelik katalogda. O
 * kataloğu istemciye indirip orada aramak mümkün değil; koni araması
 * (`alandaki_cisimler`) veritabanında yapılıyor ve yalnızca kadrajın
 * çevresindeki birkaç düzine kayıt dönüyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN KONİ ARAMASI KADRAJDAN GENİŞ
 *
 * Koni yarıçapı kadrajın KÖŞEGENİNİN yarısı. Kadraj bir dikdörtgen ve
 * köşeleri merkeze kenarlardan uzak; kısa kenarı yarıçap saysaydık
 * köşelerdeki cisimler hiç sorulmazdı. Dikdörtgenin dışında kalan
 * fazlalık ikinci adımda, gerçek izdüşümle eleniyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ETİKET SAYISI SINIRLI
 *
 * Geniş alan bir kadrajda 200 katalog nesnesi olabiliyor ve 200 etiket
 * fotoğrafı tamamen kapatır. Sunucu parlaklık ve boyuta göre sıralayıp
 * en anlamlılarını veriyor; burada ayrıca üst sınır var. Kadrajı
 * okunmaz yapan bir açıklama, açıklama değil gürültüdür.
 */

const EN_FAZLA_ETIKET = 18;

export interface AlanCismi {
  id: string;
  slug: string;
  ad: string;
  katalog: string;
  tur: string;
  raDeg: number;
  decDeg: number;
  kadir: number | null;
  boyutArcmin: number | null;
  /** Kadraj içindeki oransal konumu. */
  nokta: KadrajNoktasi;
}

interface HamSatir {
  id: string;
  slug: string;
  name: string;
  catalog: string;
  kind: string;
  ra_deg: number | string;
  dec_deg: number | string;
  magnitude: number | string | null;
  size_major_arcmin: number | string | null;
}

function sayi(v: number | string | null): number | null {
  if (v === null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function alandakiCisimler(
  cozum: CozumGeometrisi
): Promise<AlanCismi[]> {
  const yaricap = kadrajYaricapiDerece(cozum);
  if (yaricap <= 0) return [];

  const promise = getSupabase();
  if (!promise) return [];

  const client = await promise;
  const { data, error } = await client.rpc('alandaki_cisimler', {
    merkez_ra: cozum.raDeg,
    merkez_dec: cozum.decDeg,
    yaricap_derece: yaricap,
    /* Sunucudan sınırın üç katı isteniyor: izdüşüm elemesinden sonra
       kaç tanesinin kadrajda kaldığı belli değil ve dikdörtgen, koninin
       yaklaşık üçte ikisi. Az istemek, elemeden sonra listeyi
       gereksiz yere kısaltırdı. */
    adet: EN_FAZLA_ETIKET * 3,
  });

  if (error) throw new Error(error.message);

  const cisimler: AlanCismi[] = [];
  for (const ham of (data ?? []) as HamSatir[]) {
    const ra = sayi(ham.ra_deg);
    const dec = sayi(ham.dec_deg);
    if (ra === null || dec === null) continue;

    const nokta = gokyuzundenKadraja(cozum, ra, dec);
    if (!nokta || !kadrajIcinde(nokta)) continue;

    cisimler.push({
      id: ham.id,
      slug: ham.slug,
      ad: ham.name,
      katalog: ham.catalog,
      tur: ham.kind,
      raDeg: ra,
      decDeg: dec,
      kadir: sayi(ham.magnitude),
      boyutArcmin: sayi(ham.size_major_arcmin),
      nokta,
    });
  }

  return cisimler.slice(0, EN_FAZLA_ETIKET);
}

/**
 * Kadrajdaki cisimler — yalnızca çözülmüş fotoğraflarda.
 *
 * `enabled` üç koşula birden bakıyor: yapılandırma var mı, çözüm
 * geometrisi tam mı, ve katman AÇIK mı. Üçüncüsü önemli: katmanı hiç
 * açmayan kullanıcı için istek atmak, her fotoğraf sayfasında boşuna
 * bir sorgu demek.
 */
export function useAlandakiCisimler(
  cozum: CozumGeometrisi | null,
  etkin: boolean
) {
  return useQuery({
    queryKey: ['alan-cisimleri', cozum, etkin],
    enabled: isSupabaseConfigured && cozum !== null && etkin,
    staleTime: 60 * 60 * 1000,
    retry: 1,
    queryFn: () => (cozum ? alandakiCisimler(cozum) : Promise.resolve([])),
  });
}

/**
 * `PlateSolve` alanlarından izdüşüm geometrisi kurar.
 *
 * Eksik bir alan varsa `null`: kadraj boyutu bilinmeden etiketin
 * yerini hesaplamak mümkün değil ve tahmin etmek, etiketleri rastgele
 * yerlere koymak olurdu.
 */
export function cozumGeometrisi(solve: {
  durum: string;
  raDeg: number | null;
  decDeg: number | null;
  rotationDeg: number | null;
  fieldWidthDeg: number | null;
  fieldHeightDeg: number | null;
  parity: number | null;
}): CozumGeometrisi | null {
  if (solve.durum !== 'cozuldu') return null;
  if (solve.raDeg === null || solve.decDeg === null) return null;
  if (!solve.fieldWidthDeg || !solve.fieldHeightDeg) return null;

  return {
    raDeg: solve.raDeg,
    decDeg: solve.decDeg,
    /* Dönüklük gelmediyse sıfır: kuzey yukarıda varsaymak, kadrajı hiç
       göstermemekten iyi ve çözümlerin çoğunda değer zaten geliyor. */
    rotationDeg: solve.rotationDeg ?? 0,
    fieldWidthDeg: solve.fieldWidthDeg,
    fieldHeightDeg: solve.fieldHeightDeg,
    parity: solve.parity,
  };
}

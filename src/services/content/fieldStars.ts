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
 * KADRAJDAKİ YILDIZLAR — açıklamalı görüntünün ikinci katmanı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN AYRI BİR SORGU
 *
 * `alandaki_cisimler` koni araması yıldızları AÇIKÇA eliyordu
 * (`kind not in ('yildiz','diger')`) ve elemeyi kaldırmak da bir şey
 * değiştirmezdi: `celestial_objects` içindeki 485 "yildiz" satırı
 * konumsal bir katalog değil, tek tek eklenmiş dikkat çekici nesneler.
 * Çözülmüş altı fotoğrafın kadrajında o satırlardan hiçbiri yoktu.
 *
 * Yıldızlar artık `bright_stars` tablosunda (Hipparcos tabanlı, kadir
 * ≤ 10,5) ve kendi koni aramasıyla geliyor. Ayrı durmalarının sebebi
 * sadece tablo değil: dönen alanlar da bambaşka — slug ve tür yerine
 * HIP/HD ve tayf türü var.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN YILDIZ SAYISI NESNEDEN AZ
 *
 * Nesne etiketi kadrajda ne olduğunu söylüyor; yıldız etiketi çoğu
 * zaman yalnızca bir katalog numarası. Yıldızlar nesneleri
 * bastırmamalı — bu yüzden hem sayıları daha düşük hem de gösterimleri
 * daha sönük.
 */

const EN_FAZLA_YILDIZ = 8;

/**
 * VERİ ATFI — kullanıcıya gösterilen metin.
 *
 * Konumlar ESA'nın Hipparcos kataloğundan (CDS/VizieR üzerinden), özel
 * adlar IAU'nun yıldız adları kataloğundan, Bayer/Flamsteed imleri Yale
 * Bright Star Catalogue'dan geliyor. Projede DSS2 görselleri için zaten
 * aynı biçimde bir atıf var (`TARAMA_ATFI`); dış veriye dayanan her
 * gösterimin kaynağını yazması bu sitenin kuralı.
 */
export const YILDIZ_ATFI =
  'Yıldız adları: Hipparcos (ESA 1997) / CDS · IAU-CSN · Yale BSC';

export interface AlanYildizi {
  hip: number;
  hd: number | null;
  /** IAU'nun onayladığı özel ad (Sadr, Albireo…) — çoğunda yok. */
  ozelAd: string | null;
  /** Bayer/Flamsteed imi ("γ Cyg", "33 Psc") — çoğunda yok. */
  im: string | null;
  kadir: number | null;
  nokta: KadrajNoktasi;
}

interface HamYildiz {
  hip: number;
  hd: number | null;
  proper_name: string | null;
  designation: string | null;
  ra_deg: number | string;
  dec_deg: number | string;
  magnitude: number | string | null;
}

function sayi(v: number | string | null): number | null {
  if (v === null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * ETİKETİN NE YAZACAĞI.
 *
 * Sıra bilgi değerine göre: özel ad bir yıldızı TANITIR ("Sadr"),
 * Bayer/Flamsteed imi gökyüzünde YERİNİ söyler ("γ Cyg"), HD numarası
 * yalnızca kimliğini verir. HIP en sonda çünkü katalog numaraları
 * arasında en az tanınanı o.
 */
export function yildizEtiketi(y: {
  ozelAd: string | null;
  im: string | null;
  hd: number | null;
  hip: number;
}): string {
  if (y.ozelAd) return y.ozelAd;
  if (y.im) return y.im;
  if (y.hd !== null) return `HD ${y.hd}`;
  return `HIP ${y.hip}`;
}

export async function alandakiYildizlar(
  cozum: CozumGeometrisi
): Promise<AlanYildizi[]> {
  const yaricap = kadrajYaricapiDerece(cozum);
  if (yaricap <= 0) return [];

  const promise = getSupabase();
  if (!promise) return [];

  const client = await promise;
  const { data, error } = await client.rpc('alandaki_yildizlar', {
    merkez_ra: cozum.raDeg,
    merkez_dec: cozum.decDeg,
    yaricap_derece: yaricap,
    /* Koni dikdörtgenden geniş; izdüşüm elemesinden sonra kaçının
       kadrajda kaldığı belli değil. Az istemek listeyi gereksiz
       kısaltırdı (aynı gerekçe `alandakiCisimler` içinde de yazılı). */
    adet: EN_FAZLA_YILDIZ * 3,
  });

  if (error) throw new Error(error.message);

  const yildizlar: AlanYildizi[] = [];
  for (const ham of (data ?? []) as HamYildiz[]) {
    const ra = sayi(ham.ra_deg);
    const dec = sayi(ham.dec_deg);
    if (ra === null || dec === null) continue;

    const nokta = gokyuzundenKadraja(cozum, ra, dec);
    if (!nokta || !kadrajIcinde(nokta)) continue;

    yildizlar.push({
      hip: ham.hip,
      hd: ham.hd,
      ozelAd: ham.proper_name,
      im: ham.designation,
      kadir: sayi(ham.magnitude),
      nokta,
    });
  }

  return yildizlar.slice(0, EN_FAZLA_YILDIZ);
}

/** Kadrajdaki yıldızlar — katman açıkken ve çözüm tamken. */
export function useAlandakiYildizlar(
  cozum: CozumGeometrisi | null,
  etkin: boolean
) {
  return useQuery({
    queryKey: ['alan-yildizlari', cozum, etkin],
    enabled: isSupabaseConfigured && cozum !== null && etkin,
    staleTime: 60 * 60 * 1000,
    retry: 1,
    queryFn: () => (cozum ? alandakiYildizlar(cozum) : Promise.resolve([])),
  });
}

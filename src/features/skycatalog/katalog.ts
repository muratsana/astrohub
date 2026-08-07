import { useQuery } from '@tanstack/react-query';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';
import { mapTargetRow } from '@/services/content/targets';
import type { CelestialTarget } from '@/features/targets/data';

/**
 * GÖKYÜZÜ KATALOĞU — veri katmanı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BU MODÜL NEDEN /hedefler'DEN AYRI
 *
 * `/hedefler` bir SEÇKİ: paketlenmiş 230 kayıt, ağ olmadan açılıyor,
 * "bu gece ne çekeyim" sorusuna cevap veriyor. Kartları büyük, açıklaması
 * uzun.
 *
 * Bu modülün sorusu başka: "NGC 6888'in yanında ne var", "Sharpless'ın
 * tamamını göster", "Kuğu'da 20 yay dakikasından büyük kaç emisyon
 * bulutsusu var". 16.663 nesnenin tamamı, filtreli ve sayfalı.
 *
 * İkisini tek sayfada birleştirmek her ikisini de bozardı: seçki 16.000
 * kaydın içinde kaybolur, katalog da seçkinin geniş kartlarında
 * gezilemez hâle gelirdi.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SUPABASE YOKSA NE OLUR
 *
 * Hiçbir şey. Bu modül tamamen veritabanına dayalı ve tohum karşılığı
 * YOK — 16.663 kaydın paketlenmiş bir kopyası olamaz. Yapılandırma
 * yoksa sayfa bunu açıkça söylüyor; sahte bir liste göstermek, kataloğun
 * eksik olduğu izlenimi verirdi.
 */

/** Sunucudan gelen ham satır — `mapTargetRow` bunu bekliyor. */
interface KatalogSatiri {
  id: string;
  slug: string;
  name: string;
  catalog: string;
  kind: string;
  constellation: string;
  ra_deg: number | string | null;
  dec_deg: number | string | null;
  magnitude: number | string | null;
  size_major_arcmin: number | string | null;
  size_minor_arcmin: number | string | null;
  best_months: string | null;
  difficulty: string | null;
  recommended_focal: string | null;
  recommended_filters: string | null;
  description: string | null;
  distance_ly: number | string | null;
  imm: boolean;
  kodlar: string[] | null;
}

export interface KatalogNesnesi extends CelestialTarget {
  /** Işık yılı cinsinden uzaklık; bilinmiyorsa `null`. */
  uzaklikLy: number | null;
  /** Imm Deep Sky Compendium seçkisinde mi? */
  secki: boolean;
  kodlar: string[];
}

export interface KatalogSayfasi {
  toplam: number;
  satirlar: KatalogNesnesi[];
}

/**
 * KATALOG AİLELERİ.
 *
 * Desen `LIKE` ile eşleşiyor ve AYIRICIYI DA İÇERİYOR. "M %" yerine "M%"
 * yazsaydık Messier filtresi "Mel 22" ve "Mink 1" kayıtlarını da
 * getirirdi — üç ayrı katalog tek başlık altında karışırdı.
 *
 * Sayılar sabit değil, açıklama: filtre uygulandığında gerçek toplam
 * sunucudan geliyor. Buradaki sayı menüde "ne kadar büyük bir liste"
 * beklentisi kuruyor.
 */
export interface KatalogAilesi {
  ad: string;
  desen: string;
  aciklama: string;
}

export const KATALOG_AILELERI: KatalogAilesi[] = [
  { ad: 'Messier', desen: 'M %', aciklama: '110 nesne · 1774' },
  { ad: 'Caldwell', desen: 'C %', aciklama: '109 nesne · 1995' },
  { ad: 'Herschel 400', desen: 'H400 %', aciklama: '400 nesne · 1786' },
  { ad: 'NGC', desen: 'NGC %', aciklama: 'Yeni Genel Katalog · 1888' },
  { ad: 'IC', desen: 'IC %', aciklama: 'Index Katalog · 1912' },
  { ad: 'Sharpless (Sh2)', desen: 'Sh2-%', aciklama: '313 emisyon bulutsusu · 1959' },
  { ad: 'Barnard', desen: 'Barnard %', aciklama: '349 karanlık bulutsu · 1927' },
  { ad: 'LBN', desen: 'LBN %', aciklama: 'Lynds parlak bulutsuları · 1965' },
  { ad: 'LDN', desen: 'LDN %', aciklama: 'Lynds karanlık bulutsuları · 1962' },
  { ad: 'van den Bergh', desen: 'vdB %', aciklama: '159 yansıma bulutsusu · 1966' },
  { ad: 'Cederblad', desen: 'Ced %', aciklama: '215 bulutsu · 1946' },
  { ad: 'RCW', desen: 'RCW %', aciklama: '182 güney H II bölgesi · 1960' },
  { ad: 'Gum', desen: 'Gum %', aciklama: '85 güney emisyon bulutsusu · 1955' },
  { ad: 'Abell (gezegenimsi)', desen: 'Abell PN %', aciklama: '86 yaşlı gezegenimsi · 1966' },
  { ad: 'Abell (galaksi kümesi)', desen: 'Abell %', aciklama: 'Galaksi kümeleri · 1958' },
  { ad: 'Arp', desen: 'Arp %', aciklama: '338 tuhaf galaksi · 1966' },
  { ad: 'Hickson', desen: 'HCG %', aciklama: '100 sıkışık galaksi grubu · 1982' },
  { ad: 'Süpernova kalıntıları', desen: 'SNR %', aciklama: 'Green kataloğu · 1984' },
  { ad: 'Hidden Treasures', desen: 'HT %', aciklama: "O'Meara · 109 nesne · 2007" },
  { ad: 'Secret Deep', desen: 'SD %', aciklama: "O'Meara · 109 nesne · 2011" },
  { ad: 'Orphaned Beauties', desen: 'OB %', aciklama: "O'Meara · 109 nesne · 2020" },
  { ad: 'Small Packages', desen: 'SP %', aciklama: "O'Meara · 109 nesne · 2020" },
];

export type Siralama = 'parlaklik' | 'boyut' | 'uzaklik' | 'ra' | 'ad';

export const SIRALAMA_ETIKETLERI: Record<Siralama, string> = {
  parlaklik: 'Parlaklık',
  boyut: 'Açısal boyut',
  uzaklik: 'Uzaklık',
  ra: 'Sağ açıklık',
  ad: 'Ad',
};

export interface KatalogSorgusu {
  q: string;
  aile: string | null;
  tur: string | null;
  takimyildiz: string | null;
  sadeceSecki: boolean;
  enSonukKadir: number | null;
  enKucukArcmin: number | null;
  sirala: Siralama;
  sayfa: number;
}

export const SAYFA_ADEDI = 24;

export const BOS_SORGU: KatalogSorgusu = {
  q: '',
  aile: null,
  tur: null,
  takimyildiz: null,
  sadeceSecki: false,
  enSonukKadir: null,
  enKucukArcmin: null,
  sirala: 'parlaklik',
  sayfa: 0,
};

function sayi(v: number | string | null): number | null {
  if (v === null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function esle(satir: KatalogSatiri): KatalogNesnesi {
  const kodlar = satir.kodlar ?? [];
  return {
    ...mapTargetRow({
      ...satir,
      /* Kodların tamamı takma ad olarak veriliyor; birincil kod zaten
         `catalog` alanında ve `mapTargetRow` onu listeden eliyor. */
      catalog_identifiers: kodlar.map((code) => ({ code, is_primary: false })),
    }),
    uzaklikLy: sayi(satir.distance_ly),
    secki: satir.imm === true,
    kodlar,
  };
}

export async function katalogGozat(
  sorgu: KatalogSorgusu
): Promise<KatalogSayfasi> {
  const promise = getSupabase();
  if (!promise) return { toplam: 0, satirlar: [] };

  const client = await promise;
  const { data, error } = await client.rpc('katalog_gozat', {
    q: sorgu.q,
    katalog_deseni: sorgu.aile,
    tur: sorgu.tur,
    takimyildiz: sorgu.takimyildiz,
    sadece_secki: sorgu.sadeceSecki,
    en_sonuk_kadir: sorgu.enSonukKadir,
    en_kucuk_arcmin: sorgu.enKucukArcmin,
    sirala: sorgu.sirala,
    sayfa: sorgu.sayfa,
    adet: SAYFA_ADEDI,
  });

  if (error) throw new Error(error.message);

  const govde = data as { toplam: number; satirlar: KatalogSatiri[] } | null;
  return {
    toplam: govde?.toplam ?? 0,
    satirlar: (govde?.satirlar ?? []).map(esle),
  };
}

export interface KatalogOzeti {
  toplam: number;
  secki: number;
  kod: number;
  turler: { tur: string; adet: number }[];
  takimyildizlar: { ad: string; adet: number }[];
}

export async function katalogOzeti(): Promise<KatalogOzeti | null> {
  const promise = getSupabase();
  if (!promise) return null;
  const client = await promise;
  const { data, error } = await client.rpc('katalog_ozet');
  if (error) throw new Error(error.message);
  return data as KatalogOzeti;
}

/**
 * Liste kancası — `placeholderData` ile sayfa değişiminde LİSTE
 * BOŞALMIYOR.
 *
 * Sayfalama sırasında listeyi boşaltmak, her tıklamada sayfanın
 * yüksekliğini sıfırlar ve kaydırma konumunu yukarı fırlatır. Önceki
 * sayfayı soluk bırakıp yenisiyle değiştirmek, kullanıcının nerede
 * olduğunu kaybetmemesini sağlıyor.
 */
export function useKatalog(sorgu: KatalogSorgusu) {
  return useQuery({
    queryKey: ['gokyuzu-katalogu', sorgu],
    enabled: isSupabaseConfigured,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    placeholderData: (onceki) => onceki,
    queryFn: () => katalogGozat(sorgu),
  });
}

export function useKatalogOzeti() {
  return useQuery({
    queryKey: ['gokyuzu-katalogu-ozet'],
    enabled: isSupabaseConfigured,
    /* Özet gün içinde değişmiyor: katalog içe aktarma bir bakım işi.
       Bir saat, filtre menüsünü her sayfa açılışında yeniden
       hesaplatmamak için yeterince uzun. */
    staleTime: 60 * 60 * 1000,
    retry: 1,
    queryFn: katalogOzeti,
  });
}

/** Adres çubuğundaki parametreleri sorguya çevirir. */
export function sorguyuOku(params: URLSearchParams): KatalogSorgusu {
  const sayi = (ad: string): number | null => {
    const ham = params.get(ad);
    if (!ham) return null;
    const n = Number(ham);
    return Number.isFinite(n) ? n : null;
  };

  const sirala = params.get('sirala') as Siralama | null;

  return {
    q: params.get('q') ?? '',
    aile: params.get('aile'),
    tur: params.get('tur'),
    takimyildiz: params.get('takimyildiz'),
    sadeceSecki: params.get('secki') === '1',
    enSonukKadir: sayi('kadir'),
    enKucukArcmin: sayi('boyut'),
    sirala: sirala && sirala in SIRALAMA_ETIKETLERI ? sirala : 'parlaklik',
    sayfa: Math.max(0, sayi('sayfa') ?? 0),
  };
}

/** Işık yılını okunur biçime indirir: 2.500.000 → "2,5 milyon ışık yılı". */
export function uzaklikMetni(ly: number | null): string | null {
  if (ly === null || ly <= 0) return null;
  if (ly >= 1_000_000) {
    return `${(ly / 1_000_000).toLocaleString('tr-TR', {
      maximumFractionDigits: 1,
    })} milyon ışık yılı`;
  }
  /* Eşik ON BİN, bin değil. Bulutsu uzaklıkları tipik olarak 1.000–8.000
     ışık yılı aralığında ve "1,5 bin ışık yılı" Türkçede kimsenin
     söylemediği bir ifade; "1.500 ışık yılı" hem doğru hem okunur.
     Kısaltma ancak sayı okunamayacak kadar uzayınca kazanç sağlıyor. */
  if (ly >= 10_000) {
    return `${(ly / 1000).toLocaleString('tr-TR', {
      maximumFractionDigits: 1,
    })} bin ışık yılı`;
  }
  return `${ly.toLocaleString('tr-TR')} ışık yılı`;
}

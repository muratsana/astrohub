import { useEffect, useState } from 'react';
import { getSupabase } from '@/services/supabase/client';

/**
 * FİLTRE ÖNERİLERİ — yükleme sihirbazının poz satırları için (§17.1, §17.2).
 *
 * ══════════════════════════════════════════════════════════════════════
 * ÖLÇÜLEN SORUN: SERBEST METİN
 *
 * Poz satırındaki filtre alanı düz bir metin kutusuydu. Aynı filtre
 * "Ha", "HA", "H-alpha", "Hα", "h alfa" diye beş ayrı değer olarak
 * kaydediliyordu ve galeri süzgeci onları farklı filtreler sanıyordu.
 * Hata sessiz: kimse "yanlış yazdım" uyarısı almıyor, yalnızca süzgeç
 * hiçbir zaman doğru sayı vermiyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SIK KULLANILAN SEKİZİ ÜSTTE, KATALOG ALTINDA
 *
 * Astrofotoğrafçıların poz satırlarına yazdığı değerlerin ezici çoğunluğu
 * sekiz taneden biri (L/R/G/B ve Hα/OIII/SII ile UV-IR Cut). Kataloğun
 * doksan dokuz ürünü listenin başına konsaydı, en sık girilen değer
 * kaydırmanın arkasında kalırdı. Katalog kaybolmuyor — altta duruyor ve
 * arama onun içinde de eşleşiyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ARAMA `astro_filter_aliases`I KULLANIYOR
 *
 * Tablo 0072'de doldurulmuş ama BUGÜNE KADAR HİÇ OKUNMAMIŞTI: on üç
 * satırlık takma ad kaydı, çağıranı olmayan bir veri olarak duruyordu
 * (planın FAZ 18 listesindeki "arka uçta var, ön uçta yok" kalemlerinden
 * biri). Takma adlar öneri metnine katılıyor, böylece "H-alpha" yazan
 * biri kanonik "Hα" seçeneğini buluyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SUPABASE YOKSA SEKİZLİ YİNE ÇALIŞIYOR
 *
 * Yapılandırma yoksa ya da çağrı düşerse liste sık kullanılanlarla
 * kalıyor. Yükleme sihirbazı bir ağ hatasında filtresiz kalmamalı —
 * öneri bir kolaylık, bir önkoşul değil.
 */

export interface FilterSuggestion {
  /** Kutuya yazılacak kanonik değer. */
  value: string;
  /** Listede değerin yanında görünen açıklama. */
  hint?: string;
}

/**
 * Sık kullanılan sekiz filtre — plan §17.1'in istediği sıra.
 *
 * Kodda sabit duruyorlar çünkü bunlar ÜRÜN değil, kanal adı: "Hα" bir
 * marka modeli değil, bir dalga boyu. Katalog ürünleri (Optolong L-eXtreme
 * gibi) veritabanından geliyor.
 */
export const SIK_FILTRELER: FilterSuggestion[] = [
  { value: 'L', hint: 'Luminance — parlaklık' },
  { value: 'R', hint: 'Kırmızı' },
  { value: 'G', hint: 'Yeşil' },
  { value: 'B', hint: 'Mavi' },
  { value: 'Hα', hint: 'Hidrojen-alfa 656 nm' },
  { value: 'OIII', hint: 'Oksijen III 500 nm' },
  { value: 'SII', hint: 'Kükürt II 672 nm' },
  { value: 'UV/IR Cut', hint: 'Mor ötesi ve kızılötesi kesici' },
];

interface UrunSatiri {
  display_name: string | null;
  name: string | null;
  brand_name: string | null;
  astro_filter_aliases: { alias: string }[] | null;
}

/**
 * Kanonik değerin yanına takma adları da yazıyoruz.
 *
 * `<datalist>` yalnızca `value` üzerinde eşleşir; takma adı ayrı bir
 * seçenek yapsaydık kullanıcı "H-alpha"yı seçtiğinde kutuya o yazılır ve
 * kayıt yine ikiye bölünürdü. `hint` içinde durunca arama onları
 * göremiyor ama insan görüyor — eşleşmeyi gözle kuruyoruz, veriyi
 * bölmeden.
 */
function urunuOneriyeCevir(row: UrunSatiri): FilterSuggestion | null {
  const value = (row.display_name || row.name || '').trim();
  if (!value) return null;

  const takmaAdlar = (row.astro_filter_aliases ?? [])
    .map((a) => a.alias?.trim())
    .filter((a): a is string => Boolean(a));

  const parcalar = [row.brand_name?.trim(), ...takmaAdlar].filter(Boolean);
  return { value, hint: parcalar.length > 0 ? parcalar.join(' · ') : undefined };
}

export function useFilterSuggestions(): FilterSuggestion[] {
  const [katalog, setKatalog] = useState<FilterSuggestion[]>([]);

  useEffect(() => {
    let iptal = false;

    void (async () => {
      const promise = getSupabase();
      if (!promise) return;
      try {
        const supabase = await promise;
        const { data, error } = await supabase
          .from('astro_filter_products')
          .select('display_name, name, brand_name, astro_filter_aliases ( alias )')
          .eq('is_discontinued', false)
          .order('display_name');
        if (error || !data || iptal) return;

        const oneriler = (data as UrunSatiri[])
          .map(urunuOneriyeCevir)
          .filter((s): s is FilterSuggestion => s !== null);

        /* Sık kullanılanlarla çakışan ürün adı varsa katalogdan düşüyor:
           aynı değeri iki kez listelemek, seçeneği değil kararsızlığı
           çoğaltır. */
        const sikDegerler = new Set(SIK_FILTRELER.map((f) => f.value));
        setKatalog(oneriler.filter((o) => !sikDegerler.has(o.value)));
      } catch {
        /* Sessiz: sık kullanılan sekizli zaten listede. */
      }
    })();

    return () => {
      iptal = true;
    };
  }, []);

  return [...SIK_FILTRELER, ...katalog];
}

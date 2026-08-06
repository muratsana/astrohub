import { byText, type ExplorerSpec } from '@/features/explorer/query';
import type { EquipmentModel } from './data';
import {
  SPECTRAL_LINES,
  filterCategoryLabels,
  type AstroFilterSpec,
} from '@/domain/equipment/spectrum';

/**
 * EKİPMAN KATALOĞUNUN DATA EXPLORER TANIMI (Faz 4).
 *
 * KATEGORİ BİLEREK FACET DEĞİL. Ekipman kategorisi ROTA YOLUNDA taşınıyor
 * (`/ekipman/montur`) ve o rotaların hepsi prerender ediliyor — 421 statik
 * HTML'in bir bölümü bunlar. Kategoriyi sorgu parametresine taşımak hem
 * o adresleri hem de onlara verilmiş bağlantıları kırardı.
 *
 * Yani explorer burada kategorinin ÜSTÜNDE çalışıyor: sayfa listeyi
 * kategoriye göre süzüp explorer'a veriyor, explorer arama ve sıralamayı
 * üstleniyor. Ortak motorun facet'siz de çalışabilmesi bunu mümkün
 * kılıyor.
 *
 * Sayfanın eski yorumu "arama URL'e yazılmaz, her tuş vuruşu geçmişe
 * kayıt ekler" diyordu. Bu doğruydu ama artık geçerli değil: ortak motor
 * hem gecikme uyguluyor hem `replace: true` ile yazıyor, yani geçmiş
 * kirlenmiyor.
 */
export const equipmentSpec: ExplorerSpec<EquipmentModel> = {
  searchFields: (e) => [e.brand, e.model, ...Object.values(e.specs).map(String)],

  facets: [{ param: 'marka', label: 'Marka', valueOf: (e) => e.brand }],

  sorts: [
    { value: 'marka', label: 'Marka (A–Z)', compare: byText((e) => `${e.brand} ${e.model}`) },
    { value: 'model', label: 'Model (A–Z)', compare: byText((e) => e.model) },
  ],

  defaultSort: 'marka',
};

/**
 * FİLTRE KATEGORİSİNİN KENDİ SÜZGEÇLERİ.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN AYRI BİR SPEC, NEDEN HERKESE AÇIK DEĞİL
 *
 * "Hα geçiriyor mu", "kaç nm" ya da "kaç emisyon çizgisi" soruları
 * yalnızca filtrelerde anlamlı. Bu facet'leri ortak spec'e koymak, montür
 * listesinde bomboş bir "Emisyon çizgisi" süzgeci göstermek olurdu.
 *
 * ══════════════════════════════════════════════════════════════════════
 * VERİ YOKSA FACET DE YOK
 *
 * Spektral künye ayrı bir tablodan geliyor ve tohumu yok
 * (`services/content/filterSpectrum.ts`). Harita boşsa — veritabanı
 * yapılandırılmamış, göç uygulanmamış ya da sorgu düşmüş — bu fonksiyon
 * ortak spec'i olduğu gibi döndürüyor. Boş bir facet listesi göstermek,
 * kullanıcıya var olmayan bir süzgeç vaat etmek olurdu.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BİLİNMEYEN DEĞER FACET'E GİRMEZ
 *
 * 99 üründen 68'inde bant genişliği, 50'sinde emisyon çizgisi sayısı yok.
 * `valueOf` bu kayıtlarda `null` dönüyor; explorer onları hiçbir kutuya
 * saymıyor. Alternatif "bilinmiyor" diye bir kutu açmaktı ve o kutu
 * listenin üçte ikisini toplayıp süzgeci işe yaramaz hâle getirirdi.
 */
export function equipmentSpecFor(
  category: string,
  spectra: Map<string, AstroFilterSpec>
): ExplorerSpec<EquipmentModel> {
  if (category !== 'filtre' || spectra.size === 0) return equipmentSpec;

  return {
    ...equipmentSpec,

    /* Aramaya spektral terimler de giriyor: kullanıcı "Ha" ya da "OIII"
       yazdığında künyede o metin geçmese bile ürün bulunsun. */
    searchFields: (e) => [
      ...equipmentSpec.searchFields(e),
      ...(spectra.get(e.slug)?.passbands ?? []).map(
        (band) => SPECTRAL_LINES[band.line].shortName
      ),
    ],

    facets: [
      ...equipmentSpec.facets,
      {
        param: 'sinif',
        label: 'Sınıf',
        valueOf: (e) => {
          const spec = spectra.get(e.slug);
          return spec ? filterCategoryLabels[spec.categoryCode] : null;
        },
      },
      {
        param: 'cizgi',
        label: 'Emisyon çizgisi',
        valueOf: (e) => {
          const spec = spectra.get(e.slug);
          if (!spec || spec.passbands.length === 0) return null;
          return spec.passbands.map((band) => SPECTRAL_LINES[band.line].shortName);
        },
      },
    ],

    ranges: [
      {
        param: 'bant',
        label: 'Bant genişliği',
        unit: 'nm',
        step: 0.5,
        /* En DAR pencere ölçüt: "3nm'den dar filtreler" arayan kullanıcı,
           3–7 nm aralığındaki bir ürünü de görmek ister — o ürünün 3 nm'lik
           bir bandı gerçekten var. */
        valueOf: (e) => spectra.get(e.slug)?.bandwidthMinNm ?? null,
        format: (value) => `${value} nm`,
      },
    ],
  };
}

import { useMemo } from 'react';
import { useEquipmentCatalog } from '@/services/content/equipment';
import {
  cameraMechanicalPresetsFrom,
  cameraPresetsFrom,
  factorPresetsFrom,
  guidePresetsFrom,
  mountPresetsFrom,
  opticMechanicalPresetsFrom,
  opticPresetsFrom,
  type CameraMechanicalPreset,
  type CameraPreset,
  type FactorPreset,
  type GuidePreset,
  type MountPreset,
  type OpticMechanicalPreset,
  type OpticPreset,
} from '@/domain/equipment/presets';

/**
 * HESAPLAYICI ÖN AYARLARI — canlı ekipman veritabanından.
 *
 * Bu dosya iki kez yer değiştirdi ve ikisinin de sebebi aynı: araçların
 * gördüğü ekipman listesi ile sitenin geri kalanının gördüğü liste
 * birbirinden ayrılıyordu.
 *
 * Önce her araç kendi elle yazılmış listesini taşıyordu. Sonra listeler
 * `features/equipment/data.ts` tohum dizisinden türetildi — ama o dizi
 * uygulamanın içine derlenmiş 129 model. Katalog veritabanında 1086
 * model varken FOV hesaplayıcısı hâlâ 129'unu görüyordu: "Ekipman"
 * modülünde bulunan bir teleskop, "Araçlar"da yoktu.
 *
 * Artık listeler `useEquipmentCatalog()` üzerinden geliyor — Ekipman
 * modülü, setup oluşturucu, ilan formu ve yükleme sihirbazı ile TEK VE
 * AYNI kaynak. Veritabanı yoksa aynı kanca tohum diziye düşer, yani tek
 * dosya önizleme ve çevrimdışı kabuk çalışmaya devam eder.
 *
 * NEDEN KANCA, NEDEN MODÜL SABİTİ DEĞİL: katalog bir ağ isteğiyle
 * geliyor. Modül seviyesinde hesaplanan bir dizi, ilk çizimde ne varsa
 * onu dondurur ve veritabanı yanıtı geldiğinde güncellenmez.
 *
 * VERİSİ EKSİK OLAN KAYIT LİSTEYE GİRMEZ — kural `domain/equipment/
 * presets.ts` içinde ve orada kalıyor: odağı bilinmeyen bir tüp, kadraj
 * hesabına uydurma bir sayıyla giremez.
 */

export type {
  OpticPreset,
  CameraPreset,
  MountPreset,
  FactorPreset,
  GuidePreset,
  OpticMechanicalPreset,
  CameraMechanicalPreset,
};

export interface CalculatorPresets {
  optic: OpticPreset[];
  camera: CameraPreset[];
  mount: MountPreset[];
  opticMechanical: OpticMechanicalPreset[];
  cameraMechanical: CameraMechanicalPreset[];
  guide: GuidePreset[];
  reducer: ReducerPreset[];
  /** Katalogdaki toplam model sayısı — "kaç modelden seçiyorum" bilgisi. */
  catalogSize: number;
}

export interface ReducerPreset {
  label: string;
  factor: number;
}

/**
 * Yaygın filtre kalınlıkları (mm).
 *
 * Katalogdan gelmiyor çünkü kalınlık filtrenin değil, filtre **hücresinin**
 * özelliği ve künyede bir kolonu yok. Uydurma bir kolon açmaktansa dört
 * yaygın değeri açıkça listelemek dürüst.
 */
export const filterThicknessPresets: { label: string; mm: number }[] = [
  { label: 'Filtre yok', mm: 0 },
  { label: '2 mm (1.25")', mm: 2 },
  { label: '3 mm (2" tipik)', mm: 3 },
  { label: '3.5 mm (kalın cam)', mm: 3.5 },
];

/** Dört hesaplayıcının ortak ön ayar kaynağı. */
export function useCalculatorPresets(): CalculatorPresets {
  const catalog = useEquipmentCatalog();
  const entries = catalog.items;

  return useMemo(
    () => ({
      optic: opticPresetsFrom(entries),
      camera: cameraPresetsFrom(entries),
      mount: mountPresetsFrom(entries),
      opticMechanical: opticMechanicalPresetsFrom(entries),
      cameraMechanical: cameraMechanicalPresetsFrom(entries),

      /*
        "Guide yok" listede bir satır değil, seçicinin boş seçeneği —
        aynı anlamı iki yerde sunmak, kullanıcıya iki farklı şey gibi
        görünürdü.

        `-1` odak, "ana optikle aynı" demek: off-axis guider ana
        teleskobun odağını kullanır ve o değer kullanıcının girdiği
        odaktan gelir. Sabit bir sayı yazmak, OAG'yi her kurulumda yanlış
        hesaplamak olurdu.
      */
      guide: [
        ...guidePresetsFrom(entries),
        {
          slug: 'oag',
          brand: '',
          label: 'OAG (ana optikle aynı odak)',
          focalLength: -1,
          pixelSize: 3.75,
        },
      ],

      /*
        Çarpan listesi katalogdan gelir ama başında "yok", sonunda yuvarlak
        değerler durur: kullanıcının elindeki reducer katalogda olmayabilir
        ve "0.8×" yazan bir seçenek, markası bilinmeyen bir parçayı da
        karşılar.
      */
      reducer: [
        { label: 'Yok (1.0×)', factor: 1 },
        ...factorPresetsFrom(entries).map((p) => ({
          label: p.label,
          factor: p.factor,
        })),
        { label: 'Genel reducer 0.8×', factor: 0.8 },
        { label: 'Genel barlow 1.5×', factor: 1.5 },
      ],

      catalogSize: entries.length,
    }),
    [entries]
  );
}

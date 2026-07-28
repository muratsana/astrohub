import type { EquipmentModel } from '../data';

/**
 * Listede gösterilecek tek satırlık teknik özet.
 *
 * Kategoriye göre değişiyor: bir montürde odak uzaklığı yok, bir filtrede
 * piksel boyutu yok. Sabit bir alan seçmek, kayıtların yarısında "—"
 * göstermek olurdu.
 *
 * Bileşen dosyasından ayrı: `ModelPicker` yalnızca bileşen dışa aktarınca
 * Vite'ın hızlı yenilemesi o dosyada çalışıyor.
 */
export function headlineSpec(model: EquipmentModel): string {
  const s = model.specs;
  const pick = (...keys: string[]) => keys.map((k) => s[k]).find(Boolean);

  switch (model.category) {
    case 'optik-tup':
    case 'lens':
      return [s['Odak'], s['f/'] && `f/${s['f/']}`].filter(Boolean).join(' · ');
    case 'astro-kamera':
    case 'fotograf-makinesi':
      return [s['Sensör'], s['Piksel']].filter(Boolean).join(' · ');
    case 'montur':
      return [s['Yük kapasitesi'], s['Ağırlık']].filter(Boolean).join(' · ');
    case 'reducer':
    case 'barlow':
      return pick('Çarpan') ?? '—';
    case 'filtre':
      return pick('Bant', 'Bant genişliği', 'Tip') ?? '—';
    case 'filtre-carki':
      return pick('Yuva') ?? '—';
    case 'okuler':
      return [s['Odak'], s['Görüş alanı']].filter(Boolean).join(' · ');
    default:
      return Object.values(s)[0] ?? '—';
  }
}


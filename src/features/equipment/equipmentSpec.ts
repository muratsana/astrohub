import { byText, type ExplorerSpec } from '@/features/explorer/query';
import type { EquipmentModel } from './data';

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

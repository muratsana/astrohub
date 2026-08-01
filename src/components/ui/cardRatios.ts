/**
 * KART EN-BOY ORANI KAYDI (Faz 2.2).
 *
 * Ölçülen durum: kart görselleri ALTI ayrı orandaydı — `aspect-square`
 * (galeri), `aspect-[4/3]` (ilan, hedef, editöryel), `aspect-[16/9]`
 * (manşet), `aspect-[16/10]` (keşif), `aspect-[16/7]` (karanlık gökyüzü
 * şeridi), `aspect-[21/9]` (gözlem noktaları). Aralarındaki farkın hiçbir
 * gerekçesi yoktu; her modül kendi sayısını seçmişti ve yan yana gelen iki
 * şerit farklı yükseklikte kart üretiyordu.
 *
 * Üçe indi ve her birinin bir SEBEBİ var:
 *
 *   standard  4:3   Varsayılan. Her ızgara kartı bunu kullanır.
 *   square    1:1   YALNIZCA galeri fotoğraf karosu. Bir fotoğraf
 *                   galerisinde asıl içerik fotoğrafın kendisidir; kare
 *                   oran ona en çok yeri verir ve ızgara mutlak hizalı
 *                   kalır.
 *   wide      16:9  YALNIZCA manşet kartı — sayfa başına bir tane, tam
 *                   genişlik bir sütun kaplar, ızgara satır hizasını
 *                   etkilemez.
 *
 * 16/10, 16/7 ve 21/9 kaldırıldı; hiçbiri ayrı bir işe yaramıyordu.
 *
 * Dördüncü bir oran eklemeden önce: aynı ızgarada başka bir oranla yan
 * yana gelecek mi? Geliyorsa satır hizası bozulur ve eklenmemeli.
 *
 * AYRI DOSYA olmasının nedeni teknik: `ContentCard.tsx` yalnızca bileşen
 * dışa vermeli, yoksa Vite'ın hızlı yenilemesi (fast refresh) o dosyada
 * çalışmıyor.
 */

export type ContentCardRatio = 'standard' | 'square' | 'wide';

export const CARD_RATIO: Record<ContentCardRatio, string> = {
  standard: 'aspect-[4/3]',
  square: 'aspect-square',
  wide: 'aspect-[16/9]',
};

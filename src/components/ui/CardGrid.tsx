import type { ReactNode } from 'react';
import type { ViewMode } from './useViewMode';
import { cn } from '@/lib/cn';

/**
 * KART IZGARASI — bütün modüllerin ortak liste kabı.
 *
 * NEDEN AYRI BİR BİLEŞEN
 * Kart yükseklikleri modüller arasında tutmuyordu. Sebep ince: CSS grid
 * satırdaki `<li>` öğelerini zaten eşitler (`align-items: stretch`), ama
 * kartın kendisi `<li>`'nin yüksekliğini **almaz** — `h-full` verilmedikçe
 * içeriği kadar yer kaplar. Başlığı iki satıra taşan bir kart satırı
 * yükseltir, komşusu kısa kalır ve altta boşluk oluşur.
 *
 * Burada `[&>li]:h-full` ile her hücre gerilir; kartların kökü de `h-full`
 * kullanır (bkz. PhotoTile, EventCard). İkisi birlikte olmadan eşitlik
 * sağlanmıyor — tek başına ızgarayı ayarlamak yetmiyor.
 *
 * `auto-rows-fr` SATIRLAR ARASINI DA EŞİTLER. `[&>li]:h-full` yalnızca
 * AYNI SATIRDAKİ kartları eşitliyordu; CSS Grid her satırı bağımsız
 * boyutladığı için satırlar birbirinden farklı kalıyordu. En görünür hâli
 * son satır: dört kartlık bir satırın altında tek başına kalan kart,
 * kendi içeriği kadar uzayıp üstündeki satırdan yüksek çıkıyordu
 * (etkinliklerde ölçtüm: 410px'e karşı 428px). `auto-rows-fr` bütün
 * satırlara aynı yüksekliği verir, böylece sayfadaki her kart eşit olur.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TEK ÖLÇEK — ÜÇ YOĞUNLUK KALDIRILDI
 *
 * Bileşen üç yoğunluk sunuyordu: `tight` (5 kolon), `default` (4) ve
 * `wide` (3). Sayım şunu gösterdi: `wide` hiçbir yerde kullanılmıyordu ve
 * `default` yalnızca TEK yerde — galeride. Diğer sekiz modülün hepsi
 * `tight` kullanıyordu.
 *
 * Yani galeri kartı sitedeki en BÜYÜK karttı ve bu bir tasarım kararı
 * değil, bir tutarsızlıktı: fotoğraf kartı, ekipman ve hedef kartlarından
 * geniş çıkıyordu. Galeri `tight`e alınınca xl'de 4 kolondan 5 kolona
 * geçiyor — kart genişliği tam olarak 4/5 = %80'e, yani %20 daralıyor —
 * ve sitedeki her kart aynı ölçüye oturuyor.
 *
 * Yoğunluk seçeneği tamamen kalktı. Kullanılmayan bir esneklik, ileride
 * birinin farkında olmadan tutarsızlığı geri getirmesinin yolu.
 */
const COLUMNS = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

export function CardGrid({
  view,
  children,
  className,
}: {
  view: ViewMode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <ul
      className={cn(
        'grid [&>li]:h-full',
        view === 'grid' ? cn('auto-rows-fr gap-2.5', COLUMNS) : 'gap-2',
        className
      )}
    >
      {children}
    </ul>
  );
}

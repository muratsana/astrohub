import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * UZUN METİN YERLEŞİMİ — okuma sütunu + yan sütun.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN "METNİ GENİŞLET" DEĞİL
 *
 * Ölçülen durum: yazı ve haber detayları `max-w-3xl` (768px) ile ortada
 * duruyordu; 1600px ekranda kapsayıcının 1424px'inin yarısı boş kalıyordu
 * (kullanıcı bildirdi). Akla ilk gelen çözüm — sınırı kaldırmak — yanlış:
 * 120 karakterlik satırda göz satır sonundan yeni satırın başına dönerken
 * yerini kaybeder. 65–75 karakter yerleşik bir okunabilirlik aralığı ve
 * ondan çıkmanın okura hiçbir faydası yok.
 *
 * Doğru kullanım şu: METİN ölçüsünü koruyup, boşta kalan yeri İKİNCİL
 * içerikle doldurmak. Yazı detayında bu ikincil içerik zaten vardı ama
 * metnin ALTINDA duruyordu — "ilgili yazılar" listesini görmek için
 * makalenin sonuna kadar inmek gerekiyordu. Yana alınca hem boşluk
 * doluyor hem de liste ilk ekranda görünür oluyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * YAN SÜTUN `lg` ALTINDA METNİN ALTINA DÜŞÜYOR
 *
 * Dar ekranda yan yana iki sütun, ikisini de okunmaz genişliğe indirir.
 * `lg` altında ızgara tek sütuna iniyor ve yan içerik eski yerine —
 * metnin altına — geçiyor. Yani mobilde davranış değişmiyor.
 *
 * Yan sütun `sticky`: uzun bir makalede aşağı inerken kaybolmuyor. Kendi
 * yüksekliği ekranı aşarsa kendi içinde kayıyor, sayfayı kilitlemiyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * İKİLİ BLOK ORTALANIYOR, GERİLMİYOR
 *
 * İlk denemede okuma sütunu `1fr` idi: metin 72ch'de duruyor, yan sütun
 * sağ kenara yapışıyor ve ARALARINDA ~450px'lik bir delik kalıyordu. İki
 * sütun arasındaki boşluk, sayfanın kenarındaki boşluktan daha rahatsız
 * edici — göz onu "eksik bir şey var" diye okuyor.
 *
 * Şimdi ikisi birlikte bir blok: genişlik metnin ölçüsü + boşluk + yan
 * sütun kadar (~64rem) ve blok ortalanıyor. Artan yer sayfanın iki
 * kenarına simetrik dağılıyor; bu bir boşluk değil, kenar payı.
 */
export function ReadingLayout({
  children,
  aside,
  className,
}: {
  /** Okuma sütunu — ölçüsü sınırlı. */
  children: ReactNode;
  /** Yan sütun; verilmezse tek sütun düzeni korunur. */
  aside?: ReactNode;
  className?: string;
}) {
  if (!aside) {
    return (
      <div className={cn('mx-auto w-full max-w-[72ch]', className)}>
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'mx-auto grid w-full max-w-[64rem] gap-10',
        'lg:grid-cols-[minmax(0,1fr)_280px] xl:gap-14',
        className
      )}
    >
      <div className="min-w-0 max-w-[72ch]">{children}</div>
      <aside className="min-w-0 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto">
        {aside}
      </aside>
    </div>
  );
}

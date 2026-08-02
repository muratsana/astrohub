import type { ReactNode } from 'react';
import { HeroSection } from './sections/HeroSection';
import { TonightPanel } from './sections/TonightPanel';
import { RecentRecords } from './sections/RecentRecords';
import { NewsStrip } from './sections/NewsStrip';
import { UpcomingEvents } from './sections/UpcomingEvents';
import { RecentListings } from './sections/RecentListings';
import { PageMeta } from '@/components/seo/PageMeta';
import { organizationJsonLd } from '@/lib/seo';
import {
  useHomeLayout,
  visibilityClass,
  type HomeModuleView,
} from './homeLayout';

/**
 * ANA SAYFA — Rasathane Terminali.
 *
 *   1  Hero · beş modül mockup'ı + slogan (site ne yapar)
 *   2  Bu gece · gerçek efemeris hesabı
 *   3  Galeriden son yüklenenler
 *   4  Haberler ve yazılar · iki sütun, mini görsel kartları
 *   5  Yaklaşan etkinlikler · ajanda
 *   6  Son ilanlar
 *
 * SIRA BİR ÖNCELİK BEYANI: önce gökyüzünün kendisi (bu gece), sonra
 * topluluğun ürettiği (galeri), sonra okunacaklar (haber/yazı), sonra
 * takvim, en sonda pazaryeri. Ziyaretçinin ilk işi alışveriş değil.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SIRA ARTIK BURADA SABİT DEĞİL — `home_modules` BELİRLİYOR (§13.2)
 *
 * Yukarıdaki numaralandırma VARSAYILAN, kural değil. Modüllerin sırası,
 * açık/kapalı olması, kaç öğe göstereceği, başlığı, mobil/masaüstü
 * görünürlüğü ve yayın penceresi yönetim panelinden geliyor.
 *
 * Bunlar zaten panelde düzenlenebiliyordu; eksik olan tek şey ana
 * sayfanın onları OKUMASIYDI. Yönetici "galeri modülünü kapat" diyor,
 * taslağı yayımlıyor, değişiklik geçmişine kaydı düşüyordu — ve
 * ziyaretçi galeriyi görmeye devam ediyordu. §13'ün ilk cümlesi "normal
 * operasyon için kaynak kod değişikliği gerekmemelidir" diyor; o cümle
 * ancak bu okuma varsa doğru.
 *
 * BİLİNMEYEN ANAHTAR SESSİZCE ATLANIR. `SECTIONS` haritasında karşılığı
 * olmayan bir modül anahtarı çizilmiyor — tabloya ileride bir satır
 * eklenirse (ya da elle eklenirse) ana sayfa çökmek yerine onu görmezden
 * geliyor. Tersi de güvenli: haritada olup tabloda olmayan modül hiç
 * çizilmiyor, çünkü döngü TABLOYU geziyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NELER BAĞLANMADI
 *
 * `layout` (ızgara/liste) bağlanmadı: her bölümün kendi tasarımı var ve
 * ızgarayı listeye çevirmek altı ayrı tasarım kararı demek — tek satırlık
 * bir prop değil. Panelde duruyor ama ana sayfada karşılığı yok; bunu
 * bilerek ve yazılı bırakıyoruz, çünkü sessizce hiçbir şey yapmayan bir
 * kontrol, olmayan kontrolden kötüdür.
 *
 * `subtitle` de bağlanmadı: bölümlerin `description` alanları elle
 * yazılmış ve §5.4'te bilerek kısaltılmıştı.
 *
 * Karanlık gökyüzü şeridi ana sayfadan çıkarıldı — modül `/saha`da
 * duruyor ve üst menüde girişi var.
 *
 * Manifesto ve araçlar şeritleri kaldırıldı: ürün mesajını hero taşıyor,
 * araçlar üst menüde ve modül haritasında zaten var.
 */
export function HomePage() {
  const layout = useHomeLayout();

  return (
    <>
      <PageMeta
        bare
        title="Astrohub — Gökyüzünü kaydet, paylaş, planla"
        description="Türkiye'nin astronomi platformu. Astrofotoğraflarını teknik künyesiyle arşivle, etkinlikleri takip et, karanlık gökyüzü noktalarını bul, gökyüzü araçlarıyla geceni planla."
        jsonLd={organizationJsonLd}
      />

      {layout.map((modul) => {
        const ciz = SECTIONS[modul.key];
        if (!ciz) return null;
        return (
          <Visible key={modul.key} modul={modul}>
            {ciz(modul)}
          </Visible>
        );
      })}
    </>
  );
}

/**
 * Modül anahtarı → bölüm.
 *
 * `home_modules.key` ile bileşen arasındaki TEK eşleme noktası. Dağınık
 * `if` zincirleri yerine harita: yeni bir modül eklemek tek satır, ve
 * hangi anahtarın karşılığı olduğu tek bakışta görünüyor.
 */
const SECTIONS: Record<string, (m: HomeModuleView) => ReactNode> = {
  hero: () => <HeroSection />,
  tonight: () => <TonightPanel />,
  records: (m) => (
    <RecentRecords
      hideWhenEmpty={m.hide_when_empty}
      limit={m.item_limit}
      title={m.title ?? undefined}
    />
  ),
  news: (m) => <NewsStrip limit={m.item_limit} />,
  events: (m) => (
    <UpcomingEvents limit={m.item_limit} title={m.title ?? undefined} />
  ),
  listings: (m) => (
    <RecentListings limit={m.item_limit} title={m.title ?? undefined} />
  ),
};

/**
 * Mobil/masaüstü görünürlüğü.
 *
 * Sarmalayıcı `<div>` YALNIZCA gerektiğinde ekleniyor. Her modülü
 * koşulsuz sarsaydık, hiçbir görünürlük kısıtı olmayan olağan durumda da
 * DOM'a altı gereksiz katman girerdi — ve bölümlerin kendi dikey boşluk
 * hesapları (`py-9 sm:py-11`) araya giren kutuyla birlikte doğrulanmamış
 * bir düzene dönüşürdü.
 */
function Visible({
  modul,
  children,
}: {
  modul: HomeModuleView;
  children: ReactNode;
}) {
  const sinif = visibilityClass(modul);
  if (!sinif) return <>{children}</>;
  return <div className={sinif}>{children}</div>;
}

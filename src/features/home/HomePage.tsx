import { lazy, Suspense, type ReactNode } from 'react';
import { HeroSection } from './sections/HeroSection';
import { TonightPanel } from './sections/TonightPanel';
import { RecentRecords } from './sections/RecentRecords';
import { PageMeta } from '@/components/seo/PageMeta';
import { organizationJsonLd } from '@/lib/seo';
import {
  useHomeLayout,
  visibilityClass,
  type HomeModuleView,
} from './homeLayout';

const NewsStrip = lazy(() =>
  import('./sections/NewsStrip').then((module) => ({
    default: module.NewsStrip,
  }))
);
const UpcomingEvents = lazy(() =>
  import('./sections/UpcomingEvents').then((module) => ({
    default: module.UpcomingEvents,
  }))
);
const RecentListings = lazy(() =>
  import('./sections/RecentListings').then((module) => ({
    default: module.RecentListings,
  }))
);
const WeeklyPhoto = lazy(() =>
  import('./sections/WeeklyPhoto').then((module) => ({
    default: module.WeeklyPhoto,
  }))
);

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
 * `layout` ve `subtitle` de bağlı. Varsayılanlar bileşenlerin kendi
 * ritmini korur; panelden gelen değer yalnızca ilgili modülün başlık
 * metnini ve kart/list davranışını değiştirir.
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
      layout={m.layout}
      subtitle={m.subtitle ?? undefined}
      title={m.title ?? undefined}
    />
  ),
  news: (m) => (
    <LazySection>
      <NewsStrip
        limit={m.item_limit}
        layout={m.layout}
        subtitle={m.subtitle ?? undefined}
        title={m.title ?? undefined}
      />
    </LazySection>
  ),
  events: (m) => (
    <LazySection>
      <UpcomingEvents
        limit={m.item_limit}
        layout={m.layout}
        subtitle={m.subtitle ?? undefined}
        title={m.title ?? undefined}
      />
    </LazySection>
  ),
  listings: (m) => (
    <LazySection>
      <RecentListings
        limit={m.item_limit}
        layout={m.layout}
        subtitle={m.subtitle ?? undefined}
        title={m.title ?? undefined}
      />
    </LazySection>
  ),
  weekly_photo: (m) => (
    <LazySection>
      <WeeklyPhoto hideWhenEmpty={m.hide_when_empty} />
    </LazySection>
  ),
};

function LazySection({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

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

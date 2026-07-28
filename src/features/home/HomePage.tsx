import { HeroSection } from './sections/HeroSection';
import { TonightPanel } from './sections/TonightPanel';
import { RecentRecords } from './sections/RecentRecords';
import { NewsStrip } from './sections/NewsStrip';
import { UpcomingEvents } from './sections/UpcomingEvents';
import { RecentListings } from './sections/RecentListings';
import { PageMeta } from '@/components/seo/PageMeta';
import { organizationJsonLd } from '@/lib/seo';

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
 * Karanlık gökyüzü şeridi ana sayfadan çıkarıldı — modül `/saha`da
 * duruyor ve üst menüde girişi var. Ana sayfa altı bölümle bitiyor;
 * yedincisi listeyi uzatıyor, sıralamayı güçlendirmiyordu.
 *
 * Manifesto şeridi kaldırıldı: ürün mesajını artık hero taşıyor, aynı şeyi
 * iki kez söylemeye gerek yok.
 *
 * Araçlar şeridi de kaldırıldı: araçlar üst menüde ve modül haritasında
 * zaten var; ana sayfanın sonunda üçüncü bir bağlantı listesi, sayfayı
 * içerikle değil dizinle bitiriyordu.
 */
export function HomePage() {
  return (
    <>
      <PageMeta
        bare
        title="Astrohub — Gökyüzünü kaydet, paylaş, planla"
        description="Türkiye'nin astronomi platformu. Astrofotoğraflarını teknik künyesiyle arşivle, etkinlikleri takip et, karanlık gökyüzü noktalarını bul, gökyüzü araçlarıyla geceni planla."
        jsonLd={organizationJsonLd}
      />

      <HeroSection />
      <TonightPanel />
      <RecentRecords />
      <NewsStrip />
      <UpcomingEvents />
      <RecentListings />
    </>
  );
}

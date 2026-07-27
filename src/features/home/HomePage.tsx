import { HeroSection } from './sections/HeroSection';
import { QuickAccess } from './sections/QuickAccess';
import { UpcomingEvents } from './sections/UpcomingEvents';
import { FeaturedPhotos } from './sections/FeaturedPhotos';
import { PopularArticles } from './sections/PopularArticles';
import { CommunityCTA } from './sections/CommunityCTA';
import { PageMeta } from '@/components/seo/PageMeta';
import { organizationJsonLd } from '@/lib/seo';

/**
 * Astrohub ana sayfası — kabul edilen editoryal tasarım (§7.1).
 * Dashboard değil; koyu, ferah, fotoğraf odaklı yerleşim (§6.1, §19.7).
 *
 * Bölüm sırası (§7.1):
 *  1. Editoryal giriş  2. Hızlı erişim  3. Yaklaşan etkinlikler
 *  4. Öne çıkan fotoğraflar  5. Popüler makaleler  6. Topluluk çağrısı
 */
export function HomePage() {
  return (
    <div className="pb-8">
      <PageMeta
        bare
        title="Astrohub — Gökyüzünü keşfet, paylaş, öğren"
        description="Türkiye'nin astronomi, astrofotoğrafçılık, gözlem etkinlikleri, karanlık gökyüzü ve astrocamping platformu. Astrofotoğrafları teknik çekim verisiyle arşivle, etkinlikleri takip et, karanlık gökyüzü noktalarını keşfet."
        jsonLd={organizationJsonLd}
      />
      <HeroSection />
      <QuickAccess />
      <UpcomingEvents />
      <FeaturedPhotos />
      <PopularArticles />
      <CommunityCTA />
    </div>
  );
}

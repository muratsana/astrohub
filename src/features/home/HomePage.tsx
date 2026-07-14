import { HeroSection } from './sections/HeroSection';
import { QuickAccess } from './sections/QuickAccess';
import { UpcomingEvents } from './sections/UpcomingEvents';
import { FeaturedPhotos } from './sections/FeaturedPhotos';
import { PopularArticles } from './sections/PopularArticles';
import { CommunityCTA } from './sections/CommunityCTA';

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
      <HeroSection />
      <QuickAccess />
      <UpcomingEvents />
      <FeaturedPhotos />
      <PopularArticles />
      <CommunityCTA />
    </div>
  );
}

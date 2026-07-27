import { TonightPanel } from './sections/TonightPanel';
import { RecentRecords } from './sections/RecentRecords';
import { ManifestoStrip } from './sections/ManifestoStrip';
import { UpcomingEvents } from './sections/UpcomingEvents';
import { DarkSkyStrip } from './sections/DarkSkyStrip';
import { ToolsStrip } from './sections/ToolsStrip';
import { LearningStrip } from './sections/LearningStrip';
import { PageMeta } from '@/components/seo/PageMeta';
import { organizationJsonLd } from '@/lib/seo';

/**
 * ANA SAYFA — Rasathane Terminali.
 *
 * Bölüm sırası "kayıt odaklı": site kendini anlatmadan önce çalışırken
 * gösterir. Üstte bu gecenin gökyüzü durumu (dönen kullanıcı için her gece
 * yeni değer), sonra topluluğun kayıtları; ürün mesajı üçüncü sıraya,
 * tek bir şeride iner.
 *
 *   1  Bu gece · gerçek efemeris hesabı
 *   2  Son kayıtlar · künyeli karo ızgarası
 *   3  Manifesto şeridi
 *   4  Yaklaşan etkinlikler · tablo
 *   5  Karanlık gökyüzü · en iyi üç nokta
 *   6  Araçlar
 *   7  Eğitim
 */
export function HomePage() {
  return (
    <>
      <PageMeta
        bare
        title="Astrohub — Gökyüzü kayıt altında"
        description="Türkiye'nin astrofotoğraf kayıt ağı. Her kare hedefi, optiği, filtresi ve gökyüzü koşullarıyla arşivlenir. Bu gece gökyüzünde ne var, hangi hedef ne zaman zirve yapıyor — canlı hesapla."
        jsonLd={organizationJsonLd}
      />

      <TonightPanel />
      <RecentRecords />
      <ManifestoStrip />
      <UpcomingEvents />
      <DarkSkyStrip />
      <ToolsStrip />
      <LearningStrip />
    </>
  );
}

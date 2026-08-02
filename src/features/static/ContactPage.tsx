import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { LegalLayout, LegalSection, LegalList } from './LegalLayout';

const CONTACT_EMAIL = 'iletisim@astrohub.com.tr';
const MAILTO = `mailto:${CONTACT_EMAIL}?subject=Astrohub%20iletisim`;

export function ContactPage() {
  return (
    <>
      <PageMeta
        title="İletişim"
        description="Astrohub ile iletişime geçin: içerik, etkinlik, ilan, üyelik ve iş birliği mesajları."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'İletişim', path: '/iletisim' },
        ])}
      />
      <LegalLayout
        title="İletişim"
        intro="İçerik düzeltmeleri, etkinlik bildirimleri, üyelik, ilan ve iş birliği mesajları için bize e-posta gönderebilirsiniz."
      >
        <LegalSection heading="Mesaj gönder">
          <p>
            Mesajınıza konu başlığı, ilgili bağlantı ve gerekiyorsa ekran
            görüntüsü ekleyin. Böylece talebi daha hızlı inceleyebiliriz.
          </p>

          <p>
            <a
              href={MAILTO}
              className="inline-flex items-center justify-center rounded-card border border-primary bg-primary px-5 py-3 text-meta font-medium tracking-[0.03em] text-primary-foreground transition-colors hover:bg-primary-hover hover:no-underline"
            >
              E-posta gönder
            </a>
          </p>
        </LegalSection>

        <LegalSection heading="Hızlı konu seçimi">
          <LegalList
            items={[
              'Etkinlik veya gözlem kampı bildirme',
              'Galeri, haber veya yazı düzeltmesi',
              'İlan ve hesap desteği',
              'KVKK başvurusu veya veri talebi',
            ]}
          />
        </LegalSection>
      </LegalLayout>
    </>
  );
}

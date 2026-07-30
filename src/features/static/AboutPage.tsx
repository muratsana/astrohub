import { Link } from 'react-router';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { LegalLayout, LegalSection, LegalList } from './LegalLayout';

/**
 * Hakkında sayfası (§3 ürün vizyonu). Platformun ne olduğunu, hangi
 * ilkelerle kurulduğunu ve neyi kapsamadığını açıkça anlatır.
 */
export function AboutPage() {
  return (
    <>
      <PageMeta
        title="Hakkında"
        description="Astrohub nedir, hangi ilkelerle kuruldu ve neyi kapsıyor? Türkiye'nin astronomi, astrofotoğrafçılık ve karanlık gökyüzü platformu."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Hakkında', path: '/hakkinda' },
        ])}
      />
      <LegalLayout
        title="Astrohub Hakkında"
        intro="Astrohub; Türkiye'de astronomiyle uğraşan herkesi tek bir yerde buluşturmak için kuruldu. Fotoğraf paylaşmak kadar, o fotoğrafın nasıl çekildiğini kayıt altına almak da işin merkezinde."
      >
        <LegalSection heading="Neden var?">
          <p>
            Türkiye'de astrofotoğraflar dağınık platformlarda, teknik verisinden
            kopuk biçimde paylaşılıyor. Etkinlikler tek bir takvimde toplanmıyor,
            karanlık gökyüzü noktaları kulaktan kulağa yayılıyor. Astrohub bu üç
            boşluğu kapatmak için kuruldu.
          </p>
        </LegalSection>

        <LegalSection heading="Ne yapar?">
          <LegalList
            items={[
              <>
                <strong>Astrofotoğraf arşivi:</strong> her fotoğraf; hedef, setup,
                ekipman, filtreler, kalibrasyon, lokasyon ve gökyüzü koşullarıyla
                birlikte saklanır. Bir görüntü değil, tekrarlanabilir bir çekim
                kaydıdır.
              </>,
              <>
                <strong>Etkinlik merkezi:</strong> Türkiye'deki gözlem şenlikleri,
                kamplar, halk gözlemleri ve konferanslar tek takvimde; her kayıt
                kaynağı ve son doğrulama tarihiyle birlikte.
              </>,
              <>
                <strong>Karanlık gökyüzü ve astrocamping:</strong> ışık kirliliği
                haritası ile kamp/gözlem noktaları; gökyüzü, kamp ve
                astrofotoğrafçılık kriterleriyle değerlendirilmiş.
              </>,
              <>
                <strong>Ekipman veritabanı ve araçlar:</strong> marka/model
                kataloğu, setup oluşturucu ve{' '}
                <Link to="/araclar/fov">FOV / pixel scale hesaplayıcı</Link>.
              </>,
              <>
                <strong>Eğitim ve pazaryeri:</strong> başlangıçtan ileri seviyeye
                rehberler ve ekipman veritabanına bağlı ikinci el ilanlar.
              </>,
            ]}
          />
        </LegalSection>

        <LegalSection heading="İlkelerimiz">
          <LegalList
            items={[
              <>
                <strong>Teknik veri esastır.</strong> Fotoğrafın nasıl çekildiği,
                fotoğrafın kendisi kadar değerlidir.
              </>,
              <>
                <strong>Konum gizliliği kullanıcının kararıdır.</strong> GPS verisi
                varsayılan olarak gizlidir; hassas noktalarda koordinat yuvarlanır.
              </>,
              <>
                <strong>Kaynak şeffaflığı.</strong> Etkinlik ve harita verisi,
                nereden geldiği ve ne zaman doğrulandığı bilgisiyle sunulur.
              </>,
              <>
                <strong>Dürüst içerik.</strong> Yapay zekâ kullanımı beyan edilir;
                üretilmiş görsel astrofotoğraf diye sunulamaz.
              </>,
              <>
                <strong>Sade arayüz.</strong> Kamuya açık sayfalar editoryal ve
                ferahtır; yoğun dashboard görünümü yalnızca üye/yönetim
                panelindedir.
              </>,
            ]}
          />
        </LegalSection>

        <LegalSection heading="Geliştirme durumu">
          <p>
            Astrohub geliştirme aşamasındadır. Şu anda arayüz ve modül akışları
            örnek veriyle çalışır durumdadır; hesap sistemi, fotoğraf yükleme
            pipeline'ı, harita katmanları ve ödeme entegrasyonu sırayla devreye
            alınmaktadır. Yol haritası ve tamamlanan işler proje deposunda açık
            biçimde takip edilir.
          </p>
        </LegalSection>

        <LegalSection heading="İletişim">
          <p>
            Öneri, hata bildirimi, etkinlik kaydı veya gözlem noktası katkısı
            için topluluk kanalları platform yayına alındığında bu sayfada
            duyurulacaktır.
          </p>
        </LegalSection>
      </LegalLayout>
    </>
  );
}

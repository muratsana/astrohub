import { Link } from 'react-router';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { LegalLayout, LegalSection, LegalList } from './LegalLayout';

/**
 * KVKK aydınlatma metni ve gizlilik politikası (§15.7).
 *
 * NOT: Bu metin şartnamedeki veri işleme kararlarını yansıtan taslaktır;
 * yayına almadan önce hukuk danışmanı incelemesinden geçmelidir. Veri
 * sorumlusu kimliği, iletişim adresi ve saklama süreleri tüzel kişilik
 * kurulduğunda kesinleştirilecektir.
 */
export function PrivacyPage() {
  return (
    <>
      <PageMeta
        title="KVKK Aydınlatma Metni ve Gizlilik Politikası"
        description="Astrohub'ın kişisel veri işleme esasları: hangi veriler işlenir, konum ve EXIF verisi nasıl ele alınır, ilgili kişi hakları nasıl kullanılır."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'KVKK ve Gizlilik', path: '/kvkk' },
        ])}
      />
      <LegalLayout
        title="KVKK Aydınlatma Metni ve Gizlilik Politikası"
        intro="6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında, Astrohub'ı kullanırken hangi kişisel verilerinizin işlendiğini, bu verilerin neden ve ne kadar süreyle saklandığını ve haklarınızı nasıl kullanabileceğinizi açıklar."
        updatedAt="2026-07-27"
      >
        <p className="rounded-card border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          Bu metin, platformun veri işleme kararlarını yansıtan taslaktır. Veri
          sorumlusu tüzel kişilik bilgileri ve başvuru kanalları, platform
          ticari olarak yayına alındığında bu sayfada kesinleştirilecektir.
        </p>

        <LegalSection heading="1. İşlenen kişisel veriler">
          <p>Astrohub, yalnızca hizmetin sunulması için gereken verileri işler:</p>
          <LegalList
            items={[
              <>
                <strong>Hesap verileri:</strong> e-posta adresi, kullanıcı adı,
                görünen ad, profil görseli.
              </>,
              <>
                <strong>İçerik verileri:</strong> yüklediğiniz astrofotoğraflar,
                çekim günlüğü kayıtları, ekipman bilgileri, yorumlar.
              </>,
              <>
                <strong>Konum verileri:</strong> fotoğraf ve gözlem noktalarına
                ilişkin koordinatlar. Görünürlük düzeyini siz seçersiniz (tam
                koordinat / yaklaşık / il-ilçe / gizli).
              </>,
              <>
                <strong>Teknik veriler:</strong> oturum bilgisi, cihaz ve tarayıcı
                türü, IP adresi (güvenlik ve kötüye kullanım önleme amacıyla).
              </>,
              <>
                <strong>Üyelik ve ödeme verileri:</strong> üyelik durumu ve dönem
                bilgisi. Kart bilgileri Astrohub tarafından saklanmaz; ödeme
                sağlayıcısı tarafından işlenir.
              </>,
            ]}
          />
        </LegalSection>

        <LegalSection heading="2. Konum ve EXIF verisi">
          <p>
            Yüklenen fotoğrafların EXIF verisi sunucu tarafında okunur ve çekim
            formuna yansıtılır. <strong>GPS koordinatı varsayılan olarak gizlidir</strong>{' '}
            ve siz açıkça izin vermeden kamuya açılmaz.
          </p>
          <p>
            Hassas gözlem noktalarında sistem koordinatı otomatik olarak
            yuvarlayabilir. Tam koordinatın kamuya açık hâle geleceği durumlarda
            yayın öncesinde açık uyarı gösterilir.
          </p>
          <p>
            Yayımlanan türev görsellerden konum içeren EXIF alanları kaldırılır;
            orijinal dosya hiçbir zaman herkese açık bir adresten sunulmaz.
          </p>
        </LegalSection>

        <LegalSection heading="3. İşleme amaçları ve hukuki sebep">
          <LegalList
            items={[
              'Üyelik sözleşmesinin kurulması ve ifası (hesap, üyelik hakları, kota takibi).',
              'İçeriğin yayımlanması, arşivlenmesi ve topluluğa sunulması.',
              'Güvenlik, kötüye kullanım ve telif ihlali önleme; moderasyon kayıtları.',
              'Yasal yükümlülüklerin yerine getirilmesi.',
              'Açık rızanız varsa: pazarlama iletişimi ve isteğe bağlı bildirimler.',
            ]}
          />
          <p>
            Pazarlama izni, hizmetin kullanımı için zorunlu değildir ve diğer
            işleme amaçlarından ayrı olarak alınır; dilediğiniz an geri
            çekebilirsiniz.
          </p>
        </LegalSection>

        <LegalSection heading="4. Çerezler ve yerel depolama">
          <p>
            Astrohub hâlihazırda <strong>izleme çerezi kullanmamaktadır</strong>:
            reklam ağı, üçüncü parti analitik ve parmak izi çıkarma yoktur.
            Tarayıcınızda saklanan veriler yalnızca sizin tercihlerinizdir
            (tema, gözlem konumu, görünüm seçimi, radyo ses düzeyi) ve
            tarayıcınızın yerel deposunda kalır.
          </p>
          <p>
            Oturum açıldığında kimlik doğrulama için zorunlu bir oturum kaydı
            tutulur; hizmetin çalışması için gereklidir ve kapatılamaz.
            Ölçümleme ya da pazarlama amaçlı bir kayıt eklenirse ayrıca açık
            rızanız alınır.
          </p>
          <p>
            Saklanan verilerin tam listesini görmek ve tek tıkla silmek için{' '}
            <Link to="/cerezler" className="text-primary hover:underline">
              Çerez ve Depolama Tercihleri
            </Link>{' '}
            sayfasına bakabilirsiniz.
          </p>
        </LegalSection>

        <LegalSection heading="5. Saklama süreleri">
          <LegalList
            items={[
              'Hesap ve içerik verileri: hesap aktif olduğu sürece.',
              'Üyeliği sona eren kullanıcının içeriği silinmez; yayından kaldırılıp arşivlenir ve üyelik yenilendiğinde geri gelir.',
              'Hesap silme talebinde içerik ve kişisel veriler mevzuatın izin verdiği en kısa sürede silinir; yasal saklama yükümlülüğü olan kayıtlar süresi dolana dek tutulur.',
              'Güvenlik ve moderasyon kayıtları: kötüye kullanım incelemeleri için sınırlı süreyle.',
            ]}
          />
        </LegalSection>

        <LegalSection heading="6. Verilerin aktarılması">
          <p>
            Veriler; barındırma, veritabanı, nesne depolama, e-posta ve ödeme
            hizmeti sağlayıcılarıyla yalnızca hizmetin sunulması amacıyla ve
            sözleşmesel gizlilik yükümlülüğü altında paylaşılır. Kişisel
            verileriniz pazarlama amacıyla üçüncü taraflara satılmaz.
          </p>
        </LegalSection>

        <LegalSection heading="7. İlgili kişi hakları">
          <p>KVKK m.11 uyarınca şu haklara sahipsiniz:</p>
          <LegalList
            items={[
              'Kişisel verinizin işlenip işlenmediğini öğrenme ve buna ilişkin bilgi talep etme.',
              'İşleme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme.',
              'Eksik veya yanlış işlenmiş verinin düzeltilmesini isteme.',
              'Verinin silinmesini veya yok edilmesini isteme.',
              'Verilerinizin dışa aktarılmasını (taşınabilir bir kopyasını) talep etme.',
              'İşlemenin hukuka aykırılığı nedeniyle zarara uğramanız hâlinde giderim talep etme.',
            ]}
          />
          <p>
            Hesap ayarlarınızdan <strong>veri dışa aktarma</strong> ve{' '}
            <strong>hesap silme</strong> işlemlerini doğrudan başlatabilirsiniz.
            Diğer başvurularınız için ilgili kişi başvuru kanalı bu sayfada
            duyurulacaktır.
          </p>
        </LegalSection>
      </LegalLayout>
    </>
  );
}

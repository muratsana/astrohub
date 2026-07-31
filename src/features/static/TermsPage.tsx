import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { LegalLayout, LegalSection, LegalList } from './LegalLayout';
import {
  PHOTO_LIMITS,
  MAX_DRAFT_PHOTOS,
  MAX_STORED_BYTES,
  formatBytes,
} from '@/domain/membership/quota';
import { GRACE_PERIOD_DAYS } from '@/domain/membership/entitlement';

/**
 * Kullanım koşulları (§4 üyelik, §15.4 telif, §15.5 AI politikası, §15.6
 * üye güvenliği). Sayısal sınırlar domain katmanından okunur — kural tek
 * yerde değişir, metin otomatik güncel kalır.
 *
 * NOT: Taslak metindir; yayına almadan önce hukuk danışmanı incelemesi gerekir.
 */
export function TermsPage() {
  return (
    <>
      <PageMeta
        title="Kullanım Koşulları"
        description="Astrohub üyelik hakları, fotoğraf kotası, telif ve lisans kuralları, AI içerik beyanı ve topluluk davranış kuralları."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Kullanım Koşulları', path: '/kullanim-kosullari' },
        ])}
      />
      <LegalLayout
        title="Kullanım Koşulları"
        intro="Astrohub'ı kullanarak bu koşulları kabul etmiş olursunuz. Koşullar; üyelik hakları, içerik ve telif kuralları ile topluluk davranış esaslarını kapsar."
        updatedAt="2026-07-27"
      >
        <p className="rounded-card border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          Bu metin taslaktır. Ticari yayın öncesinde şirket bilgileri, uyuşmazlık
          çözümü ve yetkili mahkeme maddeleri hukuk danışmanı incelemesiyle
          kesinleştirilecektir.
        </p>

        <LegalSection heading="1. Üyelik">
          <p>
            Astrohub tek bir ücretli üyelik paketi sunar. Aylık ve yıllık ödeme
            seçenekleri <strong>aynı hakları</strong> verir; tek fark ödeme
            dönemidir.
          </p>
          <LegalList
            items={[
              <>
                Ücretsiz üyelikte aynı anda en fazla{' '}
                <strong>
                  {PHOTO_LIMITS.standart} aktif yayımlanmış fotoğraf
                </strong>
                , ücretli üyelikte{' '}
                <strong>{PHOTO_LIMITS.premium}</strong> bulundurabilirsiniz.
              </>,
              <>
                Her fotoğraf için saklanan dosya en fazla{' '}
                <strong>{formatBytes(MAX_STORED_BYTES)}</strong> yer tutar. Daha
                büyük bir dosya <em>reddedilmez</em>: yükleme sırasında bu
                sınıra sıkıştırılır. Çözünürlük mümkün olduğunca korunur,
                yalnızca sıkıştırma oranı artar; bu nedenle sakladığımız kopya
                gönderdiğiniz dosyayla bit düzeyinde aynı olmayabilir.
              </>,
              <>
                Aynı fotoğrafın yeni bir işleme sürümü kotada ayrı bir fotoğraf
                sayılmaz.
              </>,
              <>
                Yayımlanmamış taslak sayısı en fazla{' '}
                <strong>{MAX_DRAFT_PHOTOS}</strong> ile sınırlıdır.
              </>,
              'Üyelik durumu ve kota sunucu tarafında doğrulanır; arayüz üzerinden aşılamaz.',
            ]}
          />
        </LegalSection>

        <LegalSection heading="2. Üyelik sona erdiğinde">
          <p>
            Üyeliğiniz sona erdiğinde verileriniz <strong>silinmez</strong>.
            Ödeme dönemi bittikten sonra{' '}
            <strong>{GRACE_PERIOD_DAYS} günlük</strong> bir ödemesiz süre işler:
          </p>
          <LegalList
            items={[
              'Ödemesiz süre boyunca mevcut içeriğiniz yayında kalır, yeni yükleme ve ilan durur.',
              'Ödemesiz süre de dolduğunda içerik yayından kaldırılıp arşivlenir.',
              'Üyelik yenilendiğinde arşivlenen içerik olduğu gibi geri gelir.',
            ]}
          />
        </LegalSection>

        <LegalSection heading="3. İçerik, telif ve lisans">
          <p>
            <strong>Yüklediğiniz eserlerin hakları size aittir.</strong> Yükleme
            sırasında eserin sahibi olduğunuzu ve paylaşma hakkınız bulunduğunu
            onaylarsınız. Astrohub eseri satmaz ve üçüncü taraflara lisanslamaz.
          </p>
          <p>
            Fotoğrafınızı yükleyerek, Astrohub'ın onu{' '}
            <strong>ayrıca izin almaksızın ancak adınızı kaynak göstermek
            şartıyla</strong>{' '}
            kullanmasına izin vermiş olursunuz. Bu izin platform içindeki
            gösterimi, Astrohub'ın kendi tanıtım ve sosyal medya
            paylaşımlarını ve site içi derlemeleri kapsar. Her kullanımda
            eser sahibinin adı görünür biçimde belirtilir.
          </p>
          <LegalList
            items={[
              'Kaynak gösterme zorunludur: fotoğraf, eser sahibinin adı olmadan kullanılmaz.',
              'İzin münhasır değildir: eseriniz üzerindeki haklarınız aynen devam eder, dilediğiniz yerde yayımlayabilirsiniz.',
              'Astrohub eseri satmaz, üçüncü taraflara lisanslamaz ve ücret karşılığı devretmez.',
              'Fotoğrafınızı kaldırdığınızda ileriye dönük kullanım da sona erer; yayımlanmış geçmiş paylaşımlar için makul sürede kaldırma talebinde bulunabilirsiniz.',
              'Size ait olmayan bir eseri yüklemek yasaktır; telif kaldırma ve itiraz süreci işletilir.',
            ]}
          />
        </LegalSection>

        <LegalSection heading="4. Yapay zekâ içerik politikası">
          <p>
            Tamamen yapay zekâ ile üretilmiş görseller gerçek astrofotoğraf gibi
            sunulamaz. Yapay zekâ tabanlı gürültü azaltma, ölçek büyütme veya
            yıldız işleme kullandıysanız bunu yayın sırasında beyan edersiniz;
            beyan fotoğraf detayında görünür.
          </p>
          <p>Şüpheli içerik topluluk tarafından raporlanabilir.</p>
        </LegalSection>

        <LegalSection heading="5. Topluluk kuralları">
          <LegalList
            items={[
              'Taciz, hakaret, nefret söylemi ve kişisel veri ifşası yasaktır.',
              'Gözlem noktası bilgileri doğa ve yerel topluluğa saygıyı gözeterek paylaşılmalıdır.',
              'İkinci el ilanlarında ürün durumu dürüstçe belirtilmelidir; platform içi ödeme/escrow sunulmaz, alım-satım riski taraflara aittir.',
              'Etkinlik yayımlayan organizatörler kaynak ve doğruluk bilgisinden sorumludur.',
            ]}
          />
        </LegalSection>

        <LegalSection heading="6. Hizmetin sürekliliği">
          <p>
            Astrohub, hizmeti geliştirmek için modülleri değiştirebilir veya
            kaldırabilir. Üyelik haklarını esaslı biçimde etkileyen
            değişiklikler makul süre önce duyurulur.
          </p>
        </LegalSection>
      </LegalLayout>
    </>
  );
}

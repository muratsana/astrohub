import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { useAuth } from '@/features/auth/AuthContext';
import {
  formatBytes,
  useBilling,
  useQuota,
} from '@/services/content/membership';

/**
 * PREMIUM SAYFASI (§12.2, §12.4).
 *
 * ═══════════════════════════════════════════════════════════════════════
 * SATIN ALMA DÜĞMESİ YOK — DEVRE DIŞI BİLE DEĞİL
 *
 * §12.2'nin son maddesi: "premium kapalıyken public kullanıcı 'satın
 * al' düğmesiyle çıkmaza sokulmamalıdır". Devre dışı bir düğme koymak
 * bu maddeyi teknik olarak sağlar ve ruhunu çiğner: kullanıcı ona bakıp
 * bekler, tıklamayı dener, neden çalışmadığını arar.
 *
 * Sayfa bunun yerine ne olduğunu ve NE ZAMAN olacağını söylüyor.
 * Ödeme açıldığında (`app_settings.billing.odeme_acik`) satın alma
 * yüzeyi burada belirecek — o zamana kadar yok.
 *
 * KART BİLGİSİ İSTENMİYOR. Ne form var ne alan; §12.2 "kullanıcıdan
 * ödeme veya kart bilgisi alınmamalıdır" diyor ve bu sayfada bunun
 * yapılabileceği bir yer yok.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * PREMIUM'UN SEBEBİ AÇIK YAZILIYOR (§12.4)
 *
 * "Daha fazla özellik" demek kolaydı ve dürüst olmazdı. Premium'un
 * sebebi maliyet: astrofotoğraflar büyük dosyalar ve saklamak,
 * dağıtmak, yedeklemek para tutuyor. §12.4 bunu açıkça anlatmayı
 * şart koşuyor ve haklı — kullanıcı neden ödediğini bilmeli.
 *
 * Aynı bölüm şunu da şart koşuyor: "Premium satın almak sitenin bütün
 * temel işlevlerini kullanmak için zorunlu değildir". Sayfa bunu da
 * yazıyor, çünkü ödeme duvarı gibi görünen bir sayfa yanlış izlenim
 * bırakır.
 */
export function PremiumPage() {
  const { user } = useAuth();
  const billing = useBilling();
  const quota = useQuota();

  return (
    <>
      <PageMeta
        title="Üyelik ve Premium — AstroHub"
        description="AstroHub üyelik kademeleri, kotalar ve Premium'un neden var olduğu. Ödeme sistemi henüz açık değil."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Üyelik', path: '/uyelik' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[{ label: 'Ana Sayfa', to: '/' }, { label: 'Üyelik' }]}
          title="Üyelik ve Premium"
          description="İki kademe var ve ikisi de siteyi kullanmaya yeter. Aradaki fark yer."
          actions={<Badge tone="warning">{billing.note}</Badge>}
        />

        {/* Ödeme kapalı ve bunu ilk cümlede söylüyoruz — sayfanın
            sonunda söylemek, okuyanı boşuna umutlandırmak olurdu. */}
        {!billing.open && (
          <Alert className="mb-6">
            Premium <strong>henüz satın alınamıyor</strong>. Ödeme sistemi
            açık değil ve bu sayfada kart bilgisi istenmiyor. Kademe
            hazır olduğunda koşullar, ücret ve iptal kuralları burada
            yayımlanacak; o zamana kadar Standart üyelik sitenin bütün
            temel işlevlerini kapsıyor.
          </Alert>
        )}

        {quota && (
          <Panel title="Senin durumun" bodyClassName="p-4" className="mb-6">
            <div className="grid gap-2 sm:grid-cols-3">
              <Kutu
                baslik="Üyelik"
                deger={quota.tier === 'premium' ? 'Premium' : 'Standart'}
              />
              <Kutu
                baslik="Fotoğraf"
                deger={`${quota.photosUsed} / ${quota.photosLimit}`}
                uyari={quota.overLimit}
              />
              <Kutu
                baslik="Depolama"
                deger={`${formatBytes(quota.storageUsed)} / ${formatBytes(quota.storageLimit)}`}
              />
            </div>

            {/* §12.3: premium bitince fotoğraflar SİLİNMİYOR. Kullanıcı
                bunu görmeli, yoksa hesabını kaybettiğini sanır. */}
            {quota.overLimit && (
              <Alert variant="text" className="mt-3">
                Fotoğraf sayın şu anki kademenin üstünde.{' '}
                <strong>Mevcut fotoğrafların silinmedi ve silinmeyecek</strong>{' '}
                — yalnızca yeni fotoğraf yayımlaman durduruldu. Bir kaydı
                arşivlersen yeniden yayımlayabilirsin.
              </Alert>
            )}
          </Panel>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Kademe
            ad="Standart"
            ucret="Ücretsiz"
            aktif={quota?.tier === 'standart'}
            maddeler={[
              '5 yayımlanmış fotoğraf',
              'Fotoğraf başına ana sürüm',
              'Etkinlik takibi ve hatırlatma',
              'Yorum, beğeni, favori, mesajlaşma',
              'Forum, ilan, gözlem noktaları',
              'Bütün araçlar ve kataloglar',
            ]}
          />
          <Kademe
            ad="Premium"
            ucret={billing.open ? undefined : 'Henüz açık değil'}
            vurgu
            maddeler={[
              '30 yayımlanmış fotoğraf',
              'Fotoğraf başına 5 işleme revizyonu',
              'Sürüm geçmişi ve karşılaştırma',
              'Daha yüksek depolama alanı',
              'Gelişmiş koleksiyon ve portfolyo',
              'Gelişmiş istatistikler',
            ]}
          />
        </div>

        {/* §12.4 — Premium'un gerekçesi. */}
        <section className="mt-8">
          <h2 className="type-section mb-3 font-semibold text-foreground">
            Premium neden var
          </h2>
          <div className="space-y-3 text-body leading-relaxed text-muted-foreground">
            <p>
              Astrofotoğraflar büyük dosyalardır. Tek bir kare, arşiv kopyası
              ve gösterim için üretilen optimize sürümleriyle birlikte
              onlarca megabayt yer tutar.
            </p>
            <p>
              Bu dosyaların saklanması, dağıtılması (CDN ve veri trafiği),
              görsel dönüştürme, yedekleme, veritabanı, moderasyon, güvenlik
              ve yayın altyapısı işletme maliyeti doğurur. Premium katmanı
              AstroHub'ın bu maliyetleri sürdürülebilir biçimde
              karşılayabilmesi için var.
            </p>
            <p>
              <strong className="text-foreground">
                Premium satın almak sitenin temel işlevlerini kullanmak için
                zorunlu değil.
              </strong>{' '}
              Standart üyelik işlevsel kalır: gözlem araçları, etkinlikler,
              forum, ilanlar, mesajlaşma ve kataloglar kademeye bağlı değil.
            </p>
            <p className="text-body-sm">
              Kotalar, ücretlendirme dönemi, iptal, yenileme ve hesap
              kapanışında veri durumu ödeme sistemi açılmadan önce burada
              yayımlanacak. Şu anda ücret alınmıyor ve alınmış gibi bir
              ifade kullanılmıyor. Ayrıntılar için{' '}
              <Link to="/kullanim-kosullari" className="text-primary hover:underline">
                kullanım koşulları
              </Link>{' '}
              ve{' '}
              <Link to="/kvkk" className="text-primary hover:underline">
                KVKK aydınlatma metni
              </Link>
              .
            </p>
          </div>
        </section>

        {!user && (
          <p className="mt-6 text-body-sm text-muted-foreground">
            Kotanı görmek için{' '}
            <Link to="/giris" className="text-primary hover:underline">
              giriş yap
            </Link>
            .
          </p>
        )}
      </Container>
    </>
  );
}

function Kutu({
  baslik,
  deger,
  uyari,
}: {
  baslik: string;
  deger: string;
  uyari?: boolean;
}) {
  return (
    <div className="rounded-card border border-border bg-surface-2 px-3 py-2">
      <p className="text-meta text-muted-foreground">{baslik}</p>
      <p
        className={
          uyari
            ? 'tabular text-body font-medium text-warning'
            : 'tabular text-body font-medium text-foreground'
        }
      >
        {deger}
      </p>
    </div>
  );
}

function Kademe({
  ad,
  ucret,
  maddeler,
  vurgu,
  aktif,
}: {
  ad: string;
  ucret?: string;
  maddeler: string[];
  vurgu?: boolean;
  aktif?: boolean;
}) {
  return (
    <Panel
      title={ad}
      status={aktif ? 'kademen bu' : ucret}
      className={vurgu ? 'border-primary/45' : undefined}
      bodyClassName="p-4"
    >
      <ul className="space-y-1.5">
        {maddeler.map((m) => (
          <li key={m} className="text-body-sm leading-snug text-foreground">
            {m}
          </li>
        ))}
      </ul>
      {/* Satın alma düğmesi burada YOK ve devre dışı bir tane de yok —
          gerekçe dosyanın başında. */}
    </Panel>
  );
}

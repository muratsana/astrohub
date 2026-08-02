import { NavLink } from 'react-router';
import { Logo } from './Logo';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { MenuIcon, UserIcon } from '@/components/ui/icons';
import { useMenu } from '@/features/site/SiteConfigContext';
import { useAuth } from '@/features/auth/AuthContext';
import { ThemeToggle } from '@/features/theme/ThemeToggle';
import { RadioToggle } from '@/features/radio/RadioToggle';
import { TvToggle } from '@/features/tv/TvToggle';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { cn } from '@/lib/cn';

/**
 * ÜST NAVİGASYON.
 *
 * Dokuz ana giriş, düz — açılır menü yoktur (§5.2). Girişler hairline
 * bölmelerle ayrılır; aktif olan altında kehribar bir çizgi taşır.
 *
 * Komut paleti tetikleyicisi kaldırıldı: ⌘K kısayolu çalışmaya devam eder
 * ama üst çubukta yer kaplamaz. Dokuz modül genişliği zaten sıkıyordu ve
 * paletin kendisi keşif değil hızlandırma aracı — düğmesi olmadan da
 * bilenler kullanır.
 *
 * Kırılım `xl`: dokuz giriş 1024px'te sığmıyor. Altındaki her genişlikte
 * modül haritasını açan bir düğme gösterilir — üst çubuk hiçbir zaman
 * gezinme girişi olmadan kalmaz.
 */
export function Topbar({ onOpenNav }: { onOpenNav: () => void }) {
  /* Üst menü artık `nav_links`ten geliyor (§13.2); tablo boşsa ya da
     okunamazsa koddaki `primaryNav` yedeği çiziliyor. */
  const menu = useMenu('header');

  /*
    OTURUM DURUMU ÜST ÇUBUKTA GÖRÜNÜR OLMAK ZORUNDA. Bugüne kadar giriş
    yapmış kullanıcı da "Giriş / Kaydol" görüyordu: hem oturumunun açık
    olup olmadığını anlayamıyor hem de profiline gidecek bir yol
    bulamıyordu. Oturum açıkken iki düğme tek bir "Hesabım" girişine
    dönüşüyor.
  */
  const { user, loading } = useAuth();

  return (
    <header className="bg-background">
      <Container>
        {/* Ayırıcı çizgi konteynerin içinde: geniş ekranda kenara kadar
            uzanan bir çizgi, kabuğu kullanılabilir alanın dışına
            taşıyormuş gibi gösteriyordu. */}
        <div className="flex h-14 items-center gap-3 border-b border-border">
          <Logo />

          {/*
            NAVİGASYON TİPOGRAFİSİ.

            Önceki hâl 11px + `tracking-[0.03em]` + her hücrede dikey
            ayırıcı çizgi + sabit 84px hücreydi. Okunması zordu ve sebebi
            renk değil boyuttu: iki temada da kontrastı ölçtüm, ikisi de
            WCAG AA'yı geçiyor (koyu 5.78, açık 6.41). Sorun 11px'in
            kendisi — üstüne harf aralığının açılması Türkçe kelimeleri
            (Etkinlikler, İlanlar) daha da dağıtıyordu.

            Şimdi 13px ve harf aralığı normal. Açılmış aralık büyük harfli
            kısa etiketlerde işe yarar, cümle düzeninde uzun kelimelerde
            tam tersini yapıyor.

            AYIRICI ÇİZGİLER KALDIRILDI. Dokuz hücre + dikey hairline'lar
            gezinmeyi bir veri tablosu gibi gösteriyordu. Ayrım artık
            boşlukla veriliyor; sabit hücre genişliği de gitti, çünkü onu
            gerektiren şey çizgilerin eşit aralıklı görünme zorunluluğuydu.

            YER BÜTÇESİ: doğal genişlik + `px-3` ile dokuz giriş ~660px,
            eski sabit hücre düzeninden (9 × 84 = 756px) DAHA AZ yer
            kaplıyor. Yani punto büyürken şerit daralıyor.
          */}
          <nav
            aria-label="Ana navigasyon"
            /*
              KIRILMA NOKTASI xl (1280) → 1400 (Faz 3.1).

              Konum seçici bu satıra katılınca 1280px'te yer kalmadı ve
              ölçüm bunu açıkça gösterdi: künye 155 + nav 640 + seçici ~100
              + aksiyonlar 335 = 1230, kapsayıcı 1184. Seçici `min-w-0`
              taşıdığı için hata vermeden SIFIR genişliğe çöküyor ve
              düğmesi nav'ın üstüne taşıyordu — ekran görüntüsünde
              yakalandı.

              1400 ölçülen sayıdan geliyor: 96 (kapsayıcı dolgusu) + 155 +
              20 + 640 + 12 + 100 + 335 = 1358, üstüne pay. Altındaki
              genişliklerde düz menü zaten tasarlanmış yedeğine —
              "Modüller" çekmecesine — düşüyor.
            */
            className="ml-2 hidden items-stretch self-stretch min-[1400px]:flex"
          >
            {menu.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                target={item.new_tab ? '_blank' : undefined}
                rel={item.new_tab ? 'noopener noreferrer' : undefined}
                className={({ isActive }) =>
                  cn(
                    'relative flex items-center px-3 text-body-sm font-medium transition-colors',
                    /* Aktif alt çizgi `inset` gölge ile veriliyor: gerçek
                       bir `border-bottom` hücreyi 2px yükseltip diğer
                       girişlerin dikey hizasını bozuyor. */
                    isActive
                      ? 'text-primary shadow-[inset_0_-2px_0_var(--color-primary)]'
                      : 'text-muted-foreground hover:text-foreground'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/*
            390px'te dört ikon + hesap düğmesi 9px taşırıyordu (önizleme
            denetimi ölçtü). Telefonda boşluk ve yatay dolgu daraltılıyor;
            dokunma hedefi 32px yüksekliğini koruyor (§6.7).
          */}
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {/*
              `xl` altında düz menü gizlendiği için burası navigasyonun ÜST
              çubuktaki tek girişi. Önceden yalnızca lg–xl aralığında
              gösteriliyordu; gerekçe mobil alt çubuğun aynı çekmeceyi
              açmasıydı. Ama alt çubuk `fixed` ve gömülü/dar bir görünüm
              alanında (yan panel, küçültülmüş pencere) görüş dışında
              kalabiliyor — o durumda üst çubukta Giriş/Kaydol dışında hiçbir
              gezinme girişi kalmıyordu. Yedeği olmayan tek giriş, olmayan
              giriştir; düğme artık `xl` altında her genişlikte duruyor.

              Dar ekranda taşmayı önleyen şey görünürlük değil, etiket:
              `lg` altında yalnızca ikon kalır, erişilebilir ad `aria-label`
              ile korunur (§6.7).
            */}
            <button
              type="button"
              onClick={onOpenNav}
              aria-label="Modül haritasını aç"
              className="inline-flex h-8 items-center gap-1.5 rounded-card border border-border px-2 text-meta tracking-[0.03em] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground sm:px-2.5 min-[1400px]:hidden"
            >
              <MenuIcon className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Modüller</span>
            </button>

            {/*
              TV ve radyo üst çubukta ikon olarak duruyor, düz menüde metin
              girişi olarak değil. Sebep: ikisi de "gidilecek bir sayfa"
              değil, açılıp kapatılan bir yayın — ve yayın durumunun her
              sayfada görünmesi gerekiyor. Menüde bir metin bağlantısı bunu
              yapamazdı.
            */}
            <TvToggle />
            <RadioToggle />

            {/*
              BİLDİRİM ZİLİ `sm` VE ÜSTÜNDE.

              390px'te üst çubuk zaten sınırda: TV + radyo + modül düğmesi +
              hesap ikonu ölçülmüş genişliği doldurup 10px taşırıyordu
              (önizleme denetimi; tema düğmesi tam bu yüzden çekmeceye
              taşındı). Onuncu bir kontrol koymak o taşmayı geri getirirdi.

              Telefonda kaybolmuyor: "Bildirimler" ve "Mesajlar" modül
              haritasında (çekmece + footer + komut paleti) duruyor. Zil
              oturum yokken zaten hiç çizilmiyor, yani ziyaretçi için üst
              çubukta hiçbir şey değişmiyor.
            */}
            <span className="hidden sm:inline-flex">
              <NotificationBell />
            </span>

            {/*
              Tema düğmesi `sm` altında ÜST ÇUBUKTA DEĞİL, çekmecede.
              TV ve radyo metinli düğmeye dönünce 390px'te 45px taşma
              oluştu (önizleme denetimi ölçtü) ve bir şeyin gitmesi
              gerekiyordu. Giden tema oldu: tema bir tercih, gezinme
              değil — telefonda menüye ait. Yayın düğmeleri ise her
              sayfada durum göstermek zorunda, gizlenemez.

              Yanındaki "Saha" metni kaldırıldı: düğme artık üç modu
              dolaşıyor ve tek bir modun adını yazmak diğer ikisinde
              yalan oluyordu. Durumu ikon taşıyor (güneş/ay/göz).
            */}
            <span className="hidden sm:inline-flex">
              <ThemeToggle />
            </span>

            {/*
              390px'te iki metin düğmesi + modül düğmesi üst çubuğu taşırıyor
              (önizleme denetimi 10px ölçtü). Telefon genişliğinde tek bir
              hesap girişi bırakılıyor: `/giris` sayfası zaten "hesabın yok
              mu → Kaydol" bağlantısını taşıyor, yani kayıt yolu kapanmıyor,
              bir adım uzuyor. Düğmeyi küçültmek yerine sayısını azaltmak,
              dokunma hedefini 24px'e indirmekten iyidir (§6.7).
            */}
            {/*
              Görünürlük sarmalayıcı `span` üzerinden veriliyor: `ButtonLink`
              kendi `inline-flex` sınıfını taşıyor ve aynı elemana `hidden`
              vermek iki display kuralını çakıştırıyor — hangisinin kazandığı
              stil sırasına kalıyor, yani kırılgan.
            */}
            {/*
              Telefonda hesap girişi ikon: "Hesap" metni son 7px'i
              taşırıyordu (önizleme denetimi ölçtü). Erişilebilir ad
              `ariaLabel` ile korunuyor; ikon kontrolü olduğu için hedef
              44×44 (WCAG 2.5.5 — genişletecek metni yok).
              `/giris` sayfası kayıt bağlantısını zaten taşıyor.
            */}
            <span className="sm:hidden">
              <ButtonLink
                to={user ? '/hesap' : '/giris'}
                size="sm"
                variant="secondary"
                ariaLabel={user ? 'Hesabım' : 'Giriş yap veya kaydol'}
                className="h-11 w-11 justify-center px-0"
              >
                <UserIcon className="h-4 w-4" />
              </ButtonLink>
            </span>

            {/*
              `loading` sırasında hiçbir şey çizilmiyor: önce "Giriş"
              gösterip sonra "Hesabım"a atlamak, sayfa açılışında göze
              çarpan bir sıçrama ve bir an için yanlış bilgi.
            */}
            <span className="hidden items-center gap-2 sm:flex">
              {loading ? null : user ? (
                <ButtonLink to="/hesap" size="sm" variant="secondary">
                  Hesabım
                </ButtonLink>
              ) : (
                <>
                  <ButtonLink to="/giris" size="sm" variant="secondary">
                    Giriş
                  </ButtonLink>
                  <ButtonLink to="/kayit" size="sm">
                    Kaydol
                  </ButtonLink>
                </>
              )}
            </span>
          </div>
        </div>
      </Container>
    </header>
  );
}

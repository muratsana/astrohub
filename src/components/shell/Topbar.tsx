import { NavLink } from 'react-router-dom';
import { Logo } from './Logo';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { MenuIcon, UserIcon } from '@/components/ui/icons';
import { primaryNav } from '@/app/navigation';
import { ThemeToggle } from '@/features/theme/ThemeToggle';
import { RadioToggle } from '@/features/radio/RadioToggle';
import { TvToggle } from '@/features/tv/TvToggle';
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
  return (
    <header className="bg-background">
      <Container>
        {/* Ayırıcı çizgi konteynerin içinde: geniş ekranda kenara kadar
            uzanan bir çizgi, kabuğu kullanılabilir alanın dışına
            taşıyormuş gibi gösteriyordu. */}
        <div className="flex h-14 items-center gap-3 border-b border-border">
          <Logo />

          <nav
            aria-label="Ana navigasyon"
            className="ml-1 hidden items-stretch self-stretch xl:flex"
          >
            {primaryNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    /*
                      HÜCRE GENİŞLİĞİ SABİT, ETİKET ORTALI.
                      Önce yalnızca `px-3` vardı: "Forum" ile
                      "Etkinlikler" arasındaki boşluklar etiketin
                      uzunluğuna göre değiştiği için şerit düzensiz
                      görünüyordu. Ayırıcı çizgiler bunu daha da
                      belli ediyordu — eşit aralıklı çizgiler beklenir.
                      En uzun etiket ("Etkinlikler") 78px; 84px hücre
                      hepsini nefes payıyla alıyor ve dokuz hücre
                      1280px'te sığıyor.
                    */
                    'flex min-w-[84px] items-center justify-center border-l border-border px-2 text-[11px] font-medium tracking-[0.03em] transition-colors last:border-r',
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
              className="inline-flex h-8 items-center gap-1.5 rounded-card border border-border px-2 text-[10px] tracking-[0.03em] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground sm:px-2.5 xl:hidden"
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
              `aria-label` ile korunuyor, dokunma hedefi 32px kalıyor
              (§6.7). `/giris` sayfası kayıt bağlantısını zaten taşıyor.
            */}
            <span className="sm:hidden">
              <ButtonLink
                to="/giris"
                size="sm"
                variant="secondary"
                aria-label="Giriş yap veya kaydol"
              >
                <UserIcon className="h-3.5 w-3.5" />
              </ButtonLink>
            </span>

            <span className="hidden items-center gap-2 sm:flex">
              <ButtonLink to="/giris" size="sm" variant="secondary">
                Giriş
              </ButtonLink>
              <ButtonLink to="/kayit" size="sm">
                Kaydol
              </ButtonLink>
            </span>
          </div>
        </div>
      </Container>
    </header>
  );
}

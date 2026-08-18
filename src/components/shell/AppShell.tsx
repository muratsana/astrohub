import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Outlet, ScrollRestoration } from 'react-router';
import { ConsentGate } from '@/features/auth/ConsentGate';
import { ProfileSetupGate } from '@/features/auth/ProfileSetupGate';
import { Topbar } from './Topbar';
import { Footer } from './Footer';
import { MobileNav } from './MobileNav';
import { NavDrawer } from './NavDrawer';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { isPreviewEditorEnabled } from '@/features/preview-editor/PreviewEditorContext';
import { AnnouncementBar } from '@/features/site/AnnouncementBar';
import { AccountStatusNotice } from '@/features/auth/AccountStatusNotice';
import { EmailVerificationNotice } from '@/features/auth/EmailVerificationNotice';
import { MaintenanceGate } from '@/features/site/MaintenanceGate';
import { RadioDock } from '@/features/radio/RadioDock';

/**
 * UYGULAMA KABUĞU — Rasathane Terminali.
 *
 * Yapışkan başlık iki katmandır: gökyüzü durum çubuğu + navigasyon. Sağ
 * enstrüman rayı yoktur (o karar geri alındı) — içerik tam genişlikte akar.
 *
 * Komut paleti tüm modüllerin verisini indeksler; ilk yüklemede indirilmesi
 * gereksiz ağırlık olur (§16.4), bu yüzden yalnızca açıldığında yüklenir.
 * Üst çubuktaki düğmesi kaldırıldı — ⌘K kısayolu ve modül haritasındaki
 * giriş yeterli.
 */
const CommandPalette = lazy(() =>
  import('@/features/search/CommandPalette').then((m) => ({
    default: m.CommandPalette,
  }))
);

/**
 * Önizleme editörü bir tasarım aracıdır, ürün özelliği değildir. Tembel
 * yüklenir: üretim paketinde ayrı bir chunk'ta kalır, hiç istenmez ve
 * kullanıcıya inmez.
 */
const PreviewEditorPanel = lazy(() =>
  import('@/features/preview-editor/PreviewEditorPanel').then((m) => ({
    default: m.PreviewEditorPanel,
  }))
);

/**
 * İNCELEME MODU — her sayfada, her öğede çalışan not ve metin düzenleme.
 *
 * `PreviewEditorPanel`den AYRI bir bileşen: o yalnızca ana sayfanın
 * hero'sunu düzenliyor ve slayt alanlarını biliyor. Bu ise sayfadan
 * habersiz — herhangi bir başlığa, paragrafa ya da düğmeye tıklanabiliyor.
 * İkisini tek bileşende birleştirmek, hero'ya özel alan mantığını genel
 * seçiciyle aynı dosyaya sıkıştırmak olurdu.
 */
const ReviewMode = lazy(() =>
  import('@/features/preview-editor/ReviewMode').then((m) => ({
    default: m.ReviewMode,
  }))
);

export function AppShell() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const openNav = useCallback(() => setNavOpen(true), []);
  const closeNav = useCallback(() => setNavOpen(false), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <MaintenanceGate>
      <div className="flex min-h-dvh flex-col bg-background">
        {/* Klavye kullanıcıları için içeriğe atlama bağlantısı (§6.7) */}
        <a
          href="#icerik"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-card focus:bg-primary focus:px-4 focus:py-2 focus:text-meta focus:font-medium focus:tracking-[0.03em] focus:text-primary-foreground"
        >
          İçeriğe atla
        </a>

        {/*
          DURUM ÇUBUĞU ŞERİDİ KALDIRILDI (Faz 3.1).

          Şerit her sayfada "Bulut %x · Seeing y" gösteriyordu. Aynı veri
          "Bu Gece" modülünde — hem daha büyük, hem çizelgeyle, hem ileri
          tarihli gecelerle — zaten var. Ana görev belgesi §6.1 bunu
          kaldırmayı açıkça istiyor ve gerekçelerinin hepsi ölçülebilirdi:

            · Üst alan yüksekliği: kabuk 88px → 56px (ölçüldü).
            · Ağ: `useSkyConditions` kabukta çağrıldığı için galeri, forum,
              ilan gibi hava durumuyla hiç ilgisi olmayan HER sayfada bir
              hava isteği kuruluyordu.
            · Hiyerarşi: navigasyonun üstünde ikinci bir yatay şerit,
              gezinmeyi ikinci sıraya itiyordu.

          Konum seçici KALDI ve üst çubuğa taşındı: hava değil, kullanıcının
          her sayfada değiştirebilmesi gereken bir tercih (etkinlik mesafesi,
          gözlem noktası sıralaması, tesis uzaklığı hep ona bağlı).
        */}
        {/*
          DUYURU BANDI YAPIŞKAN ŞERİDİN DIŞINDA. İçine alsaydık duyuru
          da her sayfada ekranın tepesinde asılı kalırdı; oysa bir kez
          okunup geçilmesi gereken bir metin — kaydırınca gitmeli.
        */}
        <AnnouncementBar />

        {/*
          HESAP DURUMU ŞERİDİ duyurunun hemen altında ve yine yapışkan
          değil: askıdaki kullanıcıya durumunu bir kez söylüyor, sonra
          kaydırıp okumaya devam ediyor. Yapışkan olsaydı ceza, cezanın
          kendisinden çok daha uzun süre ekranda kalırdı.

          `ErrorBoundary`: profil sorgusu düşerse kabuk çökmemeli —
          şeridin görünmemesi, sitenin açılmamasından iyi.
        */}
        <ErrorBoundary label="AccountStatusNotice">
          <AccountStatusNotice />
        </ErrorBoundary>

        {/*
          Askı şeridinin ALTINDA: ikisi birden görünürse önce hesabın
          askıda olduğunu okumalı — doğrulama linkine tıklamak askıyı
          kaldırmayacak ve sırayı ters kurmak boşuna bir umut verirdi.
        */}
        <ErrorBoundary label="EmailVerificationNotice">
          <EmailVerificationNotice />
        </ErrorBoundary>

        <div className="sticky top-0 z-[var(--z-sticky)] bg-background/95 backdrop-blur-md">
          <Topbar onOpenNav={openNav} />
        </div>

        <main id="icerik" className="flex-1 pb-28 lg:pb-16">
          <Outlet />
        </main>

        <Footer />

        <RadioDock />

        <MobileNav onOpenNav={openNav} />

        <NavDrawer
          open={navOpen}
          onClose={closeNav}
          onOpenPalette={openPalette}
        />

        {paletteOpen && (
          <ErrorBoundary label="CommandPalette">
            <Suspense fallback={null}>
              <CommandPalette open onClose={closePalette} />
            </Suspense>
          </ErrorBoundary>
        )}

        {isPreviewEditorEnabled && (
          <ErrorBoundary label="PreviewEditorPanel">
            <Suspense fallback={null}>
              <PreviewEditorPanel />
            </Suspense>
          </ErrorBoundary>
        )}

        {isPreviewEditorEnabled && (
          <ErrorBoundary label="ReviewMode">
            <Suspense fallback={null}>
              <ReviewMode />
            </Suspense>
          </ErrorBoundary>
        )}

        {/*
          ONAY KAPISI kabuk seviyesinde: hangi rotada olursa olsun,
          profilinde onay kaydı bulunmayan oturum bu ekranı görüyor.
          Rota bazlı bir koruma yeterli olmazdı — Google ile giren
          kullanıcı doğrudan `/panel`e düşüyor ve oradan her yere
          gidebiliyor.
        */}
        <ErrorBoundary label="ConsentGate">
          <Suspense fallback={null}>
            <ConsentGate />
          </Suspense>
        </ErrorBoundary>

        {/*
          KURULUM KAPISI onay kapısından SONRA: bileşen zaten onay
          alınmamışsa kendini çizmiyor, ama sıralamayı burada da korumak
          iki modalın hangi durumda hangisinin görüneceğini okunur
          kılıyor.
        */}
        <ErrorBoundary label="ProfileSetupGate">
          <Suspense fallback={null}>
            <ProfileSetupGate />
          </Suspense>
        </ErrorBoundary>

        <ScrollRestoration />
      </div>
    </MaintenanceGate>
  );
}

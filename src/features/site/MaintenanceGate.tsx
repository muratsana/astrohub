import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { useSiteConfig } from './SiteConfigContext';
import { maintenanceBypass } from './siteConfig';
import { useRoles } from '@/features/admin/useRoles';
import { useAuth } from '@/features/auth/AuthContext';
import { Logo } from '@/components/shell/Logo';

/**
 * BAKIM MODU KAPISI (§13.2 "Bakım modu").
 *
 * Panelde yüksek riskli bir anahtar olarak duruyordu ve açıldığında
 * hiçbir şey olmuyordu. Artık `bakim_modu` açıkken ziyaretçi siteyi
 * göremiyor; yönetici görüyor ve tepesinde bir uyarı şeridi taşıyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BU BİR GÜVENLİK SINIRI DEĞİL — VE ÖYLEYMİŞ GİBİ YAZILMADI
 *
 * Kapı istemci tarafında. Veriyi koruyan şey RLS; bakım modu bir SUNUM
 * kararı ("şu an girmeyin"), bir erişim kararı değil. Bunu güvenlik gibi
 * yazmak — örneğin sorguları kesmek — yanlış bir güven duygusu verirdi;
 * adres çubuğuna doğrudan yazan biri zaten aynı veriyi görürdü, çünkü
 * veriyi veren yer veritabanı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ROL YÜKLENİRKEN KAPI BEKLİYOR — YALNIZCA OTURUM VARSA
 *
 * Oturumu olmayan ziyaretçi asla yönetici olamaz; onu beklemeye almanın
 * anlamı yok, kapı hemen kapanıyor. Oturumu olan biri için roller gelene
 * kadar bekleniyor: beklemeseydik yönetici her sayfa açılışında önce
 * "bakımdayız" ekranını görür, sonra site geri gelirdi.
 *
 * Bekleme yönü de bilinçli: bilinmezken site AÇIK kalıyor. Ters yön,
 * roller hiç gelmediğinde (ağ hatası) yöneticiyi kendi sitesinden
 * kilitlerdi.
 */
export function MaintenanceGate({ children }: { children: ReactNode }) {
  const { flags, maintenance } = useSiteConfig();
  const roles = useRoles();
  const { user } = useAuth();
  const { pathname } = useLocation();

  if (!flags.bakim_modu) return <>{children}</>;

  /* Giriş sayfası bakımda da açık — gerekçe `siteConfig.ts`te. */
  if (maintenanceBypass(pathname)) return <>{children}</>;

  if (roles.isAdmin) {
    return (
      <>
        <div
          role="status"
          className="bg-warning/20 px-4 py-2 text-center text-body-sm text-foreground sm:px-6"
        >
          <strong className="font-medium">Bakım modu açık.</strong> Siteyi
          şu an yalnızca sen görüyorsun.{' '}
          <Link to="/admin" className="underline underline-offset-2">
            Panelden kapat
          </Link>
        </div>
        {children}
      </>
    );
  }

  /* Oturum var ama roller henüz bilinmiyor: karar verilene kadar site
     açık kalıyor (yukarıdaki gerekçe). */
  if (user && (roles.status === 'idle' || roles.status === 'loading')) {
    return <>{children}</>;
  }

  return <MaintenanceScreen {...maintenance} />;
}

function MaintenanceScreen({
  baslik,
  metin,
  beklenen_bitis,
}: {
  baslik: string;
  metin: string;
  beklenen_bitis: string | null;
}) {
  const bitis = bitisMetni(beklenen_bitis);

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-6 py-16">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center">
          <Logo />
        </div>

        {/* `type-page`: bu ekranın tamamı tek bir sayfa ve başlığı o
            sayfanın başlığı (bkz. designSystem testi). */}
        <h1 className="type-page mt-8 text-foreground">{baslik}</h1>
        <p className="mt-3 text-body text-muted-foreground text-pretty">
          {metin}
        </p>

        {bitis && (
          <p className="mt-4 text-meta text-faint">Beklenen dönüş: {bitis}</p>
        )}

        {/*
          GİRİŞ BAĞLANTISI BİLEREK DURUYOR. Bakım modunu kapatabilecek
          kişinin oturumu kapalıysa siteye girmenin başka yolu kalmıyor
          (bkz. `MAINTENANCE_ALLOWED_PATHS`). Ziyaretçi için de zararsız:
          giriş yapmak siteyi açmıyor, yalnızca yönetici için açıyor.
        */}
        <p className="mt-8 text-meta text-faint">
          <Link to="/giris" className="underline underline-offset-2">
            Yönetici girişi
          </Link>
        </p>
      </div>
    </div>
  );
}

/**
 * Beklenen dönüş zamanı — geçersiz ya da geçmiş damga GÖSTERİLMİYOR.
 *
 * Geçmiş bir saat ("Beklenen dönüş: dün 14:00") bakımın unutulduğunu
 * söyler ve ziyaretçiye hiçbir şey kazandırmaz.
 */
function bitisMetni(deger: string | null): string | null {
  if (!deger) return null;
  const t = new Date(deger);
  const ms = t.getTime();
  if (!Number.isFinite(ms) || ms <= Date.now()) return null;
  return t.toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

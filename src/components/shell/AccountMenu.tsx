import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useRoles } from '@/features/admin/useRoles';
import { UserIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

/**
 * KULLANICI MENÜSÜ (§13 · FAZ 11).
 *
 * ══════════════════════════════════════════════════════════════════════
 * ÖNCE TEK DÜĞME VARDI: "HESABIM"
 *
 * Mesajlar, profil ve yönetim paneli rota olarak vardı ama üst çubuktan
 * hiçbirine yol yoktu — kullanıcı ya adresi ezberleyecek ya hesap
 * sayfasına girip oradan devam edecekti. Okunmamış mesajı olan biri için
 * bu, mesajın var olduğunu hiç öğrenmemek demek.
 *
 * ══════════════════════════════════════════════════════════════════════
 * YÖNETİM GİRİŞİ ROLE BAĞLI — VE BU BİR GÜVENLİK SINIRI DEĞİL
 *
 * `canAccessAdmin` yalnızca bağlantıyı gizliyor. Yetkisiz biri adresi
 * yazsa da `/admin` boş dönüyor, çünkü sınır RLS'te: `moderation_queue`
 * ve yönetim RPC'leri rol görmeden veri vermiyor. Menüdeki gizleme
 * kullanıcıyı çıkmaz bir sayfayla baş başa bırakmamak için.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN `<details>` DEĞİL, DURUM
 *
 * `<details>` dışarı tıklamayla kapanmıyor ve Esc'i dinlemiyor; ikisi de
 * bir menüden beklenen davranış. Odak yönetimi de gerekiyordu: menü
 * kapanınca odak tetikleyiciye dönmeli, yoksa klavye kullanıcısı sayfanın
 * başına savruluyor.
 */
export function AccountMenu({ username }: { username?: string | null }) {
  const { canAccessAdmin } = useRoles();
  const [acik, setAcik] = useState(false);
  const kapsayici = useRef<HTMLDivElement>(null);
  const tetik = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!acik) return;

    const disariTikla = (e: MouseEvent) => {
      if (!kapsayici.current?.contains(e.target as Node)) setAcik(false);
    };
    const escKapat = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setAcik(false);
      tetik.current?.focus();
    };

    document.addEventListener('mousedown', disariTikla);
    document.addEventListener('keydown', escKapat);
    return () => {
      document.removeEventListener('mousedown', disariTikla);
      document.removeEventListener('keydown', escKapat);
    };
  }, [acik]);

  /* Profil bağlantısı kullanıcı adı YOKSA hiç çizilmiyor: `/profil/`
     diye bir rota yok ve boş adrese götüren bir menü girişi, çalışmayan
     bir düğmeden farksız. */
  const girisler = [
    { to: '/hesap', label: 'Hesabım' },
    ...(username ? [{ to: '/hesap?sekme=profilim', label: 'Profilim' }] : []),
    { to: '/mesajlar', label: 'Mesajlarım' },
    ...(canAccessAdmin ? [{ to: '/admin', label: 'Yönetim' }] : []),
  ];

  return (
    <div className="relative" ref={kapsayici}>
      <button
        ref={tetik}
        type="button"
        aria-haspopup="menu"
        aria-expanded={acik}
        onClick={() => setAcik((a) => !a)}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-card border border-border-strong px-3 text-meta text-foreground transition-colors',
          'hover:border-primary hover:text-primary',
          acik && 'border-primary text-primary'
        )}
      >
        <UserIcon className="h-4 w-4" />
        Hesabım
      </button>

      {acik && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1.5 min-w-[11rem] rounded-card border border-border bg-surface-1 py-1"
        >
          {girisler.map((g) => (
            <Link
              key={g.to}
              to={g.to}
              role="menuitem"
              onClick={() => setAcik(false)}
              className="block px-3 py-2 text-body-sm text-foreground transition-colors hover:bg-surface-2 hover:text-primary"
            >
              {g.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

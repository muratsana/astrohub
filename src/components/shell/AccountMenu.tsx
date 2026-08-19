import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useRoles } from '@/features/admin/useRoles';
import { useAuth } from '@/features/auth/AuthContext';
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
 *
 * ══════════════════════════════════════════════════════════════════════
 * ÇIKIŞ BURADAYDI, YOKTU (E03)
 *
 * Menüde "Çıkış yap" hiç yoktu. Çıkmak isteyen kullanıcının tek yolu
 * `/hesap` sayfasına girip aşağı inmekti — yani en sık aranan hesap
 * işlemi, en derindeki yerdeydi. Ortak bir bilgisayarda oturumunu
 * kapatmak isteyen biri için bu bir kolaylık meselesi değil.
 *
 * Çıkış diğer girişlerden AYRILMIŞ çiziliyor ve bir bağlantı değil
 * düğme: bir yere GİTMİYOR, bir şey YAPIYOR. Aynı görünümde bırakmak,
 * "Mesajlarım"a gitmek isterken oturumu kapatmayı kolaylaştırırdı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TETİKLEYİCİ ARTIK "HESABIM" DEMİYOR (E02)
 *
 * Kimin oturumunun açık olduğu üst çubukta hiçbir yerde yazmıyordu.
 * Ortak cihazda hangi hesapla gezildiğini görmenin tek yolu menüye
 * girmekti. Artık kullanıcı adı ve varsa profil fotoğrafı görünüyor;
 * kullanıcı adı henüz seçilmemişse eski etikete düşülüyor.
 */
export function AccountMenu({
  username,
  avatarUrl,
}: {
  username?: string | null;
  avatarUrl?: string | null;
}) {
  const { canAccessAdmin } = useRoles();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [acik, setAcik] = useState(false);
  const [cikiliyor, setCikiliyor] = useState(false);
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

  /*
   * PROFİL, EKİPMAN VE KOLEKSİYON BURADA DEĞİL.
   *
   * Hepsi `Hesabım` altındaki sekmelerde duruyor. Dropdown yalnız üst
   * seviye hesap, mesaj ve yönetim yollarını göstermeli; aynı modüle iki
   * farklı kısa yol menüyü gereksiz kalabalık yapıyor.
   */
  const girisler = [
    { to: '/hesap', label: 'Hesabım' },
    { to: '/mesajlar', label: 'Mesajlarım' },
    ...(canAccessAdmin ? [{ to: '/admin', label: 'Yönetim' }] : []),
  ];

  async function cikisYap() {
    setCikiliyor(true);
    try {
      await signOut();
      setAcik(false);
      /*
       * ANA SAYFAYA GİDİLİYOR. Oturum kapandıktan sonra bulunulan
       * sayfada kalmak, kullanıcıyı yetkisi kalmamış bir ekranda
       * bırakmak demek: `/hesap` ya da `/mesajlar` çıkışın hemen
       * ardından boşalır ve ekran "bir şeyler bozuldu" gibi görünür.
       */
      navigate('/');
    } finally {
      setCikiliyor(false);
    }
  }

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
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-5 w-5 shrink-0 rounded-full object-cover"
          />
        ) : (
          <UserIcon className="h-4 w-4" />
        )}
        {/* Uzun kullanıcı adı üst çubuğu itmesin: kısaltılıyor ama
            tamamı `title` ile erişilebilir kalıyor. */}
        <span className="max-w-[9rem] truncate" title={username ?? undefined}>
          {username ?? 'Hesabım'}
        </span>
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

          <div className="my-1 border-t border-border" />
          <button
            type="button"
            role="menuitem"
            disabled={cikiliyor}
            onClick={() => void cikisYap()}
            className="block w-full px-3 py-2 text-left text-body-sm text-foreground transition-colors hover:bg-surface-2 hover:text-danger disabled:opacity-60"
          >
            {cikiliyor ? 'Çıkılıyor…' : 'Çıkış yap'}
          </button>
        </div>
      )}
    </div>
  );
}

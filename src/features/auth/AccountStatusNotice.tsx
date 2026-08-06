import { Link } from 'react-router';
import { useAuth } from './AuthContext';
import { canWrite, useMyProfile } from '@/services/content/profile';

/**
 * HESAP DURUMU BİLDİRİMİ — askıdaki kullanıcı neden yazamadığını bilsin.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN GEREKLİ
 *
 * Askı yaptırımı RLS'te (`app.is_account_active`, Görev 1.1). Yani
 * askıdaki kullanıcı fotoğraf yükleme formunu doldurup gönderiyor ve
 * PostgREST'ten dönen ham hatayı görüyor: "new row violates row-level
 * security policy". Teknik olarak doğru, kullanıcı için anlamsız.
 *
 * Bu şerit o boşluğu kapatıyor: durumu, gerekçesini ve varsa bitiş
 * tarihini söylüyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ENGELLEMİYOR, ANLATIYOR
 *
 * `ConsentGate` ekranı kaplıyor çünkü onay alınmadan veri işlememeliyiz.
 * Bu bileşen KAPLAMIYOR: askıdaki kullanıcı siteyi okumaya devam
 * edebilmeli — askı yazma cezası, okuma yasağı değil. Formları da tek
 * tek kapatmıyoruz: her formu "askıda mı" diye kontrol etmek, bir gün
 * birinin unutulması demek ve unutulan yerde kullanıcı yine ham hata
 * görürdü. Tek şerit + veritabanı yaptırımı, on ayrı kontrolden sağlam.
 *
 * YASAKLI HESAP ayrı: ona da aynı şerit gösteriliyor ama metni kalıcı
 * olduğunu söylüyor. Yasaklının profili zaten public listelerden düşmüş
 * durumda (`profiles_select_all` politikası).
 */
export function AccountStatusNotice() {
  const { user } = useAuth();
  const { profile, loading } = useMyProfile(user?.id);

  if (!user || loading || !profile) return null;
  if (canWrite(profile)) return null;

  const yasak = profile.accountStatus === 'banned';
  const donduruldu = profile.accountStatus === 'deactivated';

  const bitis =
    profile.accountStatus === 'suspended' && profile.suspendedUntil
      ? new Date(profile.suspendedUntil)
      : null;

  return (
    <div
      role="status"
      className={`border-b px-4 py-2.5 text-body-sm ${
        yasak
          ? 'border-danger/40 bg-danger/10 text-danger'
          : 'border-warning/40 bg-warning/10 text-warning'
      }`}
    >
      <div className="mx-auto flex max-w-[90rem] flex-wrap items-baseline gap-x-2 gap-y-1">
        <strong>
          {yasak
            ? 'Hesabınız yasaklandı.'
            : donduruldu
              ? 'Hesabınız donduruldu.'
              : 'Hesabınız askıda.'}
        </strong>
        <span className="text-foreground">
          {yasak || donduruldu
            ? 'İçerik ekleyemez, yorum yazamaz ve ilan açamazsınız.'
            : 'Siteyi okumaya devam edebilirsiniz ama içerik ekleyemez, yorum yazamaz ve ilan açamazsınız.'}
        </span>
        {profile.statusReason && (
          <span className="text-muted-foreground">
            Gerekçe: {profile.statusReason}
          </span>
        )}
        {bitis && (
          <span className="tabular text-muted-foreground">
            Bitiş: {bitis.toLocaleString('tr-TR')}
          </span>
        )}
        <Link to="/iletisim" className="underline underline-offset-2">
          İtiraz et
        </Link>
      </div>
    </div>
  );
}

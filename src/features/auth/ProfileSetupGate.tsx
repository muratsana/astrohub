import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { LocationTypeahead } from '@/components/ui/LocationTypeahead';
import { useAuth } from './AuthContext';
import { isProfileComplete, missingProfileFields } from './accountSetup';
import { updateProfile, useMyProfile } from '@/services/content/profile';

/**
 * HESAP KURULUM KAPISI — kullanıcı adı ve şehir alınmadan devam yok.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN BİR KAPI DAHA
 *
 * Kayıt akışı hiçbir yerde kullanıcı adı sormuyor: `handle_new_user()`
 * `user_16206d94efc3` gibi bir ad üretiyor ve kimse onu değiştirmeye
 * çağrılmıyor. Canlıdaki sekiz hesabın DÖRDÜ bu adla geziyordu ve o ad
 * profil ADRESİNİN parçası — yani sitedeki her dördüncü profil
 * paylaşılamaz bir bağlantıya sahipti.
 *
 * Şehir de aynı sınıfta: sitenin yarısı konuma bağlı (bu gece
 * gökyüzünde, karanlık pencere, yakındaki noktalar, şehir sayfaları) ve
 * beş hesabın şehri boştu. O hesaplar bu ekranların hepsinde boşluk
 * görüyordu ve nereden dolduracaklarını bilmiyorlardı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN ENGELLEYİCİ
 *
 * `AccountStatusNotice` deseni (anlatan şerit) burada işe yaramaz:
 * şerit görmezden gelinebilir ve dört kullanıcı tam olarak bunu yaptı —
 * hesap sayfası zaten alanları gösteriyordu, kimse doldurmadı. İki alan
 * için bir kez duran bir ekran, her sayfada göz ardı edilen bir
 * şeritten dürüst.
 *
 * `ConsentGate` GİBİ, "çıkış yap" her zaman açık: kapı hapishane
 * değil. Ve onay kapısı hâlâ duruyorsa bu ekran çizilmiyor — iki modalı
 * üst üste bindirmek, ikisini de okunmaz yapardı.
 */
export function ProfileSetupGate() {
  const { user, signOut } = useAuth();
  const { profile, loading, refresh } = useMyProfile(user?.id);

  const [username, setUsername] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
   * Alanlar profil gelince BİR KEZ tohumlanıyor. `profile` her
   * yenilemede yeni nesne olarak döndüğü için koşulsuz bir efekt,
   * kullanıcı yazarken kutuyu eski değere geri çevirirdi.
   */
  useEffect(() => {
    if (!profile) return;
    setCity((value) => value || profile.city || '');
    setDistrict((value) => value || profile.district || '');
  }, [profile]);

  if (!user) return null;
  if (loading || !profile) return null;
  /* Onay kapısı önce: onay verilmeden profil bilgisi istemek, rıza
     alınmadan kişisel veri toplamak olurdu. */
  if (!profile.termsAcceptedAt) return null;
  if (isProfileComplete(profile)) return null;

  const eksik = missingProfileFields(profile);
  const adGerekli = eksik.includes('kullanıcı adı');
  const sehirGerekli = eksik.includes('şehir');

  const hazir =
    (!adGerekli || username.trim().length >= 3) && (!sehirGerekli || !!city.trim());

  async function save() {
    if (!user || !profile) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile(user.id, {
        /* Değiştirilmeyen alanlar mevcut değerleriyle geri yazılıyor:
           `updateProfile` tam satır güncelliyor ve boş göndermek
           kullanıcının hakkında metnini silmek olurdu. */
        username: adGerekli ? username.trim() : profile.username,
        displayName: profile.displayName ?? '',
        displayNameVisible: profile.displayNameVisible,
        bio: profile.bio ?? '',
        city,
        district,
        websiteUrl: profile.websiteUrl ?? '',
      });
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-title"
      className="fixed inset-0 z-50 grid place-items-center bg-background/90 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-card border border-border-strong bg-surface-1 p-6">
        <h2 id="setup-title" className="type-panel font-bold text-foreground">
          Hesabınızı tamamlayın
        </h2>
        <p className="mt-2 text-body-sm leading-relaxed text-muted-foreground">
          Devam etmek için {eksik.join(' ve ')} bilgisi gerekiyor. Bu iki alan
          profilinizin adresini ve size gösterilecek gökyüzü hesaplarını
          belirliyor.
        </p>

        <div className="mt-5 grid gap-3">
          {adGerekli && (
            <Field
              label="Kullanıcı adı"
              htmlFor="setup-username"
              hint="Profil adresiniz bu olacak. Sonradan değiştirilemez."
            >
              <Input
                id="setup-username"
                value={username}
                maxLength={32}
                autoFocus
                placeholder="orion_gozlemci"
                onChange={(e) => setUsername(e.target.value)}
              />
            </Field>
          )}

          {adGerekli && (
            <p className="rounded-card border border-warning/40 bg-surface-2 px-2.5 py-2 text-meta leading-snug text-warning">
              Kullanıcı adı <strong>bir kez</strong> seçilir. Profiliniz
              /profil/{username.trim() || '…'} adresinde yayınlanır ve bu adres
              daha sonra değişmez.
            </p>
          )}

          {sehirGerekli && (
            <Field
              label="Şehir"
              htmlFor="setup-city"
              hint="İl yeterli; ilçe isteğe bağlı. Sonradan değiştirebilirsiniz."
            >
              <LocationTypeahead
                id="setup-city"
                city={city}
                district={district}
                onSelect={(secim) => {
                  setCity(secim.city);
                  setDistrict(secim.district);
                }}
                onClear={() => {
                  setCity('');
                  setDistrict('');
                }}
                allowProvinceOnly
              />
            </Field>
          )}
        </div>

        {error && (
          <div className="mt-4">
            <Alert variant="text">{error}</Alert>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button onClick={() => void save()} disabled={!hazir || saving}>
            {saving ? 'Kaydediliyor…' : 'Kaydet ve devam et'}
          </Button>
          <Button variant="ghost" onClick={() => void signOut()}>
            Çıkış yap
          </Button>
        </div>
      </div>
    </div>
  );
}

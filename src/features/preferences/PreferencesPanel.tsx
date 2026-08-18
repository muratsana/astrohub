import { Link } from 'react-router';
import { Panel } from '@/components/ui/Panel';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthContext';
import { visibilityLabels, type SetupVisibility } from '@/features/setups/store';
import { useDefaultEquipmentVisibility } from './equipmentVisibility';

/**
 * TERCİHLER — hesapta saklanan ayarların tek ekranı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ALTYAPI VARDI, YÜZEY YOKTU
 *
 * `ui_preferences` tablosu çalışıyor ve hesaba yazıyor — ama tek bir şey
 * için: liste/ızgara görünümü, o da yalnızca ilgili sayfanın köşesinden
 * değiştirilebiliyor. Kullanıcı hangi ayarlarının hesabında saklandığını
 * hiçbir yerden göremiyordu.
 *
 * Bu ekran o boşluğu kapatıyor ve tercihlerin nerede yaşadığını da
 * SÖYLÜYOR: oturum kapalıyken ayarların cihazda kaldığını bilmeyen
 * kullanıcı, başka bir cihazda seçimini bulamayınca kaybolduğunu sanıyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BURAYA HER AYAR GELMİYOR
 *
 * Bildirim tercihleri kendi ekranında (`/bildirimler`) duruyor ve oraya
 * taşınmıyor: bildirim listesiyle aynı sayfada olmaları doğru — kullanıcı
 * bir bildirimden rahatsız olduğunda onu kapatacağı yer, o bildirimi
 * gördüğü yerdir. Buradan yalnızca bağlantı veriliyor.
 */
export function PreferencesPanel() {
  const { user } = useAuth();
  const [visibility, setVisibility] = useDefaultEquipmentVisibility();

  return (
    <div className="grid gap-4">
      <Panel title="Ekipman">
        <Field
          label="Yeni ekipmanın varsayılan görünürlüğü"
          htmlFor="pref-equipment-visibility"
          hint="Kaydettiğiniz her ekipman bu seçimle başlar; tek tek değiştirebilirsiniz."
        >
          <Select
            id="pref-equipment-visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as SetupVisibility)}
            className="h-10 text-body-sm"
          >
            {(
              Object.entries(visibilityLabels) as [SetupVisibility, string][]
            ).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <p className="mt-2 text-meta leading-snug text-faint">
          Bu ayar yalnızca BUNDAN SONRA kaydedeceğiniz ekipmanları etkiler.
          Kayıtlı ekipmanlarınızın görünürlüğü değişmez — onları{' '}
          <Link
            to="/hesap?sekme=ekipmanlarim"
            className="text-primary hover:underline"
          >
            Ekipmanlarım
          </Link>{' '}
          bölümünden tek tek değiştirebilirsiniz.
        </p>
      </Panel>

      <Panel title="Bildirimler">
        <p className="text-body-sm leading-relaxed text-muted-foreground">
          Hangi olaylarda bildirim alacağınızı bildirim sayfasından
          seçebilirsiniz — bildirimlerin listesiyle aynı yerde durmaları
          bilinçli: bir bildirimden rahatsız olduğunuzda onu kapatacağınız
          yer, o bildirimi gördüğünüz yer olmalı.
        </p>
        <Link
          to="/bildirimler"
          className="mt-2 inline-block text-body-sm text-primary hover:underline"
        >
          Bildirim tercihlerine git →
        </Link>
      </Panel>

      <Panel title="Tercihler nerede saklanıyor">
        {/*
          Bu kutu bir ayar değil, bir CEVAP. Oturum kapalıyken tercihlerin
          cihazda kaldığını bilmeyen kullanıcı, başka bir cihazda seçimini
          bulamayınca kaybolduğunu sanıyor.
        */}
        <p className="text-body-sm leading-relaxed text-muted-foreground">
          {user
            ? 'Tercihleriniz hesabınızda saklanıyor; giriş yaptığınız her cihazda aynı ayarları görürsünüz.'
            : 'Giriş yapmadığınız için tercihleriniz yalnızca bu tarayıcıda saklanıyor. Giriş yaparsanız hesabınıza taşınır.'}
        </p>
        <p className="mt-2 text-meta leading-snug text-faint">
          Liste ve ızgara görünümü tercihleri de aynı yerde tutuluyor;
          onları ilgili sayfanın köşesindeki görünüm düğmesinden
          değiştiriyorsunuz.
        </p>
      </Panel>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel, SpecList, SpecRow } from '@/components/ui/Panel';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Button, ButtonLink } from '@/components/ui/Button';
import { PageMeta } from '@/components/seo/PageMeta';
import { useAuth } from '@/features/auth/AuthContext';
import { useRoles, roleLabels } from '@/features/admin/useRoles';
import {
  updateProfile,
  useMyProfile,
  validateProfile,
  type ProfileEdit,
} from '@/services/content/profile';
import { Badge } from '@/components/ui/Badge';

/**
 * HESABIM — profil yönetimi (denetim maddesi L2).
 *
 * BUNDAN ÖNCE profil diye görünen sayfa tohum fotoğraflardan
 * türetiliyordu ve hesapla hiçbir bağı yoktu: kayıt olan biri kullanıcı
 * adını, şehrini ya da kendini anlatan iki satırı değiştiremiyordu.
 * Bir topluluk sitesinde bu, kaydolmanın karşılığının olmaması demek.
 *
 * KULLANICI ADI ADRESİN PARÇASI (`/profil/:username`) ve bu yüzden
 * değiştirilebilir olması bir karar: eski adres kırılır. Sayfa bunu
 * saklamıyor, değiştirmeden önce yazıyor — sessizce kırmak, kullanıcının
 * paylaştığı bağlantıyı arkasından bozmak olurdu.
 *
 * AVATAR YOK ve bu da yazılı. Medya hattı (Faz 2) devreye girmeden
 * fotoğraf yüklemek için bir yol yok; boş bir "fotoğraf seç" düğmesi
 * koymak, olmayan bir özelliği varmış gibi göstermek olurdu.
 */
export function AccountPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const roles = useRoles();
  const { profile, loading, error, refresh } = useMyProfile(user?.id);

  const [edit, setEdit] = useState<ProfileEdit>({
    username: '',
    displayName: '',
    bio: '',
    city: '',
    websiteUrl: '',
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  /* Sunucudan gelen kayıt forma bir kez yansıtılıyor; kullanıcı yazmaya
     başladıktan sonra tazeleme onu ezmemeli. */
  useEffect(() => {
    if (!profile) return;
    setEdit({
      username: profile.username,
      displayName: profile.displayName ?? '',
      bio: profile.bio ?? '',
      city: profile.city ?? '',
      websiteUrl: profile.websiteUrl ?? '',
    });
  }, [profile]);

  if (!authLoading && !user) {
    return (
      <Container className="py-10">
        <PageHeader
          title="Hesabım"
          description="Profil bilgilerinizi görmek için giriş yapın."
        />
        <ButtonLink to="/giris">Giriş yap</ButtonLink>
      </Container>
    );
  }

  const problem = validateProfile(edit);
  const usernameChanged = !!profile && edit.username !== profile.username;

  async function save() {
    if (!user) return;
    setBusy(true);
    setMessage(null);
    setFailure(null);
    try {
      await updateProfile(user.id, edit);
      refresh();
      setMessage('Profil güncellendi.');
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'Kaydedilemedi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageMeta
        title="Hesabım"
        description="Astrohub profil ayarları."
        noIndex
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[{ label: 'Ana Sayfa', to: '/' }, { label: 'Hesabım' }]}
          title="Hesabım"
          description="Profilinizde görünen bilgiler. Kullanıcı adı profil adresinizin parçasıdır."
          actions={
            profile ? (
              <ButtonLink
                to={`/profil/${profile.username}`}
                size="sm"
                variant="secondary"
              >
                Profilimi gör
              </ButtonLink>
            ) : undefined
          }
        />

        {loading && (
          <p className="mb-4 text-[11.5px] text-muted-foreground">
            Profil yükleniyor…
          </p>
        )}

        {error && (
          <p className="mb-4 rounded-card border border-danger/45 bg-surface-1 px-3 py-2 text-[11.5px] text-danger">
            Profil okunamadı: {error}
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
          <Panel title="Profil bilgileri">
            <div className="grid gap-3">
              <Field
                label="Kullanıcı adı"
                htmlFor="p-username"
                hint="Harf, rakam, alt çizgi ve tire. Profil adresinizde görünür."
              >
                <Input
                  id="p-username"
                  value={edit.username}
                  maxLength={32}
                  onChange={(e) =>
                    setEdit((v) => ({ ...v, username: e.target.value }))
                  }
                />
              </Field>

              {/*
                Adres kırılması sessizce olmamalı: kullanıcı adını
                değiştirmek, daha önce paylaşılmış profil bağlantısını
                çalışmaz hâle getirir.
              */}
              {usernameChanged && (
                <p className="rounded-card border border-warning/40 bg-surface-2 px-2.5 py-2 text-[11px] leading-snug text-warning">
                  Kullanıcı adını değiştirirseniz eski profil adresiniz
                  (<span className="tabular">/profil/{profile?.username}</span>)
                  artık çalışmaz. Daha önce paylaştığınız bağlantılar kırılır.
                </p>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Görünen ad" htmlFor="p-display">
                  <Input
                    id="p-display"
                    value={edit.displayName}
                    maxLength={60}
                    placeholder="Adınız veya takma adınız"
                    onChange={(e) =>
                      setEdit((v) => ({ ...v, displayName: e.target.value }))
                    }
                  />
                </Field>

                <Field label="Şehir" htmlFor="p-city">
                  <Input
                    id="p-city"
                    value={edit.city}
                    maxLength={60}
                    placeholder="Ankara"
                    onChange={(e) =>
                      setEdit((v) => ({ ...v, city: e.target.value }))
                    }
                  />
                </Field>
              </div>

              <Field
                label="Web adresi"
                htmlFor="p-site"
                hint="Kendi sitesi, Astrobin ya da portfolyo bağlantısı."
              >
                <Input
                  id="p-site"
                  value={edit.websiteUrl}
                  placeholder="https://"
                  onChange={(e) =>
                    setEdit((v) => ({ ...v, websiteUrl: e.target.value }))
                  }
                />
              </Field>

              <Field
                label="Hakkında"
                htmlFor="p-bio"
                hint="Nereden gözlem yaptığınız ve ne çektiğiniz — en çok 400 karakter."
              >
                <textarea
                  id="p-bio"
                  value={edit.bio}
                  rows={5}
                  maxLength={400}
                  onChange={(e) =>
                    setEdit((v) => ({ ...v, bio: e.target.value }))
                  }
                  className="w-full resize-y rounded-card border border-border bg-surface-2 px-2.5 py-2 text-[12px] leading-relaxed text-foreground outline-none transition-colors focus:border-primary"
                />
              </Field>

              {problem && (
                <p className="rounded-card border border-warning/40 bg-surface-2 px-2.5 py-2 text-[11px] leading-snug text-warning">
                  {problem}
                </p>
              )}
              {failure && (
                <p className="rounded-card border border-danger/45 bg-surface-2 px-2.5 py-2 text-[11px] leading-snug text-danger">
                  {failure}
                </p>
              )}

              <div className="flex items-center gap-2">
                <Button onClick={save} disabled={busy || !!problem || !profile}>
                  {busy ? 'Kaydediliyor…' : 'Kaydet'}
                </Button>
                {message && (
                  <span className="text-[11px] text-success">{message}</span>
                )}
              </div>
            </div>
          </Panel>

          <div className="grid gap-4 lg:content-start">
            <Panel title="Hesap">
              <SpecList>
                <SpecRow label="E-posta" value={user?.email ?? '—'} />
                <SpecRow
                  label="Roller"
                  value={
                    roles.roles.length > 0 ? (
                      <span className="flex flex-wrap gap-1">
                        {roles.roles.map((role) => (
                          <Badge
                            key={role}
                            tone={role === 'admin' ? 'primary' : 'cold'}
                          >
                            {roleLabels[role]}
                          </Badge>
                        ))}
                      </span>
                    ) : (
                      'Üye'
                    )
                  }
                />
              </SpecList>

              <div className="mt-3 flex flex-wrap gap-2">
                {roles.canAccessAdmin && (
                  <ButtonLink to="/admin" size="sm" variant="secondary">
                    Yönetim paneli
                  </ButtonLink>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    void signOut();
                    navigate('/');
                  }}
                >
                  Çıkış yap
                </Button>
              </div>
            </Panel>

            <Panel title="Henüz yapılamayanlar">
              {/*
                Eksikler gizlenmiyor. Boş bir "fotoğraf seç" düğmesi
                koymak, olmayan bir özelliği varmış gibi göstermek
                olurdu; kullanıcı deneyip başarısız olduğunda siteye
                değil kendine kızıyor.
              */}
              <ul className="space-y-2 text-[11.5px] leading-relaxed text-muted-foreground">
                <li>
                  <span className="text-foreground">Profil fotoğrafı</span> —
                  medya altyapısı devreye girdiğinde açılacak.
                </li>
                <li>
                  <span className="text-foreground">E-posta değiştirme</span> —
                  doğrulama akışı gerektiriyor.
                </li>
                <li>
                  <span className="text-foreground">Hesap silme</span> —{' '}
                  <Link to="/kvkk" className="text-cold hover:text-primary">
                    KVKK sayfasından
                  </Link>{' '}
                  talep edilebiliyor.
                </li>
              </ul>
            </Panel>
          </div>
        </div>
      </Container>
    </>
  );
}

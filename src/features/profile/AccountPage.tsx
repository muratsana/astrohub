import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { LocationTypeahead } from '@/components/ui/LocationTypeahead';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel, SpecList, SpecRow } from '@/components/ui/Panel';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Button, ButtonLink } from '@/components/ui/Button';
import { PageMeta } from '@/components/seo/PageMeta';
import { Badge } from '@/components/ui/Badge';
import { Readout } from '@/components/ui/Readout';
import { useAuth } from '@/features/auth/AuthContext';
import { useRoles, roleLabels } from '@/features/admin/useRoles';
import { BlockList } from '@/features/social/BlockList';
import { useClubs } from '@/features/clubs/clubsSource';
import { formatIntegration } from '@/domain/photography/integration';
import {
  deleteOwnAccount,
  updateProfile,
  updateProfileContact,
  useMyProfile,
  useMyProfileContact,
  validateProfile,
  type ProfileEdit,
} from '@/services/content/profile';
import {
  requestClubMembership,
  useMyClubMemberships,
} from '@/services/content/profileCommunities';
import { useMyProfileStats } from '@/services/content/profileDashboard';
import { isUsernameLocked } from '@/features/auth/accountSetup';
import { MyEquipmentPanel } from '@/features/equipment/MyEquipmentPanel';
import { PreferencesPanel } from '@/features/preferences/PreferencesPanel';
import { AvatarEditor } from './AvatarEditor';
import { PasswordPanel } from './PasswordPanel';
import { DataExportPanel } from './DataExportPanel';

type Tab = 'hesabim' | 'profilim' | 'ekipmanlarim' | 'tercihler';

const TAB_LABELS: Record<Tab, string> = {
  hesabim: 'Hesabım',
  profilim: 'Profilim',
  ekipmanlarim: 'Ekipmanlarım',
  tercihler: 'Tercihler',
};

/*
 * EKİPMAN SEKMESİ BURAYA TAŞINDI (`/ekipman`ın üçüncü sekmesindeydi).
 *
 * Kişisel veri, herkese açık bir katalog sayfasının içinde duruyordu ve
 * kimse bulamıyordu: canlıda bir tek kayıtlı ekipman vardı. Gerekçenin
 * tamamı `MyEquipmentPanel` başlığında.
 */
function tabFromQuery(value: string | null): Tab {
  if (value === 'profilim') return 'profilim';
  if (value === 'ekipmanlarim') return 'ekipmanlarim';
  if (value === 'tercihler') return 'tercihler';
  return 'hesabim';
}

export function AccountPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const activeTab = tabFromQuery(params.get('sekme'));
  const { user, loading: authLoading, signOut, signOutEverywhere } = useAuth();
  const roles = useRoles();
  const { profile, loading, error, refresh } = useMyProfile(user?.id);
  const contactState = useMyProfileContact(user?.id);
  const statsState = useMyProfileStats(user?.id);
  const membershipsState = useMyClubMemberships(user?.id);
  const { clubs } = useClubs();

  const [edit, setEdit] = useState<ProfileEdit>({
    username: '',
    displayName: '',
    displayNameVisible: true,
    bio: '',
    city: '',
    district: '',
    websiteUrl: '',
  });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneVisible, setPhoneVisible] = useState(false);
  const [selectedClub, setSelectedClub] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [revokeArmed, setRevokeArmed] = useState(false);
  const [revokeBusy, setRevokeBusy] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [clubBusy, setClubBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setEdit({
      username: profile.username,
      displayName: profile.displayName ?? '',
      displayNameVisible: profile.displayNameVisible,
      bio: profile.bio ?? '',
      city: profile.city ?? '',
      district: profile.district ?? '',
      websiteUrl: profile.websiteUrl ?? '',
    });
  }, [profile]);

  useEffect(() => {
    setPhoneNumber(contactState.contact.phoneNumber ?? '');
    setPhoneVisible(contactState.contact.phoneVisible);
  }, [contactState.contact.phoneNumber, contactState.contact.phoneVisible]);

  /*
   * OTURUMSUZ ZİYARETÇİ HESAP BİLGİLERİNİ GÖREMİYOR — AMA EKİPMAN
   * KURUCUYU KULLANABİLİYOR.
   *
   * Kurucu `/ekipman` altındayken hesap gerektirmiyordu ve bu bilinçli
   * bir karardı: setup kurmak için kaydolmak gerekmiyor, kayıt
   * tarayıcıda duruyor ve giriş yapılınca hesaba taşınıyor (bkz.
   * `store.ts` ve `SyncNotice`). Modül hesabın altına taşınırken bu
   * kapı yanlışlıkla kapanmıştı: aracı denemek isteyen ziyaretçi
   * "giriş yapın" ekranına düşüyordu.
   *
   * Şimdi yalnızca hesap ve profil sekmeleri oturum istiyor; ekipman ve
   * tercihler sekmeleri ziyaretçiye açık ve ikisi de verinin nerede
   * durduğunu kendisi söylüyor.
   */
  const oturumsuzAcik: Tab[] = ['ekipmanlarim', 'tercihler'];
  if (!authLoading && !user && !oturumsuzAcik.includes(activeTab)) {
    return (
      <Container className="py-10">
        <PageHeader
          title="Hesabım"
          description="Profil bilgilerinizi görmek için giriş yapın."
        />
        <div className="flex flex-wrap gap-2">
          <ButtonLink to="/giris">Giriş yap</ButtonLink>
          {/* Ziyaretçi için çalışan yol açıkta bırakılıyor: araca gelen
              kullanıcıyı kayıt duvarına çarptırmak yerine içeri alıyoruz. */}
          <ButtonLink
            to="/hesap?sekme=ekipmanlarim"
            variant="secondary"
          >
            Ekipman kurucuyu aç
          </ButtonLink>
        </div>
      </Container>
    );
  }

  const emailVerified = Boolean(user?.email_confirmed_at || user?.confirmed_at);
  const problem = validateProfile(edit);
  const usernameChanged = !!profile && edit.username !== profile.username;
  /*
   * Kilit ARAYÜZDE anlatılıyor, RLS'te uygulanıyor
   * (`app.profiles_username_kilidi`). Alanı kilitli göstermeseydik
   * kullanıcı yazıp kaydeder ve ham bir veritabanı hatası görürdü.
   */
  const usernameLocked = isUsernameLocked(profile);
  const approvedMemberships = membershipsState.memberships.filter(
    (membership) => membership.status === 'approved'
  );

  function setTab(tab: Tab) {
    setParams(tab === 'hesabim' ? {} : { sekme: tab });
  }

  async function save() {
    if (!user) return;
    setBusy(true);
    setMessage(null);
    setFailure(null);
    try {
      await updateProfile(user.id, edit);
      await updateProfileContact(user.id, { phoneNumber, phoneVisible });
      refresh();
      contactState.refresh();
      setMessage('Profil bilgileri güncellendi.');
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'Kaydedilemedi.');
    } finally {
      setBusy(false);
    }
  }

  async function sendClubRequest() {
    if (!user || !selectedClub) return;
    setClubBusy(true);
    setFailure(null);
    setMessage(null);
    try {
      await requestClubMembership(user.id, selectedClub);
      membershipsState.refresh();
      setSelectedClub('');
      setMessage('Topluluk üyelik isteği onaya gönderildi.');
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'Topluluk isteği gönderilemedi.');
    } finally {
      setClubBusy(false);
    }
  }

  async function revokeEverywhere() {
    setRevokeBusy(true);
    setFailure(null);
    const { error: signOutError } = await signOutEverywhere();
    setRevokeBusy(false);
    if (signOutError) {
      setRevokeArmed(false);
      setFailure(signOutError);
      return;
    }
    navigate('/');
  }

  async function deleteAccount() {
    setDeleteBusy(true);
    setFailure(null);
    try {
      await deleteOwnAccount();
      await signOut();
      navigate('/');
    } catch (e) {
      setDeleteBusy(false);
      setDeleteArmed(false);
      setFailure(e instanceof Error ? e.message : 'Hesap silinemedi.');
    }
  }

  return (
    <>
      <PageMeta title="Hesabım" description="Astrohub profil ayarları." noIndex />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[{ label: 'Ana Sayfa', to: '/' }, { label: 'Hesabım' }]}
          title="Hesabım"
          description="Hesap bilgileri ve public profil vitrini aynı modülde yönetilir."
          actions={
            profile ? (
              <ButtonLink to={`/profil/${profile.username}`} size="sm" variant="secondary">
                Public profili aç
              </ButtonLink>
            ) : undefined
          }
        />

        <div className="mb-4 flex flex-wrap gap-2 border-b border-border pb-2">
          {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setTab(tab)}
              className={
                activeTab === tab
                  ? 'rounded-card border border-primary bg-primary/10 px-3 py-2 text-body-sm font-semibold text-primary'
                  : 'rounded-card border border-border px-3 py-2 text-body-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary'
              }
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {loading && (
          <p className="mb-4 text-body-sm text-muted-foreground">Profil yükleniyor…</p>
        )}
        {error && (
          <p className="mb-4 rounded-card border border-danger/45 bg-surface-1 px-3 py-2 text-body-sm text-danger">
            Profil okunamadı: {error}
          </p>
        )}
        {failure && (
          <p className="mb-4 rounded-card border border-danger/45 bg-surface-1 px-3 py-2 text-body-sm text-danger">
            {failure}
          </p>
        )}
        {message && (
          <p className="mb-4 rounded-card border border-success/35 bg-surface-1 px-3 py-2 text-body-sm text-success">
            {message}
          </p>
        )}

        {activeTab === 'hesabim' ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
            <Panel title="Kişisel bilgiler">
              <div className="grid gap-3">
                <Field
                  label="Kullanıcı adı"
                  htmlFor="p-username"
                  hint={
                    usernameLocked
                      ? 'Seçildi ve kilitlendi — profil adresiniz artık sabit.'
                      : 'Profil adresinizin parçasıdır. Yalnızca bir kez seçilir.'
                  }
                >
                  <Input
                    id="p-username"
                    value={edit.username}
                    maxLength={32}
                    readOnly={usernameLocked}
                    aria-readonly={usernameLocked}
                    onChange={(e) =>
                      setEdit((value) => ({ ...value, username: e.target.value }))
                    }
                  />
                </Field>

                {usernameLocked ? (
                  <p className="rounded-card border border-border bg-surface-2 px-2.5 py-2 text-meta leading-snug text-muted-foreground">
                    Kullanıcı adı bir kez seçilir ve değiştirilemez: profiliniz{' '}
                    <span className="tabular">/profil/{profile?.username}</span>{' '}
                    adresinde yayında ve bu bağlantı paylaşılmış olabilir.
                    Düzeltilmesi gereken bir durum varsa{' '}
                    <span className="text-foreground">iletişim</span> sayfasından
                    yazın.
                  </p>
                ) : (
                  usernameChanged && (
                    <p className="rounded-card border border-warning/40 bg-surface-2 px-2.5 py-2 text-meta leading-snug text-warning">
                      Bu <strong>tek seferlik</strong> bir seçim: kaydettiğinizde
                      kullanıcı adınız kilitlenir ve bir daha değiştirilemez.
                      Profiliniz{' '}
                      <span className="tabular">/profil/{edit.username}</span>{' '}
                      adresinde yayınlanacak.
                    </p>
                  )
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Gerçek ad soyad" htmlFor="p-display">
                    <Input
                      id="p-display"
                      value={edit.displayName}
                      maxLength={60}
                      placeholder="Adınız ve soyadınız"
                      onChange={(e) =>
                        setEdit((value) => ({
                          ...value,
                          displayName: e.target.value,
                        }))
                      }
                    />
                  </Field>

                  <Field
                    label="Şehir"
                    htmlFor="p-location"
                    hint="İl / ilçe seçilir."
                  >
                    <LocationTypeahead
                      id="p-location"
                      city={edit.city}
                      district={edit.district}
                      onSelect={(secim) =>
                        setEdit((value) => ({
                          ...value,
                          city: secim.city,
                          district: secim.district,
                        }))
                      }
                      onClear={() =>
                        setEdit((value) => ({ ...value, city: '', district: '' }))
                      }
                      allowProvinceOnly
                    />
                  </Field>
                </div>

                <label className="flex items-start gap-2 text-meta text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={edit.displayNameVisible}
                    onChange={(event) =>
                      setEdit((value) => ({
                        ...value,
                        displayNameVisible: event.target.checked,
                      }))
                    }
                    className="mt-0.5 h-4 w-4 rounded border-border bg-surface-1 accent-primary"
                  />
                  Gerçek ad soyad public profilde görünsün.
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="E-posta"
                    htmlFor="p-email"
                    hint="Zorunlu alan. Doğrulanmadan hesap aktif sayılmaz."
                  >
                    <Input id="p-email" value={user?.email ?? ''} readOnly />
                  </Field>
                  <div className="rounded-card border border-border bg-surface-2 px-3 py-2">
                    <span className="label">E-posta durumu</span>
                    <p className={emailVerified ? 'text-success' : 'text-warning'}>
                      {emailVerified ? 'Doğrulandı' : 'Doğrulanmadı'}
                    </p>
                  </div>
                </div>

                <Field
                  label="Telefon numarası"
                  htmlFor="p-phone"
                  hint="Zorunlu değil. Varsayılan olarak diğer kullanıcılar göremez."
                >
                  <Input
                    id="p-phone"
                    value={phoneNumber}
                    placeholder="+90 ..."
                    onChange={(event) => setPhoneNumber(event.target.value)}
                  />
                </Field>

                <label className="flex items-start gap-2 text-meta text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={phoneVisible}
                    disabled={!phoneNumber.trim()}
                    onChange={(event) => setPhoneVisible(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border bg-surface-1 accent-primary disabled:opacity-50"
                  />
                  Telefon numaram public profilde görünsün.
                </label>

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
                      setEdit((value) => ({
                        ...value,
                        websiteUrl: e.target.value,
                      }))
                    }
                  />
                </Field>

                <Field
                  label="Hakkında"
                  htmlFor="p-bio"
                  hint="Zorunlu değil — en çok 400 karakter."
                >
                  <textarea
                    id="p-bio"
                    value={edit.bio}
                    rows={5}
                    maxLength={400}
                    onChange={(e) =>
                      setEdit((value) => ({ ...value, bio: e.target.value }))
                    }
                    className="w-full resize-y rounded-card border border-border bg-surface-2 px-2.5 py-2 text-meta leading-relaxed text-foreground outline-none transition-colors focus:border-primary"
                  />
                </Field>

                <Field
                  label="Üye olunan topluluklar"
                  htmlFor="p-club"
                  hint="Seçim topluluk yöneticisinin/adminin onayına gider."
                >
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                      id="p-club"
                      value={selectedClub}
                      onChange={(event) => setSelectedClub(event.target.value)}
                      className="h-10 flex-1 rounded-card border border-border bg-surface-2 px-2.5 text-meta text-foreground outline-none focus:border-primary"
                    >
                      <option value="">Topluluk seç</option>
                      {clubs.map((club) => (
                        <option key={club.slug} value={club.slug}>
                          {club.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!selectedClub || clubBusy || !user}
                      onClick={() => void sendClubRequest()}
                    >
                      {clubBusy ? 'Gönderiliyor…' : 'Onaya gönder'}
                    </Button>
                  </div>
                </Field>

                {membershipsState.memberships.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {membershipsState.memberships.map((membership) => {
                      const club = clubs.find((item) => item.slug === membership.clubSlug);
                      return (
                        <Badge
                          key={membership.clubSlug}
                          tone={membership.status === 'approved' ? 'success' : 'warning'}
                        >
                          {club?.name ?? membership.clubSlug} ·{' '}
                          {membership.status === 'approved'
                            ? 'onaylı'
                            : membership.status === 'pending'
                              ? 'onay bekliyor'
                              : 'reddedildi'}
                        </Badge>
                      );
                    })}
                  </div>
                )}

                {problem && (
                  <p className="rounded-card border border-warning/40 bg-surface-2 px-2.5 py-2 text-meta leading-snug text-warning">
                    {problem}
                  </p>
                )}

                <Button
                  onClick={save}
                  disabled={busy || !!problem || !profile || !emailVerified}
                >
                  {busy ? 'Kaydediliyor…' : 'Kaydet'}
                </Button>
              </div>
            </Panel>

            <AccountSidePanel
              userEmail={user?.email ?? null}
              emailVerified={emailVerified}
              roles={roles.roles}
              canAccessAdmin={roles.canAccessAdmin}
              revokeArmed={revokeArmed}
              revokeBusy={revokeBusy}
              deleteArmed={deleteArmed}
              deleteBusy={deleteBusy}
              onAdmin={() => navigate('/admin')}
              onSignOut={() => {
                void signOut();
                navigate('/');
              }}
              onArmRevoke={() => setRevokeArmed(true)}
              onCancelRevoke={() => setRevokeArmed(false)}
              onRevoke={() => void revokeEverywhere()}
              onArmDelete={() => setDeleteArmed(true)}
              onCancelDelete={() => setDeleteArmed(false)}
              onDelete={() => void deleteAccount()}
            />
          </div>
        ) : activeTab === 'ekipmanlarim' ? (
          <MyEquipmentPanel />
        ) : activeTab === 'tercihler' ? (
          <PreferencesPanel />
        ) : (
          <div className="grid gap-4">
            <AvatarEditor userId={user?.id} profile={profile} onDone={refresh} />

            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
              <Readout label="Fotoğrafları" value={statsState.stats.photoCount} />
              <Readout label="Ekipmanları" value={statsState.stats.equipmentCount} />
              <Readout
                label="Toplam entegrasyon"
                value={formatIntegration(statsState.stats.integrationSeconds)}
                tone="cold"
              />
              <Readout label="Beğeni sayısı" value={statsState.stats.likeCount} />
              <Readout label="Toplulukları" value={approvedMemberships.length} />
              <Readout label="İlanları" value={statsState.stats.listingCount} />
            </div>

            {statsState.error && (
              <p className="rounded-card border border-warning/40 bg-surface-1 px-3 py-2 text-body-sm text-warning">
                Profil istatistikleri okunamadı: {statsState.error}
              </p>
            )}

            <Panel title="Fotoğrafları">
              {statsState.loading ? (
                <p className="text-body-sm text-muted-foreground">Fotoğraflar yükleniyor…</p>
              ) : statsState.stats.photos.length > 0 ? (
                <ul className="divide-y divide-border">
                  {statsState.stats.photos.slice(0, 12).map((photo) => (
                    <li key={photo.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="text-body-sm text-foreground">{photo.title}</span>
                      <ButtonLink to={`/fotograf/${photo.slug}`} size="sm" variant="ghost">
                        Aç
                      </ButtonLink>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-body-sm text-muted-foreground">
                  Henüz fotoğraf yüklenmemiş.
                </p>
              )}
            </Panel>

            <Panel title="Toplulukları">
              {approvedMemberships.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {approvedMemberships.map((membership) => {
                    const club = clubs.find((item) => item.slug === membership.clubSlug);
                    return (
                      <ButtonLink
                        key={membership.clubSlug}
                        to={`/topluluk/${membership.clubSlug}`}
                        size="sm"
                        variant="secondary"
                      >
                        {club?.name ?? membership.clubSlug}
                      </ButtonLink>
                    );
                  })}
                </div>
              ) : (
                <p className="text-body-sm text-muted-foreground">
                  Onaylı topluluk üyeliği yok.
                </p>
              )}
            </Panel>

            <BlockList />
          </div>
        )}
      </Container>
    </>
  );
}

function AccountSidePanel({
  userEmail,
  emailVerified,
  roles,
  canAccessAdmin,
  revokeArmed,
  revokeBusy,
  deleteArmed,
  deleteBusy,
  onAdmin,
  onSignOut,
  onArmRevoke,
  onCancelRevoke,
  onRevoke,
  onArmDelete,
  onCancelDelete,
  onDelete,
}: {
  userEmail: string | null;
  emailVerified: boolean;
  roles: string[];
  canAccessAdmin: boolean;
  revokeArmed: boolean;
  revokeBusy: boolean;
  deleteArmed: boolean;
  deleteBusy: boolean;
  onAdmin: () => void;
  onSignOut: () => void;
  onArmRevoke: () => void;
  onCancelRevoke: () => void;
  onRevoke: () => void;
  onArmDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="grid gap-4 lg:content-start">
      <Panel title="Hesap">
        <SpecList>
          <SpecRow label="E-posta" value={userEmail ?? '—'} />
          <SpecRow
            label="E-posta doğrulama"
            value={emailVerified ? 'Doğrulandı' : 'Doğrulanmadı'}
          />
          <SpecRow
            label="Roller"
            value={
              roles.length > 0 ? (
                <span className="flex flex-wrap gap-1">
                  {roles.map((role) => (
                    <Badge key={role} tone={role === 'admin' ? 'primary' : 'cold'}>
                      {roleLabels[role as keyof typeof roleLabels] ?? role}
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
          {canAccessAdmin && (
            <Button size="sm" variant="secondary" onClick={onAdmin}>
              Yönetim paneli
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onSignOut}>
            Çıkış yap
          </Button>
          {revokeArmed ? (
            <>
              <Button size="sm" variant="danger" disabled={revokeBusy} onClick={onRevoke}>
                {revokeBusy ? 'Kapatılıyor…' : 'Onayla — hepsini kapat'}
              </Button>
              <Button size="sm" variant="ghost" disabled={revokeBusy} onClick={onCancelRevoke}>
                Vazgeç
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={onArmRevoke}>
              Tüm cihazlardan çıkış
            </Button>
          )}
        </div>
      </Panel>

      <PasswordPanel />

      <DataExportPanel />

      <Panel title="Hesabı sil">
        <p className="text-meta leading-relaxed text-muted-foreground">
          Hesabınızı silerseniz profiliniz, oturumunuz ve hesabınıza bağlı kişisel
          veriler kalıcı olarak kaldırılır. Bu işlem geri alınamaz.
        </p>
        {deleteArmed ? (
          <div className="mt-3 rounded-card border border-danger/45 bg-danger/10 p-3">
            <p className="text-body-sm font-semibold text-danger">
              Hesabınızı kalıcı olarak silmek istediğinizden emin misiniz?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="danger" disabled={deleteBusy} onClick={onDelete}>
                {deleteBusy ? 'Siliniyor…' : 'Evet, kalıcı olarak sil'}
              </Button>
              <Button size="sm" variant="ghost" disabled={deleteBusy} onClick={onCancelDelete}>
                Vazgeç
              </Button>
            </div>
          </div>
        ) : (
          <Button className="mt-3" size="sm" variant="danger" onClick={onArmDelete}>
            Hesabımı sil
          </Button>
        )}
      </Panel>
    </div>
  );
}


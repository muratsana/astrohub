import { Suspense, lazy, useEffect, useState } from 'react';
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
import { MAX_DRAFT_PHOTOS } from '@/domain/membership/quota';
import {
  formatBytes as formatQuotaBytes,
  useQuota,
  type QuotaState,
} from '@/services/content/membership';
import {
  isPhotoPubliclyVisible,
  useMyPhotos,
  type MyPhotosState,
  type MyPhotoSummary,
} from '@/services/content/photos';
import { deletePhoto } from '@/services/photos/remove';
import { photoStatusLabels, type PhotoStatus } from '@/features/photos/types';
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
import { AvatarEditor, BannerEditor } from './AvatarEditor';
import { PasswordPanel } from './PasswordPanel';
import { DataExportPanel } from './DataExportPanel';
import { CollectionsPanel } from './CollectionsPanel';

const ClubManagementPanel = lazy(() =>
  import('./ClubManagementPanel').then((module) => ({
    default: module.ClubManagementPanel,
  }))
);

type Tab =
  | 'hesabim'
  | 'profilim'
  | 'fotograflarim'
  | 'ekipmanlarim'
  | 'koleksiyonlarim'
  | 'kulup-yonetimi'
  | 'tercihler';

const TAB_LABELS: Record<Tab, string> = {
  hesabim: 'Hesabım',
  profilim: 'Profilim',
  fotograflarim: 'Fotoğraflarım',
  ekipmanlarim: 'Ekipmanlarım',
  koleksiyonlarim: 'Koleksiyonlarım',
  'kulup-yonetimi': 'Kulüp Yönetimi',
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
  if (value === 'fotograflarim') return 'fotograflarim';
  if (value === 'ekipmanlarim') return 'ekipmanlarim';
  if (value === 'koleksiyonlarim') return 'koleksiyonlarim';
  if (value === 'kulup-yonetimi') return 'kulup-yonetimi';
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
  const myPhotos = useMyPhotos(user?.id);
  const quota = useQuota();
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
          <ButtonLink to="/hesap?sekme=ekipmanlarim" variant="secondary">
            Ekipman kurucuyu aç
          </ButtonLink>
        </div>
      </Container>
    );
  }

  const emailVerified = Boolean(user?.email_confirmed_at || user?.confirmed_at);
  const accountUserId = user?.id ?? '';
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
      setFailure(
        e instanceof Error ? e.message : 'Topluluk isteği gönderilemedi.'
      );
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
      <PageMeta
        title="Hesabım"
        description="Astrohub profil ayarları."
        noIndex
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[{ label: 'Ana Sayfa', to: '/' }, { label: 'Hesabım' }]}
          title="Hesabım"
          description="Hesap bilgileri ve public profil vitrini aynı modülde yönetilir."
          actions={
            profile ? (
              <ButtonLink
                to={`/profil/${profile.username}`}
                size="sm"
                variant="secondary"
              >
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
          <p className="mb-4 text-body-sm text-muted-foreground">
            Profil yükleniyor…
          </p>
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
                      setEdit((value) => ({
                        ...value,
                        username: e.target.value,
                      }))
                    }
                  />
                </Field>

                {usernameLocked ? (
                  <p className="rounded-card border border-border bg-surface-2 px-2.5 py-2 text-meta leading-snug text-muted-foreground">
                    Kullanıcı adı bir kez seçilir ve değiştirilemez: profiliniz{' '}
                    <span className="tabular">/profil/{profile?.username}</span>{' '}
                    adresinde yayında ve bu bağlantı paylaşılmış olabilir.
                    Düzeltilmesi gereken bir durum varsa{' '}
                    <span className="text-foreground">iletişim</span>{' '}
                    sayfasından yazın.
                  </p>
                ) : (
                  usernameChanged && (
                    <p className="rounded-card border border-warning/40 bg-surface-2 px-2.5 py-2 text-meta leading-snug text-warning">
                      Bu <strong>tek seferlik</strong> bir seçim:
                      kaydettiğinizde kullanıcı adınız kilitlenir ve bir daha
                      değiştirilemez. Profiliniz{' '}
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
                    /* ZORUNLU OLDUĞU FORMDA YAZIYOR. Kaydete basınca
                       öğrenilen bir zorunluluk, kullanıcıyı formu
                       ikinci kez doldurmaya gönderir. */
                    hint="İl / ilçe seçilir. Zorunlu — konuma bağlı bölümler şehre göre hesaplanıyor."
                    error={edit.city.trim() ? undefined : 'Şehir seçilmeli.'}
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
                        setEdit((value) => ({
                          ...value,
                          city: '',
                          district: '',
                        }))
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

                {/*
                 * E-POSTA DURUMU ARTIK ALANIN İÇİNDE (E01).
                 *
                 * Önce ayrı bir çerçeveli "E-posta durumu" kutusu vardı ve
                 * aynı bilgi üç yerde birden duruyordu: bu kutu, sağdaki
                 * "Hesap" özet listesi ve sitenin üstündeki doğrulama şeridi.
                 * Kutu kaldırıldı; durum, ait olduğu yerde — e-posta
                 * kutucuğunun yanında kompakt bir rozet olarak — kaldı.
                 */}
                <Field
                  label="E-posta"
                  htmlFor="p-email"
                  hint="Zorunlu alan. Doğrulanmadan hesap aktif sayılmaz."
                >
                  <div className="flex items-center gap-2">
                    <Input
                      id="p-email"
                      value={user?.email ?? ''}
                      readOnly
                      className="flex-1"
                    />
                    <span
                      className={
                        'shrink-0 rounded-full px-2.5 py-1 text-meta ' +
                        (emailVerified
                          ? 'bg-success/12 text-success'
                          : 'bg-warning/12 text-warning')
                      }
                    >
                      {emailVerified ? 'Doğrulandı' : 'Doğrulanmadı'}
                    </span>
                  </div>
                </Field>

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
                      const club = clubs.find(
                        (item) => item.slug === membership.clubSlug
                      );
                      return (
                        <Badge
                          key={membership.clubSlug}
                          tone={
                            membership.status === 'approved'
                              ? 'success'
                              : 'warning'
                          }
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
        ) : activeTab === 'fotograflarim' ? (
          <MyPhotosAccountPanel
            photosState={myPhotos}
            quota={quota}
            userId={accountUserId}
          />
        ) : activeTab === 'koleksiyonlarim' ? (
          <CollectionsPanel />
        ) : activeTab === 'kulup-yonetimi' ? (
          <Suspense
            fallback={
              <Panel title="Kulüp Yönetimi">
                <p className="text-body-sm text-muted-foreground">
                  Kulüp yönetimi yükleniyor…
                </p>
              </Panel>
            }
          >
            <ClubManagementPanel userId={user?.id} />
          </Suspense>
        ) : activeTab === 'tercihler' ? (
          <PreferencesPanel />
        ) : (
          <div className="grid gap-4">
            <AvatarEditor
              userId={user?.id}
              profile={profile}
              onDone={refresh}
            />

            {/* Kapak, profil fotoğrafının hemen ardında: ikisi public
                profilde de yan yana duruyor ve burada ayrı yerlere
                dağıtmak, birini düzenleyip diğerini unutmayı
                kolaylaştırırdı. */}
            <BannerEditor
              userId={user?.id}
              profile={profile}
              onDone={refresh}
            />

            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
              <Readout
                label="Fotoğrafları"
                value={statsState.stats.photoCount}
              />
              <Readout
                label="Ekipmanları"
                value={statsState.stats.equipmentCount}
              />
              <Readout
                label="Toplam entegrasyon"
                value={formatIntegration(statsState.stats.integrationSeconds)}
                tone="cold"
              />
              <Readout
                label="Beğeni sayısı"
                value={statsState.stats.likeCount}
              />
              <Readout
                label="Toplulukları"
                value={approvedMemberships.length}
              />
              <Readout label="İlanları" value={statsState.stats.listingCount} />
            </div>

            {statsState.error && (
              <p className="rounded-card border border-warning/40 bg-surface-1 px-3 py-2 text-body-sm text-warning">
                Profil istatistikleri okunamadı: {statsState.error}
              </p>
            )}

            <Panel title="Fotoğrafları">
              {statsState.loading ? (
                <p className="text-body-sm text-muted-foreground">
                  Fotoğraflar yükleniyor…
                </p>
              ) : statsState.stats.photos.length > 0 ? (
                <ul className="divide-y divide-border">
                  {statsState.stats.photos.slice(0, 12).map((photo) => (
                    <li
                      key={photo.id}
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <span className="text-body-sm text-foreground">
                        {photo.title}
                      </span>
                      <ButtonLink
                        to={`/fotograf/${photo.slug}`}
                        size="sm"
                        variant="ghost"
                      >
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
                    const club = clubs.find(
                      (item) => item.slug === membership.clubSlug
                    );
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

function photoStatusTone(status: PhotoStatus) {
  if (status === 'yayinda') return 'success';
  if (status === 'taslak') return 'warning';
  if (status === 'reddedildi' || status === 'yayindan_kaldirildi') {
    return 'danger';
  }
  if (status === 'incelemede' || status === 'onaylandi') return 'primary';
  return 'muted';
}

function formatDate(value: string): string {
  if (!value) return 'Tarih yok';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Tarih yok';
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function averageScore(photo: MyPhotoSummary): string {
  if (photo.ratingCount <= 0) return 'Puan yok';
  return `${(photo.ratingSum / photo.ratingCount).toFixed(1)} / 10`;
}

function MyPhotosAccountPanel({
  photosState,
  quota,
  userId,
}: {
  photosState: MyPhotosState;
  quota: QuotaState | null;
  userId: string;
}) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busyDeleteId, setBusyDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const photos = photosState.photos;
  const totalIntegration = photos.reduce(
    (sum, photo) => sum + photo.integrationSeconds,
    0
  );
  const totalLikes = photos.reduce((sum, photo) => sum + photo.likeCount, 0);
  const totalComments = photos.reduce(
    (sum, photo) => sum + photo.commentCount,
    0
  );
  const totalRatings = photos.reduce((sum, photo) => sum + photo.ratingCount, 0);
  const totalRatingScore = photos.reduce(
    (sum, photo) => sum + photo.ratingSum,
    0
  );
  const average =
    totalRatings > 0 ? `${(totalRatingScore / totalRatings).toFixed(1)} / 10` : '—';
  const archived = photos.filter((photo) => photo.status === 'arsivlendi').length;
  const review = photos.filter((photo) =>
    ['incelemede', 'onaylandi'].includes(photo.status)
  ).length;

  async function removePhoto(photo: MyPhotoSummary) {
    setBusyDeleteId(photo.id);
    setDeleteError(null);
    try {
      await deletePhoto({ userId, photoId: photo.id });
      setDeleteId(null);
      photosState.refresh();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Fotoğraf kaldırılamadı');
    } finally {
      setBusyDeleteId(null);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <Readout label="Toplam fotoğraf" value={photos.length} />
        <Readout
          label="Yayında"
          value={quota?.photosUsed ?? photosState.published}
          tone="primary"
        />
        <Readout label="Taslak" value={photosState.drafts} tone="muted" />
        <Readout label="Arşiv" value={archived} />
        <Readout
          label="Toplam entegrasyon"
          value={formatIntegration(totalIntegration)}
          tone="cold"
        />
        <Readout label="Ortalama puan" value={average} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <Panel
          title="Fotoğraflarım"
          status={
            photosState.loading
              ? 'yükleniyor'
              : `${photos.length.toLocaleString('tr-TR')} kayıt`
          }
        >
          {deleteError && (
            <p className="mb-3 rounded-card border border-danger/45 bg-surface-2 px-3 py-2 text-body-sm text-danger">
              {deleteError}
            </p>
          )}

          {photosState.error && (
            <p className="mb-3 rounded-card border border-danger/45 bg-surface-2 px-3 py-2 text-body-sm text-danger">
              Fotoğraflar okunamadı: {photosState.error}
            </p>
          )}

          {photosState.loading ? (
            <p className="text-body-sm text-muted-foreground">
              Fotoğraflar yükleniyor…
            </p>
          ) : photos.length > 0 ? (
            <ul className="divide-y divide-border">
              {photos.map((photo) => {
                const publicPath = isPhotoPubliclyVisible(photo.status)
                  ? `/fotograf/${photo.slug}`
                  : undefined;
                return (
                  <li
                    key={photo.id}
                    className="grid gap-3 py-3 md:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div className="flex min-w-0 gap-3">
                      <div className="h-16 w-20 shrink-0 overflow-hidden rounded-card border border-border bg-surface-2">
                        {photo.thumbUrl ? (
                          <img
                            src={photo.thumbUrl}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-[linear-gradient(135deg,rgba(250,166,50,.22),rgba(80,160,190,.16))]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-body-sm font-semibold text-foreground">
                            {photo.title}
                          </p>
                          <Badge tone={photoStatusTone(photo.status)}>
                            {photoStatusLabels[photo.status]}
                          </Badge>
                        </div>
                        <p className="mt-1 text-meta text-muted-foreground">
                          Çekim {formatDate(photo.capturedAt)} · Yayın{' '}
                          {formatDate(photo.publishedAt)}
                        </p>
                        <p className="mt-1 text-meta text-faint">
                          {formatIntegration(photo.integrationSeconds)} ·{' '}
                          {photo.likeCount} beğeni · {photo.commentCount} yorum ·{' '}
                          {averageScore(photo)} ({photo.ratingCount} oy)
                          {photo.width && photo.height
                            ? ` · ${photo.width}×${photo.height}px`
                            : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      {publicPath && (
                        <ButtonLink to={publicPath} size="sm" variant="secondary">
                          Gör
                        </ButtonLink>
                      )}
                      <ButtonLink
                        to={`/galeri/yukle?duzenle=${photo.slug}`}
                        size="sm"
                      >
                        Düzenle
                      </ButtonLink>
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        disabled={busyDeleteId === photo.id}
                        onClick={() =>
                          setDeleteId(deleteId === photo.id ? null : photo.id)
                        }
                      >
                        Kaldır
                      </Button>
                    </div>

                    {deleteId === photo.id && (
                      <div className="md:col-span-2 rounded-card border border-danger/40 bg-danger/10 px-3 py-2">
                        <p className="text-meta leading-relaxed text-danger">
                          <strong>{photo.title}</strong> hesabınızdan
                          kaldırılacak. Kayıt public listelerden ve kotadan
                          düşer; gerekirse yönetim panelinden geri alınabilir.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            disabled={busyDeleteId === photo.id}
                            onClick={() => void removePhoto(photo)}
                          >
                            {busyDeleteId === photo.id
                              ? 'Kaldırılıyor…'
                              : 'Evet, kaldır'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={busyDeleteId === photo.id}
                            onClick={() => setDeleteId(null)}
                          >
                            Vazgeç
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-card border border-border bg-surface-2 px-3 py-4">
              <p className="text-body-sm font-medium text-foreground">
                Henüz fotoğraf yok.
              </p>
              <p className="mt-1 text-meta text-muted-foreground">
                İlk fotoğrafınızı yüklediğinizde taslaklar, yayındaki kayıtlar
                ve arşiv buradan yönetilecek.
              </p>
              <ButtonLink to="/galeri/yukle" size="sm" className="mt-3">
                Fotoğraf yükle
              </ButtonLink>
            </div>
          )}
        </Panel>

        <div className="grid gap-4 lg:content-start">
          <Panel title="Kota ve depolama">
            <SpecList>
              <SpecRow
                label="Fotoğraf kotası"
                value={
                  quota
                    ? `${quota.photosUsed} / ${quota.photosLimit}`
                    : `${photosState.published} / —`
                }
              />
              <SpecRow
                label="Taslak"
                value={`${photosState.drafts} / ${MAX_DRAFT_PHOTOS}`}
              />
              <SpecRow
                label="Depolama"
                value={
                  quota
                    ? `${formatQuotaBytes(quota.storageUsed)} / ${formatQuotaBytes(
                        quota.storageLimit
                      )}`
                    : '—'
                }
              />
              <SpecRow
                label="Üyelik"
                value={quota?.tier === 'premium' ? 'Premium' : 'Standart'}
              />
            </SpecList>
            {quota?.overLimit && (
              <p className="mt-3 rounded-card border border-warning/45 bg-warning/10 px-3 py-2 text-meta text-warning">
                Fotoğraf sayınız mevcut kota sınırının üstünde. Yeni yayın için
                önce bir kaydı arşivleyin.
              </p>
            )}
          </Panel>

          <Panel title="Analiz">
            <SpecList>
              <SpecRow label="Toplam entegrasyon" value={formatIntegration(totalIntegration)} />
              <SpecRow label="Toplam beğeni" value={totalLikes.toLocaleString('tr-TR')} />
              <SpecRow label="Toplam yorum" value={totalComments.toLocaleString('tr-TR')} />
              <SpecRow label="Toplam oy" value={totalRatings.toLocaleString('tr-TR')} />
              <SpecRow label="İncelemede" value={review.toLocaleString('tr-TR')} />
            </SpecList>
          </Panel>

          <ButtonLink to="/galeri/yukle" className="w-full justify-center">
            Yeni fotoğraf yükle
          </ButtonLink>
        </div>
      </div>
    </div>
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
                    <Badge
                      key={role}
                      tone={role === 'admin' ? 'primary' : 'cold'}
                    >
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
              <Button
                size="sm"
                variant="danger"
                disabled={revokeBusy}
                onClick={onRevoke}
              >
                {revokeBusy ? 'Kapatılıyor…' : 'Onayla — hepsini kapat'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={revokeBusy}
                onClick={onCancelRevoke}
              >
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
          Hesabınızı silerseniz profiliniz, oturumunuz ve hesabınıza bağlı
          kişisel veriler kalıcı olarak kaldırılır. Bu işlem geri alınamaz.
        </p>
        {deleteArmed ? (
          <div className="mt-3 rounded-card border border-danger/45 bg-danger/10 p-3">
            <p className="text-body-sm font-semibold text-danger">
              Hesabınızı kalıcı olarak silmek istediğinizden emin misiniz?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="danger"
                disabled={deleteBusy}
                onClick={onDelete}
              >
                {deleteBusy ? 'Siliniyor…' : 'Evet, kalıcı olarak sil'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={deleteBusy}
                onClick={onCancelDelete}
              >
                Vazgeç
              </Button>
            </div>
          </div>
        ) : (
          <Button
            className="mt-3"
            size="sm"
            variant="danger"
            onClick={onArmDelete}
          >
            Hesabımı sil
          </Button>
        )}
      </Panel>
    </div>
  );
}

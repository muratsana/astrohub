import { useCallback, useEffect, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import {
  grantTestPremium,
  revokeTestPremium,
} from '@/services/content/membership';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/features/auth/AuthContext';
import {
  fetchUsers,
  fetchDeletionRequests,
  exportUsersCsv,
  fetchUserAudit,
  USER_PAGE_SIZE,
  USER_SORTS,
  userSortLabels,
  type UserQuery,
  type UserSort,
  grantRole,
  revokeRole,
  setMembership,
  membershipLabels,
  roleDescriptions,
  roleLabels,
  ROLES,
  MEMBERSHIP_STATUSES,
  ACCOUNT_STATUSES,
  accountStatusLabels,
  accountStatusDescriptions,
  isWriteAllowed,
  setAccountStatus,
  setAdminNote,
  type AccountStatus,
  type AuditEntry,
  type AdminUser,
  type AppRole,
  type DeletionRequest,
  type MembershipStatus,
} from './users';
import { cn } from '@/lib/cn';

/**
 * KULLANICI YÖNETİMİ.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ROL VERMEK GERİ ALINABİLİR, KULLANICI SİLMEK DEĞİL
 *
 * Bu panelde kullanıcı SİLME düğmesi YOK ve bu bilinçli. Silme yalnızca
 * kullanıcının kendi KVKK talebiyle başlıyor (aşağıdaki liste); bir
 * yöneticinin tek tıkla hesap silebilmesi, yanlış satıra basıldığında
 * geri dönüşü olmayan bir kayıp demekti.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DURDURMANIN YOLU ARTIK ROL ALMAK DEĞİL
 *
 * Bu ekranda eskiden şu yazıyordu: "bir hesabı durdurmak için rollerini
 * alın ve içeriğini arşivleyin". O tavsiye işe yaramıyordu — rolsüz
 * kullanıcı da fotoğraf yükler, yorum yazar, ilan açar. Yani panelin
 * elinde gerçekten susturma aracı yoktu (keşif bulgusu T3).
 *
 * Artık `account_status` var ve yaptırımı RLS yapıyor: askıdaki kullanıcı
 * PostgREST'e doğrudan istek atsa bile 42501 alıyor. Aşağıdaki düğmeler
 * o alanı yazıyor, yasağı uygulamıyor — uygulayan yer veritabanı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * KENDİ ROLÜNÜ ALMAK
 *
 * Yönetici kendi `admin` rolünü alabiliyor — bu kasıtlı, devretme
 * senaryosu var. Ama SON admin alınamıyor (`users.ts`) ve arayüz kendi
 * satırını ayrıca işaretliyor: "bu sensin" uyarısı olmadan, listede
 * kendi satırına basmak fark edilmeyecek kadar kolay.
 */
export function UserControl() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [total, setTotal] = useState(0);
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  /*
    SORGU TEK NESNEDE. Filtreler ayrı `useState`lerde dursaydı her
    değişiklikte "hangileriyle yükleyeceğim" sorusu yeniden çözülürdü ve
    sayfa numarasını sıfırlamayı unutmak kaçınılmazdı — filtre değişip
    sayfa 3'te kalmak, boş liste demek.
  */
  const [query, setQuery] = useState<UserQuery>({
    search: '',
    status: 'hepsi',
    role: 'hepsi',
    city: '',
    sort: 'createdAt',
    page: 0,
  });
  /* Arama kutusu forma bağlı: her tuşta sorgu atmıyoruz. */
  const [searchDraft, setSearchDraft] = useState('');

  const load = useCallback((q: UserQuery) => {
    setError(null);
    fetchUsers(q)
      .then((sayfa) => {
        setUsers(sayfa.rows);
        setTotal(sayfa.total);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Kullanıcılar okunamadı')
      );
    fetchDeletionRequests()
      .then(setRequests)
      .catch(() => {
        /* Silme talepleri okunamazsa kullanıcı listesi yine çalışsın —
             ikisi ayrı yetki ve ayrı tablo. */
      });
  }, []);

  useEffect(() => load(query), [load, query]);

  /** Filtre değişince sayfa BAŞA döner — yoksa boş sayfada kalınır. */
  function setFilter(patch: Partial<UserQuery>) {
    setQuery((q) => ({ ...q, ...patch, page: 0 }));
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      load(query);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem uygulanamadı');
    } finally {
      setBusy(false);
    }
  }

  const sayfaSayisi = Math.max(1, Math.ceil(total / USER_PAGE_SIZE));
  const sayfa = query.page ?? 0;

  async function setPrimaryStatus(
    userId: string,
    status: 'standard' | 'moderator' | 'admin'
  ) {
    if (status === 'standard') {
      await revokeRole(userId, 'moderator');
      await revokeRole(userId, 'admin');
      return;
    }
    if (status === 'moderator') {
      await revokeRole(userId, 'admin');
      await grantRole(userId, 'moderator');
      return;
    }
    await grantRole(userId, 'admin');
  }

  return (
    <Panel
      title="Kullanıcılar"
      status={
        users
          ? `${total} kayıt · sayfa ${sayfa + 1}/${sayfaSayisi}`
          : 'okunuyor…'
      }
    >
      <p className="mb-3 text-meta leading-relaxed text-muted-foreground">
        Yetki veritabanında zorlanıyor: bu ekrandaki düğmeler yalnızca
        yöneticinin çağırabildiği işlemleri gösteriyor.{' '}
        <strong className="text-foreground">
          E-posta adresleri panelde görünmez
        </strong>{' '}
        — kimlik tablosu API'ye hiç açılmadı.
      </p>

      {error && <Alert className="mb-3">{error}</Alert>}

      <form
        className="mb-3 flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setFilter({ search: searchDraft });
        }}
      >
        <label className="min-w-[12rem] flex-1">
          <span className="label mb-1 block">Ara</span>
          <Input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Kullanıcı adı ya da görünen ad"
            className="h-9 w-full text-meta"
            aria-label="Kullanıcı ara"
          />
        </label>

        <label>
          <span className="label mb-1 block">Durum</span>
          <Select
            value={query.status}
            disabled={busy}
            onChange={(e) =>
              setFilter({ status: e.target.value as AccountStatus | 'hepsi' })
            }
            className="h-9 text-meta"
          >
            <option value="hepsi">Hepsi</option>
            {ACCOUNT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {accountStatusLabels[s]}
              </option>
            ))}
          </Select>
        </label>

        <label>
          <span className="label mb-1 block">Rol</span>
          <Select
            value={query.role}
            disabled={busy}
            onChange={(e) =>
              setFilter({ role: e.target.value as AppRole | 'hepsi' })
            }
            className="h-9 text-meta"
          >
            <option value="hepsi">Hepsi</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabels[r]}
              </option>
            ))}
          </Select>
        </label>

        <label>
          <span className="label mb-1 block">Şehir</span>
          <Input
            value={query.city ?? ''}
            onChange={(e) => setFilter({ city: e.target.value })}
            placeholder="Tümü"
            className="h-9 w-32 text-meta"
            aria-label="Şehre göre süz"
          />
        </label>

        <label>
          <span className="label mb-1 block">Sırala</span>
          <Select
            value={query.sort}
            disabled={busy}
            onChange={(e) => setFilter({ sort: e.target.value as UserSort })}
            className="h-9 text-meta"
          >
            {USER_SORTS.map((s) => (
              <option key={s} value={s}>
                {userSortLabels[s]}
              </option>
            ))}
          </Select>
        </label>

        <Button size="sm" type="submit" disabled={busy}>
          Uygula
        </Button>
        <Button
          size="sm"
          variant="ghost"
          type="button"
          disabled={busy}
          onClick={() => {
            setSearchDraft('');
            setQuery({
              search: '',
              status: 'hepsi',
              role: 'hepsi',
              city: '',
              sort: 'createdAt',
              page: 0,
            });
          }}
        >
          Sıfırla
        </Button>
        {/*
          CSV FİLTREYE UYAN TÜM KAYITLARI alır, ekrandaki sayfayı değil.
          Yönetici "listeyi indir" derken gördüğü 50 satırı değil, süzdüğü
          kümeyi kastediyor. Dışa aktarım `audit_logs`'a düşüyor
          (`users.export`) — kişisel veri toplu olarak dışarı çıkıyor ve
          bunun kaydı olmalı.
        */}
        <Button
          size="sm"
          variant="secondary"
          type="button"
          disabled={busy}
          onClick={() => void run(() => exportUsersCsv(query))}
        >
          CSV indir
        </Button>
      </form>

      {users && users.length === 0 && (
        <p className="py-4 text-center text-body-sm text-muted-foreground">
          Filtreye uyan kullanıcı yok.
        </p>
      )}

      <ul>
        {(users ?? []).map((u) => {
          const isSelf = user?.id === u.id;
          const expanded = open === u.id;
          return (
            <li
              key={u.id}
              className="border-b border-border py-2 last:border-0"
            >
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : u.id)}
                  aria-expanded={expanded}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-caption font-medium text-foreground">
                    @{u.username}
                    {u.displayName && (
                      <span className="text-muted-foreground">
                        {' '}
                        · {u.displayName}
                      </span>
                    )}
                    {isSelf && (
                      <span className="ml-2 text-meta text-primary">(sen)</span>
                    )}
                  </span>
                  <span className="tabular mt-0.5 block text-meta text-faint">
                    {new Date(u.createdAt).toLocaleDateString('tr-TR')}
                    {u.city && ` · ${u.city}`}
                    {u.photoCount > 0 && ` · ${u.photoCount} fotoğraf`}
                  </span>
                </button>

                <span className="flex flex-wrap gap-1">
                  {/* Durum rozeti YALNIZCA aktif olmayanlarda. Herkeste
                      "Aktif" yazsaydı göz onu okumayı bırakır ve asıl
                      önemli olan üç satır kalabalıkta kaybolurdu. */}
                  {u.status !== 'active' && (
                    <Badge tone={u.status === 'banned' ? 'danger' : 'warning'}>
                      {accountStatusLabels[u.status]}
                      {u.status === 'suspended' &&
                        (isWriteAllowed(u)
                          ? ' · süresi doldu'
                          : u.suspendedUntil
                            ? ` · ${new Date(u.suspendedUntil).toLocaleDateString('tr-TR')}`
                            : ' · süresiz')}
                    </Badge>
                  )}
                  {u.roles.length === 0 && <Badge>Üye</Badge>}
                  {u.roles.map((r) => (
                    <Badge
                      key={r}
                      tone={
                        r === 'admin'
                          ? 'danger'
                          : r === 'moderator'
                            ? 'warning'
                            : 'muted'
                      }
                    >
                      {roleLabels[r]}
                    </Badge>
                  ))}
                  {u.membership !== 'none' && (
                    <Badge tone="cold">{membershipLabels[u.membership]}</Badge>
                  )}
                </span>
              </div>

              {expanded && (
                <div className="mt-2 space-y-3 rounded-card border border-border bg-surface-2 p-3">
                  <div>
                    <p className="label mb-1.5">Ana statü</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        ['standard', 'Standart kullanıcı'],
                        ['moderator', 'Moderatör'],
                        ['admin', 'Admin'],
                      ].map(([status, label]) => {
                        const active =
                          status === 'admin'
                            ? u.roles.includes('admin')
                            : status === 'moderator'
                              ? !u.roles.includes('admin') &&
                                u.roles.includes('moderator')
                              : !u.roles.includes('admin') &&
                                !u.roles.includes('moderator');
                        return (
                          <button
                            key={status}
                            type="button"
                            disabled={busy || active}
                            onClick={() =>
                              void run(() =>
                                setPrimaryStatus(
                                  u.id,
                                  status as 'standard' | 'moderator' | 'admin'
                                )
                              )
                            }
                            className={cn(
                              'h-8 rounded-card border px-2.5 text-meta font-medium transition-colors disabled:opacity-50',
                              active
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
                            )}
                          >
                            {active ? '✓ ' : ''}
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-1.5 text-meta text-faint">
                      Ana statü standart/moderatör/admin ayrımını yönetir;
                      aşağıdaki roller özel yetkiler için korunur.
                    </p>
                  </div>

                  <div>
                    <p className="label mb-1.5">Roller</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ROLES.map((r) => {
                        const has = u.roles.includes(r);
                        return (
                          <button
                            key={r}
                            type="button"
                            disabled={busy}
                            title={roleDescriptions[r]}
                            onClick={() =>
                              void run(() =>
                                has ? revokeRole(u.id, r) : grantRole(u.id, r)
                              )
                            }
                            className={cn(
                              'h-8 rounded-card border px-2.5 text-meta font-medium transition-colors disabled:opacity-50',
                              has
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
                            )}
                          >
                            {has ? '✓ ' : '+ '}
                            {roleLabels[r]}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-1.5 text-meta text-faint">
                      Rolün ne açtığını görmek için üzerine gelin. Son yönetici
                      rolü alınamaz.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-end gap-2">
                    <label className="block">
                      <span className="label mb-1 block">Üyelik</span>
                      <Select
                        value={u.membership}
                        disabled={busy}
                        onChange={(e) =>
                          void run(() =>
                            setMembership(
                              u.id,
                              e.target.value as MembershipStatus
                            )
                          )
                        }
                        className="h-8 text-meta"
                      >
                        {MEMBERSHIP_STATUSES.map((m) => (
                          <option key={m} value={m}>
                            {membershipLabels[m]}
                          </option>
                        ))}
                      </Select>
                    </label>
                    {u.membershipEnds && (
                      <span className="tabular pb-1.5 text-meta text-faint">
                        bitiş:{' '}
                        {new Date(u.membershipEnds).toLocaleDateString('tr-TR')}
                      </span>
                    )}

                    {/*
                      TEST PREMIUM — §12.2 "admin test kullanıcılarına
                      kontrollü Premium entitlement verebilmelidir".

                      Yukarıdaki açılır liste üyelik DURUMUNU değiştiriyor;
                      bu düğme farklı bir şey yapıyor ve ayrı durmasının
                      sebebi o: 30 GÜNLÜK bir süre koyuyor, kaydı
                      `provider='test'` diye işaretliyor ve denetim
                      kaydına yazıyor.

                      Süre zorunlu çünkü süresiz bir test premium'u,
                      unutulduğunda ücretsiz kalıcı premium olur.
                      İşaret zorunlu çünkü ödeme sağlayıcısı bağlandığında
                      gerçek abonelikleri bunlardan ayırmak gerekecek.
                    */}
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        /* `run` void bekliyor; dönen bitiş tarihi
                           listenin tazelenmesiyle zaten görünüyor. */
                        void run(async () => {
                          await grantTestPremium(u.id, 30);
                        })
                      }
                    >
                      Test premium (30 gün)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      disabled={busy}
                      onClick={() => void run(() => revokeTestPremium(u.id))}
                    >
                      Test premiumi geri al
                    </Button>
                  </div>

                  <AccountStatusSection
                    user={u}
                    busy={busy}
                    isSelf={isSelf}
                    onApply={run}
                  />

                  <UserAuditTrail userId={u.id} />

                  {/*
                    KULLANICI SİLME DÜĞMESİ YOK — sebebi yazılı, yoksa
                    "unutulmuş" sanılıp eklenir.
                  */}
                  <p className="text-meta leading-relaxed text-faint">
                    Hesap silme bu ekrandan yapılmaz: talep kullanıcıdan gelir
                    (aşağıdaki liste). Geri alınabilir durdurma için yukarıdaki
                    askı/yasak aksiyonlarını kullanın.
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/*
        SAYFALAMA yalnızca birden çok sayfa varsa çiziliyor. Tek sayfalık
        listede "1/1" ve iki kapalı düğme göstermek, kullanıcıya olmayan
        bir mekanizmayı öğretmek olurdu.
      */}
      {sayfaSayisi > 1 && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
          <Button
            size="sm"
            variant="ghost"
            type="button"
            disabled={busy || sayfa === 0}
            onClick={() => setQuery((q) => ({ ...q, page: sayfa - 1 }))}
          >
            ← Önceki
          </Button>
          <span className="tabular text-meta text-muted-foreground">
            {sayfa * USER_PAGE_SIZE + 1}–
            {Math.min((sayfa + 1) * USER_PAGE_SIZE, total)} / {total}
          </span>
          <Button
            size="sm"
            variant="ghost"
            type="button"
            disabled={busy || sayfa + 1 >= sayfaSayisi}
            onClick={() => setQuery((q) => ({ ...q, page: sayfa + 1 }))}
          >
            Sonraki →
          </Button>
        </div>
      )}

      {/* ── KVKK silme talepleri ── */}
      <div className="mt-4 border-t border-border pt-3">
        <p className="label mb-1.5">Hesap silme talepleri (KVKK)</p>
        {requests.length === 0 ? (
          <p className="text-meta text-faint">Bekleyen talep yok.</p>
        ) : (
          <ul className="space-y-1">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-baseline gap-x-2 rounded-card border border-warm/30 bg-warm/8 px-3 py-2 text-meta"
              >
                <span className="font-medium text-foreground">
                  {r.username ? `@${r.username}` : r.userId.slice(0, 8)}
                </span>
                <span className="text-muted-foreground">
                  {new Date(r.requestedAt).toLocaleDateString('tr-TR')}{' '}
                  tarihinde talep etti
                </span>
                <Badge tone="warning">{r.status}</Badge>
                {r.scheduledFor && (
                  <span className="tabular text-faint">
                    planlanan:{' '}
                    {new Date(r.scheduledFor).toLocaleDateString('tr-TR')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}

/**
 * HESAP DURUMU BÖLÜMÜ.
 *
 * ══════════════════════════════════════════════════════════════════════
 * GEREKÇE FORMDA, ONAY DİYALOĞUNDA DEĞİL
 *
 * Belge "onay diyaloğu + sebep alanı" istiyor. Sebebi forma koyup
 * düğmeyi sebep yazılana kadar kapalı tutmak aynı korumayı veriyor ve
 * bir adım eksiltiyor: yönetici gerekçeyi zaten yazmak zorunda, üstüne
 * bir de "emin misiniz?" penceresi kapatmak zorunda kalmıyor.
 *
 * Tek istisna YASAKLAMA: orada ikinci bir onay var, çünkü yasak
 * kullanıcının public profilini ve içeriklerini anında görünmez yapıyor
 * ve yanlış satıra basmanın bedeli görünür.
 *
 * ══════════════════════════════════════════════════════════════════════
 * KENDİNİ ASKIYA ALAMAZSIN
 *
 * Yönetici kendi `admin` rolünü verebiliyor/alabiliyor (devretme
 * senaryosu) ama kendi hesabını askıya alması bir işe yaramaz: RLS
 * yöneticiye zaten muafiyet tanımıyor, yalnızca `is_account_active`
 * kontrolü var ve o kendi satırına da bakar. Sonuç, yöneticinin kendini
 * yazamaz hâle getirmesi olurdu. Düğme kapalı.
 */
function AccountStatusSection({
  user,
  busy,
  isSelf,
  onApply,
}: {
  user: AdminUser;
  busy: boolean;
  isSelf: boolean;
  onApply: (action: () => Promise<void>) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [days, setDays] = useState('7');
  const [note, setNote] = useState(user.adminNote ?? '');
  const [confirmBan, setConfirmBan] = useState(false);

  const reasonOk = reason.trim().length >= 3;

  /** Süreli askı bitişi. "0" seçildiğinde süresiz. */
  function until(): string | null {
    const n = Number(days);
    if (!n) return null;
    return new Date(Date.now() + n * 86400000).toISOString();
  }

  function apply(status: AccountStatus) {
    return onApply(async () => {
      await setAccountStatus(user.id, {
        status,
        reason,
        until: status === 'suspended' ? until() : null,
      });
      setReason('');
      setConfirmBan(false);
    });
  }

  return (
    <div className="rounded-card border border-border bg-surface-1 p-3">
      <p className="label mb-1.5">Hesap durumu</p>

      <p className="mb-2 text-meta leading-relaxed text-faint">
        Şu an:{' '}
        <strong className="text-foreground">
          {accountStatusLabels[user.status]}
        </strong>{' '}
        — {accountStatusDescriptions[user.status]}
        {user.status === 'suspended' && user.suspendedUntil && (
          <>
            {' '}
            Bitiş:{' '}
            <span className="tabular">
              {new Date(user.suspendedUntil).toLocaleString('tr-TR')}
            </span>
            {isWriteAllowed(user) && ' (süresi doldu, yazabiliyor)'}
          </>
        )}
        {user.statusReason && (
          <>
            {' '}
            Gerekçe: <em className="text-muted-foreground">{user.statusReason}</em>
          </>
        )}
      </p>

      {isSelf ? (
        <p className="text-meta text-warning">
          Kendi hesabınızın durumunu değiştiremezsiniz.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-[12rem] flex-1">
              <span className="label mb-1 block">
                Gerekçe (kullanıcıya gösterilir)
              </span>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Örn. tekrarlanan telif ihlali"
                className="h-8 w-full text-meta"
              />
            </label>
            <label>
              <span className="label mb-1 block">Askı süresi</span>
              <Select
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="h-8 text-meta"
              >
                <option value="3">3 gün</option>
                <option value="7">7 gün</option>
                <option value="30">30 gün</option>
                <option value="0">Süresiz</option>
              </Select>
            </label>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {ACCOUNT_STATUSES.filter((s) => s !== 'deactivated').map((s) => {
              const current = user.status === s;
              const ban = s === 'banned';
              return (
                <Button
                  key={s}
                  type="button"
                  size="sm"
                  variant={ban ? 'danger' : s === 'active' ? 'secondary' : 'ghost'}
                  disabled={busy || current || !reasonOk}
                  onClick={() => {
                    if (ban && !confirmBan) {
                      setConfirmBan(true);
                      return;
                    }
                    void apply(s);
                  }}
                >
                  {current ? '✓ ' : ''}
                  {ban && confirmBan ? 'Yasağı onayla' : accountStatusLabels[s]}
                </Button>
              );
            })}
          </div>

          {!reasonOk && (
            <p className="mt-1.5 text-meta text-faint">
              Aksiyonlar gerekçe yazılınca açılır — bu metin kullanıcıya
              gösterilecek.
            </p>
          )}
          {confirmBan && (
            <p className="mt-1.5 text-meta text-danger">
              Yasak, kullanıcının profilini ve içeriklerini public
              yüzeylerden düşürür. Onaylamak için tekrar basın.
            </p>
          )}
        </>
      )}

      {/* Dahili not — kullanıcıya GÖSTERİLMEZ, gerekçeyle karıştırılmasın
          diye ayrı kutuda ve etiketi bunu söylüyor. */}
      <div className="mt-3 border-t border-border pt-2">
        <label className="block">
          <span className="label mb-1 block">
            Dahili not (kullanıcıya gösterilmez)
          </span>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Yalnızca yönetim görür"
            className="h-8 w-full text-meta"
          />
        </label>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="mt-1.5"
          disabled={busy || note === (user.adminNote ?? '')}
          onClick={() => void onApply(() => setAdminNote(user.id, note))}
        >
          Notu kaydet
        </Button>
      </div>
    </div>
  );
}

/**
 * KULLANICI DENETİM GEÇMİŞİ (Görev 1.4/7).
 *
 * ══════════════════════════════════════════════════════════════════════
 * AÇILINCA YÜKLENİYOR
 *
 * Liste 50 satır çiziyor; her satır açılışta kendi denetim kaydını
 * çekseydi sayfa başına 50 ek sorgu olurdu ve bunların 49'u hiç
 * okunmayacaktı. Bileşen yalnızca satır AÇILDIĞINDA monte ediliyor,
 * yani sorgu da o zaman gidiyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * HAM `action` KODU DEĞİL, TÜRKÇE KARŞILIĞI
 *
 * `user.status_change` bir yöneticiye hiçbir şey söylemiyor. Bilinmeyen
 * kod olduğu gibi gösteriliyor — sözlükte olmayan yeni bir eylem
 * eklendiğinde satır boş görünmesin.
 */
const AUDIT_LABELS: Record<string, string> = {
  'user.status_change': 'Hesap durumu değişti',
  'user.username_change': 'Kullanıcı adı değişti',
  'user.role_grant': 'Rol verildi',
  'user.role_revoke': 'Rol alındı',
  'users.export': 'Kullanıcı listesi dışa aktarıldı',
};

function UserAuditTrail({ userId }: { userId: string }) {
  const [rows, setRows] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let iptal = false;
    fetchUserAudit(userId)
      .then((r) => {
        if (!iptal) setRows(r);
      })
      .catch((e: unknown) => {
        if (!iptal) {
          setError(e instanceof Error ? e.message : 'Denetim kaydı okunamadı');
        }
      });
    return () => {
      iptal = true;
    };
  }, [userId]);

  if (error) {
    return <p className="text-meta text-warning">{error}</p>;
  }
  if (!rows) {
    return <p className="text-meta text-faint">Denetim kaydı okunuyor…</p>;
  }
  if (rows.length === 0) {
    return (
      <p className="text-meta text-faint">
        Bu kullanıcı için denetim kaydı yok.
      </p>
    );
  }

  return (
    <div>
      <p className="label mb-1.5">Denetim kaydı (son {rows.length})</p>
      <ul className="space-y-1">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-baseline gap-x-2 rounded-card border border-border bg-surface-1 px-2.5 py-1.5 text-meta"
          >
            <span className="tabular text-faint">
              {new Date(row.createdAt).toLocaleString('tr-TR')}
            </span>
            <span className="text-foreground">
              {AUDIT_LABELS[row.action] ?? row.action}
            </span>
            {/*
              Detay jsonb; şeması eyleme göre değişiyor. Anahtar/değer
              olarak dökmek, her eylem için ayrı bir gösterim yazmaktan
              hem kısa hem de yeni eylemlerde kendiliğinden çalışıyor.
            */}
            {Object.entries(row.detail).map(([k, v]) => (
              <span key={k} className="text-muted-foreground">
                {k}: {v === null ? '—' : String(v)}
              </span>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

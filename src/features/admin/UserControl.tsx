import { useCallback, useEffect, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/features/auth/AuthContext';
import {
  fetchUsers,
  fetchDeletionRequests,
  grantRole,
  revokeRole,
  setMembership,
  membershipLabels,
  roleDescriptions,
  roleLabels,
  ROLES,
  MEMBERSHIP_STATUSES,
  type AdminUser,
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
 * geri dönüşü olmayan bir kayıp demekti. Yönetici bir hesabı
 * durduracaksa rollerini alır ve içeriğini arşivler — ikisi de geri
 * alınabilir.
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
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(
    (term: string) => {
      setError(null);
      fetchUsers(term)
        .then(setUsers)
        .catch((e: unknown) =>
          setError(e instanceof Error ? e.message : 'Kullanıcılar okunamadı')
        );
      fetchDeletionRequests()
        .then(setRequests)
        .catch(() => {
          /* Silme talepleri okunamazsa kullanıcı listesi yine çalışsın —
             ikisi ayrı yetki ve ayrı tablo. */
        });
    },
    []
  );

  useEffect(() => load(''), [load]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      load(search);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem uygulanamadı');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Kullanıcılar"
      status={users ? `${users.length} kayıt` : 'okunuyor…'}
    >
      <p className="mb-3 text-meta leading-relaxed text-muted-foreground">
        Yetki veritabanında zorlanıyor: bu ekrandaki düğmeler yalnızca
        yöneticinin çağırabildiği işlemleri gösteriyor.{' '}
        <strong className="text-foreground">E-posta adresleri panelde
        görünmez</strong> — kimlik tablosu API'ye hiç açılmadı.
      </p>

      {error && <Alert className="mb-3">{error}</Alert>}

      <form
        className="mb-3 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load(search);
        }}
      >
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Kullanıcı adı ya da görünen ad"
          className="h-9 max-w-xs flex-1 text-[12px]"
          aria-label="Kullanıcı ara"
        />
        <Button size="sm" type="submit" disabled={busy}>
          Ara
        </Button>
        {search && (
          <Button
            size="sm"
            variant="ghost"
            type="button"
            disabled={busy}
            onClick={() => {
              setSearch('');
              load('');
            }}
          >
            Temizle
          </Button>
        )}
      </form>

      {users && users.length === 0 && (
        <p className="py-4 text-center text-body-sm text-muted-foreground">
          Eşleşen kullanıcı yok.
        </p>
      )}

      <ul>
        {(users ?? []).map((u) => {
          const isSelf = user?.id === u.id;
          const expanded = open === u.id;
          return (
            <li key={u.id} className="border-b border-border py-2 last:border-0">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : u.id)}
                  aria-expanded={expanded}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-[12.5px] font-medium text-foreground">
                    @{u.username}
                    {u.displayName && (
                      <span className="text-muted-foreground">
                        {' '}
                        · {u.displayName}
                      </span>
                    )}
                    {isSelf && (
                      <span className="ml-2 text-meta text-primary">
                        (sen)
                      </span>
                    )}
                  </span>
                  <span className="tabular mt-0.5 block text-meta text-faint">
                    {new Date(u.createdAt).toLocaleDateString('tr-TR')}
                    {u.city && ` · ${u.city}`}
                    {u.photoCount > 0 && ` · ${u.photoCount} fotoğraf`}
                  </span>
                </button>

                <span className="flex flex-wrap gap-1">
                  {u.roles.length === 0 && <Badge>Üye</Badge>}
                  {u.roles.map((r) => (
                    <Badge
                      key={r}
                      tone={r === 'admin' ? 'danger' : r === 'moderator' ? 'warning' : 'muted'}
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
                        className="h-8 text-[12px]"
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
                  </div>

                  {/*
                    KULLANICI SİLME DÜĞMESİ YOK — sebebi yazılı, yoksa
                    "unutulmuş" sanılıp eklenir.
                  */}
                  <p className="text-meta leading-relaxed text-faint">
                    Hesap silme bu ekrandan yapılmaz: talep kullanıcıdan gelir
                    (aşağıdaki liste). Bir hesabı durdurmak için rollerini alın
                    ve içeriğini arşivleyin — ikisi de geri alınabilir.
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>

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
                  {new Date(r.requestedAt).toLocaleDateString('tr-TR')} tarihinde
                  talep etti
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

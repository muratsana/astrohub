import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel, SpecList, SpecRow } from '@/components/ui/Panel';
import { Readout } from '@/components/ui/Readout';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageMeta } from '@/components/seo/PageMeta';
import { useAuth } from '@/features/auth/AuthContext';
import { useRoles, roleLabels } from './useRoles';
import { BroadcastControl } from './BroadcastControl';
import {
  fetchQueue,
  resolveItem,
  targetLabels,
  statusLabels,
  reasonLabels,
  type ModerationItem,
  type ModerationStatus,
  type QueueResult,
} from './moderation';
import { cn } from '@/lib/cn';

/**
 * YÖNETİM PANELİ (§13).
 *
 * YETKİ NEREDE ZORLANIYOR: veritabanında. Bu sayfadaki rol kontrolü
 * kullanıcıyı boş bir ekranla baş başa bırakmamak içindir; yetkisiz biri
 * adres çubuğuna `/admin` yazsa bile `moderation_queue` sorgusu RLS
 * yüzünden boş döner. İstemci kontrolünü güvenlik sınırı sanmak, bu tür
 * panellerde en sık yapılan hatadır — bu yüzden ekranda da yazıyor.
 *
 * Sayfa dört durumu ayrı ayrı karşılar ve hiçbirini diğerinin arkasına
 * saklamaz: kurulum yok / giriş yok / yetki yok / hazır. "Bir şeyler ters
 * gitti" demek, dördünü tek kutuya tıkıp kullanıcıyı çıkmazda bırakmaktır.
 */

const statusTone: Record<ModerationStatus, 'muted' | 'primary' | 'success' | 'danger' | 'warning'> = {
  pending: 'primary',
  in_review: 'warning',
  approved: 'success',
  rejected: 'danger',
  escalated: 'warning',
};

export function AdminPage() {
  const { user, configured, loading } = useAuth();
  const roles = useRoles();

  const [filter, setFilter] = useState<ModerationStatus | 'hepsi'>('pending');
  const [queue, setQueue] = useState<QueueResult | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!roles.canAccessAdmin) return;
    setQueueError(null);
    fetchQueue(filter === 'hepsi' ? undefined : filter)
      .then(setQueue)
      .catch((error: unknown) =>
        setQueueError(error instanceof Error ? error.message : 'Kuyruk okunamadı')
      );
  }, [filter, roles.canAccessAdmin]);

  useEffect(load, [load]);

  const act = async (item: ModerationItem, status: ModerationStatus) => {
    if (!user) return;
    setBusy(true);
    try {
      await resolveItem(item.id, status, user.id);
      load();
    } catch (error) {
      setQueueError(
        error instanceof Error ? error.message : 'İşlem uygulanamadı'
      );
    } finally {
      setBusy(false);
    }
  };

  const header = (
    <PageHeader
      breadcrumb={[{ label: 'Ana Sayfa', to: '/' }, { label: 'Yönetim' }]}
      title="Yönetim Paneli"
      description="Moderasyon kuyruğu ve içerik yönetimi. Yetki veritabanındaki rol tablosundan okunur; bu ekrandaki kontrol yalnızca arayüz içindir."
      actions={
        roles.roles.length > 0 && (
          <>
            {roles.roles.map((role) => (
              <Badge key={role} tone={role === 'admin' ? 'primary' : 'cold'}>
                {roleLabels[role]}
              </Badge>
            ))}
          </>
        )
      }
    />
  );

  /* ── Durum 1: Supabase kurulu değil ── */
  if (!configured || roles.status === 'unconfigured') {
    return (
      <Shell header={header}>
        <EmptyState
          message="Veritabanı bağlantısı yapılandırılmamış"
          hint="Yönetim paneli Supabase'e bağlanır. VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY tanımlandığında kuyruk buradan okunacak."
        />
      </Shell>
    );
  }

  /* ── Durum 2: oturum yok ── */
  if (loading || roles.status === 'loading') {
    return (
      <Shell header={header}>
        <p className="py-10 text-center text-[12px] text-muted-foreground" role="status">
          Yetkiler kontrol ediliyor…
        </p>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell header={header}>
        <EmptyState
          message="Bu sayfa için giriş gerekli"
          hint="Yönetim paneli yalnızca moderatör ve yönetici rolüne sahip hesaplara açıktır."
          action={
            <ButtonLink to="/giris" size="sm">
              Giriş Yap
            </ButtonLink>
          }
        />
      </Shell>
    );
  }

  /* ── Durum 3: yetki yok ── */
  if (!roles.canAccessAdmin) {
    return (
      <Shell header={header}>
        <EmptyState
          message="Bu hesapta yönetim yetkisi yok"
          hint="Moderasyon kuyruğuna yalnızca moderatör ve yönetici rolleri erişebilir. Yetki talebi için topluluk yönetimiyle iletişime geçin."
          action={
            <ButtonLink to="/panel" size="sm" variant="secondary">
              Üye Paneli
            </ButtonLink>
          }
        />
        {roles.error && (
          <p className="mt-3 text-center text-[11px] text-danger">{roles.error}</p>
        )}
      </Shell>
    );
  }

  /* ── Durum 4: hazır ── */
  const counts = queue?.counts;

  return (
    <Shell header={header}>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {(
          [
            'pending',
            'in_review',
            'escalated',
            'approved',
            'rejected',
          ] as ModerationStatus[]
        ).map((status) => (
          <Readout
            key={status}
            label={statusLabels[status]}
            value={counts ? counts[status] : '—'}
            tone={status === 'pending' ? 'primary' : 'muted'}
          />
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="tabular label" role="status">
          {queue ? `${queue.items.length} kayıt` : 'yükleniyor…'}
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor="queue-filter" className="sr-only">
            Durum filtresi
          </label>
          <Select
            id="queue-filter"
            value={filter}
            onChange={(e) =>
              setFilter(e.target.value as ModerationStatus | 'hepsi')
            }
            className="h-8 w-auto text-[11px]"
          >
            <option value="hepsi">Tüm durumlar</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Button size="sm" variant="secondary" onClick={load} disabled={busy}>
            Yenile
          </Button>
        </div>
      </div>

      {queueError && (
        <p className="mb-3 rounded-card border border-danger/40 bg-surface-1 px-3 py-2 text-[11.5px] text-danger">
          {queueError}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Panel title="Kuyruk" status={filter === 'hepsi' ? 'tümü' : statusLabels[filter]}>
          {!queue ? (
            <p className="py-6 text-center text-[12px] text-muted-foreground">
              Kuyruk okunuyor…
            </p>
          ) : queue.items.length === 0 ? (
            <p className="py-6 text-center text-[12px] leading-relaxed text-muted-foreground">
              Bu filtrede kayıt yok. Kuyruk boşsa moderasyon bekleyen içerik
              yok demektir; yetkiniz eksikse de aynı görünür — RLS yetkisiz
              sorguya boş sonuç döndürür.
            </p>
          ) : (
            <ul>
              {queue.items.map((item) => (
                <li
                  key={item.id}
                  className="border-b border-border py-3 first:pt-0 last:border-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge tone={statusTone[item.status]}>
                        {statusLabels[item.status]}
                      </Badge>
                      <span className="text-[12.5px] font-medium text-foreground">
                        {targetLabels[item.target_type]}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {reasonLabels[item.reason]}
                      </span>
                    </span>
                    <span className="tabular text-[10.5px] text-faint">
                      {new Date(item.created_at).toLocaleString('tr-TR')}
                    </span>
                  </div>

                  {item.note && (
                    <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                      {item.note}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {item.target_path && (
                      <Link
                        to={item.target_path}
                        className="text-[11px] text-primary hover:underline"
                      >
                        İçeriğe git →
                      </Link>
                    )}
                    {item.status !== 'approved' && item.status !== 'rejected' && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => void act(item, 'in_review')}
                        >
                          Üzerime al
                        </Button>
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => void act(item, 'approved')}
                        >
                          İçerik kalsın
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={busy}
                          onClick={() => void act(item, 'rejected')}
                        >
                          Kaldır
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel title="Yetki ve sınırlar">
            <SpecList>
              <SpecRow
                label="Rolleriniz"
                value={
                  roles.roles.map((r) => roleLabels[r]).join(', ') || 'yok'
                }
                tone="primary"
              />
              <SpecRow
                label="Kuyruk okuma"
                value={roles.canAccessAdmin ? 'açık' : 'kapalı'}
              />
              <SpecRow
                label="Kayıt silme"
                value={roles.isAdmin ? 'açık (yönetici)' : 'kapalı'}
                tone="muted"
              />
              <SpecRow
                label="Denetim günlüğü"
                value={roles.isAdmin ? 'okunabilir' : 'yalnızca yönetici'}
                tone="muted"
              />
            </SpecList>
            <p className="mt-3 text-[10px] leading-snug text-faint">
              Bu satırlar RLS politikalarının aynasıdır. Arayüz bir düğmeyi
              gizlese bile asıl engel veritabanındadır; tersi de doğru —
              gizlenmiş bir düğme yetki vermez.
            </p>
          </Panel>

          <Panel title="Kuyruk nasıl doluyor?">
            <p className="text-[11.5px] leading-relaxed text-muted-foreground">
              Kayıtlar kullanıcı raporlarından ve otomatik kontrollerden gelir.
              Rapor eden kullanıcı kendi raporunu kuyrukta göremez: raporlayanın
              kuyruğu izleyebilmesi, hedef kullanıcının kimin şikâyet ettiğini
              çıkarmasına ve misilleme zincirine kapı açar. Sonuç, bildirim
              kanalından iletilir.
            </p>
          </Panel>
        </div>
      </div>

      {/*
        Yayın kontrolü kuyruğun altında: moderasyon günlük iş, yayın
        programı ise seyrek bir eylem. Sık kullanılanı üstte tutmak,
        panelin her açılışında aşağı kaydırmayı gerektirmiyor.
      */}
      <div className="mt-4">
        <BroadcastControl />
      </div>
    </Shell>
  );
}

function Shell({
  header,
  children,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <PageMeta
        title="Yönetim Paneli"
        description="Moderasyon kuyruğu ve içerik yönetimi."
        noIndex
      />
      <Container className={cn('py-8 sm:py-10')}>
        {header}
        {children}
      </Container>
    </>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
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
import { ReminderControl } from './ReminderControl';
import { RadioControl } from './RadioControl';
import { TvControl } from './TvControl';
import { CatalogControl } from './CatalogControl';
import { SiteControl } from './SiteControl';
import { FeaturedControl } from './FeaturedControl';
import { ContentControl } from './ContentControl';
import { ClubControl } from './ClubControl';
import { EquipmentDataControl } from './EquipmentDataControl';
import { SpecImportControl } from './SpecImportControl';
import { UserControl } from './UserControl';
import { RecordsControl, AuditControl } from './RecordsControl';
import { CommentsControl } from './CommentsControl';
import { ForumCategories } from './ForumCategories';
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

  const [params, setParams] = useSearchParams();
  const bolumParam = params.get('bolum');
  const bolum: BolumId = isBolum(bolumParam) ? bolumParam : 'ozet';

  /* `replace`: sekme gezinmesi geri yığınını doldurmamalı — geri tuşu
     panelden çıkmalı, önceki sekmeye değil. */
  const setBolum = (id: BolumId) =>
    setParams(id === 'ozet' ? {} : { bolum: id }, { replace: true });

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
        <p className="py-10 text-center text-meta text-muted-foreground" role="status">
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
          <p className="mt-3 text-center text-meta text-danger">{roles.error}</p>
        )}
      </Shell>
    );
  }

  /* ── Durum 4: hazır ── */
  const counts = queue?.counts;

  return (
    <Shell header={header}>
      <BolumSekmeleri aktif={bolum} onChange={setBolum} />

      {bolum === 'ozet' && (
        <AdminOverview
          counts={counts}
          roleNames={roles.roles.map((r) => roleLabels[r])}
          isAdmin={roles.isAdmin}
          onChange={setBolum}
        />
      )}

      {bolum === 'moderasyon' && (
        <>
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
            className="h-8 w-auto text-meta"
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
        <p className="mb-3 rounded-card border border-danger/40 bg-surface-1 px-3 py-2 text-body-sm text-danger">
          {queueError}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Panel title="Kuyruk" status={filter === 'hepsi' ? 'tümü' : statusLabels[filter]}>
          {!queue ? (
            <p className="py-6 text-center text-meta text-muted-foreground">
              Kuyruk okunuyor…
            </p>
          ) : queue.items.length === 0 ? (
            <p className="py-6 text-center text-meta leading-relaxed text-muted-foreground">
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
                      <span className="text-caption font-medium text-foreground">
                        {targetLabels[item.target_type]}
                      </span>
                      <span className="text-meta text-muted-foreground">
                        {reasonLabels[item.reason]}
                      </span>
                    </span>
                    <span className="tabular text-meta text-faint">
                      {new Date(item.created_at).toLocaleString('tr-TR')}
                    </span>
                  </div>

                  {item.note && (
                    <p className="mt-1 text-body-sm leading-relaxed text-muted-foreground">
                      {item.note}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {item.target_path && (
                      <Link
                        to={item.target_path}
                        className="text-meta text-primary hover:underline"
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
            <p className="mt-3 text-meta leading-snug text-faint">
              Bu satırlar RLS politikalarının aynasıdır. Arayüz bir düğmeyi
              gizlese bile asıl engel veritabanındadır; tersi de doğru —
              gizlenmiş bir düğme yetki vermez.
            </p>
          </Panel>

          <Panel title="Kuyruk nasıl doluyor?">
            <p className="text-body-sm leading-relaxed text-muted-foreground">
              Kayıtlar kullanıcı raporlarından ve otomatik kontrollerden gelir.
              Rapor eden kullanıcı kendi raporunu kuyrukta göremez: raporlayanın
              kuyruğu izleyebilmesi, hedef kullanıcının kimin şikâyet ettiğini
              çıkarmasına ve misilleme zincirine kapı açar. Sonuç, bildirim
              kanalından iletilir.
            </p>
          </Panel>
        </div>
      </div>

        </>
      )}

      {/*
        İÇERİK — sitenin okunan/yayımlanan malzemesi.

        Haber ve yazılar üstte, kayıtlar altta: önce içerik yazılır,
        sonra yayımlanmış olan denetlenir. Forum konusu bu sekmede YOK,
        kendi bölümünde — aynı kaydı iki yerden yönetmek, biri
        güncellenirken diğerinin eski kalması demekti.
      */}
      {bolum === 'icerik' && (
        <div className="space-y-4">
          <ContentControl canWrite={roles.isAdmin} />
          <RecordsControl kinds={['photo', 'listing', 'event', 'site']} />
          {/* Kulüp dizini burada, "kayıtlar"ın içinde değil: dizin
              EDİTORYAL bir kaynak — sahibi, durumu ve moderasyon kuyruğu
              olan kullanıcı kayıtlarıyla aynı ekrana sıkıştırmak, orada
              anlamı olmayan sütunlar taşımak olurdu. */}
          <ClubControl canWrite={roles.isAdmin} />
          <CommentsControl kinds={['photoComment', 'siteReview']} />
        </div>
      )}

      {/*
        KULLANICILAR — hesaplar ve onlara dokunan her şey.

        Denetim kaydı burada, ayrı bir sekmede değil: "bu rolü kim
        verdi" sorusu her zaman bir kullanıcı satırına bakarken
        soruluyor. Ayrı sekmede olsaydı iki ekran arasında gidip gelmek
        gerekirdi.
      */}
      {bolum === 'kullanicilar' && roles.isAdmin && (
        <div className="space-y-4">
          <UserControl />
          <AuditControl />
        </div>
      )}
      {bolum === 'kullanicilar' && !roles.isAdmin && (
        <Panel title="Kullanıcılar">
          <p className="py-4 text-center text-body-sm text-muted-foreground">
            Kullanıcı yönetimi yalnızca yöneticilere açık. Moderatör
            rolüyle içerik ve forum bölümlerini kullanabilirsiniz.
          </p>
        </Panel>
      )}

      {/*
        FORUM — konu ve gönderi birlikte.

        Tabloya göre bölseydik konu "içerik", gönderi "yorum" sekmesine
        düşerdi; oysa foruma bakan biri ikisini birlikte düşünüyor:
        konuyu kilitlemek mi yoksa tek bir gönderiyi kaldırmak mı
        yeterli, bu karar ikisini yan yana görmeyi gerektiriyor.
      */}
      {bolum === 'forum' && (
        <div className="space-y-4">
          {/* Kategoriler üstte: forumun iskeleti, içerikten önce gelir. */}
          <ForumCategories canWrite={roles.isAdmin} />
          <RecordsControl kinds={['thread']} title="Forum konuları" />
          <CommentsControl kinds={['forumPost']} />
        </div>
      )}

      {/* ANA SAYFA — bugün ne görünsün. */}
      {bolum === 'anasayfa' && <FeaturedControl canWrite={roles.isAdmin} />}

      {/* "Ana sayfa" ile "Site yönetimi" AYRI sekmeler ve ayrı işler:
          ilki hangi İÇERİĞİN öne çıkacağını seçiyor (öne çıkan fotoğraf,
          haber), ikincisi ana sayfanın YAPISINI yönetiyor (modül açık mı,
          hangi sırada, kaç öğe). Tek sekmede birleştirilseydi "bu
          fotoğrafı öne çıkar" ile "galeri modülünü kapat" yan yana
          dururdu ve ikincisi birincisini görünmez kılardı. */}
      {bolum === 'site' && <SiteControl canWrite={roles.isAdmin} />}

      {/* YAYIN — TV ve radyo programı. */}
      {bolum === 'yayin' && <BroadcastControl />}

      {/*
        RADYO — §10.5'in AstroHub'a düşen kısmı.

        AzuraCast panelinin yerine geçmiyor: program takvimi, yayıncı
        künyesi ve canlı duyurusu burada; playlist rotasyonu, mount ve
        bitrate orada. Aynı ayarı iki yerde tutmak, ikisi ayrıştığında
        hangisinin geçerli olduğunu belirsiz bırakırdı.
      */}
      {bolum === 'radyo' && <RadioControl canWrite={roles.isAdmin} />}

      {/*
        TV — §11.3'ün AstroHub'a düşen kısmı.

        Kanal bağlantısı yokken sahte içerik göstermiyor (§11.2 son
        madde) ve senkronizasyon düğmesi hiç görünmüyor: basılınca
        "bağlı değil" diyecek bir düğme, çalışmayan bir kontroldür.
      */}
      {bolum === 'tv' && <TvControl canWrite={roles.isAdmin} />}

      {/*
        HATIRLATMA — sitenin kullanıcılara ne gönderdiği.

        Teslim sayıları, hatalı işler ve yeniden deneme aynı ekranda:
        hatayı görüp yeniden denemek için sekme değiştirmek gerekmiyor.
        Zorunlu duyuru da burada, çünkü o da bir gönderim kanalı.
      */}
      {bolum === 'hatirlatma' && <ReminderControl canWrite={roles.isAdmin} />}

      {/*
        KATALOG — sürüm başına bir kez yapılan işler.

        Üçü aynı sırayla: senkronizasyon neyin geldiğini, rapor neyin
        eksik olduğunu, içe aktarma o eksiği doldurmanın yolunu
        söylüyor.
      */}
      {bolum === 'katalog' && (
        <div className="space-y-4">
          <CatalogControl canWrite={roles.isAdmin} />
          <EquipmentDataControl canWrite={roles.isAdmin} />
          <SpecImportControl canWrite={roles.isAdmin} />
        </div>
      )}

    </Shell>
  );
}

/**
 * SEKMELER — panel konularına göre bölündü.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN SEKME
 *
 * Panel tek bir uzun yığındı ve on bir bölüme çıkmıştı. Bir yöneticinin
 * radyo listesine ulaşması için moderasyon kuyruğunu, içerik kayıtlarını
 * ve kullanıcı listesini geçmesi gerekiyordu — hepsi de o an ilgisiz.
 * Uzun bir sayfada "aşağıda bir yerde" olan şey, pratikte yok gibidir.
 *
 * Gruplama İŞE göre yapıldı, tabloya göre değil: "Forum" sekmesi hem
 * konuyu hem gönderiyi taşıyor çünkü foruma bakan biri ikisini birlikte
 * düşünüyor. Tabloya göre bölseydik aynı iş iki sekmeye dağılırdı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SEKME ADRESTE TAŞINIYOR
 *
 * `?bolum=forum` — üç sebeple:
 *   1. Yenileme sekmeyi kaybetmiyor (moderasyon uzun bir iş, sayfa
 *      yenilenebiliyor),
 *   2. Bağlantı paylaşılabiliyor ("şu kullanıcıya bak" derken),
 *   3. Geri tuşu beklendiği gibi çalışıyor.
 *
 * Bilinmeyen bir değer varsayılana düşüyor; adres çubuğuna elle yazılan
 * bir şey paneli boş bırakmamalı.
 */
const BOLUMLER = [
  { id: 'ozet', label: 'Özet' },
  { id: 'moderasyon', label: 'Moderasyon' },
  { id: 'icerik', label: 'İçerik' },
  { id: 'kullanicilar', label: 'Kullanıcılar' },
  { id: 'forum', label: 'Forum' },
  { id: 'anasayfa', label: 'Ana sayfa' },
  { id: 'site', label: 'Site yönetimi' },
  { id: 'yayin', label: 'Yayın' },
  { id: 'radyo', label: 'Radyo' },
  { id: 'tv', label: 'TV' },
  { id: 'hatirlatma', label: 'Hatırlatma' },
  { id: 'katalog', label: 'Katalog' },
] as const;

type BolumId = (typeof BOLUMLER)[number]['id'];

function isBolum(value: string | null): value is BolumId {
  return BOLUMLER.some((b) => b.id === value);
}

function BolumSekmeleri({
  aktif,
  onChange,
}: {
  aktif: BolumId;
  onChange: (id: BolumId) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Yönetim bölümleri"
      className="mb-4 flex flex-wrap gap-1 border-b border-border"
    >
      {BOLUMLER.map((b) => (
        <button
          key={b.id}
          role="tab"
          aria-selected={aktif === b.id}
          onClick={() => onChange(b.id)}
          className={cn(
            '-mb-px rounded-t-lg border-b-2 px-3.5 py-2.5 text-body-sm font-medium transition-colors',
            aktif === b.id
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}

function AdminOverview({
  counts,
  roleNames,
  isAdmin,
  onChange,
}: {
  counts: QueueResult['counts'] | undefined;
  roleNames: string[];
  isAdmin: boolean;
  onChange: (id: BolumId) => void;
}) {
  const pending = counts?.pending ?? '—';
  const escalated = counts?.escalated ?? '—';
  const approved = counts?.approved ?? '—';
  const rejected = counts?.rejected ?? '—';

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
      <Panel title="Yönetim özeti" status={counts ? 'canlı' : 'yükleniyor…'}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Readout label="Bekleyen" value={pending} tone="primary" />
          <Readout label="Yükseltilen" value={escalated} tone="cold" />
          <Readout label="Onaylanan" value={approved} tone="muted" />
          <Readout label="Reddedilen" value={rejected} tone="muted" />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <OverviewButton
            label="Moderasyon kuyruğu"
            detail="Raporlar ve otomatik kontroller"
            onClick={() => onChange('moderasyon')}
          />
          <OverviewButton
            label="Site yönetimi"
            detail="Menü, hero, modüller ve ayarlar"
            onClick={() => onChange('site')}
          />
          <OverviewButton
            label="Yayın"
            detail="Radyo ve TV yayın akışı"
            onClick={() => onChange('yayin')}
          />
          <OverviewButton
            label="Katalog"
            detail="Hedef ve ekipman verisi"
            onClick={() => onChange('katalog')}
          />
        </div>
      </Panel>

      <Panel title="Yetki durumu">
        <SpecList>
          <SpecRow
            label="Rol"
            value={roleNames.length > 0 ? roleNames.join(', ') : 'yok'}
            tone="primary"
          />
          <SpecRow
            label="Yazma yetkisi"
            value={isAdmin ? 'açık' : 'moderasyonla sınırlı'}
            tone={isAdmin ? 'primary' : 'muted'}
          />
          <SpecRow
            label="Kullanıcı yönetimi"
            value={isAdmin ? 'açık' : 'kapalı'}
            tone="muted"
          />
        </SpecList>
        <p className="mt-3 text-meta leading-relaxed text-muted-foreground">
          Özet ekranı yalnızca var olan panel yüzeylerine kısa yol verir; yetki
          sınırı her işlemde yine veritabanı politikalarıyla uygulanır.
        </p>
      </Panel>
    </div>
  );
}

function OverviewButton({
  label,
  detail,
  onClick,
}: {
  label: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-card border border-border bg-surface-1 px-3.5 py-3 text-left transition-colors hover:border-border-strong hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
    >
      <span className="block text-body-sm font-semibold text-foreground">
        {label}
      </span>
      <span className="mt-0.5 block text-meta text-muted-foreground">
        {detail}
      </span>
    </button>
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

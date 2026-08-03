import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
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
  AlertIcon,
  BookIcon,
  CalendarIcon,
  GridIcon,
  HomeIcon,
  ImageIcon,
  ListIcon,
  MapIcon,
  PlayIcon,
  RadioIcon,
  SearchIcon,
  TagIcon,
  UserIcon,
} from '@/components/ui/icons';
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
  const location = useLocation();
  const navigate = useNavigate();
  const bolum = getBolum(location.pathname, params.get('bolum'));

  const setBolum = (id: BolumId) => {
    const path = BOLUM_PATHS[id];
    if (path) {
      navigate(path, { replace: true });
      return;
    }
    setParams(id === 'ozet' ? {} : { bolum: id }, { replace: true });
  };

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
      <Shell header={header} active={bolum} onChange={setBolum}>
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
      <Shell header={header} active={bolum} onChange={setBolum}>
        <p className="py-10 text-center text-meta text-muted-foreground" role="status">
          Yetkiler kontrol ediliyor…
        </p>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell header={header} active={bolum} onChange={setBolum}>
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
      <Shell header={header} active={bolum} onChange={setBolum}>
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
    <Shell header={header} active={bolum} onChange={setBolum}>
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

      {bolum === 'galeri' && (
        <div className="space-y-4">
          <RecordsControl kinds={['photo']} title="Galeri fotoğrafları" />
          <CommentsControl kinds={['photoComment']} />
        </div>
      )}

      {bolum === 'haberler' && (
        <ContentControl key="haberler" canWrite={roles.isAdmin} initialKind="haber" />
      )}

      {bolum === 'yazilar' && (
        <ContentControl key="yazilar" canWrite={roles.isAdmin} initialKind="yazi" />
      )}

      {bolum === 'etkinlikler' && (
        <RecordsControl kinds={['event']} title="Etkinlikler" />
      )}

      {bolum === 'ilanlar' && (
        <RecordsControl kinds={['listing']} title="İlanlar" />
      )}

      {bolum === 'saha' && (
        <div className="space-y-4">
          <RecordsControl kinds={['site']} title="Saha kayıtları" />
          <CommentsControl kinds={['siteReview']} />
        </div>
      )}

      {bolum === 'araclar' && (
        <div className="space-y-4">
          <CatalogControl canWrite={roles.isAdmin} />
          <EquipmentDataControl canWrite={roles.isAdmin} />
          <SpecImportControl canWrite={roles.isAdmin} />
        </div>
      )}

      {/* "Ana sayfa" ile "Site yönetimi" AYRI sekmeler ve ayrı işler:
          ilki hangi İÇERİĞİN öne çıkacağını seçiyor (öne çıkan fotoğraf,
          haber), ikincisi ana sayfanın YAPISINI yönetiyor (modül açık mı,
          hangi sırada, kaç öğe). Tek sekmede birleştirilseydi "bu
          fotoğrafı öne çıkar" ile "galeri modülünü kapat" yan yana
          dururdu ve ikincisi birincisini görünmez kılardı. */}
      {bolum === 'site' && <SiteControl canWrite={roles.isAdmin} />}

      {bolum === 'kurumsal' && <SiteControl canWrite={roles.isAdmin} />}

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

      {bolum === 'medya' && (
        <Panel title="Medya kütüphanesi" status="PARTIAL">
          <p className="text-body-sm leading-relaxed text-muted-foreground">
            Fotoğraf, içerik ve yayın medya yüzeyleri mevcut modüllerde
            yönetiliyor. Ortak dosya kasası ve orphan raporu için storage
            migration ve servis rolü bağlantısı gerekiyor.
          </p>
        </Panel>
      )}

      {bolum === 'import' && <SpecImportControl canWrite={roles.isAdmin} />}

      {bolum === 'entegrasyonlar' && (
        <Panel title="Entegrasyonlar" status="BLOCKED_EXTERNAL">
          <p className="text-body-sm leading-relaxed text-muted-foreground">
            YouTube OAuth, AzuraCast, CKEditor Import from Word, Apryse ve
            canlı Bortle katmanı için lisans, secret veya harici servis
            bağlantısı olmadan çalışan kontrol eklenmedi.
          </p>
        </Panel>
      )}

      {bolum === 'audit' && <AuditControl />}

      {bolum === 'ayarlar' && (
        <Panel title="Sistem ve ayarlar" status="PARTIAL">
          <p className="text-body-sm leading-relaxed text-muted-foreground">
            Site modül sırası, yayın bayrakları ve içerik ayarları ilgili
            yüzeylerde tutuluyor. Merkezi ayar sayfası için Supabase ayar
            tablosu ve audit migration'ı gerekir.
          </p>
        </Panel>
      )}

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

const ADMIN_NAV = [
  {
    label: 'İçerik',
    items: [
      { id: 'ozet', label: 'Genel Bakış', path: '/admin', icon: HomeIcon },
      { id: 'anasayfa', label: 'Anasayfa', path: '/admin/home', icon: GridIcon },
      { id: 'galeri', label: 'Galeri', path: '/admin/gallery', icon: ImageIcon },
      { id: 'haberler', label: 'Haberler', path: '/admin/news', icon: SearchIcon },
      { id: 'yazilar', label: 'Yazılar', path: '/admin/articles', icon: BookIcon },
      { id: 'forum', label: 'Forum', path: '/admin/forum', icon: ListIcon },
      { id: 'etkinlikler', label: 'Etkinlikler', path: '/admin/events', icon: CalendarIcon },
      { id: 'araclar', label: 'Araçlar', path: '/admin/tools', icon: TagIcon },
      { id: 'ilanlar', label: 'İlanlar', path: '/admin/listings', icon: TagIcon },
      { id: 'saha', label: 'Saha', path: '/admin/sites', icon: MapIcon },
    ],
  },
  {
    label: 'Operasyon',
    items: [
      { id: 'moderasyon', label: 'Moderasyon', path: '/admin/moderation', icon: AlertIcon },
      { id: 'kullanicilar', label: 'Kullanıcılar', path: '/admin/users', icon: UserIcon },
      { id: 'radyo', label: 'Radyo', path: '/admin/radio', icon: RadioIcon },
      { id: 'tv', label: 'TV', path: '/admin/tv', icon: PlayIcon },
      { id: 'kurumsal', label: 'Kurumsal', path: '/admin/corporate', icon: BookIcon },
    ],
  },
  {
    label: 'Sistem',
    items: [
      { id: 'medya', label: 'Medya Kütüphanesi', path: '/admin/media', icon: ImageIcon },
      { id: 'hatirlatma', label: 'Bildirim Merkezi', path: '/admin/notifications', icon: AlertIcon },
      { id: 'import', label: 'İçe Aktarma İşleri', path: '/admin/import-jobs', icon: BookIcon },
      { id: 'entegrasyonlar', label: 'Entegrasyonlar', path: '/admin/integrations', icon: GridIcon },
      { id: 'audit', label: 'Audit Log', path: '/admin/audit', icon: ListIcon },
      { id: 'ayarlar', label: 'Sistem ve Ayarlar', path: '/admin/settings', icon: GridIcon },
    ],
  },
] as const;

type AdminNavItem = (typeof ADMIN_NAV)[number]['items'][number];

const BOLUMLER: readonly AdminNavItem[] = ADMIN_NAV.flatMap(
  (group): readonly AdminNavItem[] => group.items
);

const LEGACY_IDS = ['icerik', 'site', 'yayin', 'katalog'] as const;
type LegacyBolumId = (typeof LEGACY_IDS)[number];
type BolumId = (typeof BOLUMLER)[number]['id'] | LegacyBolumId;

const LEGACY_BOLUM_PATHS: Record<LegacyBolumId, string> = {
  icerik: '/admin/content',
  site: '/admin/site-settings',
  yayin: '/admin/broadcast',
  katalog: '/admin/catalog',
};

const BOLUM_PATHS = {
  ...Object.fromEntries(BOLUMLER.map((b) => [b.id, b.path])),
  ...LEGACY_BOLUM_PATHS,
} as Record<BolumId, string>;

function isBolum(value: string | null): value is BolumId {
  return (
    BOLUMLER.some((b) => b.id === value) ||
    LEGACY_IDS.some((id) => id === value)
  );
}

function getBolum(pathname: string, queryBolum: string | null): BolumId {
  const normalized = pathname.replace(/\/+$/, '');
  const fromPath = Object.entries(BOLUM_PATHS).find(
    ([, path]) => normalized === path
  )?.[0];
  if (fromPath && isBolum(fromPath)) return fromPath;
  return isBolum(queryBolum) ? queryBolum : 'ozet';
}

function AdminSidebar({
  active,
  onChange,
}: {
  active: BolumId;
  onChange: (id: BolumId) => void;
}) {
  return (
    <aside className="rounded-card border border-border-strong bg-surface-1/85 p-2 shadow-overlay lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
      <div className="px-2 py-2">
        <p className="text-caption font-semibold text-foreground">
          AstroHub Yönetim
        </p>
        <p className="mt-0.5 text-meta text-muted-foreground">
          İçerik, yayın ve sistem yüzeyleri
        </p>
      </div>
      <nav aria-label="Yönetim bölümleri" className="mt-1 space-y-3">
        {ADMIN_NAV.map((group) => (
          <div key={group.label}>
            <p className="px-2 pb-1 text-[0.64rem] font-semibold uppercase tracking-[0.08em] text-faint">
              {group.label}
            </p>
            <div className="grid gap-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const selected = active === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={selected ? 'page' : undefined}
                    onClick={() => onChange(item.id)}
                    className={cn(
                      'flex min-h-9 w-full items-center gap-2 rounded-card border px-2.5 text-left text-body-sm font-medium transition-colors',
                      selected
                        ? 'border-primary/55 bg-primary/10 text-primary'
                        : 'border-transparent text-muted-foreground hover:border-border hover:bg-surface-2 hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
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
  active,
  onChange,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
  active: BolumId;
  onChange: (id: BolumId) => void;
}) {
  return (
    <>
      <PageMeta
        title="Yönetim Paneli"
        description="Moderasyon kuyruğu ve içerik yönetimi."
        noIndex
      />
      <Container className={cn('max-w-none py-6 sm:py-8')}>
        <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)]">
          <AdminSidebar active={active} onChange={onChange} />
          <main className="min-w-0">
            <div className="mb-4 rounded-card border border-border bg-background/70 p-3 shadow-overlay">
              {header}
            </div>
            {children}
          </main>
        </div>
      </Container>
    </>
  );
}

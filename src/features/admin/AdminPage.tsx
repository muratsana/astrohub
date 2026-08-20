import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageMeta } from '@/components/seo/PageMeta';
import { useAuth } from '@/features/auth/AuthContext';
import { cn } from '@/lib/cn';
import { IcerikSekmeleri } from './IcerikSekmeleri';
import { UserControl } from './UserControl';
import { RecordsControl, AuditControl } from './RecordsControl';
import { CommentsControl } from './CommentsControl';
import { ForumCategories } from './ForumCategories';
import { FeaturedControl } from './FeaturedControl';
import { SiteControl } from './SiteControl';
import { BroadcastControl } from './BroadcastControl';
import { RadioControl } from './RadioControl';
import { TvControl } from './TvControl';
import { ReminderControl } from './ReminderControl';
import { ModerationQueueControl } from './ModerationQueueControl';
import { CatalogControl } from './CatalogControl';
import { EquipmentDataControl } from './EquipmentDataControl';
import { SpecImportControl } from './SpecImportControl';
import { useRoles } from './useRoles';
import type { EntryKind } from '@/services/content/entries';
import { fetchDashboard, type DashboardStats } from './records';
import type { RecordKind } from './records';
import { formatAdminCount } from './dashboard';
import {
  AlertIcon,
  BellIcon,
  BookIcon,
  CalendarIcon,
  ChatIcon,
  GridIcon,
  HomeIcon,
  ImageIcon,
  ListIcon,
  RadioIcon,
  SparkleIcon,
  TagIcon,
  UsersIcon,
} from '@/components/ui/icons';

type AdminSectionId =
  | 'genel'
  | 'onay'
  | 'kullanicilar'
  | 'icerik'
  | 'moderasyon'
  | 'forum'
  | 'destek'
  | 'hata'
  | 'aktivite'
  | 'link'
  | 'eposta'
  | 'duyuru'
  | 'sayfa'
  | 'ayar';

const navGroups: readonly {
  title?: string;
  items: readonly {
    id: AdminSectionId;
    label: string;
    path: string;
    icon: typeof HomeIcon;
  }[];
}[] = [
  {
    items: [
      { id: 'genel', label: 'Genel Bakış', path: '/admin', icon: HomeIcon },
      {
        id: 'onay',
        label: 'Onay Kuyruğu',
        path: '/admin/onay-kuyrugu',
        icon: GridIcon,
      },
      {
        id: 'kullanicilar',
        label: 'Kullanıcılar',
        path: '/admin/kullanicilar',
        icon: UsersIcon,
      },
      { id: 'icerik', label: 'İçerik', path: '/admin/icerik', icon: BookIcon },
      {
        id: 'moderasyon',
        label: 'Moderasyon',
        path: '/admin/moderasyon',
        icon: AlertIcon,
      },
      /* Forum yönetimi (kategoriler, konular, iletiler) yazılmıştı ama menüde
         girdisi yoktu ve `/admin/forum` takma adı da 'moderasyon'a gidiyordu:
         ekrana hiçbir yoldan erişilemiyordu. */
      { id: 'forum', label: 'Forum', path: '/admin/forum', icon: ChatIcon },
      { id: 'destek', label: 'Destek', path: '/admin/destek', icon: BellIcon },
    ],
  },
  {
    title: 'Sistem',
    items: [
      /* MENÜDEN ÇIKARILAN ÜÇ GİRDİ — kimlikleri ve yolları duruyor.
         'hata' ("Hata Günlükleri"), 'link' ("Link Sağlığı") ve 'eposta'
         ("E-posta Sağlığı") kendi ekranlarına sahip değildi: sırasıyla
         'aktivite' (denetim günlüğü), 'ayar' (site/katalog ayarları) ve
         'destek' (hatırlatmalar) ile AYNI bileşeni çiziyorlardı. Etiketleri
         yöneticiye var olmayan bir ekran vaat ediyordu. Kimlikler tip ve
         gövde içinde korunuyor ki eski yer imleri ve `routeAliases`
         çalışmaya devam etsin — yalnızca menüden kaldırıldılar. */
      {
        id: 'aktivite',
        label: 'Aktivite',
        path: '/admin/aktivite',
        icon: ListIcon,
      },
      {
        id: 'duyuru',
        label: 'Duyurular',
        path: '/admin/duyurular',
        icon: RadioIcon,
      },
      {
        id: 'sayfa',
        label: 'Sayfalar',
        path: '/admin/sayfalar',
        icon: ImageIcon,
      },
      { id: 'ayar', label: 'Ayarlar', path: '/admin/ayarlar', icon: GridIcon },
    ],
  },
];

const sections = navGroups.flatMap((group) => group.items);

const routeAliases: Record<string, AdminSectionId> = {
  '/admin/gallery': 'icerik',
  '/admin/news': 'icerik',
  '/admin/articles': 'icerik',
  '/admin/content': 'icerik',
  '/admin/events': 'icerik',
  '/admin/listings': 'icerik',
  '/admin/sites': 'icerik',
  '/admin/media': 'icerik',
  '/admin/moderation': 'moderasyon',
  '/admin/users': 'kullanicilar',
  '/admin/broadcast': 'duyuru',
  '/admin/radio': 'duyuru',
  '/admin/tv': 'duyuru',
  '/admin/notifications': 'eposta',
  '/admin/site-settings': 'ayar',
  '/admin/catalog': 'ayar',
  '/admin/audit': 'aktivite',
};

type StatTone = 'warning' | 'primary' | 'success' | 'cold';

interface DashboardCard {
  label: string;
  value: string;
  hint: string;
  tone: StatTone;
  href: string;
  icon: typeof HomeIcon;
}

function dashboardStats(data: DashboardStats | null): DashboardCard[] {
  return [
    {
      label: 'Onay bekleyen',
      value: formatAdminCount(data?.moderasyonBekleyen),
      hint: 'Kuyruktaki şikâyetler',
      tone: 'warning',
      icon: AlertIcon,
      /* Sayı `moderation_queue`dan geliyor (`admin_dashboard_rpc.sql:58`);
         bağlantı da o tabloyu gösteren ekrana gitmeli. Eskiden içerik onay
         ekranına gidiyordu: sayaç doğru, varış yeri yanlıştı. */
      href: '/admin/moderasyon',
    },
    {
      label: 'Bekleyen fotoğraf',
      value: formatAdminCount(data?.fotografBekleyen),
      hint: 'Fotoğraf inceleme',
      tone: 'warning',
      icon: ImageIcon,
      href: '/admin/onay-kuyrugu?record=photo',
    },
    {
      label: 'Silme talebi',
      value: formatAdminCount(data?.silmeTalebi),
      hint: 'Hesap kapatma kuyruğu',
      tone: 'primary',
      icon: UsersIcon,
      href: '/admin/kullanicilar',
    },
    {
      label: 'Askıdaki kullanıcı',
      value: formatAdminCount(data?.kullaniciAskida),
      hint: 'Kısıtlı hesap',
      tone: 'success',
      icon: UsersIcon,
      href: '/admin/kullanicilar',
    },
    {
      label: 'Kullanıcı',
      value: formatAdminCount(data?.kullaniciToplam),
      hint: 'Toplam üye',
      tone: 'cold',
      icon: UsersIcon,
      href: '/admin/kullanicilar',
    },
    {
      label: 'İçerik',
      value: formatAdminCount(data?.icerikYayinda),
      hint: 'Yayındaki kayıt',
      tone: 'primary',
      icon: BookIcon,
      href: '/admin/icerik',
    },
  ];
}

interface DashboardRow {
  title: string;
  text: string;
  meta: string;
  href: string;
}

function activityRows(data: DashboardStats | null): DashboardRow[] {
  return [
    {
      title: 'Yeni kullanıcı (7g)',
      text: 'Son 7 günde açılan hesap',
      meta: formatAdminCount(data?.kullaniciYeni7g),
      href: '/admin/kullanicilar',
    },
    {
      title: 'Taslak içerik',
      text: 'Yayına alınmamış içerik',
      meta: formatAdminCount(data?.icerikTaslak),
      href: '/admin/icerik',
    },
    {
      title: 'Bugünkü audit',
      text: 'Bugün kayda geçen işlem',
      meta: formatAdminCount(data?.auditBugun),
      href: '/admin/aktivite',
    },
    {
      title: 'Askıdaki kullanıcı',
      text: 'Kısıtlı ya da yasaklı hesap',
      meta: formatAdminCount(data?.kullaniciAskida),
      href: '/admin/kullanicilar',
    },
  ];
}

function contentRows(data: DashboardStats | null): DashboardRow[] {
  return [
    {
      title: 'Yayındaki içerik',
      text: 'Haber, yazı, sözlük ve SSS kayıtları',
      meta: formatAdminCount(data?.icerikYayinda),
      href: '/admin/icerik',
    },
    {
      title: 'Taslak içerik',
      text: 'Yayına alınmayı bekleyen içerik',
      meta: formatAdminCount(data?.icerikTaslak),
      href: '/admin/icerik',
    },
    {
      title: 'Bekleyen fotoğraf',
      text: 'Fotoğraf moderasyon kuyruğu',
      meta: formatAdminCount(data?.fotografBekleyen),
      href: '/admin/onay-kuyrugu?record=photo',
    },
    {
      title: 'Onay kuyruğu',
      text: 'Moderasyon bekleyen tüm kayıtlar',
      meta: formatAdminCount(data?.moderasyonBekleyen),
      href: '/admin/onay-kuyrugu',
    },
  ];
}

function queueRows(data: DashboardStats | null): DashboardRow[] {
  return [
    {
      title: 'Onay bekleyen',
      text: 'Şikâyet kuyruğu',
      meta: formatAdminCount(data?.moderasyonBekleyen),
      href: '/admin/moderasyon',
    },
    {
      title: 'Fotoğraf inceleme',
      text: 'Taslak fotoğraflar',
      meta: formatAdminCount(data?.fotografBekleyen),
      href: '/admin/onay-kuyrugu?record=photo',
    },
    {
      title: 'Silme talebi',
      text: 'Hesap kapatma istekleri',
      meta: formatAdminCount(data?.silmeTalebi),
      href: '/admin/kullanicilar',
    },
    {
      title: 'Askıdaki kullanıcı',
      text: 'Müdahale edilmiş hesaplar',
      meta: formatAdminCount(data?.kullaniciAskida),
      href: '/admin/kullanicilar',
    },
  ];
}

function healthRows(data: DashboardStats | null): DashboardRow[] {
  return [
    {
      title: 'Toplam kullanıcı',
      text: 'Kullanıcı yönetimi',
      meta: formatAdminCount(data?.kullaniciToplam),
      href: '/admin/kullanicilar',
    },
    {
      title: 'Yeni kullanıcı (7g)',
      text: 'Kayıt akışı',
      meta: formatAdminCount(data?.kullaniciYeni7g),
      href: '/admin/kullanicilar',
    },
    {
      title: 'Yayındaki içerik',
      text: 'Canlı içerik',
      meta: formatAdminCount(data?.icerikYayinda),
      href: '/admin/icerik',
    },
    {
      title: 'Bugünkü audit',
      text: 'Sistem aktivitesi',
      meta: formatAdminCount(data?.auditBugun),
      href: '/admin/aktivite',
    },
  ];
}

export function AdminPage() {
  const { user, configured, loading } = useAuth();
  const roles = useRoles();
  const location = useLocation();
  const search = new URLSearchParams(location.search);
  const active = useActiveSection(location.pathname);
  const contentKind = getContentKind(search.get('kind'));
  const recordKind = getRecordKind(location.pathname, search.get('record'));
  const targetSlug = search.get('slug') ?? undefined;
  const ready = configured && roles.status !== 'unconfigured';

  return (
    <>
      <PageMeta
        title="AstroHub Admin"
        description="AstroHub yönetim paneli."
        noIndex
      />
      <Container className="max-w-admin py-6 sm:py-8">
        <div className="grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-card border border-border-strong bg-surface-1 shadow-overlay lg:sticky lg:top-20 lg:self-start">
            <div className="border-b border-border px-4 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-card border border-primary/35 bg-background text-primary">
                  <SparkleIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-caption font-bold tracking-[0.14em] text-foreground">
                    ASTROHUB
                  </p>
                  <p className="text-meta text-muted-foreground">
                    Yönetim paneli
                  </p>
                </div>
              </div>
              <Badge
                tone={roles.isAdmin ? 'primary' : 'warning'}
                className="mt-4"
              >
                {roles.isAdmin ? 'Yönetici' : 'Yetki kontrollü'}
              </Badge>
            </div>

            <nav aria-label="Yönetim bölümleri" className="space-y-5 p-3">
              {navGroups.map((group, groupIndex) => (
                <div key={group.title ?? groupIndex}>
                  {group.title ? (
                    <p className="mb-2 px-2 text-[0.64rem] font-semibold uppercase tracking-[0.08em] text-faint">
                      {group.title}
                    </p>
                  ) : null}
                  <ul className="grid gap-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const selected = active === item.id;
                      return (
                        <li key={item.id}>
                          <Link
                            to={item.path}
                            aria-current={selected ? 'page' : undefined}
                            className={cn(
                              'grid grid-cols-[1.35rem_minmax(0,1fr)_0.4rem] items-center gap-2 rounded-card px-2.5 py-2.5 text-body-sm font-medium transition-colors',
                              selected
                                ? 'bg-surface-2 text-foreground'
                                : 'text-muted-foreground hover:bg-surface-2/70 hover:text-foreground'
                            )}
                          >
                            <Icon className="h-[18px] w-[18px] shrink-0" />
                            <span className="truncate">{item.label}</span>
                            <span
                              aria-hidden="true"
                              className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                selected ? 'bg-primary' : 'bg-transparent'
                              )}
                            />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>

          <main className="min-w-0 space-y-4">
            {!ready ? (
              <EmptyState
                message="Veritabanı bağlantısı yapılandırılmamış"
                hint="Yönetim paneli Supabase yapılandırmasıyla çalışır."
              />
            ) : loading || roles.status === 'loading' ? (
              <p
                className="py-10 text-center text-meta text-muted-foreground"
                role="status"
              >
                Yetkiler kontrol ediliyor…
              </p>
            ) : !user ? (
              <EmptyState
                message="Bu sayfa için giriş gerekli"
                hint="Yönetim paneli yalnızca yetkili hesaplara açıktır."
                action={
                  <ButtonLink to="/giris" size="sm">
                    Giriş Yap
                  </ButtonLink>
                }
              />
            ) : !roles.canAccessAdmin ? (
              <EmptyState
                message="Bu hesapta yönetim yetkisi yok"
                hint="Yönetim paneline admin ve moderatör rolleri erişebilir."
                action={
                  <ButtonLink to="/panel" size="sm" variant="secondary">
                    Üye Paneli
                  </ButtonLink>
                }
              />
            ) : active === 'genel' ? (
              <Dashboard />
            ) : (
              <AdminSection
                active={active}
                isAdmin={roles.isAdmin}
                contentKind={contentKind}
                recordKind={recordKind}
                targetSlug={targetSlug}
              />
            )}
          </main>
        </div>
      </Container>
    </>
  );
}

function AdminSection({
  active,
  isAdmin,
  contentKind,
  recordKind,
  targetSlug,
}: {
  active: AdminSectionId;
  isAdmin: boolean;
  contentKind: EntryKind;
  recordKind?: RecordKind;
  targetSlug?: string;
}) {
  if (active === 'onay') {
    return (
      <div className="space-y-4">
        <RecordsControl kinds={['photo', 'listing', 'event', 'site']} />
        <CommentsControl />
      </div>
    );
  }

  /* İÇERİK ONAYI İLE ŞİKÂYET KUYRUĞU AYRI İŞLER.
     İkisi de bu dalda birleşiktiyken "Moderasyon" menüsü içerik onay
     ekranını açıyordu; `moderation_queue`'ya bakan hiçbir ekran yoktu. */
  if (active === 'moderasyon') {
    return <ModerationQueueControl />;
  }

  if (active === 'kullanicilar') {
    return isAdmin ? (
      <div className="space-y-4">
        <UserControl />
        <AuditControl />
      </div>
    ) : (
      <EmptyState
        message="Kullanıcı yönetimi yalnızca yöneticilere açık"
        hint="Moderatör rolüyle içerik ve moderasyon bölümleri kullanılabilir."
      />
    );
  }

  if (active === 'icerik') {
    return (
      <IcerikSekmeleri
        canWrite={isAdmin}
        contentKind={contentKind}
        recordKind={recordKind}
        targetSlug={targetSlug}
      />
    );
  }

  if (active === 'destek' || active === 'eposta') {
    return <ReminderControl canWrite={isAdmin} />;
  }

  if (active === 'duyuru') {
    return (
      <div className="space-y-4">
        <BroadcastControl />
        <div className="grid gap-4 xl:grid-cols-2">
          <RadioControl canWrite={isAdmin} />
          <TvControl canWrite={isAdmin} />
        </div>
      </div>
    );
  }

  if (active === 'sayfa') {
    return (
      <div className="space-y-4">
        <FeaturedControl canWrite={isAdmin} />
        <SiteControl canWrite={isAdmin} />
      </div>
    );
  }

  if (active === 'ayar' || active === 'link') {
    return (
      <div className="space-y-4">
        <SiteControl canWrite={isAdmin} />
        <CatalogControl canWrite={isAdmin} />
        <EquipmentDataControl canWrite={isAdmin} />
        <SpecImportControl canWrite={isAdmin} />
      </div>
    );
  }

  if (active === 'hata' || active === 'aktivite') {
    return <AuditControl />;
  }

  if (active === 'forum') {
    return (
      <div className="space-y-4">
        <ForumCategories canWrite={isAdmin} />
        {/* `targetSlug` GEÇİRİLİYOR: forum konusundan panele gelen derin
            bağlantı (`/admin/forum?slug=…`) doğru kaydı açmalı; slug
            yoksa liste normal davranıyor. */}
        <RecordsControl
          kinds={['thread']}
          title="Forum konuları"
          initialKind="thread"
          targetSlug={targetSlug}
        />
        <CommentsControl kinds={['forumPost']} />
      </div>
    );
  }

  /* Buraya düşülmüyor: yukarıdaki dallar `AdminSectionId`in tamamını
     karşılıyor. Forum ekranı eskiden BU konumdaydı — koşulsuz son dönüş
     olduğu için de hiçbir kimlikle eşleşmiyordu; artık kendi dalında. */
  return <Dashboard />;
}

function Dashboard() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    fetchDashboard()
      .then((nextData) => {
        if (!alive) return;
        setData(nextData);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setData(null);
        setError(
          err instanceof Error ? err.message : 'Dashboard verisi alınamadı'
        );
      });

    return () => {
      alive = false;
    };
  }, []);

  const stats = dashboardStats(data);
  const liveActivityRows = activityRows(data);
  const liveContentRows = contentRows(data);
  const liveQueueRows = queueRows(data);
  const liveHealthRows = healthRows(data);
  const totalQueue =
    (data?.moderasyonBekleyen ?? 0) +
    (data?.fotografBekleyen ?? 0) +
    (data?.silmeTalebi ?? 0) +
    (data?.kullaniciAskida ?? 0);
  const priorityStats = stats.slice(0, 4);
  const platformStats = stats.slice(4);
  const latestActivity = data?.sonHareketler[0];

  return (
    <>
      <section className="rounded-card border border-border-strong bg-surface-1 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="label text-primary">Yönetim Paneli</p>
            <h1 className="type-page-sm mt-1 text-foreground">
              Genel Bakış
            </h1>
            <p className="mt-2 max-w-2xl text-body-sm leading-relaxed text-muted-foreground">
              Kritik kuyrukları, yayın durumunu ve son yönetim hareketlerini tek
              ekrandan takip edin.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:w-[24rem]">
            <div className="rounded-card border border-border bg-background px-3 py-2">
              <p className="text-meta text-faint">Açık iş</p>
              <p className="tabular mt-1 font-display text-xl font-bold text-warning">
                {formatAdminCount(totalQueue)}
              </p>
            </div>
            <div className="rounded-card border border-border bg-background px-3 py-2">
              <p className="text-meta text-faint">Son hareket</p>
              <p className="tabular mt-1 truncate text-body-sm font-semibold text-foreground">
                {latestActivity ? formatAdminTime(latestActivity.zaman) : '—'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <p
          className="rounded-card border border-warning/30 bg-warning/10 px-3 py-2 text-meta text-warning"
          role="status"
        >
          Canlı dashboard verisi alınamadı: {error}
        </p>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="rounded-card border border-border bg-surface-1">
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <h2 className="label text-foreground">Öncelikli İşler</h2>
              <p className="mt-1 text-meta text-faint">
                Müdahale bekleyen alanlar
              </p>
            </div>
            <Badge tone={totalQueue > 0 ? 'warning' : 'success'}>
              {formatAdminCount(totalQueue)} açık
            </Badge>
          </header>
          <div className="grid gap-px bg-border md:grid-cols-2 xl:grid-cols-4">
            {priorityStats.map((stat) => (
              <DashboardStatLink key={stat.label} stat={stat} />
            ))}
          </div>
        </div>

        <div className="rounded-card border border-border bg-surface-1">
          <header className="border-b border-border px-4 py-3">
            <h2 className="label text-foreground">Platform</h2>
            <p className="mt-1 text-meta text-faint">Canlı temel metrikler</p>
          </header>
          <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-1">
            {platformStats.map((stat) => (
              <DashboardStatLink key={stat.label} stat={stat} compact />
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-card border border-border bg-surface-1">
        <header className="border-b border-border px-4 py-3">
          <h2 className="label text-foreground">Kısa Göstergeler</h2>
        </header>
        <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-4">
          {liveActivityRows.map((row) => (
            <DashboardRowLink key={row.title} row={row} />
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
        <section className="rounded-card border border-border bg-surface-1">
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <h2 className="label text-foreground">İçerik Akışı</h2>
              <p className="mt-1 text-meta text-faint">
                Yayın, vitrin ve katalog yüzeyleri
              </p>
            </div>
            <Badge tone="primary">{liveContentRows.length} modül</Badge>
          </header>
          <div className="grid gap-px bg-border md:grid-cols-2">
            {liveContentRows.map((row, index) => (
              <Link
                key={row.title}
                to={row.href}
                className="bg-surface-1 p-4 transition-colors hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary"
              >
                <div className="flex items-start justify-between gap-3">
                  <IconTile index={index} />
                  <Badge
                    tone={index === 2 || index === 3 ? 'warning' : 'muted'}
                  >
                    {row.meta}
                  </Badge>
                </div>
                <h3 className="mt-4 text-body-sm font-semibold text-foreground">
                  {row.title}
                </h3>
                <p className="mt-1 text-meta leading-relaxed text-muted-foreground">
                  {row.text}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-card border border-border bg-surface-1">
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <h2 className="label text-foreground">İş Kuyruğu</h2>
              <p className="mt-1 text-meta text-faint">Özet iş listesi</p>
            </div>
            <Badge tone="warning">{formatAdminCount(totalQueue)} açık</Badge>
          </header>
          <ul className="divide-y divide-border">
            {liveQueueRows.map((row) => (
              <li key={row.title}>
                <Link
                  to={row.href}
                  className="block px-4 py-3 transition-colors hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-body-sm font-semibold text-foreground">
                        {row.title}
                      </p>
                      <p className="mt-1 text-meta text-muted-foreground">
                        {row.text}
                      </p>
                    </div>
                    <span className="tabular text-meta text-primary">
                      {row.meta}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-card border border-border bg-surface-1 xl:col-span-2">
          <header className="border-b border-border px-4 py-3">
            <h2 className="label text-foreground">Sistem Sağlığı</h2>
          </header>
          <div className="grid gap-px bg-border sm:grid-cols-2">
            {liveHealthRows.map((row) => (
              <Link
                key={row.title}
                to={row.href}
                className="flex items-center justify-between gap-3 bg-surface-1 px-4 py-3 transition-colors hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary"
              >
                <span className="text-body-sm text-muted-foreground">
                  {row.title}
                </span>
                <span className="tabular text-body-sm font-semibold text-foreground">
                  {row.meta}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-card border border-border bg-surface-1">
          <header className="border-b border-border px-4 py-3">
            <h2 className="label text-foreground">Son Hareketler</h2>
          </header>
          <ol className="divide-y divide-border">
            {data?.sonHareketler.length ? (
              data.sonHareketler.map((item) => (
                <li
                  key={`${item.zaman}-${item.eylem}-${item.hedef ?? ''}`}
                  className="flex gap-3 px-4 py-3"
                >
                  <span className="tabular text-meta text-primary">
                    {formatAdminTime(item.zaman)}
                  </span>
                  <span className="text-meta leading-relaxed text-muted-foreground">
                    {item.eylem}
                    {item.hedef ? ` · ${item.hedef}` : ''}
                    {item.kim ? ` · @${item.kim}` : ''}
                  </span>
                </li>
              ))
            ) : (
              <li className="px-4 py-3 text-meta text-muted-foreground">
                Son hareket kaydı yok.
              </li>
            )}
          </ol>
        </section>
      </div>
    </>
  );
}

function DashboardStatLink({
  stat,
  compact = false,
}: {
  stat: DashboardCard;
  compact?: boolean;
}) {
  const Icon = stat.icon;
  return (
    <Link
      to={stat.href}
      className="group bg-surface-1 p-4 transition-colors hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-card border bg-background',
            stat.tone === 'warning' && 'border-warning/35 text-warning',
            stat.tone === 'primary' && 'border-primary/35 text-primary',
            stat.tone === 'success' && 'border-success/35 text-success',
            stat.tone === 'cold' && 'border-cold/35 text-cold'
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span
          className={cn(
            'tabular font-display font-bold leading-none',
            compact ? 'text-xl' : 'text-2xl',
            stat.tone === 'warning' && 'text-warning',
            stat.tone === 'primary' && 'text-primary',
            stat.tone === 'success' && 'text-success',
            stat.tone === 'cold' && 'text-cold'
          )}
        >
          {stat.value}
        </span>
      </div>
      <h3 className="mt-4 text-body-sm font-semibold text-foreground">
        {stat.label}
      </h3>
      <p className="mt-1 text-meta leading-relaxed text-muted-foreground">
        {stat.hint}
      </p>
    </Link>
  );
}

function DashboardRowLink({ row }: { row: DashboardRow }) {
  return (
    <Link
      to={row.href}
      className="flex min-h-24 flex-col justify-between bg-surface-1 p-4 transition-colors hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-body-sm font-semibold text-foreground">
          {row.title}
        </h3>
        <span className="tabular font-display text-xl font-bold leading-none text-primary">
          {row.meta}
        </span>
      </div>
      <p className="mt-3 text-meta leading-relaxed text-muted-foreground">
        {row.text}
      </p>
    </Link>
  );
}

function useActiveSection(pathname: string): AdminSectionId {
  const normalized = pathname.replace(/\/+$/, '') || '/admin';
  const exact = sections.find((item) => item.path === normalized);
  return exact?.id ?? routeAliases[normalized] ?? 'genel';
}

function getContentKind(value: string | null): EntryKind {
  if (value === 'yazi' || value === 'sozluk' || value === 'sss') return value;
  return 'haber';
}

function getRecordKind(
  pathname: string,
  value: string | null
): RecordKind | undefined {
  if (
    value === 'photo' ||
    value === 'listing' ||
    value === 'event' ||
    value === 'site'
  ) {
    return value;
  }
  const normalized = pathname.replace(/\/+$/, '');
  if (normalized === '/admin/events') return 'event';
  if (normalized === '/admin/listings') return 'listing';
  if (normalized === '/admin/sites') return 'site';
  return undefined;
}

function IconTile({ index }: { index: number }) {
  const icons = [ImageIcon, CalendarIcon, ListIcon, TagIcon] as const;
  const Icon = icons[index] ?? ImageIcon;
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-card border border-border-strong bg-background text-muted-foreground">
      <Icon className="h-5 w-5" />
    </span>
  );
}

function formatAdminTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
